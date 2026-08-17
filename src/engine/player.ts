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
 * Potencial de partida. No es un muro: `developPlayer` lo empuja hacia arriba
 * cuando el jugador firma temporadas grandes al máximo nivel, así que el 99 se
 * alcanza jugando, no naciendo. Aquí sólo se decide con cuánto margen empiezas.
 */
export function rollPotential(rng: Rng): number {
  const roll = rng.next()
  if (roll < 0.02) return rng.int(91, 95) // generacional
  if (roll < 0.13) return rng.int(85, 90) // crack
  if (roll < 0.40) return rng.int(81, 84) // muy bueno
  if (roll < 0.70) return rng.int(76, 80) // titular de primera
  if (roll < 0.90) return rng.int(69, 75) // profesional solvente
  return rng.int(62, 68) // se queda por el camino
}

/** Techo absoluto de la media. */
export const MAX_OVR = 99
/** Tope de puntos de media que se pueden ganar en una sola temporada. */
export const MAX_SEASON_GAIN = 9
/** Ritmo base de mejora, en puntos de media por temporada. */
const BASE_GAIN = 4.6

/**
 * Ritmo de desarrollo por edad. El crecimiento es *absoluto*, no proporcional al
 * margen que queda: se mejora unos cuatro o cinco puntos por temporada mientras
 * se es joven, igual que en el juego de referencia. Lo que decide el potencial no
 * es la velocidad de mejora, sino cuántos años seguirás mejorando.
 */
export function growthFactor(age: number): number {
  if (age <= 18) return 1.05
  if (age <= 21) return 1.0
  if (age <= 24) return 0.8
  if (age <= 27) return 0.5
  if (age <= 29) return 0.3
  if (age <= 31) return 0.15
  return 0
}

/** El declive llega tarde y es suave: unos dos puntos de media por temporada. */
export function declineFactor(age: number): number {
  if (age <= 31) return 0
  if (age <= 33) return 1.4
  if (age <= 35) return 2.2
  if (age <= 37) return 3.0
  return 3.8
}

export interface DevelopmentInput {
  minutesShare: number
  clubPrestige: number
  leagueStrength: number
  growthMult: number
  trainingFocus: AttributeKey[]
  injuryWeeks: number
  /** Nota media de la temporada: es lo que puede empujar el techo hacia arriba. */
  seasonRating: number
}

/** Evoluciona los atributos una temporada. Devuelve el delta de OVR. */
export function developPlayer(player: PlayerState, input: DevelopmentInput, rng: Rng): number {
  const { position } = player.identity
  const before = ovrOf(player.attrs, position)
  const headroom = Math.max(0, player.potential - before)

  // Jugar es lo que hace crecer: sin minutos el desarrollo se estanca.
  const minutesEffect = 0.45 + 0.80 * clamp(input.minutesShare, 0, 1)
  // Entrenar en un grande y competir en una liga fuerte acelera: mejores
  // entrenadores, mejores compañeros y más exigencia diaria.
  const environment = 0.80 + (input.clubPrestige / 100) * 0.30 + (input.leagueStrength / 100) * 0.20
  const injuryPenalty = clamp(1 - input.injuryWeeks / 45, 0.35, 1)
  // Rendir por encima de tu nivel acelera la mejora; una temporada gris la frena.
  const performance = clamp(1 + (input.seasonRating - 6.8) * 0.42, 0.55, 1.4)
  // Los últimos puntos antes del techo cuestan mucho más que los primeros, pero
  // nunca se detienen del todo: quedan años de sumar de uno en uno.
  const taper = headroom > 0 ? Math.max(0.32, Math.min(1, headroom / 6)) : 0

  const gain = clamp(
    BASE_GAIN * growthFactor(player.age) * minutesEffect * environment * performance *
      input.growthMult * injuryPenalty * taper * rng.float(0.72, 1.3),
    0,
    MAX_SEASON_GAIN,
  )

  // Oxidarse cuesta nivel a cualquier edad: sin minutos y sin rendir se retrocede,
  // aunque tengas veinte años y todo el margen del mundo por delante.
  const rust = clamp(
    (0.45 - clamp(input.minutesShare, 0, 1)) * 4.0 + (6.6 - input.seasonRating) * 0.9,
    0,
    2.5,
  )
  const loss = declineFactor(player.age) * rng.float(0.7, 1.35) + rust

  // El reparto entre atributos decide *dónde* mejora el jugador; la
  // normalización garantiza que *cuánto* mejora sea exactamente `gain` puntos de
  // media. Sin ella, enfocar el entrenamiento en un atributo de mucho peso
  // multiplicaría la subida real y descuadraría toda la curva.
  const bias = GROWTH_BIAS[position]
  const ups: Record<string, number> = {}
  const downs: Record<string, number> = {}
  for (const k of ATTRIBUTE_KEYS) {
    ups[k] = bias[k] * (input.trainingFocus.includes(k) ? 1.9 : 0.82)
    downs[k] = DECLINE_BIAS[k]
  }
  applyShaped(player, ups, gain, position)
  applyShaped(player, downs, -loss, position)

  raisePotential(player, input, rng)
  return ovrOf(player.attrs, position) - before
}

