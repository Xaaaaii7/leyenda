import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { getClub, getLeague } from '../data/clubs'
import { clubNamesOf } from '../engine/legacy'
import type { CareerState } from '../engine/types'
import { money } from '../format'
import { drawLegacyCard, downloadCanvas } from '../legacyCard'
import type { LegacyCardData } from '../legacyCard'
import { Card, Stat } from './Bits'
import { TrophyCase } from './CareerHub'
import { CareerGrid } from './CareerGrid'

interface Props {
  state: CareerState
  onReplay: () => void
}

export function LegacyScreen({ state, onReplay }: Props) {
  const { t, tx } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const legacy = state.legacy
  const player = state.player
  const totals = state.totals

  const honours = useMemo(() => {
    const grouped = new Map<string, number>()
    for (const item of [...totals.trophies, ...totals.awards]) {
      const label = tx(item.text)
      grouped.set(label, (grouped.get(label) ?? 0) + 1)
    }
    return [...grouped.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  }, [totals, tx])

  const cardData: LegacyCardData | null = useMemo(() => {
    if (!legacy) return null
    const isGk = player.identity.position === 'GK'
    return {
      playerName: `${player.identity.firstName} ${player.identity.lastName}`,
      number: player.identity.number,
      positionShort: t(`position.${player.identity.position}.short`),
      nation: t(`nation.${player.identity.nationId}`),
      tier: t(`tier.${legacy.tier}`),
      verdict: t(`tier.${legacy.tier}.verdict`),
      peakOvr: legacy.peakOvr,
      score: legacy.score,
      retiredLine: t('legacy.retired', { age: legacy.retiredAt }),
      dreamLine: t(legacy.dreamAchieved ? 'legacy.dreamAchieved' : 'legacy.dreamFailed', {
        dream: t(`dream.${player.identity.dream}`),
      }),
      dreamAchieved: legacy.dreamAchieved,
      stats: [
        { label: t('stat.seasons'), value: String(legacy.seasons) },
        { label: t('stat.apps'), value: String(totals.apps) },
        {
          label: isGk ? t('stat.cleanSheets') : t('stat.goals'),
          value: String(isGk ? totals.cleanSheets : totals.goals),
        },
        { label: t('stat.assists'), value: String(totals.assists) },
        { label: t('stat.caps'), value: String(totals.caps) },
        { label: t('hub.trophies'), value: String(totals.trophies.length) },
        { label: t('stat.peakValue'), value: money(totals.peakValue) },
        { label: t('stat.level'), value: String(legacy.level) },
        { label: t('legacy.score'), value: String(legacy.score) },
      ],
      clubsLabel: t('legacy.clubsPlayed'),
      clubs: clubNamesOf(state),
      honoursLabel: t('hub.trophies'),
      honours,
      footer: t('legacy.score'),
    }
  }, [legacy, player, totals, state, honours, t])

  useEffect(() => {
    if (canvasRef.current && cardData) drawLegacyCard(canvasRef.current, cardData)
  }, [cardData])

  if (!legacy || !cardData) return null

  const summaryText = [
    `${cardData.playerName} · ${cardData.tier}`,
    `${t('stat.seasons')}: ${legacy.seasons} · ${t('stat.apps')}: ${totals.apps} · ${t('stat.goals')}: ${totals.goals} · ${t('stat.assists')}: ${totals.assists}`,
    `${t('stat.peakOvr')}: ${legacy.peakOvr} · ${t('hub.trophies')}: ${totals.trophies.length} · ${t('stat.caps')}: ${totals.caps}`,
    `${t('legacy.score')}: ${legacy.score}`,
  ].join('\n')

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer; la carta sigue descargable.
    }
  }

  return (
    <div className="stack">
      <Card>
        <div className="legacy-hero">
          <div className="legacy-tier">{cardData.tier}</div>
          <p className="legacy-verdict">{cardData.verdict}</p>
        </div>
      </Card>

      <Card title={t('legacy.title')}>
        <canvas ref={canvasRef} className="legacy-canvas" role="img" aria-label={summaryText} />
        <div className="row" style={{ marginTop: 14, justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() =>
              canvasRef.current &&
              downloadCanvas(
                canvasRef.current,
                `leyenda-${player.identity.lastName.toLowerCase() || 'carrera'}.png`,
              )
            }
          >
            {t('legacy.download')}
          </button>
          <button className="btn" type="button" onClick={copySummary}>
            {copied ? t('legacy.copied') : t('legacy.copy')}
          </button>
        </div>
        <p className="tiny dim" style={{ marginTop: 10, textAlign: 'center' }}>
          {t('legacy.downloadHint')}
        </p>
      </Card>

      <Card title={t('hub.totals')}>
        <div className="grid-4">
          <Stat name={t('stat.seasons')} value={legacy.seasons} />
          <Stat name={t('stat.apps')} value={totals.apps} />
          <Stat name={t('stat.goals')} value={totals.goals} />
          <Stat name={t('stat.assists')} value={totals.assists} />
          <Stat name={t('stat.caps')} value={totals.caps} />
          <Stat name={t('stat.intlGoals')} value={totals.intlGoals} />
          <Stat name={t('stat.peakOvr')} value={legacy.peakOvr} />
          <Stat name={t('stat.peakValue')} value={money(totals.peakValue)} />
          <Stat name={t('stat.motm')} value={totals.motm} />
          <Stat name={t('stat.injuries')} value={totals.injuries} />
          <Stat name={t('stat.clubs')} value={totals.clubs.length} />
          <Stat name={t('stat.earnings')} value={money(totals.careerEarnings)} />
        </div>
      </Card>

      <TrophyCase trophies={totals.trophies} awards={totals.awards} />

      {legacy.bestSeason ? (
        <Card title={t('legacy.bestSeason')}>
          <div className="spread">
            <div>
              <strong>{legacy.bestSeason.season}</strong>
              <div className="small muted">
                {getClub(legacy.bestSeason.clubId).name} ·{' '}
                {getLeague(legacy.bestSeason.leagueId).name}
              </div>
            </div>
            <div className="small muted" style={{ textAlign: 'right' }}>
              {legacy.bestSeason.stats.goals} {t('stat.goals').toLowerCase()} ·{' '}
              {legacy.bestSeason.stats.assists} {t('stat.assists').toLowerCase()} ·{' '}
              {legacy.bestSeason.stats.rating.toFixed(2)}
            </div>
          </div>
          <ul className="highlights" style={{ marginTop: 12 }}>
            {legacy.bestSeason.highlights.map((h, i) => (
              <li key={i}>{tx(h)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title={t('legacy.viewCareer')}>
        <CareerGrid state={state} />
      </Card>

      <button className="btn btn-primary btn-block" type="button" onClick={onReplay}>
        {t('legacy.replay')}
      </button>
    </div>
  )
}
