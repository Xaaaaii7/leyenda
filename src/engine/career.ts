import { clubsOfLeague, getClub, getLeague, leagueTopPrestige } from '../data/clubs'
import { Rng, clamp } from './rng'
import {
  buildAttributes, developPlayer, marketValueOf, ovrOf, rollPotential, wageFor,
} from './player'
import {
  ROLE_MINUTES, clubFixtures, playerImpactOn, roleFor, rollInjuries,
  simulateAwards, simulateLeaguePosition, simulateStats, simulateTrophies,
} from './season'
import { simulateNationalSeason, tournamentTxt } from './national'
import { EVENT_BY_KEY, buildDecision, eventsFor, refreshMarket } from './events'
import type { EventCtx } from './events'
import { computeLegacy } from './legacy'
import type {
  CareerSetup, CareerState, CareerTotals, Decision, SeasonModifiers, SeasonRecord, Step, Txt,
} from './types'

/** Orden en el que se presentan los eventos dentro de una misma fase. */
const EVENT_ORDER: Record<string, number> = {
  academy: 0,
  rehab: 5,
  youthLeap: 8,
  training: 10,
  nutrition: 20,
  slump: 25,
  coachClash: 30,
  positionChange: 32,
  ntSwitch: 35,
  captaincy: 38,
  media: 42,
  sponsor: 45,
  derby: 48,
  renewal: 10,
  transfer: 20,
  loan: 21,
  goldenExit: 25,
  agent: 30,
  ntRetire: 35,
  charity: 40,
  retirementCall: 95,
}

/** Eventos que aparecen siempre que se cumplan sus condiciones. */
const ALWAYS = new Set([
  'academy', 'transfer', 'loan', 'renewal', 'retirementCall', 'rehab', 'training', 'youthLeap',
])

export const MAX_SEASONS = 24
export const RETIREMENT_HARD_AGE = 41

function emptyModifiers(): SeasonModifiers {
  return { minutes: 0, growth: 1, injuryRisk: 1, rating: 0, trainingFocus: [] }
}

function emptyTotals(): CareerTotals {
  return {
    apps: 0, goals: 0, assists: 0, minutes: 0, motm: 0, yellow: 0, red: 0, cleanSheets: 0,
    caps: 0, intlGoals: 0, clubs: [], trophies: [], awards: [], injuries: 0,
    peakOvr: 0, peakValue: 0, careerEarnings: 0,
  }
}

export function createCareer(setup: CareerSetup): CareerState {
  const rng = new Rng(setup.seed)
  const attrs = buildAttributes(setup.identity.position, setup.attributeBoosts, rng)
  const state: CareerState = {
    setup,
    player: {
      identity: { ...setup.identity },
      age: 16,
      attrs,
      potential: rollPotential(rng),
      form: 60,
      morale: 70,
      fitness: 82,
      injuryProneness: rng.int(20, 55),
      reputation: 25,
      clubId: '',
      contractYears: 3,
      wage: 0.05,
      marketValue: 0.3,
      captain: false,
      retiredFromNT: false,
      ntNationId: setup.identity.nationId,
    },
    phase: 'preseason',
    seasonIndex: 0,
    year: setup.startYear,
    history: [],
    totals: emptyTotals(),
    prepared: false,
    queue: [],
    pending: null,
    news: [],
    modifiers: emptyModifiers(),
    rngState: rng.state,
    seenEvents: [],
  }
  // El potencial nunca puede quedar por debajo de la media inicial.
  state.player.potential = Math.max(state.player.potential, ovrOf(attrs, setup.identity.position) + 4)
  return state
}

export function currentOvr(state: CareerState): number {
  return ovrOf(state.player.attrs, state.player.identity.position)
}

