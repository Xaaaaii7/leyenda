import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { I18nContext, loadLocale, saveLocale, translate, translateTxt } from './i18n'
import type { Locale } from './i18n'
import { autoPlay, choose, createCareer, step } from './engine/career'
import type { CareerSetup, CareerState, Step } from './engine/types'
import { clearCareer, loadCareer, saveCareer } from './storage'
import { LocaleSwitcher } from './components/Bits'
import { Home } from './components/Home'
import { CreatePlayer } from './components/CreatePlayer'
import { CareerHub } from './components/CareerHub'
import { LegacyScreen } from './components/LegacyScreen'

type Screen = 'home' | 'create' | 'career' | 'legacy'

export default function App() {
  const [locale, setLocaleState] = useState<Locale>(() => loadLocale())
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    saveLocale(next)
    document.documentElement.lang = next
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const i18n = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string, params?: Parameters<typeof translate>[2]) => translate(locale, key, params),
      tx: (txt: Parameters<typeof translateTxt>[1]) => translateTxt(locale, txt),
    }),
    [locale, setLocale],
  )

  // El estado de carrera se muta en sitio (el motor trabaja así), de modo que
  // vive en una ref y forzamos el repintado con un contador.
  const careerRef = useRef<CareerState | null>(null)
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const [screen, setScreen] = useState<Screen>('home')
  const [current, setCurrent] = useState<Step | null>(null)
  const [saved, setSaved] = useState<CareerState | null>(() => loadCareer())

  const persist = useCallback(() => {
    if (careerRef.current) saveCareer(careerRef.current)
  }, [])

  /** Pide el siguiente paso al motor y lo muestra. */
  const advance = useCallback(() => {
    const state = careerRef.current
    if (!state) return
    const next = step(state)
    setCurrent(next)
    persist()
    bump()
  }, [persist])

  const startCareer = useCallback(
    (setup: CareerSetup) => {
      const state = createCareer(setup)
      careerRef.current = state
      setScreen('career')
      const first = step(state)
      setCurrent(first)
      saveCareer(state)
      setSaved(state)
      bump()
    },
    [],
  )

  const continueCareer = useCallback(() => {
    const state = loadCareer()
    if (!state) return
    careerRef.current = state
    setScreen(state.phase === 'done' ? 'legacy' : 'career')
    setCurrent(step(state))
    bump()
  }, [])

  const onChoose = useCallback(
    (optionId: string) => {
      const state = careerRef.current
      if (!state) return
      choose(state, optionId)
      const next = step(state)
      setCurrent(next)
      persist()
      bump()
    },
    [persist],
  )

  /** Simula lo que queda de carrera tomando la primera opción de cada decisión. */
  const onAutoplay = useCallback(() => {
    const state = careerRef.current
    if (!state) return
    const steps = autoPlay(state)
    setCurrent(steps[steps.length - 1])
    persist()
    setScreen('legacy')
    bump()
  }, [persist])

  const goHome = useCallback(() => {
    setSaved(loadCareer())
    setScreen('home')
  }, [])

  const discard = useCallback(() => {
    clearCareer()
    careerRef.current = null
    setSaved(null)
    setCurrent(null)
  }, [])

  const replay = useCallback(() => {
    discard()
    setScreen('create')
  }, [discard])

  const state = careerRef.current

  return (
    <I18nContext.Provider value={i18n}>
      <div className="shell">
        <header className="topbar">
          <button
            className="brand"
            type="button"
            onClick={goHome}
            style={{ background: 'none', border: 0, color: 'inherit', padding: 0 }}
          >
            <span className="ball">⚽</span>
            {i18n.t('app.title')}
          </button>
          <LocaleSwitcher />
        </header>

        <main>
          {screen === 'home' ? (
            <Home
              saved={saved}
              onNew={() => setScreen('create')}
              onContinue={continueCareer}
              onDiscard={discard}
            />
          ) : null}

          {screen === 'create' ? (
            <CreatePlayer onStart={startCareer} onCancel={goHome} />
          ) : null}

          {screen === 'career' && state && current ? (
            <CareerHub
              state={state}
              step={current}
              onChoose={onChoose}
              onAdvance={advance}
              onAutoplay={onAutoplay}
              onFinish={() => setScreen('legacy')}
            />
          ) : null}

          {screen === 'legacy' && state ? (
            <LegacyScreen state={state} onReplay={replay} />
          ) : null}
        </main>
      </div>
    </I18nContext.Provider>
  )
}
