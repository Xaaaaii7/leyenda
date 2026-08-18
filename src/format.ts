import { getClub, getLeague } from './data/clubs'
import { ATTRIBUTE_KEYS } from './engine/types'
import type { AttributeKey, Position } from './engine/types'

/** "12,5 M€" / "€12.5M" según idioma, en versión corta y neutra. */
export function money(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}B €`
  if (value >= 100) return `${Math.round(value)} M€`
  if (value >= 10) return `${value.toFixed(1)} M€`
  if (value >= 1) return `${value.toFixed(1)} M€`
  return `${Math.round(value * 1000)} k€`
}

export function clubName(clubId: string): string {
  return clubId ? getClub(clubId).name : '—'
}

export function leagueNameOfClub(clubId: string): string {
  return clubId ? getLeague(getClub(clubId).leagueId).name : '—'
}

/** Clave de traducción de un atributo, distinta para porteros. */
export function attrKey(attr: AttributeKey, position: Position): string {
  return position === 'GK' ? `attrGk.${attr}` : `attr.${attr}`
}

export { ATTRIBUTE_KEYS }

/** Ordinal en el idioma activo: 1º / 1st / 1r. Suficiente para posiciones de liga. */
export function ordinal(n: number, locale: string): string {
  if (locale === 'en') {
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`
    switch (n % 10) {
      case 1: return `${n}st`
      case 2: return `${n}nd`
      case 3: return `${n}rd`
      default: return `${n}th`
    }
  }
  if (locale === 'ca') return `${n}è`
  return `${n}º`
}

/** Color de una barra 0-100: rojo abajo, verde arriba. */
export function meterColor(value: number): string {
  if (value >= 70) return '#35e08a'
  if (value >= 45) return '#f3c552'
  return '#ff6b6b'
}

/** "+3" / "−2" / "—": el acumulado del verano se lee de un vistazo. */
export function signed(value: number): string {
  if (value === 0) return '—'
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`
}
