import { ATTRIBUTE_KEYS } from './types'
import type { Attributes, AttributeKey, PlayerState, Position } from './types'
import { Rng, clamp } from './rng'

/** Pesos con los que cada posición calcula su media (OVR). */
const OVR_WEIGHTS: Record<Position, Attributes> = {
  GK: { pace: 0.05, shooting: 0.05, passing: 0.10, dribbling: 0.05, defending: 0.45, physical: 0.30 },
  DF: { pace: 0.15, shooting: 0.03, passing: 0.14, dribbling: 0.06, defending: 0.38, physical: 0.24 },
  MF: { pace: 0.12, shooting: 0.14, passing: 0.30, dribbling: 0.22, defending: 0.12, physical: 0.10 },
  FW: { pace: 0.22, shooting: 0.34, passing: 0.10, dribbling: 0.24, defending: 0.02, physical: 0.08 },
}

/** Reparto base de un canterano de 16 años (media ~50). */
const BASE_ATTRS: Record<Position, Attributes> = {
  GK: { pace: 38, shooting: 30, passing: 45, dribbling: 34, defending: 54, physical: 52 },
  DF: { pace: 52, shooting: 34, passing: 47, dribbling: 42, defending: 55, physical: 53 },
  MF: { pace: 50, shooting: 47, passing: 55, dribbling: 52, defending: 44, physical: 45 },
  FW: { pace: 56, shooting: 55, passing: 43, dribbling: 54, defending: 28, physical: 45 },
}

/** Cuánto crece cada atributo con la edad respecto al resto (0-1). */
const GROWTH_BIAS: Record<Position, Attributes> = {
  GK: { pace: 0.3, shooting: 0.3, passing: 0.8, dribbling: 0.4, defending: 1.0, physical: 0.9 },
  DF: { pace: 0.7, shooting: 0.4, passing: 0.8, dribbling: 0.6, defending: 1.0, physical: 0.9 },
  MF: { pace: 0.6, shooting: 0.9, passing: 1.0, dribbling: 0.95, defending: 0.7, physical: 0.7 },
  FW: { pace: 0.8, shooting: 1.0, passing: 0.7, dribbling: 0.95, defending: 0.3, physical: 0.7 },
}

/** Cuánto se deteriora cada atributo a partir de los 30. */
const DECLINE_BIAS: Attributes = {
  pace: 1.6, shooting: 0.35, passing: 0.05, dribbling: 0.8, defending: 0.3, physical: 1.2,
}

export function ovrOf(attrs: Attributes, position: Position): number {
  const w = OVR_WEIGHTS[position]
  let sum = 0
  for (const k of ATTRIBUTE_KEYS) sum += attrs[k] * w[k]
  return Math.round(sum)
}

/** Puntos que el usuario reparte al crear el jugador. */
export const CREATION_POINTS = 12
/** Tope de puntos que se pueden meter en un mismo atributo. */
export const MAX_BOOST_PER_ATTR = 6

export function buildAttributes(
  position: Position,
  boosts: Partial<Record<AttributeKey, number>>,
  rng: Rng,
): Attributes {
  const base = { ...BASE_ATTRS[position] }
  for (const k of ATTRIBUTE_KEYS) {
    const boost = clamp(boosts[k] ?? 0, 0, MAX_BOOST_PER_ATTR)
    base[k] = clamp(Math.round(base[k] + boost * 1.4 + rng.gauss(0, 2)), 20, 75)
  }
  return base
}

/**
 * Potencial: la mayoría de canteranos se queda entre 62 y 78; el techo de
 * crack (88+) es raro, y el reparto ofensivo del usuario no lo condiciona.
 */
export function rollPotential(rng: Rng): number {
  const roll = rng.next()
  if (roll < 0.02) return rng.int(90, 95) // generacional
  if (roll < 0.10) return rng.int(84, 89) // crack
  if (roll < 0.28) return rng.int(78, 83) // muy bueno
  if (roll < 0.60) return rng.int(70, 77) // titular de primera
  if (roll < 0.85) return rng.int(63, 69) // profesional solvente
  return rng.int(55, 62) // se queda por el camino
}

/** Ritmo de desarrollo por edad: explosivo hasta los 21, plano a los 27, declive a los 31. */
export function growthFactor(age: number): number {
  if (age <= 18) return 1.0
  if (age <= 21) return 0.85
  if (age <= 24) return 0.6
  if (age <= 26) return 0.35
  if (age <= 28) return 0.18
  if (age <= 30) return 0.06
  return 0
}

