import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { FEATURED_NATIONS, NATIONS, getNation } from '../data/nations'
import { FIRST_NAMES, LAST_NAMES } from '../data/names'
import {
  CREATION_POINTS, MAX_BOOST_PER_ATTR, buildAttributes, ovrOf,
} from '../engine/player'
import { Rng } from '../engine/rng'
import { ATTRIBUTE_KEYS } from '../engine/types'
import type { AttributeKey, CareerSetup, Dream, Foot, Position } from '../engine/types'
import { attrKey } from '../format'
import { Card } from './Bits'

const POSITIONS: Position[] = ['GK', 'DF', 'MF', 'FW']
const DREAMS: Dream[] = ['ballon', 'worldcup', 'legend']
const FEET: Foot[] = ['R', 'L', 'B']
const STEPS = 5

interface Props {
  onStart: (setup: CareerSetup) => void
  onCancel: () => void
}

/** Nacionalidades destacadas primero, el resto por orden alfabético del idioma activo. */
function useSortedNations(labelOf: (id: string) => string) {
  return useMemo(() => {
    const featured = FEATURED_NATIONS.filter((id) => NATIONS.some((n) => n.id === id))
    const rest = NATIONS.map((n) => n.id)
      .filter((id) => !featured.includes(id))
      .sort((a, b) => labelOf(a).localeCompare(labelOf(b)))
    return { featured, rest }
  }, [labelOf])
}

