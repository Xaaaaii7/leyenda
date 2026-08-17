import { createContext, useContext } from 'react'
import type { Txt } from '../engine/types'
import { es } from './es'
import { en } from './en'
import { ca } from './ca'

export type Locale = 'es' | 'en' | 'ca'

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
  { id: 'ca', label: 'Català' },
]

export type Catalog = Record<string, string>

const CATALOGS: Record<Locale, Catalog> = { es, en, ca }

/**
 * Resuelve una clave con sus parámetros. Un parámetro puede ser:
 *  - un literal (`'FC Barcelona'`, `12`),
 *  - otra clave, escribiéndola como `'@nation.ESP'`,
 *  - un `Txt` anidado con sus propios parámetros.
 * Si la clave no existe cae al español y, en último término, a la propia clave.
 */
export function translate(locale: Locale, key: string, params?: Txt['params']): string {
  const catalog = CATALOGS[locale] ?? es
  let out = catalog[key] ?? es[key] ?? key
  if (!params) return out
  for (const [name, raw] of Object.entries(params)) {
    let value: string
    if (typeof raw === 'string') {
      value = raw.startsWith('@') ? translate(locale, raw.slice(1)) : raw
    } else if (typeof raw === 'number') {
      value = String(raw)
    } else {
      value = translate(locale, raw.key, raw.params)
    }
    out = out.split(`{${name}}`).join(value)
  }
  return out
}

export function translateTxt(locale: Locale, txt: Txt): string {
  return translate(locale, txt.key, txt.params)
}

export interface I18n {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Traduce una clave suelta con parámetros opcionales. */
  t: (key: string, params?: Txt['params']) => string
  /** Traduce un `Txt` producido por el motor. */
  tx: (txt: Txt) => string
}

export const I18nContext = createContext<I18n>({
  locale: 'es',
  setLocale: () => {},
  t: (key, params) => translate('es', key, params),
  tx: (txt) => translateTxt('es', txt),
})

export function useI18n(): I18n {
  return useContext(I18nContext)
}

const STORAGE_KEY = 'leyenda.locale'

export function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'es' || saved === 'en' || saved === 'ca') return saved
  } catch {
    // localStorage puede estar bloqueado; se ignora y se detecta por navegador.
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'es'
  if (nav.startsWith('ca')) return 'ca'
  if (nav.startsWith('es')) return 'es'
  return 'en'
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Sin almacenamiento el idioma simplemente no persiste entre sesiones.
  }
}

/** Claves presentes en el catálogo español pero ausentes en otro idioma. */
export function missingKeys(locale: Locale): string[] {
  const catalog = CATALOGS[locale] ?? {}
  return Object.keys(es).filter((k) => !(k in catalog))
}

export { es, en, ca }