export function seasonLabel(year: number): string {
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

/** Avanza la carrera un paso. Si devuelve una decisión, hay que llamar a `choose`. */
export function step(state: CareerState): Step {
  if (state.pending) {
    return { kind: 'decision', decision: state.pending }
  }
  const rng = new Rng(state.rngState)
  try {
    return advance(state, rng)
  } finally {
    state.rngState = rng.state
  }
}

function advance(state: CareerState, rng: Rng): Step {
  if (state.news.length > 0) {
    const item = state.news.shift()!
    return { kind: 'news', ...item }
  }
  if (state.phase === 'done') {
    return { kind: 'retired', legacy: state.legacy ?? computeLegacy(state) }
  }

  if (state.phase === 'preseason') {
    if (!state.prepared) {
      prepareQueue(state, 'preseason', rng)
      state.prepared = true
    }
    const next = state.queue.shift()
    if (next) {
      state.pending = next
      return { kind: 'decision', decision: next }
    }
    state.phase = 'season'
    state.prepared = false
    return advance(state, rng)
  }

  if (state.phase === 'season') {
    const record = runSeason(state, rng)
    state.history.push(record)
    state.phase = 'postseason'
    state.prepared = false
    return { kind: 'season', record }
  }

  // postseason
  if (!state.prepared) {
    refreshMarket(state, state.history[state.history.length - 1], rng)
    prepareQueue(state, 'postseason', rng)
    state.prepared = true
  }
  const next = state.queue.shift()
  if (next) {
    state.pending = next
    return { kind: 'decision', decision: next }
  }
  const retired = endOfYear(state, rng)
  if (retired) {
    state.phase = 'done'
    state.legacy = computeLegacy(state)
    return { kind: 'retired', legacy: state.legacy }
  }
  state.phase = 'preseason'
  state.prepared = false
  return advance(state, rng)
}

/** Resuelve la decisión pendiente. */
export function choose(state: CareerState, optionId: string): void {
  const decision = state.pending
  if (!decision) throw new Error('No hay ninguna decisión pendiente')
  const def = EVENT_BY_KEY.get(decision.eventKey)
  state.pending = null
  if (!def) return
  const rng = new Rng(state.rngState)
  const ctx: EventCtx = {
    state,
    last: state.history[state.history.length - 1],
    ovr: currentOvr(state),
  }
  const summary = def.apply(ctx, optionId, decision.payload ?? {}, rng)
  state.rngState = rng.state
  if (def.once && !state.seenEvents.includes(def.key)) state.seenEvents.push(def.key)
  if (summary) state.news.push({ title: decision.title, text: summary })
}

function prepareQueue(state: CareerState, stage: 'preseason' | 'postseason', rng: Rng): void {
  const ctx: EventCtx = {
    state,
    last: state.history[state.history.length - 1],
    ovr: currentOvr(state),
  }
  // Antes de entrar en una cantera sólo tiene sentido la propia elección de cantera.
  const available = eventsFor(stage, ctx).filter(
    (e) => state.player.clubId !== '' || e.key === 'academy',
  )
  const forced = available.filter((e) => ALWAYS.has(e.key))
  const optional = available.filter((e) => !ALWAYS.has(e.key))

  const chosen = [...forced]
  // Uno o dos eventos de sabor por fase, elegidos por peso.
  const extras = rng.int(0, forced.length >= 2 ? 1 : 2)
  const pool = optional.slice()
  for (let i = 0; i < extras && pool.length > 0; i++) {
    const pickIt = rng.weighted(pool, (e) => e.weight)
    pool.splice(pool.indexOf(pickIt), 1)
    chosen.push(pickIt)
  }

  chosen.sort((a, b) => (EVENT_ORDER[a.key] ?? 50) - (EVENT_ORDER[b.key] ?? 50))
  const decisions: Decision[] = []
  for (const def of chosen) {
    // Las condiciones pueden haber cambiado por decisiones anteriores de la misma fase.
    if (!def.when(ctx)) continue
    decisions.push(buildDecision(def, ctx, rng))
    if (def.once && !state.seenEvents.includes(def.key)) state.seenEvents.push(def.key)
  }
  state.queue = decisions
}

/** ¿Juega el club competición continental esta temporada? */
function hasContinental(clubId: string): boolean {
  const club = getClub(clubId)
  const league = getLeague(club.leagueId)
  if (league.continental === 'NONE') return false
  const table = clubsOfLeague(club.leagueId)
  const rank = table.findIndex((c) => c.id === clubId) + 1
  return rank > 0 && rank <= Math.max(3, Math.round(table.length * 0.35))
}

function runSeason(state: CareerState, rng: Rng): SeasonRecord {
  const p = state.player
  const mods = state.modifiers
  const club = getClub(p.clubId)
  const league = getLeague(club.leagueId)
  const ovrStart = currentOvr(state)
  const season = seasonLabel(state.year)

  const baseRole = roleFor(ovrStart, club.prestige, p.form, p.age, rng)
  const injuries = rollInjuries(p, mods, rng)
  const injuryWeeks = injuries.reduce((a, i) => a + i.weeks, 0)
  const availability = clamp(1 - injuryWeeks / 42, 0.05, 1)

  const cont = hasContinental(p.clubId)
  const fixtures = clubFixtures(club.prestige, cont)
  const minutesShare = clamp(ROLE_MINUTES[baseRole] + mods.minutes, 0, 0.97)
  const minutes = fixtures * 90 * minutesShare * availability

  const stats = simulateStats(
    {
      position: p.identity.position,
      ovr: ovrStart,
      attrs: p.attrs,
      minutes,
      fixtures: Math.round(fixtures * availability),
      clubPrestige: club.prestige,
      leagueStrength: league.strength,
      form: p.form,
      ratingBonus: mods.rating,
    },
    rng,
  )

  const impact = playerImpactOn(baseRole, stats.rating, ovrStart, club.prestige)
  const { position: leaguePosition } = simulateLeaguePosition(p.clubId, impact, rng)
  const trophies = simulateTrophies(
    { clubId: p.clubId, season, leaguePosition, hadContinental: cont },
    rng,
  )
  const national = simulateNationalSeason(
    p,
    {
      ovr: ovrStart,
      seasonRating: stats.rating,
      seasonApps: stats.apps,
      startYear: state.year,
      injuredWeeks: injuryWeeks,
    },
    rng,
  )
  if (national.tournament?.result === 'winner') {
    trophies.push({
      kind: national.tournament.key === 'worldcup' ? 'worldcup' : 'continental',
      text: tournamentTxt(national.tournament),
      season,
    })
  }

  const awards = simulateAwards(
    {
      season,
      position: p.identity.position,
      ovr: ovrStart,
      age: p.age,
      stats,
      trophies,
      leagueStrength: league.strength,
      leagueId: league.id,
      reputation: p.reputation,
    },
    rng,
  )
  if (national.tournament && ['winner', 'final'].includes(national.tournament.result) && stats.rating >= 7.2 && rng.chance(0.25)) {
    awards.push({
      kind: 'tournamentMvp',
      text: { key: 'award.tournamentMvp', params: { tournament: tournamentTxt(national.tournament) } },
      season,
    })
  }

  // Un canterano que no juega con el primer equipo sigue compitiendo en el filial:
  // esos minutos no cuentan como partidos oficiales, pero sí le hacen crecer.
  const reserveShare = p.age <= 20 ? 0.58 : p.age <= 22 ? 0.38 : 0
  const developmentShare =
    baseRole === 'youth' || baseRole === 'bench'
      ? Math.max(minutesShare, reserveShare) * availability
      : minutesShare * availability

  developPlayer(
    p,
    {
      minutesShare: developmentShare,
      clubPrestige: club.prestige,
      leagueStrength: league.strength,
      growthMult: mods.growth,
      trainingFocus: mods.trainingFocus,
      injuryWeeks,
    },
    rng,
  )
  for (const inj of injuries) {
    if (inj.permanentLoss > 0) {
      p.attrs.pace = clamp(p.attrs.pace - inj.permanentLoss, 20, 99)
      p.attrs.physical = clamp(p.attrs.physical - inj.permanentLoss * 0.6, 20, 99)
      p.injuryProneness = clamp(p.injuryProneness + 6, 0, 100)
    }
  }

  const ovrEnd = currentOvr(state)

  // Estado anímico y físico de cara al año siguiente.
  const perfDelta = (stats.rating - 6.8) * 22 + (minutesShare - 0.5) * 26
  p.form = clamp(55 + perfDelta * 0.6 + rng.gauss(0, 6), 10, 98)
  p.morale = clamp(
    p.morale + perfDelta * 0.35 + trophies.length * 6 + awards.length * 5 - injuryWeeks * 0.5,
    5, 100,
  )
  p.fitness = clamp(p.fitness - (p.age >= 30 ? 3.5 : 1) - injuryWeeks * 0.35 + 2, 20, 100)
  p.reputation = clamp(
    p.reputation +
      (stats.goals + stats.assists) * 0.18 +
      trophies.length * 3 +
      awards.filter((a) => a.kind === 'ballon').length * 18 +
      awards.length * 2 +
      (league.strength - 65) * 0.05 -
      (stats.apps < 10 ? 4 : 0),
    5, 100,
  )
  p.marketValue = marketValueOf(p, league.strength)
  p.wage = Math.max(p.wage, wageFor(ovrEnd, club.prestige, p.age) * 0.85)

  const record: SeasonRecord = {
    index: state.seasonIndex,
    season,
    age: p.age,
    clubId: p.clubId,
    leagueId: league.id,
    onLoan: !!p.parentClubId,
    parentClubId: p.parentClubId,
    role: baseRole,
    stats,
    leaguePosition,
    trophies,
    awards,
    injuries,
    national,
    ovrStart,
    ovrEnd,
    marketValue: p.marketValue,
    wage: p.wage,
    highlights: buildHighlights(state, stats, trophies, awards, national, injuries, leaguePosition),
  }

  // Acumulados de carrera.
  const t = state.totals
  t.apps += stats.apps
  t.goals += stats.goals
  t.assists += stats.assists
  t.minutes += stats.minutes
  t.motm += stats.motm
  t.yellow += stats.yellow
  t.red += stats.red
  t.cleanSheets += stats.cleanSheets
  t.caps += national.caps
  t.intlGoals += national.goals
  t.trophies.push(...trophies)
  t.awards.push(...awards)
  t.injuries += injuries.length
  t.peakOvr = Math.max(t.peakOvr, ovrEnd)
  t.peakValue = Math.max(t.peakValue, p.marketValue)
  t.careerEarnings += p.wage
  if (!t.clubs.includes(p.clubId)) t.clubs.push(p.clubId)

  state.modifiers = emptyModifiers()
  return record
}

function buildHighlights(
  state: CareerState,
  stats: SeasonRecord['stats'],
  trophies: SeasonRecord['trophies'],
  awards: SeasonRecord['awards'],
  national: SeasonRecord['national'],
  injuries: SeasonRecord['injuries'],
  leaguePosition: number,
): Txt[] {
  const out: Txt[] = []
  const club = getClub(state.player.clubId)
  const league = getLeague(club.leagueId)

  if (stats.apps === 0) out.push({ key: 'highlight.blank' })
  else {
    out.push({
      key: 'highlight.season',
      params: { apps: stats.apps, club: club.name, position: leaguePosition, league: league.name },
    })
  }

  if (stats.goals >= 20) out.push({ key: 'highlight.goals', params: { goals: stats.goals } })
  if (stats.assists >= 12) out.push({ key: 'highlight.assists', params: { assists: stats.assists } })
  if (stats.rating >= 7.6) out.push({ key: 'highlight.rating', params: { rating: stats.rating.toFixed(2) } })
  if (stats.red > 0) out.push({ key: 'highlight.red' })
  for (const t of trophies) out.push({ key: 'highlight.trophy', params: { trophy: t.text } })
  for (const a of awards) out.push({ key: 'highlight.award', params: { award: a.text } })
  if (national.tournament) {
    out.push({
      key: 'highlight.tournament',
      params: {
        tournament: tournamentTxt(national.tournament),
        result: `@result.${national.tournament.result}`,
      },
    })
  } else if (national.caps > 0) {
    out.push({
      key: 'highlight.caps',
      params: { caps: national.caps, nation: `@nation.${state.player.ntNationId}` },
    })
  }
  const weeks = injuries.reduce((a, i) => a + i.weeks, 0)
  if (weeks > 0) out.push({ key: 'highlight.injured', params: { weeks } })
  return out
}

/** Cierra el año: contratos, cesiones, edad y retirada. Devuelve true si se retira. */
function endOfYear(state: CareerState, rng: Rng): boolean {
  const p = state.player

  // Vuelta de cesión.
  if (p.parentClubId) {
    p.clubId = p.parentClubId
    p.parentClubId = undefined
    state.news.push({
      title: { key: 'news.loanReturn.title' },
      text: { key: 'news.loanReturn.text', params: { club: getClub(p.clubId).name } },
    })
  }

  p.age += 1
  state.year += 1
  state.seasonIndex += 1
  p.contractYears = Math.max(0, p.contractYears - 1)
  p.wantsOut = false

  // Contrato acabado sin ofertas: el club te renueva a la baja o bajas de nivel.
  if (p.contractYears === 0) p.contractYears = 1

  const ovr = currentOvr(state)
  if (p.retiringNow) return true
  if (p.age >= RETIREMENT_HARD_AGE) return true
  if (state.seasonIndex >= MAX_SEASONS) return true
  if (p.age >= 34 && ovr < 60) return true
  if (p.age >= 36 && rng.chance(0.45)) return true
  if (p.age >= 33 && (state.history[state.history.length - 1]?.stats.apps ?? 0) < 5 && rng.chance(0.6)) return true
  return false
}

/** Corre la carrera entera tomando decisiones con una política dada (para tests y modo rápido). */
export function autoPlay(
  state: CareerState,
  policy: (d: Decision, s: CareerState) => string = (d) => d.options[0].id,
  maxSteps = 5000,
): Step[] {
  const steps: Step[] = []
  for (let i = 0; i < maxSteps; i++) {
    const s = step(state)
    steps.push(s)
    if (s.kind === 'retired') return steps
    if (s.kind === 'decision') choose(state, policy(s.decision, state))
  }
  throw new Error('autoPlay no terminó dentro del límite de pasos')
}

export { leagueTopPrestige }
