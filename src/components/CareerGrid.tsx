import { useI18n } from '../i18n'
import { getClub, getLeague } from '../data/clubs'
import { MAX_SEASONS } from '../engine/career'
import type { CareerState } from '../engine/types'
import { ordinal } from '../format'

const FIRST_AGE = 16
const LAST_AGE = FIRST_AGE + MAX_SEASONS - 1

/**
 * La carrera entera de un vistazo: todas las edades desde los 16 hasta la última
 * posible están listadas desde el principio y se van rellenando temporada a
 * temporada. Es la pantalla que hace que se vea el camino que queda por delante.
 */
export function CareerGrid({ state, current }: { state: CareerState; current?: boolean }) {
  const { t, locale } = useI18n()
  const byAge = new Map(state.history.map((s) => [s.age, s]))
  const currentAge = state.phase === 'done' ? -1 : state.player.age
  const anyLoan = state.history.some((s) => s.onLoan)

  return (
    <div className="table-wrap">
      <table className="career grid">
        <thead>
          <tr>
            <th>{t('hub.seasonCol')}</th>
            <th>{t('hub.club')}</th>
            <th>{t('hub.ovr')}</th>
            <th>{t('stat.apps')}</th>
            <th>{t('stat.goals')}</th>
            <th>{t('stat.assists')}</th>
            <th>{t('stat.rating')}</th>
            <th>{t('stat.leaguePosition')}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: LAST_AGE - FIRST_AGE + 1 }, (_, i) => {
            const age = FIRST_AGE + i
            const season = byAge.get(age)
            const isNow = current && age === currentAge
            return (
              <tr
                key={age}
                className={season ? (isNow ? 'row-now' : '') : isNow ? 'row-now row-empty' : 'row-empty'}
              >
                <td className="age-cell">{age}</td>
                {season ? (
                  <>
                    <td>
                      <span className="club-cell">
                        <span>
                          {getClub(season.clubId).name}
                          {season.onLoan ? ' *' : ''}
                        </span>
                        <span className="league">{getLeague(season.leagueId).name}</span>
                      </span>
                    </td>
                    <td className="ovr-cell">{season.ovrEnd}</td>
                    <td>{season.stats.apps}</td>
                    <td>{season.stats.goals}</td>
                    <td>{season.stats.assists}</td>
                    <td>{season.stats.rating.toFixed(2)}</td>
                    <td>{ordinal(season.leaguePosition, locale)}</td>
                  </>
                ) : (
                  <>
                    <td className="pending">
                      {isNow ? t('hub.playingNow') : ''}
                    </td>
                    <td colSpan={6} />
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {anyLoan ? <p className="tiny dim" style={{ marginTop: 8 }}>{t('hub.loanNote')}</p> : null}
    </div>
  )
}