/**
 * Reparte `delta` puntos de media entre los atributos siguiendo la forma `shape`
 * (positivo = mejora, negativo = declive). Escala el reparto para que el cambio
 * de media resultante sea exactamente `delta`.
 */
function applyShaped(
  player: PlayerState,
  shape: Record<string, number>,
  delta: number,
  position: Position,
): void {
  if (delta === 0) return
  const weights = OVR_WEIGHTS[position]
  const up = delta > 0
  let remaining = delta

  // Los atributos que ya han tocado techo (o suelo) no pueden absorber su parte:
  // si no se redistribuyera, la media se quedaría atascada muy por debajo del
  // potencial. Se reparte en varias pasadas, cada una sobre los que aún tienen
  // margen, hasta colocar los puntos o quedarse sin sitio donde ponerlos.
  for (let pass = 0; pass < 4 && Math.abs(remaining) > 0.001; pass++) {
    const room: Record<string, number> = {}
    let perUnit = 0
    for (const k of ATTRIBUTE_KEYS) {
      const free = up ? MAX_OVR - player.attrs[k] : player.attrs[k] - 20
      room[k] = free > 0.001 ? shape[k] : 0
      perUnit += room[k] * weights[k]
    }
    if (perUnit <= 0) return
    const scale = remaining / perUnit
    let placed = 0
    for (const k of ATTRIBUTE_KEYS) {
      if (room[k] === 0) continue
      const before = player.attrs[k]
      player.attrs[k] = clamp(before + room[k] * scale, 20, MAX_OVR)
      placed += (player.attrs[k] - before) * weights[k]
    }
    remaining -= placed
  }
}

/**
 * El techo se puede empujar. Una gran temporada, con muchos minutos y al máximo
 * nivel, sube el potencial; brillar en una liga menor apenas cuenta. Así el 99
 * es alcanzable, pero pide una carrera de elecciones acertadas y algo de suerte.
 */
function raisePotential(player: PlayerState, input: DevelopmentInput, rng: Rng): void {
  if (player.age > 30 || input.minutesShare < 0.62) return
  const brilliance = clamp((input.seasonRating - 6.9) / 1.1, 0, 1)
  if (brilliance <= 0) return
  const level = clamp((input.clubPrestige * 0.6 + input.leagueStrength * 0.4 - 45) / 45, 0.2, 1)
  // Cuanto más alto está ya el techo, más cuesta subirlo otro punto: pasar de 92
  // a 99 exige una temporada descomunal tras otra, no una buena racha.
  const resistance = clamp((MAX_OVR - player.potential) / 14, 0.1, 1)
  // Reventar la liga a los 19 dice mucho más de tu techo que hacerlo a los 28, y
  // además deja años para escalarlo: es la única vía realista hasta el 99.
  const youth = player.age <= 22 ? 1.7 : player.age <= 25 ? 1.25 : 1
  const odds = (0.05 + brilliance * 0.45) * level * resistance * youth
  if (!rng.chance(odds)) return
  const step = brilliance > 0.78 ? rng.int(2, 3) : 1
  player.potential = Math.min(MAX_OVR, player.potential + step)
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

/**
 * Reconversión de posición. Un delantero que se retrasa a la medular no pierde
 * diez puntos de media de golpe: redistribuye trabajo hacia lo que pide su nuevo
 * puesto. Queda un par de puntos por debajo, no hundido.
 */
export function convertPosition(player: PlayerState, to: Position): void {
  const before = ovrOf(player.attrs, player.identity.position)
  player.identity.position = to
  const target = before - 2
  const weights = OVR_WEIGHTS[to]
  const order = ATTRIBUTE_KEYS.slice().sort((a, b) => weights[b] - weights[a])
  // Presupuesto de puntos de atributo que la reconversión puede reasignar. Es
  // amplio a propósito: el tope real lo pone `target`, no el presupuesto.
  let budget = 60
  while (budget > 0 && ovrOf(player.attrs, to) < target) {
    let moved = false
    for (const k of order) {
      if (budget <= 0 || ovrOf(player.attrs, to) >= target) break
      if (player.attrs[k] >= MAX_OVR) continue
      player.attrs[k] += 1
      budget -= 1
      moved = true
    }
    if (!moved) break
  }
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