export function declineFactor(age: number): number {
  if (age <= 29) return 0
  if (age <= 31) return 0.35
  if (age <= 33) return 0.9
  if (age <= 35) return 1.6
  return 2.4
}

export interface DevelopmentInput {
  minutesShare: number
  clubPrestige: number
  leagueStrength: number
  growthMult: number
  trainingFocus: AttributeKey[]
  injuryWeeks: number
}

/** Evoluciona los atributos una temporada. Devuelve el delta de OVR. */
export function developPlayer(player: PlayerState, input: DevelopmentInput, rng: Rng): number {
  const { position } = player.identity
  const before = ovrOf(player.attrs, position)
  const headroom = Math.max(0, player.potential - before)

  // Jugar es lo que hace crecer: sin minutos el desarrollo se estanca.
  const minutesEffect = 0.35 + 1.0 * clamp(input.minutesShare, 0, 1)
  // Entrenar en un grande y competir en una liga fuerte acelera de verdad:
  // mejores entrenadores, mejores compañeros y más exigencia diaria.
  const environment = 0.70 + (input.clubPrestige / 100) * 0.50 + (input.leagueStrength / 100) * 0.30
  const injuryPenalty = clamp(1 - input.injuryWeeks / 45, 0.35, 1)

  const gain =
    headroom * 0.28 * growthFactor(player.age) * minutesEffect * environment *
    input.growthMult * injuryPenalty * rng.float(0.75, 1.25)

  const loss = declineFactor(player.age) * rng.float(0.7, 1.35)

  const bias = GROWTH_BIAS[position]
  const biasTotal = ATTRIBUTE_KEYS.reduce((a, k) => a + bias[k], 0)
  const declineTotal = ATTRIBUTE_KEYS.reduce((a, k) => a + DECLINE_BIAS[k], 0)

  for (const k of ATTRIBUTE_KEYS) {
    const focusMult = input.trainingFocus.includes(k) ? 1.9 : 0.82
    const up = gain * ((bias[k] / biasTotal) * ATTRIBUTE_KEYS.length) * focusMult
    const down = loss * ((DECLINE_BIAS[k] / declineTotal) * ATTRIBUTE_KEYS.length)
    player.attrs[k] = clamp(player.attrs[k] + up - down, 20, 99)
  }

  // El potencial no es un muro absoluto: un año excepcional puede subirlo algo.
  if (input.minutesShare > 0.7 && rng.chance(0.12)) {
    player.potential = Math.min(97, player.potential + rng.int(1, 3))
  }

  return ovrOf(player.attrs, position) - before
}

/** Valor de mercado en millones de €. */
export function marketValueOf(player: PlayerState, leagueStrength: number): number {
  const ovr = ovrOf(player.attrs, player.identity.position)
  const base = Math.pow(1.19, ovr - 50) * 0.45
  const ageMult =
    player.age <= 19 ? 1.25 :
    player.age <= 23 ? 1.35 :
    player.age <= 27 ? 1.15 :
    player.age <= 29 ? 0.85 :
    player.age <= 31 ? 0.55 :
    player.age <= 33 ? 0.3 : 0.12
  const potentialMult = 1 + clamp(player.potential - ovr, 0, 25) / 90
  const leagueMult = 0.75 + (leagueStrength / 100) * 0.45
  const formMult = 0.85 + (player.form / 100) * 0.3
  const gkMult = player.identity.position === 'GK' ? 0.62 : 1
  const value = base * ageMult * potentialMult * leagueMult * formMult * gkMult
  return Math.max(0.05, Math.round(value * 10) / 10)
}

/** Salario anual en millones, según club y nivel. */
export function wageFor(ovr: number, clubPrestige: number, age: number): number {
  const base = Math.pow(1.16, ovr - 50) * 0.12
  const clubMult = 0.4 + (clubPrestige / 100) * 1.4
  const youthMult = age < 20 ? 0.35 : age < 23 ? 0.7 : 1
  return Math.max(0.02, Math.round(base * clubMult * youthMult * 100) / 100)
}

/** Etiqueta de forma para la UI. */
export function formLabel(form: number): 'ice' | 'cold' | 'ok' | 'hot' | 'fire' {
  if (form < 30) return 'ice'
  if (form < 45) return 'cold'
  if (form < 65) return 'ok'
  if (form < 82) return 'hot'
  return 'fire'
}

export { OVR_WEIGHTS, BASE_ATTRS }
