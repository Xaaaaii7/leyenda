import { CLUBS, clubsOfNation, getClub, getLeague } from '../data/clubs'
import { getNation } from '../data/nations'
import { Rng, clamp } from './rng'
import { wageFor } from './player'
import type { Club, PlayerState, SquadRole } from './types'

export interface Offer {
  clubId: string
  /** Millones de € de traspaso (0 si es agente libre o cesión). */
  fee: number
  /** Salario anual ofrecido, en millones. */
  wage: number
  /** Rol prometido por el club. */
  promise: SquadRole
  loan: boolean
  years: number
}

/** Prestigio de club en el que el jugador sería titular indiscutible. */
export function comfortPrestige(ovr: number): number {
  return clamp((ovr - 13) / 0.78, 30, 96)
}

/** Contexto geográfico del jugador: de dónde es y dónde juega ahora. */
interface Roots {
  nationId: string
  conf: string
  currentLeagueId: string
  currentNationId: string
  currentStrength: number
  age: number
}

function rootsOf(player: PlayerState): Roots {
  const nation = getNation(player.identity.nationId)
  const league = player.clubId ? getLeague(getClub(player.clubId).leagueId) : null
  return {
    nationId: nation.id,
    conf: nation.conf,
    currentLeagueId: league?.id ?? '',
    currentNationId: league?.nationId ?? nation.id,
    currentStrength: league?.strength ?? 60,
    age: player.age,
  }
}

/**
 * Cuánto de plausible es que ese club en concreto llame. El fútbol es global,
 * pero no uniforme: la mayoría de los movimientos son dentro del mismo país o
 * continente, y a un chaval de dieciocho años no lo fichan de la otra punta del
 * mundo. Sin esto, un canterano español acaba en la liga india a los diecisiete.
 */
function geographyFactor(club: Club, roots: Roots): number {
  const league = getLeague(club.leagueId)
  if (league.id === roots.currentLeagueId) return 1.7
  if (league.nationId === roots.currentNationId) return 1.5
  if (league.nationId === roots.nationId) return 1.3
  const sameConf = getNation(league.nationId).conf === roots.conf
  // Salir del continente es raro, y más cuanto más joven es el jugador.
  const abroad = roots.age <= 20 ? 0.12 : roots.age <= 23 ? 0.3 : 0.55
  return sameConf ? 1 : abroad
}

/** Nadie da un paso atrás grande de nivel de competición sin un motivo. */
function stepDownFactor(club: Club, roots: Roots): number {
  const drop = roots.currentStrength - getLeague(club.leagueId).strength
  if (drop <= 6) return 1
  return clamp(1 - (drop - 6) / 40, 0.15, 1)
}

function offerWeight(club: Club, target: number, ambition: number, roots: Roots): number {
  const diff = club.prestige - target
  // Los clubes por debajo del nivel del jugador pierden interés para él;
  // los muy por encima raramente llaman.
  if (diff > ambition) return 0
  if (diff < -22) return 0
  const closeness = 1 - Math.abs(diff - ambition * 0.35) / 26
  return (
    Math.max(0.02, closeness) *
    (0.6 + getLeague(club.leagueId).strength / 160) *
    geographyFactor(club, roots) *
    stepDownFactor(club, roots)
  )
}

export interface OfferContext {
  ovr: number
  seasonRating: number
  seasonApps: number
  goalsPlusAssists: number
  currentRole: SquadRole
  wantsOut: boolean
  /** Representado por un superagente: mueve más el teléfono cada verano. */
  superAgent: boolean
}

