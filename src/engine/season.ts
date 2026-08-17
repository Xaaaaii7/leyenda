import { clubsOfLeague, getClub, getLeague } from '../data/clubs'
import { Rng, clamp, lerpClamped } from './rng'
import { ovrOf } from './player'
import type {
  Award, Injury, PlayerState, Position, SeasonModifiers, SeasonStats, SquadRole, Trophy, Txt,
} from './types'

/** Partidos de club en una temporada, según nivel del equipo. */
export function clubFixtures(prestige: number, hasContinental: boolean): number {
  const league = 34
  const cup = prestige > 70 ? 5 : 3
  const cont = hasContinental ? (prestige > 82 ? 11 : 7) : 0
  return league + cup + cont
}

const ROLE_MINUTES: Record<SquadRole, number> = {
  star: 0.90,
  starter: 0.76,
  rotation: 0.50,
  bench: 0.22,
  youth: 0.05,
}

/**
 * Compara al jugador con la exigencia del club. Un club de prestigio 90 pide
 * ~82 de media para ser titular indiscutible; uno de 55 se conforma con ~60.
 */
export function roleFor(
  ovr: number,
  clubPrestige: number,
  form: number,
  age: number,
  rng: Rng,
): SquadRole {
  const demand = clubPrestige * 0.78 + 12
  // La forma y la veteranía inclinan la balanza; los muy jóvenes tienen menos crédito.
  const youthPenalty = age <= 17 ? 7 : age <= 19 ? 3 : 0
  const gap = ovr - demand + (form - 50) * 0.09 - youthPenalty + rng.gauss(0, 2.4)
  if (gap > 7) return 'star'
  if (gap > 1) return 'starter'
  if (gap > -6) return 'rotation'
  if (gap > -14) return 'bench'
  return 'youth'
}

const INJURY_TYPES: { key: string; min: number; max: number; weight: number }[] = [
  { key: 'muscle', min: 2, max: 5, weight: 30 },
  { key: 'hamstring', min: 3, max: 8, weight: 24 },
  { key: 'ankle', min: 3, max: 10, weight: 18 },
  { key: 'groin', min: 3, max: 7, weight: 12 },
  { key: 'concussion', min: 1, max: 3, weight: 6 },
  { key: 'metatarsal', min: 8, max: 16, weight: 6 },
  { key: 'shoulder', min: 6, max: 14, weight: 4 },
  { key: 'knee', min: 10, max: 22, weight: 5 },
  { key: 'acl', min: 26, max: 44, weight: 3 },
]

export function rollInjuries(player: PlayerState, mods: SeasonModifiers, rng: Rng): Injury[] {
  const ageRisk = player.age >= 32 ? 0.14 : player.age >= 29 ? 0.07 : player.age <= 18 ? 0.03 : 0
  const fitnessRisk = (100 - player.fitness) / 340
  const base = 0.20 + player.injuryProneness / 260 + ageRisk + fitnessRisk
  const p = clamp(base * mods.injuryRisk, 0.03, 0.85)

  const injuries: Injury[] = []
  let attempts = 0
  let chance = p
  // Una lesión abre la puerta a recaídas, con probabilidad decreciente.
  while (attempts < 3 && rng.chance(chance)) {
    const type = rng.weighted(INJURY_TYPES, (t) => t.weight)
    const weeks = rng.int(type.min, type.max)
    const permanentLoss = weeks >= 24 ? rng.float(1.2, 3.0) : weeks >= 12 ? rng.float(0.2, 1.0) : 0
    injuries.push({ key: type.key, weeks, permanentLoss })
    chance *= 0.35
    attempts++
  }
  return injuries
}

interface StatsInput {
  position: Position
  ovr: number
  attrs: PlayerState['attrs']
  minutes: number
  fixtures: number
  clubPrestige: number
  leagueStrength: number
  form: number
  ratingBonus: number
}

/** Producción ofensiva por 90 minutos, ajustada por posición y calidad del equipo. */
function per90(input: StatsInput): { goals: number; assists: number } {
  const { attrs, position, clubPrestige, leagueStrength } = input
  const finishing = attrs.shooting * 0.62 + attrs.dribbling * 0.23 + attrs.pace * 0.15
  const creation = attrs.passing * 0.62 + attrs.dribbling * 0.26 + attrs.pace * 0.12

  const goalCoef: Record<Position, number> = { FW: 1.0, MF: 0.42, DF: 0.11, GK: 0.001 }
  const assistCoef: Record<Position, number> = { FW: 0.45, MF: 0.9, DF: 0.32, GK: 0.01 }

  // Jugar en un equipo dominante multiplica las ocasiones; una liga fuerte las frena.
  const teamMult = 0.62 + (clubPrestige / 100) * 0.72
  const leagueMult = 1.22 - (leagueStrength / 100) * 0.32

  const goals = clamp((finishing - 44) / 72, 0, 1) * 0.82 * goalCoef[position] * teamMult * leagueMult
  const assists = clamp((creation - 44) / 74, 0, 1) * 0.52 * assistCoef[position] * teamMult * leagueMult
  return { goals, assists }
}

