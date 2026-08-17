import { describe, expect, it } from 'vitest'
import { CLUBS, LEAGUES, LEAGUE_BY_ID, clubsOfLeague } from '../src/data/clubs'
import { NATIONS } from '../src/data/nations'
import { FIRST_NAMES, LAST_NAMES } from '../src/data/names'
import { Rng } from '../src/engine/rng'
import { autoPlay, createCareer, currentOvr, step, choose } from '../src/engine/career'
import { ovrOf, buildAttributes, rollPotential, marketValueOf } from '../src/engine/player'
import { callUpBar, tournamentOf } from '../src/engine/national'
import { comfortPrestige } from '../src/engine/transfers'
import type { CareerSetup, Legacy, Position, SeasonRecord, Step } from '../src/engine/types'

function setup(overrides: Partial<CareerSetup> = {}): CareerSetup {
  return {
    identity: {
      firstName: 'Jordi',
      lastName: 'Puig',
      number: 10,
      foot: 'R',
      nationId: 'ESP',
      position: 'FW',
      dream: 'ballon',
    },
    attributeBoosts: { shooting: 4, dribbling: 4, pace: 4 },
    seed: 12345,
    startYear: 2026,
    ...overrides,
  }
}

function runCareer(seed: number, position: Position = 'FW', policy?: (d: { options: { id: string }[] }) => string) {
  const state = createCareer(setup({ seed, identity: { ...setup().identity, position } }))
  const steps = autoPlay(state, policy ? (d) => policy(d) : undefined)
  return { state, steps }
}

function seasonsOf(steps: Step[]): SeasonRecord[] {
  return steps.filter((s): s is Extract<Step, { kind: 'season' }> => s.kind === 'season').map((s) => s.record)
}

function legacyOf(steps: Step[]): Legacy {
  const last = steps[steps.length - 1]
  if (last.kind !== 'retired') throw new Error('la carrera no terminó')
  return last.legacy
}

describe('datos', () => {
  it('todos los clubes apuntan a una liga existente', () => {
    for (const club of CLUBS) expect(LEAGUE_BY_ID.has(club.leagueId), club.name).toBe(true)
  })

  it('todas las ligas apuntan a una nación existente', () => {
    const ids = new Set(NATIONS.map((n) => n.id))
    for (const league of LEAGUES) expect(ids.has(league.nationId), league.name).toBe(true)
  })

  it('no hay ids de club duplicados', () => {
    expect(new Set(CLUBS.map((c) => c.id)).size).toBe(CLUBS.length)
  })

  it('cada liga tiene al menos cuatro clubes', () => {
    for (const league of LEAGUES) {
      expect(clubsOfLeague(league.id).length, league.name).toBeGreaterThanOrEqual(4)
    }
  })

  it('cada grupo de nombres usado por una nación tiene nombres y apellidos', () => {
    for (const nation of NATIONS) {
      expect(FIRST_NAMES[nation.names]?.length, nation.name).toBeGreaterThan(4)
      expect(LAST_NAMES[nation.names]?.length, nation.name).toBeGreaterThan(4)
    }
  })
})

