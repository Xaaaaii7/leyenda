import { getNation } from '../data/nations'
import { Rng, clamp } from './rng'
import type { Confederation, NationalSeason, PlayerState, TournamentResult, Txt } from './types'

/** Nombre del torneo como clave traducible: "Copa del Mundo 2030", "Eurocopa 2028"... */
export function tournamentTxt(t: { key: string; year: number; conf: Confederation }): Txt {
  return {
    key: t.key === 'worldcup' ? 'tournament.worldcup' : `tournament.continental.${t.conf}`,
    params: { year: t.year },
  }
}

/**
 * Torneo que se disputa al final de la temporada que empieza en `startYear`.
 * Mundial cada cuatro años; continental (Eurocopa, Copa América, Copa Oro,
 * CAN, Copa Asiática...) en los años pares intermedios.
 */
export function tournamentOf(
  startYear: number,
  conf: Confederation,
): { key: 'worldcup' | 'continental'; year: number; conf: Confederation } | null {
  const year = startYear + 1
  if (year % 4 === 2) return { key: 'worldcup', year, conf }
  if (year % 4 === 0) return { key: 'continental', year, conf }
  return null
}

/** Media mínima para entrar en la lista. Cuanto mejor la selección, más alto el listón. */
export function callUpBar(nationStrength: number): number {
  return 48 + nationStrength * 0.36
}

const RESULT_ORDER: TournamentResult[] = ['group', 'round16', 'quarter', 'semi', 'final', 'winner']

function simulateRun(nationStrength: number, playerBoost: number, rng: Rng): TournamentResult {
  // Puntuación de la selección + aportación del jugador, con mucho azar de eliminatoria.
  const score = (nationStrength - 55) / 40 + playerBoost + rng.gauss(0, 0.42)
  if (score > 1.55) return rng.chance(0.42) ? 'winner' : 'final'
  if (score > 1.15) return rng.chance(0.3) ? 'final' : 'semi'
  if (score > 0.8) return rng.chance(0.35) ? 'semi' : 'quarter'
  if (score > 0.45) return rng.chance(0.4) ? 'quarter' : 'round16'
  if (score > 0.1) return rng.chance(0.45) ? 'round16' : 'group'
  return 'group'
}

export function resultRank(result: TournamentResult): number {
  const i = RESULT_ORDER.indexOf(result)
  return i < 0 ? -1 : i
}

export interface NationalInput {
  ovr: number
  seasonRating: number
  seasonApps: number
  startYear: number
  injuredWeeks: number
}

export function simulateNationalSeason(
  player: PlayerState,
  input: NationalInput,
  rng: Rng,
): NationalSeason {
  const nation = getNation(player.ntNationId)
  const tournament = tournamentOf(input.startYear, nation.conf)
  const none: NationalSeason = { caps: 0, goals: 0 }

  if (player.retiredFromNT || player.age < 17) return none
  if (input.seasonApps < 8 || input.injuredWeeks > 22) return none

  const bar = callUpBar(nation.strength)
  // Rendir por encima de la media compensa unos puntos de OVR.
  const effective = input.ovr + (input.seasonRating - 6.8) * 4 + rng.gauss(0, 1.6)
  if (effective < bar) {
    return tournament ? { caps: 0, goals: 0, tournament: { ...tournament, result: 'notCalled' } } : none
  }

  const margin = clamp((effective - bar) / 12, 0, 1)
  let caps = rng.int(3, 6) + Math.round(margin * 5)
  const { position } = player.identity
  const goalRate = position === 'FW' ? 0.42 : position === 'MF' ? 0.18 : position === 'DF' ? 0.05 : 0
  let goals = 0
  for (let i = 0; i < caps; i++) if (rng.chance(goalRate * (0.6 + margin * 0.7))) goals++

  if (!tournament) return { caps, goals }

  // Clasificarse no está garantizado para las selecciones medianas.
  const qualifyOdds = clamp((nation.strength - 42) / 45, 0.08, 0.97)
  if (!rng.chance(qualifyOdds)) {
    return { caps, goals, tournament: { ...tournament, result: 'notQualified' } }
  }

  const playerBoost = clamp((input.ovr - bar) / 30, 0, 0.45) * (margin > 0.5 ? 1 : 0.6)
  const result = simulateRun(nation.strength, playerBoost, rng)
  const extraGames = 3 + resultRank(result)
  caps += extraGames
  for (let i = 0; i < extraGames; i++) if (rng.chance(goalRate * (0.6 + margin * 0.8))) goals++

  return { caps, goals, tournament: { ...tournament, result } }
}