export function simulateStats(input: StatsInput, rng: Rng): SeasonStats {
  const { minutes, position } = input
  const nineties = minutes / 90
  const rates = per90(input)
  const formMult = 0.76 + (input.form / 100) * 0.5

  const goals = Math.max(0, Math.round(rates.goals * nineties * formMult * rng.float(0.72, 1.28)))
  const assists = Math.max(0, Math.round(rates.assists * nineties * formMult * rng.float(0.72, 1.28)))

  const apps = Math.min(input.fixtures, Math.max(0, Math.round(minutes / rng.float(62, 88))))

  // Nota media: parte del nivel relativo y sube con la producción y los minutos.
  const levelPart = lerpClamped(input.ovr - input.clubPrestige * 0.8, -18, 14, -0.55, 0.85)
  const outputPart = nineties > 0 ? clamp(((goals + assists * 0.8) / Math.max(nineties, 1)) * 0.9, 0, 0.9) : 0
  const defPart = position === 'GK' || position === 'DF' ? lerpClamped(input.attrs.defending, 55, 92, 0, 0.35) : 0
  const rating = clamp(
    6.35 + levelPart + outputPart + defPart + input.ratingBonus + rng.gauss(0, 0.14),
    4.5, 9.6,
  )

  const motm = Math.max(0, Math.round(apps * clamp((rating - 6.7) * 0.42, 0, 0.35) * rng.float(0.6, 1.4)))
  const aggression = position === 'DF' ? 1.5 : position === 'MF' ? 1.2 : position === 'FW' ? 0.7 : 0.25
  const yellow = Math.max(0, Math.round(apps * 0.11 * aggression * rng.float(0.5, 1.6)))
  const red = rng.chance(clamp(apps * 0.004 * aggression, 0, 0.35)) ? 1 : 0

  let cleanSheets = 0
  let conceded = 0
  if (position === 'GK' && apps > 0) {
    const solidity = clamp((input.ovr * 0.55 + input.clubPrestige * 0.45 - 50) / 45, 0, 1)
    const csRate = 0.12 + solidity * 0.42
    cleanSheets = Math.round(apps * csRate * rng.float(0.75, 1.25))
    conceded = Math.max(0, Math.round(apps * (1.9 - solidity * 1.25) * rng.float(0.8, 1.2)))
  }

  return {
    apps,
    minutes: Math.round(minutes),
    goals,
    assists,
    rating: Math.round(rating * 100) / 100,
    motm,
    yellow,
    red,
    cleanSheets,
    conceded,
  }
}

/** Puesto final del equipo en liga, con el jugador influyendo algo si es estrella. */
export function simulateLeaguePosition(
  clubId: string,
  playerImpact: number,
  rng: Rng,
): { position: number; teams: number } {
  const club = getClub(clubId)
  const table = clubsOfLeague(club.leagueId)
  const teams = Math.max(table.length, 18)
  const rank = Math.max(1, table.findIndex((x) => x.id === clubId) + 1)
  // Los clubes fuera del dataset de esa liga rellenan la parte baja de la tabla.
  const expected = rank + (teams - table.length) * 0.5
  const pos = Math.round(expected + rng.gauss(0, 2.3) - playerImpact)
  return { position: clamp(pos, 1, teams), teams }
}

/** Impacto del jugador en la clasificación (0-2.5 puestos). */
export function playerImpactOn(role: SquadRole, rating: number, ovr: number, prestige: number): number {
  if (role === 'youth' || role === 'bench') return 0
  const quality = clamp((ovr - prestige * 0.8 - 8) / 12, 0, 1)
  const perf = clamp((rating - 6.6) / 1.4, 0, 1)
  return quality * perf * 2.5
}

export interface TrophyContext {
  clubId: string
  season: string
  leaguePosition: number
  hadContinental: boolean
}

