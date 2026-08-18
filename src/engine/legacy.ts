import { getClub, getLeague } from '../data/clubs'
import type { CareerState, Legacy, SeasonRecord } from './types'

/** Escalones del veredicto final, de mayor a menor. El texto lo pone el i18n. */
const TIERS: { tier: string; min: number }[] = [
  { tier: 'immortal', min: 2200 },
  { tier: 'legend', min: 1600 },
  { tier: 'worldClass', min: 1000 },
  { tier: 'elite', min: 660 },
  { tier: 'solid', min: 400 },
  { tier: 'journeyman', min: 200 },
  { tier: 'faded', min: 0 },
]

export function computeLegacy(state: CareerState): Legacy {
  const t = state.totals
  const trophyWeight: Record<string, number> = {
    worldcup: 130, ucl: 55, league: 30, lib: 34, continental: 55, clubwc: 18,
    europa: 18, cup: 10, supercup: 5, caf: 16, afc: 14, concacaf: 12, promotion: 6,
  }
  const awardWeight: Record<string, number> = {
    ballon: 110, leagueMvp: 26, leagueTopScorer: 22, teamOfTheYear: 12,
    goldenboy: 14, goldenGlove: 16, tournamentMvp: 30, puskas: 8,
  }

  const trophyScore = t.trophies.reduce((a, x) => a + (trophyWeight[x.kind] ?? 6), 0)
  const awardScore = t.awards.reduce((a, x) => a + (awardWeight[x.kind] ?? 8), 0)

  // Doscientos goles en segunda no valen lo mismo que cien en la Champions:
  // la producción se pondera por el nivel medio al que se jugó.
  const level = careerLevel(state)
  const levelMult = 0.55 + (level - 45) / 60

  const score = Math.round(
    Math.max(0, t.peakOvr - 55) * 5.5 +
    (t.goals * 1.25 + t.assists * 0.85 + t.apps * 0.14) * levelMult +
    t.caps * 0.7 +
    t.intlGoals * 1.6 +
    trophyScore +
    awardScore,
  )

  const tier = TIERS.find((x) => score >= x.min) ?? TIERS[TIERS.length - 1]

  const bestSeason = state.history.reduce<SeasonRecord | undefined>((best, s) => {
    if (!best) return s
    const value = (r: SeasonRecord) =>
      r.stats.rating * 8 + r.stats.goals + r.stats.assists * 0.8 + r.trophies.length * 4 + r.awards.length * 6
    return value(s) > value(best) ? s : best
  }, undefined)

  return {
    score,
    level: Math.round(level),
    tier: tier.tier,
    dreamAchieved: isDreamAchieved(state),
    totals: t,
    seasons: state.history.length,
    peakOvr: t.peakOvr,
    retiredAt: state.player.age,
    bestSeason,
  }
}

/**
 * Nivel medio al que se disputó la carrera: media de prestigio de club y
 * fuerza de liga, ponderada por partidos jugados en cada temporada.
 */
export function careerLevel(state: CareerState): number {
  let weighted = 0
  let apps = 0
  for (const s of state.history) {
    if (s.stats.apps === 0) continue
    const value = getClub(s.clubId).prestige * 0.65 + getLeague(s.leagueId).strength * 0.35
    weighted += value * s.stats.apps
    apps += s.stats.apps
  }
  return apps > 0 ? weighted / apps : 45
}

export function isDreamAchieved(state: CareerState): boolean {
  const t = state.totals
  switch (state.setup.identity.dream) {
    case 'ballon':
      return t.awards.some((a) => a.kind === 'ballon')
    case 'worldcup':
      return t.trophies.some((x) => x.kind === 'worldcup')
    case 'legend': {
      // Leyenda de club: al menos 8 temporadas y 250 partidos en un mismo club.
      // Las cesiones cuentan: esos partidos se jugaron con esa camiseta.
      const byClub = new Map<string, number>()
      const seasonsByClub = new Map<string, number>()
      for (const s of state.history) {
        byClub.set(s.clubId, (byClub.get(s.clubId) ?? 0) + s.stats.apps)
        seasonsByClub.set(s.clubId, (seasonsByClub.get(s.clubId) ?? 0) + 1)
      }
      for (const [clubId, apps] of byClub) {
        if (apps >= 250 && (seasonsByClub.get(clubId) ?? 0) >= 8) return true
      }
      return false
    }
  }
}

/** Club en el que más partidos jugó: su "casa". */
export function mainClubOf(state: CareerState): string | undefined {
  const byClub = new Map<string, number>()
  for (const s of state.history) byClub.set(s.clubId, (byClub.get(s.clubId) ?? 0) + s.stats.apps)
  let best: string | undefined
  let bestApps = -1
  for (const [clubId, apps] of byClub) {
    if (apps > bestApps) { best = clubId; bestApps = apps }
  }
  return best
}

export function clubNamesOf(state: CareerState): string[] {
  const seen: string[] = []
  for (const s of state.history) {
    const name = getClub(s.clubId).name
    if (!seen.includes(name)) seen.push(name)
  }
  return seen
}
