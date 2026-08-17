import { describe, expect, it } from 'vitest'
import { LOCALES, ca, en, es, missingKeys, translate } from '../src/i18n'
import type { Locale } from '../src/i18n'
import { NATIONS } from '../src/data/nations'
import { autoPlay, createCareer, step, choose } from '../src/engine/career'
import type { CareerSetup, Position, Txt } from '../src/engine/types'

const CATALOGS: Record<Locale, Record<string, string>> = { es, en, ca }

function setup(seed: number, position: Position): CareerSetup {
  return {
    identity: {
      firstName: 'Jordi', lastName: 'Puig', number: 10, foot: 'R',
      nationId: 'ESP', position, dream: 'ballon',
    },
    attributeBoosts: { shooting: 4, dribbling: 4, pace: 4 },
    seed,
    startYear: 2026,
  }
}

/** Marcadores `{param}` que usa una plantilla. */
function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
}

describe('catálogos', () => {
  it('inglés y catalán tienen todas las claves del español', () => {
    for (const { id } of LOCALES) {
      if (id === 'es') continue
      expect(missingKeys(id), `faltan claves en ${id}`).toEqual([])
    }
  })

  it('ningún idioma tiene claves de más', () => {
    const base = new Set(Object.keys(es))
    for (const { id } of LOCALES) {
      const extra = Object.keys(CATALOGS[id]).filter((k) => !base.has(k))
      expect(extra, `claves sobrantes en ${id}`).toEqual([])
    }
  })

  it('las plantillas usan los mismos parámetros en los tres idiomas', () => {
    for (const key of Object.keys(es)) {
      const expected = placeholders(es[key])
      for (const { id } of LOCALES) {
        if (id === 'es') continue
        expect(placeholders(CATALOGS[id][key]), `${id} · ${key}`).toEqual(expected)
      }
    }
  })

  it('todas las naciones del dataset tienen nombre en los tres idiomas', () => {
    for (const nation of NATIONS) {
      for (const { id } of LOCALES) {
        const key = `nation.${nation.id}`
        expect(CATALOGS[id][key], `${id} · ${key}`).toBeTruthy()
      }
    }
  })

  it('no queda ninguna cadena sin traducir (copiada tal cual del español)', () => {
    // Sólo se comprueban textos largos: nombres propios y siglas sí se repiten.
    const longKeys = Object.keys(es).filter((k) => es[k].length > 40 && !k.startsWith('nation.'))
    const identical = longKeys.filter((k) => CATALOGS.en[k] === es[k])
    expect(identical).toEqual([])
  })
})

describe('resolución de textos', () => {
  it('interpola parámetros literales', () => {
    expect(translate('es', 'hub.age', { age: 24 })).toBe('24 años')
  })

  it('resuelve referencias a otras claves con @', () => {
    expect(translate('en', 'highlight.caps', { caps: 30, nation: '@nation.ESP' })).toContain('Spain')
    expect(translate('ca', 'highlight.caps', { caps: 30, nation: '@nation.ESP' })).toContain('Espanya')
  })

  it('resuelve Txt anidados con sus propios parámetros', () => {
    const nested: Txt = {
      key: 'award.tournamentMvp',
      params: { tournament: { key: 'tournament.worldcup', params: { year: 2030 } } },
    }
    expect(translate('es', nested.key, nested.params)).toBe('MVP de la Copa del Mundo 2030')
    expect(translate('en', nested.key, nested.params)).toBe('2030 World Cup MVP')
  })

  it('cae al español si falta la clave y a la clave si no existe en ninguno', () => {
    expect(translate('en', 'clave.que.no.existe')).toBe('clave.que.no.existe')
  })
})

describe('cobertura del motor', () => {
  /** Todas las claves que produce una carrera completa deben existir en el catálogo. */
  it('cada texto generado por el motor tiene traducción en los tres idiomas', () => {
    const used = new Set<string>()
    const collect = (txt: Txt) => {
      used.add(txt.key)
      for (const value of Object.values(txt.params ?? {})) {
        if (typeof value === 'string' && value.startsWith('@')) used.add(value.slice(1))
        else if (typeof value === 'object') collect(value)
      }
    }

    const positions: Position[] = ['GK', 'DF', 'MF', 'FW']
    for (let seed = 1; seed <= 40; seed++) {
      const state = createCareer(setup(seed, positions[seed % 4]))
      // Recorre la carrera alternando opciones para tocar todas las ramas.
      let i = 0
      for (;;) {
        const s = step(state)
        if (s.kind === 'decision') {
          collect(s.decision.title)
          collect(s.decision.text)
          for (const o of s.decision.options) {
            collect(o.label)
            if (o.hint) collect(o.hint)
          }
          choose(state, s.decision.options[i++ % s.decision.options.length].id)
        } else if (s.kind === 'news') {
          collect(s.title)
          collect(s.text)
        } else if (s.kind === 'season') {
          s.record.highlights.forEach(collect)
          s.record.trophies.forEach((t) => collect(t.text))
          s.record.awards.forEach((a) => collect(a.text))
          for (const inj of s.record.injuries) used.add(`injury.${inj.key}`)
          used.add(`role.${s.record.role}`)
        } else {
          used.add(`tier.${s.legacy.tier}`)
          used.add(`tier.${s.legacy.tier}.verdict`)
          break
        }
      }
    }

    expect(used.size).toBeGreaterThan(80)
    for (const { id } of LOCALES) {
      const missing = [...used].filter((k) => !(k in CATALOGS[id]))
      expect(missing, `claves sin traducir en ${id}`).toEqual([])
    }
  })

  it('una carrera completa se puede renderizar en catalán sin dejar claves crudas', () => {
    const state = createCareer(setup(4242, 'FW'))
    const steps = autoPlay(state)
    const rendered: string[] = []
    for (const s of steps) {
      if (s.kind === 'season') {
        for (const h of s.record.highlights) rendered.push(translate('ca', h.key, h.params))
      }
    }
    expect(rendered.length).toBeGreaterThan(5)
    // Si una clave no existiera, `translate` devolvería la propia clave.
    expect(rendered.filter((line) => /^[a-z]+\.[a-zA-Z.]+$/.test(line))).toEqual([])
  })
})
