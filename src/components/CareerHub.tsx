import { useI18n } from '../i18n'
import { getClub, getLeague } from '../data/clubs'
import { currentOvr, seasonLabel } from '../engine/career'
import { formLabel } from '../engine/player'
import { ATTRIBUTE_KEYS } from '../engine/types'
import type { CareerState, Step, Trophy } from '../engine/types'
import { attrKey, money, signed } from '../format'
import { Card, Chip, Meter, Stat } from './Bits'
import { DecisionCard, NewsCard, SeasonSummary } from './StepCard'
import { CareerGrid } from './CareerGrid'

interface Props {
  state: CareerState
  step: Step
  onChoose: (optionId: string) => void
  onAdvance: () => void
  onAutoplay: () => void
  onFinish: () => void
}

export function CareerHub({ state, step, onChoose, onAdvance, onAutoplay, onFinish }: Props) {
  const { t, tx } = useI18n()
  const player = state.player
  const ovr = currentOvr(state)
  const position = player.identity.position
  const club = player.clubId ? getClub(player.clubId) : null
  const league = club ? getLeague(club.leagueId) : null

  return (
    <div className="stack">
      <Card>
        <div className="player-head">
          <div className="ovr-badge">
            <span className="value">{ovr}</span>
            <span className="label">{t(`position.${position}.short`)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="player-name">
              {player.identity.firstName} {player.identity.lastName}{' '}
              <span className="muted">#{player.identity.number}</span>
            </div>
            <div className="chips">
              <Chip>{t('hub.age', { age: player.age })}</Chip>
              <Chip>{t(`nation.${player.ntNationId}`)}</Chip>
              <Chip variant="accent">{club ? club.name : t('hub.freeAgent')}</Chip>
              {league ? <Chip>{league.name}</Chip> : null}
              {player.parentClubId ? (
                <Chip variant="gold">{t('hub.onLoan', { club: club?.name ?? '' })}</Chip>
              ) : null}
              {player.captain ? <Chip variant="gold">{t('hub.captain')}</Chip> : null}
              {state.modifiers.ovrDelta !== 0 ? (
                <Chip variant={state.modifiers.ovrDelta > 0 ? 'accent' : 'gold'}>
                  {t('hub.summerSoFar', { delta: signed(state.modifiers.ovrDelta) })}
                </Chip>
              ) : null}
            </div>
          </div>
          <div className="head-totals">
            <div className="tiny dim">{t('hub.season', { season: seasonLabel(state.year) })}</div>
            <div style={{ fontWeight: 700 }}>{money(player.marketValue)}</div>
            <div className="row tiny dim" style={{ gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <span>{t('stat.apps')} {state.totals.apps}</span>
              <span>{t('stat.goals')} {state.totals.goals}</span>
              <span>{t('stat.assists')} {state.totals.assists}</span>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div className="grid-4">
          <Meter name={t('hub.form')} value={player.form} />
          <Meter name={t('hub.morale')} value={player.morale} />
          <Meter name={t('hub.fitness')} value={player.fitness} />
          <Meter name={t('hub.reputation')} value={player.reputation} />
        </div>
        <div className="row tiny dim" style={{ marginTop: 10, gap: 14 }}>
          <span>{t(`form.${formLabel(player.form)}`)}</span>
          <span>
            {t('hub.contract')}: {t('hub.contractYears', { years: player.contractYears })}
          </span>
          <span>{t('hub.wage')}: {money(player.wage)}</span>
        </div>
      </Card>

      {step.kind === 'decision' ? (
        <DecisionCard decision={step.decision} onChoose={onChoose} />
      ) : null}

      {step.kind === 'news' ? (
        <NewsCard title={step.title} text={step.text} onContinue={onAdvance} />
      ) : null}

      {step.kind === 'season' ? (
        <SeasonSummary record={step.record} onContinue={onAdvance} />
      ) : null}

      {step.kind === 'retired' ? (
        <Card>
          <button className="btn btn-primary btn-block" type="button" onClick={onFinish}>
            {t('legacy.title')}
          </button>
        </Card>
      ) : null}

      {step.kind !== 'retired' ? (
        <Card>
          <button className="btn btn-block" type="button" onClick={onAutoplay}>
            {t('hub.autoplay')}
          </button>
          <p className="tiny dim" style={{ marginTop: 8, textAlign: 'center' }}>
            {t('hub.autoplayHint')}
          </p>
        </Card>
      ) : null}

      <Card title={t('hub.attributes')}>
        <div className="grid-2">
          {ATTRIBUTE_KEYS.map((key) => (
            <Meter key={key} name={t(attrKey(key, position))} value={player.attrs[key]} />
          ))}
        </div>
        <div className="divider" />
        <div className="spread small muted">
          <span>{t('hub.potential')}</span>
          <strong>{player.potential}</strong>
        </div>
      </Card>

      <Card title={t('hub.totals')}>
        <div className="grid-4">
          <Stat name={t('stat.apps')} value={state.totals.apps} />
          <Stat name={t('stat.goals')} value={state.totals.goals} />
          <Stat name={t('stat.assists')} value={state.totals.assists} />
          <Stat name={t('stat.caps')} value={state.totals.caps} />
        </div>
      </Card>

      <TrophyCase trophies={state.totals.trophies} awards={state.totals.awards} />

      <Card title={t('hub.career')}>
        <CareerGrid state={state} current />
      </Card>

      {state.history.length > 0 ? (
        <Card title={t('season.highlights')}>
          <ul className="highlights">
            {state.history[state.history.length - 1].highlights.map((h, i) => (
              <li key={i}>{tx(h)}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

/** Palmarés agrupado por tipo de título, con el número de veces que se ganó. */
export function TrophyCase({
  trophies,
  awards,
}: {
  trophies: Trophy[]
  awards: CareerState['totals']['awards']
}) {
  const { t, tx } = useI18n()
  const grouped = new Map<string, { label: string; count: number }>()
  for (const item of [...trophies, ...awards]) {
    const label = tx(item.text)
    const entry = grouped.get(label)
    if (entry) entry.count += 1
    else grouped.set(label, { label, count: 1 })
  }
  const rows = [...grouped.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  return (
    <Card title={t('hub.trophies')}>
      {rows.length === 0 ? (
        <p className="small muted">{t('hub.noTrophies')}</p>
      ) : (
        <div className="trophy-list">
          {rows.map((row) => (
            <div className="trophy-row" key={row.label}>
              <span>{row.label}</span>
              <span className="count">×{row.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