export function CreatePlayer({ onStart, onCancel }: Props) {
  const { t } = useI18n()
  const [stepIndex, setStepIndex] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [number, setNumber] = useState(10)
  const [foot, setFoot] = useState<Foot>('R')
  const [nationId, setNationId] = useState('ESP')
  const [position, setPosition] = useState<Position>('FW')
  const [dream, setDream] = useState<Dream>('ballon')
  const [boosts, setBoosts] = useState<Record<AttributeKey, number>>({
    pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0,
  })

  const labelOf = (id: string) => t(`nation.${id}`)
  const { featured, rest } = useSortedNations(labelOf)

  const spent = ATTRIBUTE_KEYS.reduce((a, k) => a + boosts[k], 0)
  const left = CREATION_POINTS - spent

  // Vista previa determinista: la media que se ve aquí es la que tendrá el jugador.
  const previewOvr = useMemo(
    () => ovrOf(buildAttributes(position, boosts, new Rng(1)), position),
    [position, boosts],
  )

  const rollName = () => {
    const rng = new Rng(Math.floor(Math.random() * 2 ** 31))
    const group = getNation(nationId).names
    setFirstName(rng.pick(FIRST_NAMES[group]))
    setLastName(rng.pick(LAST_NAMES[group]))
  }

  const setBoost = (key: AttributeKey, delta: number) => {
    setBoosts((prev) => {
      const next = prev[key] + delta
      if (next < 0 || next > MAX_BOOST_PER_ATTR) return prev
      if (delta > 0 && left <= 0) return prev
      return { ...prev, [key]: next }
    })
  }

  const canAdvance =
    stepIndex !== 0 || (firstName.trim().length > 0 && lastName.trim().length > 0)

  const start = () => {
    onStart({
      identity: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        number,
        foot,
        nationId,
        position,
        dream,
      },
      attributeBoosts: boosts,
      seed: Math.floor(Math.random() * 2 ** 31),
      startYear: new Date().getFullYear(),
    })
  }

  return (
    <div className="stack">
      <div className="spread">
        <h2 style={{ fontSize: 24 }}>{t('create.title')}</h2>
        <div className="progress-dots" aria-label={t('create.step', { n: stepIndex + 1, total: STEPS })}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i <= stepIndex ? 'on' : ''} />
          ))}
        </div>
      </div>

      {stepIndex === 0 ? (
        <Card title={t('create.identity')}>
          <div className="stack">
            <div className="grid-2">
              <div className="field">
                <label htmlFor="firstName">{t('create.firstName')}</label>
                <input
                  id="firstName"
                  value={firstName}
                  maxLength={18}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="lastName">{t('create.lastName')}</label>
                <input
                  id="lastName"
                  value={lastName}
                  maxLength={18}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <button className="btn-ghost small" type="button" onClick={rollName}>
              🎲 {t('create.randomName')}
            </button>

            <div className="grid-2">
              <div className="field">
                <label htmlFor="number">{t('create.number')}</label>
                <input
                  id="number"
                  type="number"
                  min={1}
                  max={99}
                  value={number}
                  onChange={(e) => setNumber(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                />
              </div>
              <div className="field">
                <label htmlFor="foot">{t('create.foot')}</label>
                <select id="foot" value={foot} onChange={(e) => setFoot(e.target.value as Foot)}>
                  {FEET.map((f) => (
                    <option key={f} value={f}>{t(`foot.${f}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="nation">{t('create.nation')}</label>
              <select id="nation" value={nationId} onChange={(e) => setNationId(e.target.value)}>
                {featured.map((id) => (
                  <option key={id} value={id}>{labelOf(id)}</option>
                ))}
                <option disabled>──────────</option>
                {rest.map((id) => (
                  <option key={id} value={id}>{labelOf(id)}</option>
                ))}
              </select>
              <span className="tiny dim">{t('create.nationHint')}</span>
            </div>
          </div>
        </Card>
      ) : null}

      {stepIndex === 1 ? (
        <Card title={t('create.position')}>
          <p className="small muted" style={{ marginBottom: 12 }}>{t('create.positionHint')}</p>
          <div className="grid-2">
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                className="choice"
                aria-pressed={position === p}
                onClick={() => setPosition(p)}
              >
                <span className="choice-title">{t(`position.${p}.name`)}</span>
                <span className="choice-desc">{t(`position.${p}.desc`)}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {stepIndex === 2 ? (
        <Card title={t('create.dream')}>
          <p className="small muted" style={{ marginBottom: 12 }}>{t('create.dreamHint')}</p>
          <div className="stack" style={{ gap: 10 }}>
            {DREAMS.map((d) => (
              <button
                key={d}
                type="button"
                className="choice"
                aria-pressed={dream === d}
                onClick={() => setDream(d)}
              >
                <span className="choice-title">{t(`dream.${d}`)}</span>
                <span className="choice-desc">{t(`dream.${d}.desc`)}</span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {stepIndex === 3 ? (
        <Card title={t('create.attributes', { points: CREATION_POINTS })}>
          <div className="spread" style={{ marginBottom: 12 }}>
            <span className="small muted">{t('create.attributesHint', { max: MAX_BOOST_PER_ATTR })}</span>
            <strong className={left === 0 ? 'muted' : ''} style={{ whiteSpace: 'nowrap' }}>
              {t('create.pointsLeft', { n: left })}
            </strong>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {ATTRIBUTE_KEYS.map((key) => (
              <div key={key} className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{t(attrKey(key, position))}</span>
                <span className="row" style={{ gap: 8 }}>
                  <button
                    className="btn"
                    type="button"
                    style={{ padding: '4px 12px' }}
                    onClick={() => setBoost(key, -1)}
                    disabled={boosts[key] === 0}
                    aria-label={`− ${t(attrKey(key, position))}`}
                  >
                    −
                  </button>
                  <strong style={{ minWidth: 22, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {boosts[key]}
                  </strong>
                  <button
                    className="btn"
                    type="button"
                    style={{ padding: '4px 12px' }}
                    onClick={() => setBoost(key, 1)}
                    disabled={left === 0 || boosts[key] === MAX_BOOST_PER_ATTR}
                    aria-label={`+ ${t(attrKey(key, position))}`}
                  >
                    +
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="spread">
            <span className="small muted">{t('create.ovrPreview')}</span>
            <strong style={{ fontSize: 20 }}>{previewOvr}</strong>
          </div>
        </Card>
      ) : null}

      {stepIndex === 4 ? (
        <Card title={t('create.summary')}>
          <p className="small muted" style={{ marginBottom: 14 }}>{t('create.summaryHint')}</p>
          <div className="player-head">
            <div className="ovr-badge">
              <span className="value">{previewOvr}</span>
              <span className="label">{t(`position.${position}.short`)}</span>
            </div>
            <div>
              <div className="player-name">
                {firstName} {lastName} <span className="muted">#{number}</span>
              </div>
              <div className="chips">
                <span className="chip">{labelOf(nationId)}</span>
                <span className="chip">{t(`position.${position}.name`)}</span>
                <span className="chip">{t(`foot.${foot}`)}</span>
                <span className="chip chip-gold">{t(`dream.${dream}`)}</span>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button
          className="btn"
          type="button"
          onClick={() => (stepIndex === 0 ? onCancel() : setStepIndex((i) => i - 1))}
        >
          {t('common.back')}
        </button>
        {stepIndex < STEPS - 1 ? (
          <button
            className="btn btn-primary"
            type="button"
            disabled={!canAdvance}
            onClick={() => setStepIndex((i) => i + 1)}
          >
            {t('common.next')}
          </button>
        ) : (
          <button className="btn btn-primary" type="button" onClick={start}>
            {t('common.start')}
          </button>
        )}
      </div>
    </div>
  )
}