export function simulateTrophies(ctx: TrophyContext, rng: Rng): Trophy[] {
  const club = getClub(ctx.clubId)
  const league = getLeague(club.leagueId)
  const out: Trophy[] = []
  const add = (kind: Trophy['kind'], params?: Txt['params']) =>
    out.push({ kind, text: { key: `trophy.${kind}`, params }, season: ctx.season })

  if (ctx.leaguePosition === 1) {
    if (league.tier === 2) add('promotion', { club: club.name })
    else add('league', { league: league.name })
  } else if (league.tier === 2 && ctx.leaguePosition <= 3 && rng.chance(0.4)) {
    add('promotion', { club: club.name })
  }

  // Copa nacional: la fuerza del club manda, pero el formato es una lotería.
  if (rng.chance(clamp((club.prestige - 52) / 130, 0.02, 0.34))) {
    add('cup', { nation: `@nation.${league.nationId}` })
  }

  if (ctx.hadContinental) {
    if (league.continental === 'UCL') {
      if (club.prestige >= 82 && rng.chance((club.prestige - 80) / 105)) add('ucl')
      else if (club.prestige >= 66 && rng.chance((club.prestige - 62) / 190)) add('europa')
    } else if (league.continental === 'LIB' && rng.chance(clamp((club.prestige - 66) / 130, 0, 0.2))) {
      add('lib')
    } else if (league.continental === 'CAF' && rng.chance(clamp((club.prestige - 52) / 110, 0, 0.22))) {
      add('caf')
    } else if (league.continental === 'AFC' && rng.chance(clamp((club.prestige - 60) / 120, 0, 0.22))) {
      add('afc')
    } else if (league.continental === 'CONCACAF' && rng.chance(clamp((club.prestige - 58) / 110, 0, 0.22))) {
      add('concacaf')
    }
  }

  if (out.some((t) => t.kind === 'league' || t.kind === 'cup') && rng.chance(0.45)) {
    add('supercup')
  }
  if (out.some((t) => ['ucl', 'lib', 'caf', 'afc', 'concacaf'].includes(t.kind)) && rng.chance(0.4)) {
    add('clubwc')
  }
  return out
}

export interface AwardContext {
  season: string
  position: Position
  ovr: number
  age: number
  stats: SeasonStats
  trophies: Trophy[]
  leagueStrength: number
  leagueId: string
  reputation: number
}

export function simulateAwards(ctx: AwardContext, rng: Rng): Award[] {
  const out: Award[] = []
  const add = (kind: Award['kind']) =>
    out.push({ kind, text: { key: `award.${kind}` }, season: ctx.season })
  const { stats } = ctx
  if (stats.apps < 12) return out

  const bigTrophy = ctx.trophies.some((t) => ['league', 'ucl', 'lib', 'clubwc'].includes(t.kind))
  const contribution = stats.goals + stats.assists * 0.75

  // Pichichi: el listón sube con el nivel de la liga.
  const scorerBar = 15 + (ctx.leagueStrength - 55) * 0.28
  if (ctx.position !== 'GK' && stats.goals >= scorerBar) {
    const edge = clamp((stats.goals - scorerBar) / 14, 0, 1)
    if (rng.chance(0.18 + edge * 0.65)) add('leagueTopScorer')
  }

  if (ctx.position === 'GK' && stats.cleanSheets >= 12 && rng.chance(clamp((stats.cleanSheets - 10) / 22, 0, 0.6))) {
    add('goldenGlove')
  }

  const totyBar = 7.25 + (ctx.leagueStrength - 70) * 0.006
  if (stats.rating >= totyBar && rng.chance(clamp((stats.rating - totyBar) * 1.6 + 0.15, 0, 0.75))) {
    add('teamOfTheYear')
  }

  if (stats.rating >= 7.4 && ctx.ovr >= 82 && rng.chance(clamp((stats.rating - 7.3) * 1.3, 0, 0.55))) {
    add('leagueMvp')
  }

  if (ctx.age <= 21 && ctx.ovr >= 76 && stats.rating >= 7.1 && rng.chance(0.25)) {
    add('goldenboy')
  }

  if (stats.goals >= 8 && rng.chance(0.06)) add('puskas')

  // Balón de Oro: hace falta nivel, números, un título grande y algo de suerte.
  if (ctx.ovr >= 87 && ctx.leagueStrength >= 78 && bigTrophy && contribution >= 24 && stats.rating >= 7.55) {
    const score =
      (ctx.ovr - 86) * 0.08 +
      (contribution - 20) * 0.012 +
      (stats.rating - 7.4) * 0.5 +
      (ctx.trophies.some((t) => t.kind === 'ucl') ? 0.22 : 0) +
      (ctx.reputation - 70) * 0.004
    if (rng.chance(clamp(score, 0, 0.62))) add('ballon')
  }
  return out
}

export function ratingOf(player: PlayerState): number {
  return ovrOf(player.attrs, player.identity.position)
}

export { ROLE_MINUTES }