/** Genera las ofertas de mercado del verano. Puede devolver lista vacía. */
export function generateOffers(player: PlayerState, ctx: OfferContext, rng: Rng): Offer[] {
  const target = comfortPrestige(ctx.ovr)
  const roots = rootsOf(player)

  // Una gran temporada, juventud y fama amplían el techo de clubes interesados.
  const ambition =
    clamp((ctx.seasonRating - 6.8) * 9, -6, 12) +
    (player.age <= 23 ? 5 : player.age <= 27 ? 2 : player.age >= 32 ? -8 : 0) +
    (player.reputation - 55) * 0.09 +
    clamp(ctx.goalsPlusAssists * 0.22, 0, 7)

  const interest =
    clamp(0.22 + (ctx.seasonRating - 6.7) * 0.55 + (ctx.seasonApps > 22 ? 0.18 : -0.15), 0.03, 0.95) *
    (player.contractYears <= 1 ? 1.4 : 1) *
    (ctx.wantsOut ? 1.35 : 1) *
    (ctx.superAgent ? 1.3 : 1)

  if (!rng.chance(interest)) return []

  const pool = CLUBS.filter((c) => c.id !== player.clubId && offerWeight(c, target, ambition, roots) > 0)
  if (pool.length === 0) return []

  const count = clamp(
    1 + Math.round(rng.float(0, 2.2) + (ctx.seasonRating - 7) * 2 + (ctx.superAgent ? 0.6 : 0)),
    1, 3,
  )
  const offers: Offer[] = []
  const taken = new Set<string>()
  for (let i = 0; i < count; i++) {
    const club = rng.weighted(pool, (c) => (taken.has(c.id) ? 0 : offerWeight(c, target, ambition, roots)))
    if (taken.has(club.id)) continue
    taken.add(club.id)
    offers.push(buildOffer(player, club, ctx.ovr, false, rng))
  }
  // Ordena de mayor a menor prestigio para que la mejor oferta salga primero.
  return offers.sort((a, b) => getClub(b.clubId).prestige - getClub(a.clubId).prestige)
}

/** Cesión: aparece cuando un joven no juega en un club grande. */
export function generateLoanOffers(player: PlayerState, ovr: number, rng: Rng): Offer[] {
  const target = comfortPrestige(ovr) + 4
  const roots = rootsOf(player)
  const pool = CLUBS.filter(
    (c) => c.id !== player.clubId && c.prestige <= target && c.prestige >= target - 22,
  )
  if (pool.length === 0) return []
  // Una cesión busca minutos cerca de casa, no una aventura al otro hemisferio.
  const picks: Club[] = []
  for (let i = 0; i < 2 && picks.length < 2; i++) {
    const c = rng.weighted(pool, (x) =>
      picks.some((p) => p.id === x.id) ? 0 : geographyFactor(x, roots),
    )
    if (!picks.some((p) => p.id === c.id)) picks.push(c)
  }
  return picks.map((c) => buildOffer(player, c, ovr, true, rng))
}

function buildOffer(player: PlayerState, club: Club, ovr: number, loan: boolean, rng: Rng): Offer {
  const promise: SquadRole =
    ovr > club.prestige * 0.78 + 20 ? 'star' :
    ovr > club.prestige * 0.78 + 13 ? 'starter' : 'rotation'
  const wage = Math.round(wageFor(ovr, club.prestige, player.age) * rng.float(0.9, 1.3) * 100) / 100
  const fee = loan ? 0 : Math.round(player.marketValue * rng.float(0.75, 1.6) * 10) / 10
  const years = loan ? 1 : player.age >= 32 ? rng.int(1, 2) : rng.int(3, 5)
  return { clubId: club.id, fee, wage, promise, loan, years }
}

/**
 * Tres ofertas de cantera al empezar: una del club grande del país, una intermedia
 * y una modesta. Si el país no tiene clubes en el dataset, se busca en su confederación.
 */
export function academyOffers(nationId: string, rng: Rng): Offer[] {
  let pool = clubsOfNation(nationId)
  if (pool.length < 3) {
    const conf = getNation(nationId).conf
    pool = CLUBS.filter((c) => getNation(getLeague(c.leagueId).nationId).conf === conf)
  }
  if (pool.length < 3) pool = CLUBS.slice()

  const sorted = pool.slice().sort((a, b) => b.prestige - a.prestige)
  const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.25)))
  const mid = sorted.slice(Math.floor(sorted.length * 0.3), Math.ceil(sorted.length * 0.7))
  const low = sorted.slice(Math.floor(sorted.length * 0.65))

  const chosen: Club[] = []
  const takeFrom = (arr: Club[]) => {
    const candidates = arr.filter((c) => !chosen.some((x) => x.id === c.id))
    if (candidates.length) chosen.push(rng.pick(candidates))
  }
  takeFrom(top)
  takeFrom(mid.length ? mid : sorted)
  takeFrom(low.length ? low : sorted)
  while (chosen.length < 3 && chosen.length < sorted.length) takeFrom(sorted)

  return chosen.map((club) => ({
    clubId: club.id,
    fee: 0,
    wage: Math.round(wageFor(50, club.prestige, 16) * 100) / 100,
    promise: 'youth' as SquadRole,
    loan: false,
    years: 3,
  }))
}
