import type { ReactNode } from 'react'
import { LOCALES, useI18n } from '../i18n'
import { meterColor } from '../format'

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n()
  return (
    <div className="locale-switch" role="group" aria-label={t('app.language')}>
      {LOCALES.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={locale === l.id}
          onClick={() => setLocale(l.id)}
        >
          {l.id.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export function Meter({ name, value, max = 100 }: { name: string; value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="meter">
      <div className="meter-head">
        <span className="name">{name}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="meter-bar">
        <div className="meter-fill" style={{ width: `${pct}%`, background: meterColor(pct) }} />
      </div>
    </div>
  )
}

export function Stat({ name, value }: { name: string; value: ReactNode }) {
  return (
    <div className="stat">
      <div className="value">{value}</div>
      <div className="name">{name}</div>
    </div>
  )
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card fade-in">
      {title ? <h3 className="card-title">{title}</h3> : null}
      {children}
    </section>
  )
}

export function Chip({ children, variant }: { children: ReactNode; variant?: 'accent' | 'gold' }) {
  return (
    <span className={`chip${variant ? ` chip-${variant}` : ''}`}>{children}</span>
  )
}