describe('rng', () => {
  it('es determinista para la misma semilla', () => {
    const a = new Rng(99)
    const b = new Rng(99)
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next())
  })

  it('produce valores dentro de [0,1)', () => {
    const rng = new Rng(7)
    for (let i = 0; i < 2000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('weighted respeta pesos cero', () => {
    const rng = new Rng(3)
    const items = ['a', 'b']
    for (let i = 0; i < 200; i++) {
      expect(rng.weighted(items, (x) => (x === 'a' ? 0 : 1))).toBe('b')
    }
  })
})

describe('jugador', () => {
  it('un canterano arranca cerca de 50 de media', () => {
    const rng = new Rng(1)
    for (const pos of ['GK', 'DF', 'MF', 'FW'] as Position[]) {
      const attrs = buildAttributes(pos, {}, rng)
      const ovr = ovrOf(attrs, pos)
      expect(ovr, pos).toBeGreaterThanOrEqual(42)
      expect(ovr, pos).toBeLessThanOrEqual(58)
    }
  })

  it('repartir puntos sube la media pero no dispara al jugador', () => {
    const rng = new Rng(5)
    const plain = ovrOf(buildAttributes('FW', {}, rng), 'FW')
    const boosted = ovrOf(buildAttributes('FW', { shooting: 6, pace: 6 }, new Rng(5)), 'FW')
    expect(boosted).toBeGreaterThan(plain)
    expect(boosted).toBeLessThan(70)
  })

  it('el potencial está siempre en un rango razonable', () => {
    const rng = new Rng(42)
    for (let i = 0; i < 500; i++) {
      const p = rollPotential(rng)
      expect(p).toBeGreaterThanOrEqual(55)
      expect(p).toBeLessThanOrEqual(95)
    }
  })

  it('los cracks generacionales son raros', () => {
    const rng = new Rng(2024)
    let elite = 0
    for (let i = 0; i < 2000; i++) if (rollPotential(rng) >= 88) elite++
    expect(elite / 2000).toBeLessThan(0.1)
  })

  it('el valor de mercado cae con la edad', () => {
    const base = {
      identity: setup().identity,
      attrs: buildAttributes('FW', { shooting: 6 }, new Rng(1)),
      potential: 85, form: 60, morale: 60, fitness: 80, injuryProneness: 30,
      reputation: 50, clubId: 'rma', contractYears: 3, wage: 1, marketValue: 1,
      captain: false, retiredFromNT: false, ntNationId: 'ESP',
    }
    const young = marketValueOf({ ...base, age: 24 }, 92)
    const old = marketValueOf({ ...base, age: 34 }, 92)
    expect(young).toBeGreaterThan(old * 2)
  })
})

describe('selección', () => {
  it('el listón sube con la fuerza de la selección', () => {
    expect(callUpBar(94)).toBeGreaterThan(callUpBar(50))
  })

  it('hay Mundial cada cuatro años y continental en los pares intermedios', () => {
    expect(tournamentOf(2025, 'UEFA')?.key).toBe('worldcup') // torneo en 2026
    expect(tournamentOf(2027, 'UEFA')?.key).toBe('continental') // torneo en 2028
    expect(tournamentOf(2026, 'UEFA')).toBeNull()
  })
})

describe('mercado', () => {
  it('a más media, clubes más grandes al alcance', () => {
    expect(comfortPrestige(85)).toBeGreaterThan(comfortPrestige(60))
    expect(comfortPrestige(50)).toBeGreaterThanOrEqual(30)
    expect(comfortPrestige(99)).toBeLessThanOrEqual(96)
  })
})

describe('carrera completa', () => {
  it('la misma semilla produce exactamente la misma carrera', () => {
    const a = runCareer(777)
    const b = runCareer(777)
    expect(JSON.stringify(a.state.history)).toBe(JSON.stringify(b.state.history))
    expect(legacyOf(a.steps).score).toBe(legacyOf(b.steps).score)
  })

  it('semillas distintas producen carreras distintas', () => {
    const a = legacyOf(runCareer(1).steps)
    const b = legacyOf(runCareer(2).steps)
    expect(a.score === b.score && a.totals.goals === b.totals.goals).toBe(false)
  })

  it('termina siempre en retirada, en las cuatro posiciones y con muchas semillas', () => {
    const positions: Position[] = ['GK', 'DF', 'MF', 'FW']
    for (let seed = 1; seed <= 60; seed++) {
      const pos = positions[seed % 4]
      const { state, steps } = runCareer(seed, pos)
      const legacy = legacyOf(steps)
      expect(state.phase).toBe('done')
      expect(legacy.seasons).toBeGreaterThan(3)
      expect(legacy.retiredAt).toBeGreaterThanOrEqual(28)
      expect(legacy.retiredAt).toBeLessThanOrEqual(42)
    }
  })

  it('no quedan decisiones sin resolver al terminar', () => {
    const { state } = runCareer(31)
    expect(state.pending).toBeNull()
    expect(state.queue).toHaveLength(0)
  })

  it('cada temporada tiene un club válido y estadísticas coherentes', () => {
    for (let seed = 100; seed < 120; seed++) {
      const { steps } = runCareer(seed, (['GK', 'DF', 'MF', 'FW'] as Position[])[seed % 4])
      for (const s of seasonsOf(steps)) {
        expect(CLUBS.some((c) => c.id === s.clubId), s.clubId).toBe(true)
        expect(s.stats.apps).toBeGreaterThanOrEqual(0)
        expect(s.stats.apps).toBeLessThanOrEqual(60)
        expect(s.stats.minutes).toBeLessThanOrEqual(s.stats.apps * 95 + 200)
        expect(s.stats.rating).toBeGreaterThanOrEqual(4.5)
        expect(s.stats.rating).toBeLessThanOrEqual(9.6)
        expect(s.stats.goals).toBeLessThanOrEqual(55)
        expect(s.leaguePosition).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('los porteros casi no marcan y los delanteros sí', () => {
    let gkGoals = 0
    let fwGoals = 0
    for (let seed = 200; seed < 230; seed++) {
      gkGoals += legacyOf(runCareer(seed, 'GK').steps).totals.goals
      fwGoals += legacyOf(runCareer(seed, 'FW').steps).totals.goals
    }
    expect(gkGoals).toBeLessThan(5)
    expect(fwGoals).toBeGreaterThan(gkGoals * 20)
  })

  it('los delanteros marcan más que los defensas', () => {
    let dfGoals = 0
    let fwGoals = 0
    for (let seed = 300; seed < 330; seed++) {
      dfGoals += legacyOf(runCareer(seed, 'DF').steps).totals.goals
      fwGoals += legacyOf(runCareer(seed, 'FW').steps).totals.goals
    }
    expect(fwGoals).toBeGreaterThan(dfGoals * 2)
  })

  it('los centrocampistas asisten más que los delanteros', () => {
    let mf = 0
    let fw = 0
    for (let seed = 400; seed < 430; seed++) {
      mf += legacyOf(runCareer(seed, 'MF').steps).totals.assists
      fw += legacyOf(runCareer(seed, 'FW').steps).totals.assists
    }
    expect(mf).toBeGreaterThan(fw)
  })

  it('la media crece en la juventud y baja al final', () => {
    const { steps } = runCareer(55, 'MF')
    const seasons = seasonsOf(steps)
    const early = seasons.slice(0, 4)
    const peak = Math.max(...seasons.map((s) => s.ovrEnd))
    expect(peak).toBeGreaterThan(early[0].ovrStart)
    const last = seasons[seasons.length - 1]
    expect(last.ovrEnd).toBeLessThanOrEqual(peak)
  })

  it('sólo una minoría de carreras llega a leyenda', () => {
    const tiers: Record<string, number> = {}
    for (let seed = 500; seed < 580; seed++) {
      const legacy = legacyOf(runCareer(seed, (['GK', 'DF', 'MF', 'FW'] as Position[])[seed % 4]).steps)
      tiers[legacy.tier] = (tiers[legacy.tier] ?? 0) + 1
    }
    const top = (tiers.immortal ?? 0) + (tiers.legend ?? 0)
    expect(top).toBeLessThan(40) // menos de la mitad
    expect(Object.keys(tiers).length).toBeGreaterThan(2) // hay variedad de finales
  })

  it('el Balón de Oro es excepcional', () => {
    let winners = 0
    for (let seed = 600; seed < 660; seed++) {
      const legacy = legacyOf(runCareer(seed, 'FW').steps)
      if (legacy.totals.awards.some((a) => a.kind === 'ballon')) winners++
    }
    expect(winners).toBeLessThan(20)
  })

  it('elegir siempre el club más grande da mejor carrera que elegir el más pequeño', () => {
    const bigPolicy = (d: { options: { id: string }[] }) => d.options[0].id
    const smallPolicy = (d: { options: { id: string }[] }) => d.options[d.options.length - 1].id
    let big = 0
    let small = 0
    let bigTrophies = 0
    let smallTrophies = 0
    let bigLevel = 0
    let smallLevel = 0
    for (let seed = 700; seed < 740; seed++) {
      const b = legacyOf(runCareer(seed, 'FW', bigPolicy).steps)
      const s = legacyOf(runCareer(seed, 'FW', smallPolicy).steps)
      big += b.score
      small += s.score
      bigTrophies += b.totals.trophies.length
      smallTrophies += s.totals.trophies.length
      bigLevel += b.level
      smallLevel += s.level
    }
    expect(big).toBeGreaterThan(small)
    expect(bigTrophies).toBeGreaterThan(smallTrophies * 2)
    expect(bigLevel).toBeGreaterThan(smallLevel)
  })

  it('quedarse siempre en el club modesto da más partidos, pero a menos nivel', () => {
    const bigPolicy = (d: { options: { id: string }[] }) => d.options[0].id
    const smallPolicy = (d: { options: { id: string }[] }) => d.options[d.options.length - 1].id
    let bigApps = 0
    let smallApps = 0
    for (let seed = 900; seed < 930; seed++) {
      bigApps += legacyOf(runCareer(seed, 'FW', bigPolicy).steps).totals.apps
      smallApps += legacyOf(runCareer(seed, 'FW', smallPolicy).steps).totals.apps
    }
    // Jugar en un club a tu medida garantiza minutos; ir al gigante los quita.
    expect(smallApps).toBeGreaterThan(bigApps)
  })

  it('el nivel de la carrera está dentro del rango de prestigios reales', () => {
    for (let seed = 950; seed < 970; seed++) {
      const legacy = legacyOf(runCareer(seed, (['GK', 'DF', 'MF', 'FW'] as Position[])[seed % 4]).steps)
      expect(legacy.level).toBeGreaterThanOrEqual(30)
      expect(legacy.level).toBeLessThanOrEqual(96)
    }
  })

  it('los totales cuadran con la suma de las temporadas', () => {
    const { state, steps } = runCareer(909, 'MF')
    const seasons = seasonsOf(steps)
    const goals = seasons.reduce((a, s) => a + s.stats.goals, 0)
    const apps = seasons.reduce((a, s) => a + s.stats.apps, 0)
    const caps = seasons.reduce((a, s) => a + s.national.caps, 0)
    expect(state.totals.goals).toBe(goals)
    expect(state.totals.apps).toBe(apps)
    expect(state.totals.caps).toBe(caps)
  })

  it('el estado es serializable y se puede reanudar', () => {
    const state = createCareer(setup({ seed: 4242 }))
    // Avanza unos pocos pasos.
    for (let i = 0; i < 6; i++) {
      const s = step(state)
      if (s.kind === 'decision') choose(state, s.decision.options[0].id)
      if (s.kind === 'retired') break
    }
    const clone = JSON.parse(JSON.stringify(state))
    const a = autoPlay(state)
    const b = autoPlay(clone)
    expect(legacyOf(a).score).toBe(legacyOf(b).score)
  })

  it('la media nunca se sale de rango', () => {
    for (let seed = 800; seed < 830; seed++) {
      const { state, steps } = runCareer(seed, (['GK', 'DF', 'MF', 'FW'] as Position[])[seed % 4])
      for (const s of seasonsOf(steps)) {
        expect(s.ovrEnd).toBeGreaterThan(30)
        expect(s.ovrEnd).toBeLessThanOrEqual(99)
      }
      expect(currentOvr(state)).toBeLessThanOrEqual(99)
    }
  })
})
