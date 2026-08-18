import { it } from 'vitest'
import { autoPlay, createCareer } from '../src/engine/career'
import { getClub, getLeague } from '../src/data/clubs'
import { getNation } from '../src/data/nations'
import type { CareerSetup } from '../src/engine/types'
const setup = (seed: number): CareerSetup => ({
  identity: { firstName: 'J', lastName: 'P', number: 10, foot: 'R', nationId: 'ESP', position: 'FW', dream: 'legend' },
  attributeBoosts: { shooting: 4, dribbling: 4, pace: 4 }, seed, startYear: 2026,
})
it('loan', () => {
  let esp = 0, uefa = 0, fuera = 0, n = 0
  const ejemplos: string[] = []
  for (let seed = 1; seed <= 200; seed++) {
    const st = createCareer(setup(seed))
    autoPlay(st, (d) => d.options[0].id)
    for (const h of st.history.filter(x => x.onLoan)) {
      const lg = getLeague(getClub(h.clubId).leagueId)
      n++
      if (lg.nationId === 'ESP') esp++
      else if (getNation(lg.nationId).conf === 'UEFA') uefa++
      else fuera++
      if (ejemplos.length < 5) ejemplos.push(`${h.age}a → ${getClub(h.clubId).name} (${lg.name}), ${h.stats.apps} PJ`)
    }
  }
  console.log(`CESIONES ${n}: España ${(esp/n*100).toFixed(0)}% · resto UEFA ${(uefa/n*100).toFixed(0)}% · fuera de Europa ${(fuera/n*100).toFixed(0)}%`)
  console.log('EJEMPLOS ' + ejemplos.join(' | '))
})
