import type { CareerState } from './engine/types'

const KEY = 'leyenda.career.v2'

/**
 * El estado de carrera es JSON puro (incluido el estado del PRNG), así que
 * guardarlo y recuperarlo reproduce exactamente la misma partida.
 */
export function saveCareer(state: CareerState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Sin almacenamiento la partida simplemente no persiste.
  }
}

export function loadCareer(): CareerState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CareerState
    // Comprobación mínima para no romper la app con datos de una versión vieja.
    if (!parsed?.player?.identity || !Array.isArray(parsed.history)) return null
    return parsed
  } catch {
    return null
  }
}

export function clearCareer(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nada que limpiar.
  }
}
