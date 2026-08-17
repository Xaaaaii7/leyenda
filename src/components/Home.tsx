import { useState } from 'react'
import { useI18n } from '../i18n'
import { currentOvr } from '../engine/career'
import { clubName } from '../format'
import type { CareerState } from '../engine/types'
import { Card } from './Bits'

interface Props {
  saved: CareerState | null
  onNew: () => void
  onContinue: () => void
  onDiscard: () => void
}

export function Home({ saved, onNew, onContinue, onDiscard }: Props) {
  const { t } = useI18n()
  const [howTo, setHowTo] = useState(false)

  const savedInProgress = saved && saved.phase !== 'done'

  return (
    <div className="stack">
      <div style={{ padding: '28px 0 8px' }}>
        <h1 className="hero-title">{t('app.title')}</h1>
        <p className="hero-sub">{t('app.tagline')}</p>
      </div>

      <Card>
        <div className="stack">
          <button className="btn btn-primary btn-block" type="button" onClick={onNew}>
            {t('home.play')}
          </button>

          {savedInProgress ? (
            <>
              <button className="btn btn-block" type="button" onClick={onContinue}>
                {t('home.continue')}
                <span className="small muted" style={{ display: 'block', fontWeight: 500, marginTop: 3 }}>
                  {t('home.continueHint', {
                    club: saved.player.clubId ? clubName(saved.player.clubId) : t('hub.freeAgent'),
                    age: saved.player.age,
                    ovr: currentOvr(saved),
                  })}
                </span>
              </button>
              <button
                className="btn-ghost small"
                type="button"
                onClick={() => {
                  if (confirm(t('home.discardConfirm'))) onDiscard()
                }}
              >
                {t('home.discard')}
              </button>
            </>
          ) : null}
        </div>
      </Card>

      <Card>
        <button
          className="btn-ghost"
          type="button"
          onClick={() => setHowTo((v) => !v)}
          aria-expanded={howTo}
          style={{ padding: 0 }}
        >
          {howTo ? '▾ ' : '▸ '}
          {t('home.howTo')}
        </button>
        {howTo ? (
          <p className="small muted fade-in" style={{ marginTop: 12 }}>
            {t('home.howToText')}
          </p>
        ) : null}
      </Card>
    </div>
  )
}
