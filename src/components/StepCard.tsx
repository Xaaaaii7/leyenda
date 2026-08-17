import { useI18n } from '../i18n'
import { getClub, getLeague } from '../data/clubs'
import { tournamentTxt } from '../engine/national'
import type { Decision, SeasonRecord, Txt } from '../engine/types'
import { money, ordinal } from '../format'
import { Card, Stat } from './Bits'

export function DecisionCard({
  decision,
  onChoose,
}: {
  decision: Decision
  onChoose: (optionId: string) => void
}) {
  const { tx, t } = useI18n()
  return (
    <Card>
      <h3 style={{ fontSize: 20, marginBottom: 8 }}>{tx(decision.title)}</h3>
      <p className="muted" style={{ marginBottom: 16 }}>{tx(decision.text)}</p>
      <div className="stack" style={{ gap: 10 }}>
        {decision.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="choice"
            onClick={() => onChoose(option.id)}
          >
            {option.tone ? (
              <span className={`tone tone-${option.tone}`}>{t(`tone.${option.tone}`)}</span>
            ) : null}
            <span className="choice-title">{tx(option.label)}</span>
            {option.hint ? <span className="choice-desc">{tx(option.hint)}</span> : null}
          </button>
        ))}
      </div>
    </Card>
  )
}

export function NewsCard({
  title,
  text,
  onContinue,
}: {
  title: Txt
  text: Txt
  onContinue: () => void
}) {
  const { tx, t } = useI18n()
  return (
    <Card>
      <h3 style={{ fontSize: 18, marginBottom: 8 }}>{tx(title)}</h3>
      <p className="muted">{tx(text)}</p>
      <button
        className="btn btn-primary btn-block"
        type="button"
        style={{ marginTop: 16 }}
        onClick={onContinue}
      >
        {t('common.continue')}
      </button>
    </Card>
  )
}

export function SeasonSummary({
  record,
  onContinue,
}: {
  record: SeasonRecord
  onContinue: () => void
}) {
  const { t, tx, locale } = useI18n()
  const club = getClub(record.clubId)
  const league = getLeague(record.leagueId)
  const isGk = record.stats.cleanSheets > 0 || record.stats.conceded > 0

  return (
    <Card>
      <div className="spread" style={{ marginBottom: 4 }}>
        <h3 style={{ fontSize: 20 }}>{t('season.title', { season: record.season })}</h3>
        <span className="small muted">{t('hub.age', { age: record.age })}</span>
      </div>
      <p className="small muted">
        {t('season.subtitle', { club: club.name, league: league.name })}
        {record.onLoan && record.parentClubId
          ? ` · ${t('hub.onLoan', { club: getClub(record.parentClubId).name })}`
          : ''}
      </p>
      <div className="row small muted" style={{ marginTop: 6, gap: 14 }}>
        <span>{t('season.role', { role: t(`role.${record.role}`) })}</span>
        <span>{t('season.ovrChange', { from: record.ovrStart, to: record.ovrEnd })}</span>
        <span>{t('stat.leaguePosition')}: {ordinal(record.leaguePosition, locale)}</span>
      </div>

      <div className="divider" />

      <div className="grid-4">
        <Stat name={t('stat.apps')} value={record.stats.apps} />
        {isGk ? (
          <Stat name={t('stat.cleanSheets')} value={record.stats.cleanSheets} />
        ) : (
          <Stat name={t('stat.goals')} value={record.stats.goals} />
        )}
        <Stat name={t('stat.assists')} value={record.stats.assists} />
        <Stat name={t('stat.rating')} value={record.stats.apps > 0 ? record.stats.rating.toFixed(2) : t('common.none')} />
      </div>

      <div className="divider" />

      <h4 className="card-title">{t('season.highlights')}</h4>
      <ul className="highlights">
        {record.highlights.map((h, i) => (
          <li key={i}>{tx(h)}</li>
        ))}
        {record.injuries.map((inj, i) => (
          <li key={`inj-${i}`} className="muted">
            {t(`injury.${inj.key}`)} — {t('injury.weeks', { weeks: inj.weeks })}
          </li>
        ))}
      </ul>

      {record.national.tournament ? (
        <p className="small muted" style={{ marginTop: 12 }}>
          {tx(tournamentTxt({
            key: record.national.tournament.key,
            year: record.national.tournament.year,
            conf: record.national.tournament.conf,
          }))}
          {' · '}
          {t(`result.${record.national.tournament.result}`)}
        </p>
      ) : null}

      <div className="divider" />

      <div className="spread small muted">
        <span>{t('hub.value')}: {money(record.marketValue)}</span>
        <span>{t('hub.wage')}: {money(record.wage)}</span>
      </div>

      <button
        className="btn btn-primary btn-block"
        type="button"
        style={{ marginTop: 16 }}
        onClick={onContinue}
      >
        {t('season.continue')}
      </button>
    </Card>
  )
}
