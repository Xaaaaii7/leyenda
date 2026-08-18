import { CLUBS, getClub, getLeague } from '../data/clubs'
import { getNation } from '../data/nations'
import { Rng, clamp } from './rng'
import { convertPosition, marketValueOf, ovrOf, wageFor } from './player'
import { academyOffers, generateLoanOffers, generateOffers } from './transfers'
import type { Offer } from './transfers'
import type {
  AttributeKey, CareerState, Decision, DecisionOption, SeasonRecord, Txt,
} from './types'

export interface EventCtx {
  state: CareerState
  /** Última temporada jugada; no existe antes de la primera. */
  last?: SeasonRecord
  ovr: number
}

export interface EventDef {
  key: string
  stage: 'preseason' | 'postseason'
  /** Sólo puede salir una vez en toda la carrera. */
  once: boolean
  weight: number
  when: (ctx: EventCtx) => boolean
  build: (ctx: EventCtx, rng: Rng) => {
    title: Txt
    text: Txt
    options: DecisionOption[]
    payload?: Record<string, unknown>
  }
  /** Aplica el efecto y devuelve la línea de resumen que verá el jugador. */
  apply: (ctx: EventCtx, optionId: string, payload: Record<string, unknown>, rng: Rng) => Txt
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Azúcar sintáctico: `x('academy.title', { club: 'FC Barcelona' })`. */
const x = (key: string, params?: Txt['params']): Txt => (params ? { key, params } : { key })

/** Etiqueta de una oferta: "FC Barcelona · LaLiga". */
function offerTxt(offer: Offer): Txt {
  const club = getClub(offer.clubId)
  return x('offer.label', { club: club.name, league: getLeague(club.leagueId).name })
}

function adjust(
  state: CareerState,
  patch: Partial<Record<'form' | 'morale' | 'fitness' | 'reputation' | 'injuryProneness', number>>,
) {
  const p = state.player
  if (patch.form !== undefined) p.form = clamp(p.form + patch.form, 0, 100)
  if (patch.morale !== undefined) p.morale = clamp(p.morale + patch.morale, 0, 100)
  if (patch.fitness !== undefined) p.fitness = clamp(p.fitness + patch.fitness, 0, 100)
  if (patch.reputation !== undefined) p.reputation = clamp(p.reputation + patch.reputation, 0, 100)
  if (patch.injuryProneness !== undefined) {
    p.injuryProneness = clamp(p.injuryProneness + patch.injuryProneness, 0, 100)
  }
}

export function moveTo(state: CareerState, offer: Offer) {
  const p = state.player
  if (offer.loan) {
    p.parentClubId = p.parentClubId ?? p.clubId
    p.clubId = offer.clubId
    // La cesión se acuerda en la post-temporada de `seasonIndex`; la temporada
    // que se jugará cedido es la siguiente, y sólo al acabarla se vuelve.
    p.loanReturnAt = state.seasonIndex + 1
  } else {
    p.parentClubId = undefined
    p.loanReturnAt = undefined
    p.clubId = offer.clubId
    p.contractYears = offer.years
    p.wage = offer.wage
  }
  p.captain = false
  p.seasonsAtClub = 0
  if (!state.totals.clubs.includes(offer.clubId)) state.totals.clubs.push(offer.clubId)
  const club = getClub(offer.clubId)
  p.marketValue = marketValueOf(p, getLeague(club.leagueId).strength)
}

/**
 * En qué trabaja cada puesto. Antes esto era un menú que elegía el jugador, lo
 * que además ofrecía «Definición: tiro» a un portero; ahora se deduce de la
 * posición y la elección visible pasa a ser cuánto se aprieta, no en qué.
 */
const POSITION_FOCUS: Record<string, AttributeKey[]> = {
  GK: ['defending', 'physical'],
  DF: ['defending', 'physical'],
  MF: ['passing', 'dribbling'],
  FW: ['shooting', 'dribbling'],
}

/** Apuestas del plan de pretemporada: cuánto se gana, cuánto se arriesga y con qué probabilidad. */
const TRAINING_PLANS = [
  { id: 'hard', up: 2, down: -2, odds: 0.6, injuryRisk: 1.18, fitness: -3, tone: 'risky' },
  { id: 'normal', up: 1, down: 0, odds: 0.75, injuryRisk: 1, fitness: 0, tone: 'safe' },
  { id: 'rest', up: 1, down: 0, odds: 1, injuryRisk: 0.8, fitness: 7, tone: 'safe' },
] as const

const round2 = (v: number) => Math.round(v * 100) / 100

/**
 * Ligas que pagan muy por encima de su nivel deportivo. De ahí salen las ofertas
 * millonarias del final de carrera.
 */
const RICH_LEAGUES = ['SAU1', 'USA1']
const RICH_LEAGUE_CLUBS = CLUBS.filter(
  (c) => RICH_LEAGUES.includes(c.leagueId) && c.prestige >= 66,
)

// ── Catálogo de eventos ──────────────────────────────────────────────

const EVENTS: EventDef[] = [
  // ---- Estructurales: cantera, mercado, cesiones, contratos ----
  {
    key: 'academy',
    stage: 'preseason',
    once: true,
    weight: 200,
    when: (ctx) => ctx.state.player.clubId === '',
    build: (ctx, rng) => {
      const offers = academyOffers(ctx.state.player.identity.nationId, rng)
      return {
        title: x('event.academy.title'),
        text: x('event.academy.text'),
        options: offers.map((o, i) => ({
          id: `ac_${i}`,
          label: offerTxt(o),
          hint: x('event.academy.hint', { prestige: getClub(o.clubId).prestige }),
          tone: (getClub(o.clubId).prestige >= 80 ? 'bold' : 'safe') as DecisionOption['tone'],
        })),
        payload: { offers: offers as unknown as Record<string, unknown>[] },
      }
    },
    apply: (ctx, optionId, payload) => {
      const offers = (payload.offers as unknown as Offer[]) ?? []
      const offer = offers[Number(optionId.split('_')[1])] ?? offers[0]
      moveTo(ctx.state, offer)
      ctx.state.player.contractYears = 3
      return x('event.academy.done', { club: getClub(offer.clubId).name })
    },
  },
  {
    key: 'transfer',
    stage: 'postseason',
    once: false,
    weight: 100,
    when: (ctx) => (ctx.state.pendingOffersCache?.length ?? 0) > 0,
    build: (ctx) => {
      const offers = (ctx.state.pendingOffersCache ?? []) as unknown as Offer[]
      const club = getClub(ctx.state.player.clubId)
      return {
        title: x('event.transfer.title'),
        text: x(offers.length === 1 ? 'event.transfer.textOne' : 'event.transfer.textMany', {
          count: offers.length,
          club: club.name,
        }),
        options: [
          ...offers.map((o, i) => ({
            id: `take_${i}`,
            label: offerTxt(o),
            hint: x(o.fee > 0 ? 'event.transfer.hintFee' : 'event.transfer.hintFree', {
              fee: o.fee,
              wage: o.wage,
              promise: x(`promise.${o.promise}`),
            }),
            tone: (getClub(o.clubId).prestige > club.prestige ? 'bold' : 'money') as DecisionOption['tone'],
          })),
          {
            id: 'stay',
            label: x('event.transfer.stay', { club: club.name }),
            hint: x('event.transfer.stayHint'),
            tone: 'safe' as DecisionOption['tone'],
          },
        ],
        payload: { offers: offers as unknown as Record<string, unknown>[] },
      }
    },
    apply: (ctx, optionId, payload) => {
      const offers = (payload.offers as unknown as Offer[]) ?? []
      if (optionId === 'stay') {
        adjust(ctx.state, { morale: 6, reputation: 2 })
        return x('event.transfer.doneStay', { club: getClub(ctx.state.player.clubId).name })
      }
      const offer = offers[Number(optionId.split('_')[1])]
      if (!offer) return x('event.transfer.doneFail')
      moveTo(ctx.state, offer)
      adjust(ctx.state, { morale: 10, form: 4, reputation: 3 })
      return x('event.transfer.doneMove', { club: getClub(offer.clubId).name, fee: offer.fee })
    },
  },
  {
    key: 'loan',
    stage: 'postseason',
    once: false,
    weight: 95,
    when: (ctx) => (ctx.state.pendingLoansCache?.length ?? 0) > 0,
    build: (ctx) => {
      const offers = (ctx.state.pendingLoansCache ?? []) as unknown as Offer[]
      return {
        title: x('event.loan.title'),
        text: x('event.loan.text'),
        options: [
          ...offers.map((o, i) => ({
            id: `loan_${i}`,
            label: offerTxt(o),
            hint: x('event.loan.hint', { promise: x(`promise.${o.promise}`) }),
            tone: 'safe' as DecisionOption['tone'],
          })),
          {
            id: 'fight',
            label: x('event.loan.fight'),
            hint: x('event.loan.fightHint'),
            tone: 'risky' as DecisionOption['tone'],
          },
        ],
        payload: { offers: offers as unknown as Record<string, unknown>[] },
      }
    },
    apply: (ctx, optionId, payload) => {
      const offers = (payload.offers as unknown as Offer[]) ?? []
      if (optionId === 'fight') {
        ctx.state.modifiers.minutes -= 0.05
        adjust(ctx.state, { morale: -4 })
        return x('event.loan.doneFight')
      }
      const offer = offers[Number(optionId.split('_')[1])]
      if (!offer) return x('event.loan.doneFail')
      moveTo(ctx.state, offer)
      ctx.state.modifiers.minutes += 0.12
      adjust(ctx.state, { morale: 5 })
      return x('event.loan.doneGo', { club: getClub(offer.clubId).name })
    },
  },
  {
    key: 'renewal',
    stage: 'postseason',
    once: false,
    weight: 80,
    when: (ctx) => ctx.state.player.contractYears <= 1 && !ctx.state.player.parentClubId,
    build: (ctx) => {
      const club = getClub(ctx.state.player.clubId)
      const base = wageFor(ctx.ovr, club.prestige, ctx.state.player.age)
      return {
        title: x('event.renewal.title'),
        text: x('event.renewal.text', { club: club.name }),
        options: [
          { id: 'long', label: x('event.renewal.long'), hint: x('event.renewal.longHint', { wage: round2(base) }), tone: 'safe' },
          { id: 'money', label: x('event.renewal.money'), hint: x('event.renewal.moneyHint', { wage: round2(base * 1.45) }), tone: 'money' },
          { id: 'wait', label: x('event.renewal.wait'), hint: x('event.renewal.waitHint'), tone: 'risky' },
        ],
        payload: { base },
      }
    },
    apply: (ctx, optionId, payload) => {
      const base = Number(payload.base ?? 1)
      const p = ctx.state.player
      const club = getClub(p.clubId)
      if (optionId === 'long') {
        p.contractYears = 5
        p.wage = round2(base)
        adjust(ctx.state, { morale: 8 })
        return x('event.renewal.doneLong', { club: club.name })
      }
      if (optionId === 'money') {
        p.contractYears = 4
        p.wage = round2(base * 1.45)
        adjust(ctx.state, { morale: 12, reputation: 3 })
        ctx.state.modifiers.rating -= 0.05
        return x('event.renewal.doneMoney', { wage: p.wage })
      }
      p.contractYears = 1
      adjust(ctx.state, { morale: -3 })
      return x('event.renewal.doneWait')
    },
  },
  {
    key: 'retirementCall',
    stage: 'postseason',
    once: false,
    weight: 120,
    when: (ctx) => ctx.state.player.age >= 33 && (ctx.last?.stats.apps ?? 0) < 22,
    build: (ctx) => ({
      title: x('event.retire.title'),
      text: x('event.retire.text', { age: ctx.state.player.age }),
      options: [
        { id: 'continue', label: x('event.retire.continue'), hint: x('event.retire.continueHint'), tone: 'bold' },
        { id: 'retire', label: x('event.retire.retire'), hint: x('event.retire.retireHint'), tone: 'safe' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'retire') {
        ctx.state.player.retiringNow = true
        return x('event.retire.doneRetire')
      }
      adjust(ctx.state, { morale: 5 })
      return x('event.retire.doneContinue')
    },
  },
  {
    key: 'goldenExit',
    stage: 'postseason',
    once: true,
    weight: 60,
    when: (ctx) => ctx.state.player.age >= 30 && ctx.ovr >= 78,
    build: (ctx, rng) => {
      const money = Math.round(ctx.state.player.wage * rng.float(2.4, 4.2) * 10) / 10
      // Los destinos se eligen por criterio, no por id: los clubes más ricos de
      // las ligas que pagan por encima de su nivel deportivo.
      const dest = rng.pick(RICH_LEAGUE_CLUBS).id
      return {
        title: x('event.goldenExit.title'),
        text: x('event.goldenExit.text', { club: getClub(dest).name }),
        options: [
          { id: 'go', label: x('event.goldenExit.go', { money }), hint: x('event.goldenExit.goHint'), tone: 'money' },
          { id: 'no', label: x('event.goldenExit.no'), hint: x('event.goldenExit.noHint'), tone: 'bold' },
        ],
        payload: { dest, money },
      }
    },
    apply: (ctx, optionId, payload) => {
      if (optionId === 'no') {
        adjust(ctx.state, { morale: 4, reputation: 2 })
        return x('event.goldenExit.doneNo')
      }
      const dest = String(payload.dest)
      const money = Number(payload.money)
      moveTo(ctx.state, { clubId: dest, fee: 0, wage: money, promise: 'star', loan: false, years: 3 })
      ctx.state.modifiers.minutes += 0.1
      adjust(ctx.state, { morale: 12, reputation: -4 })
      return x('event.goldenExit.doneGo', { club: getClub(dest).name, money })
    },
  },

  // ---- Desarrollo y vida deportiva ----
  {
    key: 'training',
    stage: 'preseason',
    once: false,
    weight: 60,
    // Sólo se ofrece si de verdad queda margen de mejora: así el "+3" que promete
    // la opción es siempre el "+3" que acaba dando.
    when: (ctx) => ctx.state.player.potential - ctx.ovr >= 3,
    build: (ctx) => ({
      title: x('event.training.title'),
      text: x(ctx.state.player.age <= 21 ? 'event.training.textYoung' : 'event.training.textOld'),
      options: TRAINING_PLANS.map((plan) => ({
        id: plan.id,
        label: x(`event.training.${plan.id}`),
        // La apuesta va escrita: el jugador ve exactamente qué se juega.
        hint:
          plan.down < 0
            ? x('event.training.oddsRisk', {
                up: plan.up,
                upPct: Math.round(plan.odds * 100),
                down: Math.abs(plan.down),
                downPct: Math.round((1 - plan.odds) * 100),
              })
            : plan.odds < 1
              ? x('event.training.oddsSafe', { up: plan.up, upPct: Math.round(plan.odds * 100) })
              : x('event.training.oddsSure', { up: plan.up }),
        tone: plan.tone as DecisionOption['tone'],
      })),
    }),
    apply: (ctx, optionId, _payload, rng) => {
      const plan = TRAINING_PLANS.find((t) => t.id === optionId) ?? TRAINING_PLANS[1]
      ctx.state.modifiers.injuryRisk *= plan.injuryRisk
      if (plan.fitness) adjust(ctx.state, { fitness: plan.fitness })

      const won = rng.chance(plan.odds)
      const delta = won ? plan.up : plan.down
      ctx.state.modifiers.ovrDelta += delta
      return delta >= 0
        ? x('event.training.doneUp', { delta })
        : x('event.training.doneDown', { delta: Math.abs(delta) })
    },
  },
  {
    key: 'nutrition',
    stage: 'preseason',
    once: false,
    weight: 55,
    when: (ctx) => ctx.state.player.age >= 18,
    build: () => ({
      title: x('event.nutrition.title'),
      text: x('event.nutrition.text'),
      options: [
        { id: 'strict', label: x('event.nutrition.strict'), hint: x('event.nutrition.strictHint'), tone: 'safe' },
        { id: 'loose', label: x('event.nutrition.loose'), hint: x('event.nutrition.looseHint'), tone: 'safe' },
        { id: 'party', label: x('event.nutrition.party'), hint: x('event.nutrition.partyHint'), tone: 'risky' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'strict') {
        adjust(ctx.state, { fitness: 8, injuryProneness: -6, morale: -3 })
        ctx.state.modifiers.injuryRisk *= 0.82
        return x('event.nutrition.doneStrict')
      }
      if (optionId === 'party') {
        adjust(ctx.state, { fitness: -9, injuryProneness: 7, morale: 8 })
        ctx.state.modifiers.injuryRisk *= 1.25
        return x('event.nutrition.doneParty')
      }
      return x('event.nutrition.doneLoose')
    },
  },
  {
    key: 'coachClash',
    stage: 'preseason',
    once: false,
    weight: 45,
    when: (ctx) => !!ctx.last && ctx.last.role !== 'star' && ctx.state.player.age >= 19,
    build: (ctx) => ({
      title: x('event.coachClash.title'),
      text: x('event.coachClash.text', { club: getClub(ctx.state.player.clubId).name }),
      options: [
        { id: 'accept', label: x('event.coachClash.accept'), hint: x('event.coachClash.acceptHint'), tone: 'safe' },
        { id: 'confront', label: x('event.coachClash.confront'), hint: x('event.coachClash.confrontHint'), tone: 'risky' },
        { id: 'ask_out', label: x('event.coachClash.askOut'), hint: x('event.coachClash.askOutHint'), tone: 'bold' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'accept') {
        ctx.state.modifiers.minutes += 0.08
        adjust(ctx.state, { morale: -2, form: 3 })
        return x('event.coachClash.doneAccept')
      }
      if (optionId === 'confront') {
        ctx.state.modifiers.minutes -= 0.14
        adjust(ctx.state, { reputation: 6, morale: -8 })
        return x('event.coachClash.doneConfront')
      }
      ctx.state.player.wantsOut = true
      adjust(ctx.state, { morale: -5 })
      return x('event.coachClash.doneAskOut')
    },
  },
  {
    key: 'captaincy',
    stage: 'preseason',
    once: true,
    weight: 50,
    when: (ctx) =>
      ctx.ovr >= 74 && ctx.state.player.age >= 25 && !ctx.state.player.captain && !ctx.state.player.parentClubId,
    build: (ctx) => ({
      title: x('event.captaincy.title'),
      text: x('event.captaincy.text', { club: getClub(ctx.state.player.clubId).name }),
      options: [
        { id: 'yes', label: x('event.captaincy.yes'), hint: x('event.captaincy.yesHint'), tone: 'bold' },
        { id: 'no', label: x('event.captaincy.no'), tone: 'safe' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'no') return x('event.captaincy.doneNo')
      ctx.state.player.captain = true
      adjust(ctx.state, { morale: 8, reputation: 5 })
      ctx.state.modifiers.minutes += 0.06
      return x('event.captaincy.doneYes')
    },
  },
  {
    key: 'rehab',
    stage: 'preseason',
    once: false,
    weight: 90,
    when: (ctx) => (ctx.last?.injuries.reduce((a, i) => a + i.weeks, 0) ?? 0) >= 10,
    build: (ctx) => ({
      title: x('event.rehab.title'),
      text: x('event.rehab.text', { weeks: ctx.last?.injuries.reduce((a, i) => a + i.weeks, 0) ?? 0 }),
      options: [
        { id: 'slow', label: x('event.rehab.slow'), hint: x('event.rehab.slowHint'), tone: 'safe' },
        { id: 'fast', label: x('event.rehab.fast'), hint: x('event.rehab.fastHint'), tone: 'risky' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'slow') {
        ctx.state.modifiers.minutes -= 0.1
        adjust(ctx.state, { fitness: 10, injuryProneness: -5 })
        ctx.state.modifiers.injuryRisk *= 0.75
        return x('event.rehab.doneSlow')
      }
      ctx.state.modifiers.minutes += 0.06
      ctx.state.modifiers.injuryRisk *= 1.55
      adjust(ctx.state, { fitness: -6, injuryProneness: 8 })
      return x('event.rehab.doneFast')
    },
  },
  {
    key: 'media',
    stage: 'preseason',
    once: false,
    weight: 40,
    when: (ctx) => ctx.state.player.reputation >= 55,
    build: () => ({
      title: x('event.media.title'),
      text: x('event.media.text'),
      options: [
        { id: 'humble', label: x('event.media.humble'), hint: x('event.media.humbleHint'), tone: 'safe' },
        { id: 'star', label: x('event.media.star'), hint: x('event.media.starHint'), tone: 'bold' },
        { id: 'skip', label: x('event.media.skip'), tone: 'safe' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'star') {
        adjust(ctx.state, { reputation: 9, morale: 4 })
        ctx.state.modifiers.rating -= 0.06
        return x('event.media.doneStar')
      }
      if (optionId === 'humble') {
        adjust(ctx.state, { reputation: 3, morale: 3 })
        return x('event.media.doneHumble')
      }
      return x('event.media.doneSkip')
    },
  },
  {
    key: 'sponsor',
    stage: 'preseason',
    once: false,
    weight: 35,
    when: (ctx) => ctx.state.player.reputation >= 65 && ctx.state.player.age >= 20,
    build: (ctx, rng) => {
      const money = Math.round(clamp(ctx.state.player.reputation / 12, 0.5, 9) * rng.float(0.8, 1.4) * 10) / 10
      return {
        title: x('event.sponsor.title'),
        text: x('event.sponsor.text', { money }),
        options: [
          { id: 'sign', label: x('event.sponsor.sign', { money }), hint: x('event.sponsor.signHint'), tone: 'money' },
          { id: 'skip', label: x('event.sponsor.skip'), tone: 'safe' },
        ],
        payload: { money },
      }
    },
    apply: (ctx, optionId, payload) => {
      if (optionId === 'skip') {
        adjust(ctx.state, { fitness: 3 })
        return x('event.sponsor.doneSkip')
      }
      const money = Number(payload.money)
      ctx.state.totals.careerEarnings += money * 3
      adjust(ctx.state, { reputation: 8, fitness: -4 })
      ctx.state.modifiers.injuryRisk *= 1.08
      return x('event.sponsor.doneSign', { money })
    },
  },
  {
    key: 'positionChange',
    stage: 'preseason',
    once: true,
    weight: 45,
    when: (ctx) => ctx.state.player.age >= 29 && ctx.state.player.identity.position !== 'GK',
    build: (ctx) => {
      const from = ctx.state.player.identity.position
      const to = from === 'FW' ? 'MF' : from === 'MF' ? 'DF' : 'MF'
      return {
        title: x('event.positionChange.title'),
        text: x('event.positionChange.text', { from: x(`position.${from}`), to: x(`position.${to}`) }),
        options: [
          {
            id: 'change',
            label: x('event.positionChange.change', { to: x(`position.${to}`) }),
            hint: x('event.positionChange.changeHint'),
            tone: 'bold',
          },
          { id: 'keep', label: x('event.positionChange.keep'), tone: 'safe' },
        ],
        payload: { to },
      }
    },
    apply: (ctx, optionId, payload) => {
      if (optionId === 'keep') return x('event.positionChange.doneKeep')
      const to = payload.to as 'MF' | 'DF'
      convertPosition(ctx.state.player, to)
      adjust(ctx.state, { form: -6, morale: 3 })
      ctx.state.modifiers.growth += 0.15
      return x('event.positionChange.doneChange', { to: x(`position.${to}`) })
    },
  },
  {
    key: 'ntSwitch',
    stage: 'preseason',
    once: true,
    weight: 55,
    when: (ctx) => {
      const nat = getNation(ctx.state.player.ntNationId)
      return ctx.state.player.age >= 19 && ctx.state.player.age <= 25 && ctx.ovr >= 70 && nat.strength >= 82
    },
    build: (ctx, rng) => {
      const currentId = ctx.state.player.ntNationId
      const pool = ['MAR', 'ALB', 'GHA', 'JAM', 'IRL', 'TUR', 'CRC'].filter((id) => id !== currentId)
      const weaker = rng.pick(pool)
      return {
        title: x('event.ntSwitch.title'),
        text: x('event.ntSwitch.text', { current: `@nation.${currentId}`, other: `@nation.${weaker}` }),
        options: [
          {
            id: 'switch',
            label: x('event.ntSwitch.switch', { other: `@nation.${weaker}` }),
            hint: x('event.ntSwitch.switchHint'),
            tone: 'bold',
          },
          {
            id: 'wait',
            label: x('event.ntSwitch.wait', { current: `@nation.${currentId}` }),
            hint: x('event.ntSwitch.waitHint'),
            tone: 'risky',
          },
        ],
        payload: { weaker },
      }
    },
    apply: (ctx, optionId, payload) => {
      if (optionId === 'wait') {
        adjust(ctx.state, { morale: -2 })
        return x('event.ntSwitch.doneWait', { current: `@nation.${ctx.state.player.ntNationId}` })
      }
      ctx.state.player.ntNationId = String(payload.weaker)
      adjust(ctx.state, { morale: 6 })
      return x('event.ntSwitch.doneSwitch', { other: `@nation.${ctx.state.player.ntNationId}` })
    },
  },
  {
    key: 'ntRetire',
    stage: 'postseason',
    once: true,
    weight: 40,
    when: (ctx) => ctx.state.player.age >= 32 && ctx.state.totals.caps >= 25 && !ctx.state.player.retiredFromNT,
    build: (ctx) => ({
      title: x('event.ntRetire.title'),
      text: x('event.ntRetire.text', { caps: ctx.state.totals.caps }),
      options: [
        { id: 'retire', label: x('event.ntRetire.retire'), hint: x('event.ntRetire.retireHint'), tone: 'safe' },
        { id: 'stay', label: x('event.ntRetire.stay'), tone: 'bold' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'retire') {
        ctx.state.player.retiredFromNT = true
        adjust(ctx.state, { fitness: 7 })
        ctx.state.modifiers.injuryRisk *= 0.88
        return x('event.ntRetire.doneRetire')
      }
      adjust(ctx.state, { morale: 4 })
      return x('event.ntRetire.doneStay')
    },
  },
  {
    key: 'agent',
    stage: 'postseason',
    once: true,
    weight: 30,
    when: (ctx) => ctx.state.player.age >= 21 && ctx.ovr >= 72,
    build: () => ({
      title: x('event.agent.title'),
      text: x('event.agent.text'),
      options: [
        { id: 'hire', label: x('event.agent.hire'), hint: x('event.agent.hireHint'), tone: 'money' },
        { id: 'keep', label: x('event.agent.keep'), hint: x('event.agent.keepHint'), tone: 'safe' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'keep') {
        adjust(ctx.state, { morale: 3 })
        return x('event.agent.doneKeep')
      }
      adjust(ctx.state, { reputation: 7, morale: -2 })
      ctx.state.player.superAgent = true
      return x('event.agent.doneHire')
    },
  },
  {
    key: 'derby',
    stage: 'preseason',
    once: false,
    weight: 30,
    when: (ctx) => !!ctx.last && ctx.last.stats.apps >= 15,
    build: (ctx) => ({
      title: x('event.derby.title'),
      text: x('event.derby.text', { club: getClub(ctx.state.player.clubId).name }),
      options: [
        { id: 'embrace', label: x('event.derby.embrace'), hint: x('event.derby.embraceHint'), tone: 'bold' },
        { id: 'ignore', label: x('event.derby.ignore'), hint: x('event.derby.ignoreHint'), tone: 'safe' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'embrace') {
        adjust(ctx.state, { morale: 9, reputation: 5, form: 4 })
        ctx.state.modifiers.rating -= 0.04
        return x('event.derby.doneEmbrace')
      }
      adjust(ctx.state, { form: 2 })
      return x('event.derby.doneIgnore')
    },
  },
  {
    key: 'youthLeap',
    stage: 'preseason',
    once: true,
    weight: 70,
    when: (ctx) => ctx.state.player.age <= 19 && ctx.ovr >= 62,
    build: (ctx) => ({
      title: x('event.youthLeap.title'),
      text: x('event.youthLeap.text', { club: getClub(ctx.state.player.clubId).name }),
      options: [
        { id: 'push', label: x('event.youthLeap.push'), hint: x('event.youthLeap.pushHint'), tone: 'bold' },
        { id: 'filial', label: x('event.youthLeap.filial'), hint: x('event.youthLeap.filialHint'), tone: 'safe' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'push') {
        ctx.state.modifiers.minutes += 0.08
        ctx.state.modifiers.growth += 0.12
        adjust(ctx.state, { morale: 6 })
        return x('event.youthLeap.donePush')
      }
      ctx.state.modifiers.minutes += 0.28
      ctx.state.modifiers.growth += 0.2
      adjust(ctx.state, { reputation: -3 })
      return x('event.youthLeap.doneFilial')
    },
  },
  {
    key: 'charity',
    stage: 'postseason',
    once: true,
    weight: 25,
    when: (ctx) => ctx.state.player.age >= 24 && ctx.state.player.reputation >= 60,
    build: () => ({
      title: x('event.charity.title'),
      text: x('event.charity.text'),
      options: [
        { id: 'found', label: x('event.charity.found'), hint: x('event.charity.foundHint'), tone: 'safe' },
        { id: 'later', label: x('event.charity.later'), tone: 'safe' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'later') return x('event.charity.doneLater')
      adjust(ctx.state, { reputation: 10, morale: 8 })
      ctx.state.player.foundation = true
      return x('event.charity.doneFound')
    },
  },
  {
    key: 'slump',
    stage: 'preseason',
    once: false,
    weight: 35,
    when: (ctx) => !!ctx.last && ctx.last.stats.rating < 6.5 && ctx.last.stats.apps >= 12,
    build: () => ({
      title: x('event.slump.title'),
      text: x('event.slump.text'),
      options: [
        { id: 'psy', label: x('event.slump.psy'), hint: x('event.slump.psyHint'), tone: 'safe' },
        { id: 'grind', label: x('event.slump.grind'), hint: x('event.slump.grindHint'), tone: 'risky' },
        { id: 'reset', label: x('event.slump.reset'), hint: x('event.slump.resetHint'), tone: 'safe' },
      ],
    }),
    apply: (ctx, optionId) => {
      if (optionId === 'psy') {
        adjust(ctx.state, { form: 14, morale: 10 })
        ctx.state.modifiers.rating += 0.1
        return x('event.slump.donePsy')
      }
      if (optionId === 'grind') {
        adjust(ctx.state, { fitness: 9, form: 6, injuryProneness: 5 })
        ctx.state.modifiers.injuryRisk *= 1.2
        return x('event.slump.doneGrind')
      }
      adjust(ctx.state, { morale: 14, form: -5 })
      return x('event.slump.doneReset')
    },
  },
]

export const EVENT_BY_KEY = new Map(EVENTS.map((e) => [e.key, e]))

export function eventsFor(stage: 'preseason' | 'postseason', ctx: EventCtx): EventDef[] {
  return EVENTS.filter(
    (e) => e.stage === stage && !(e.once && ctx.state.seenEvents.includes(e.key)) && e.when(ctx),
  )
}

/** Construye la decisión concreta de un evento. */
export function buildDecision(def: EventDef, ctx: EventCtx, rng: Rng): Decision {
  const built = def.build(ctx, rng)
  return {
    id: `${def.key}_${ctx.state.seasonIndex}`,
    eventKey: def.key,
    title: built.title,
    text: built.text,
    options: built.options,
    payload: built.payload,
  }
}

/** Refresca la caché de ofertas que consumen los eventos de mercado. */
export function refreshMarket(state: CareerState, last: SeasonRecord | undefined, rng: Rng): void {
  const p = state.player
  const ovr = ovrOf(p.attrs, p.identity.position)
  // Volver de una cesión no genera mercado: primero regresas a tu club.
  if (!last || p.parentClubId) {
    state.pendingOffersCache = []
    state.pendingLoansCache = []
    return
  }

  state.pendingOffersCache = generateOffers(
    p,
    {
      ovr,
      seasonRating: last.stats.rating,
      seasonApps: last.stats.apps,
      goalsPlusAssists: last.stats.goals + last.stats.assists,
      currentRole: last.role,
      wantsOut: !!p.wantsOut,
      superAgent: !!p.superAgent,
    },
    rng,
  )

  const benched = last.role === 'bench' || last.role === 'youth'
  state.pendingLoansCache =
    benched && p.age <= 24 && state.pendingOffersCache.length === 0
      ? generateLoanOffers(p, ovr, rng)
      : []
}

export { EVENTS, POSITION_FOCUS, TRAINING_PLANS }
