/**
 * Todo el texto que produce el motor viaja como clave de traducción + parámetros,
 * nunca como frase ya escrita: así el mismo estado guardado se puede leer en
 * cualquiera de los idiomas de la interfaz.
 */
export interface Txt {
  key: string
  /**
   * Un valor de parámetro puede ser un literal (nombre propio, número), otra
   * clave a traducir escribiéndola como `'@clave'`, o un `Txt` anidado con sus
   * propios parámetros.
   */
  params?: Record<string, string | number | Txt>
}

export type Position = 'GK' | 'DF' | 'MF' | 'FW'
export type Foot = 'L' | 'R' | 'B'
export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'
export type Dream = 'ballon' | 'worldcup' | 'legend'

export type NameGroup =
  | 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt' | 'br' | 'nl' | 'scandi' | 'slavic'
  | 'balkan' | 'tr' | 'gr' | 'ar' | 'wafr' | 'jp' | 'kr' | 'cn' | 'in' | 'fa'
  | 'hu' | 'ro' | 'geo' | 'he'

export interface Nation {
  id: string
  name: string
  conf: Confederation
  /** Fuerza de la selección, 0-100. */
  strength: number
  names: NameGroup
}

export interface League {
  id: string
  name: string
  nationId: string
  /** 1 = primera división, 2 = segunda. */
  tier: number
  strength: number
  /** Número de equipos de la competición real. Un test comprueba que cuadra. */
  size: number
  continental: 'UCL' | 'LIB' | 'CAF' | 'AFC' | 'CONCACAF' | 'NONE'
}

export interface Club {
  id: string
  name: string
  leagueId: string
  /** 30-96. Nivel deportivo, exigencia y capacidad salarial. */
  prestige: number
}

/**
 * Seis atributos, con etiqueta distinta según sea portero o jugador de campo.
 * Campo: ritmo / tiro / pase / regate / defensa / físico
 * Portero: estirada / paradas / saque / reflejos / colocación / físico
 */
export interface Attributes {
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
}

export type AttributeKey = keyof Attributes

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical',
]

/** Rol del jugador dentro de su plantilla durante una temporada. */
export type SquadRole = 'star' | 'starter' | 'rotation' | 'bench' | 'youth'

export interface Injury {
  /** Clave de traducción del tipo de lesión. */
  key: string
  weeks: number
  /** Merma permanente aplicada (0 si se recuperó del todo). */
  permanentLoss: number
}

export type TrophyKind =
  | 'league' | 'cup' | 'supercup' | 'ucl' | 'europa' | 'lib' | 'sudamericana'
  | 'caf' | 'afc' | 'concacaf' | 'clubwc' | 'worldcup' | 'continental' | 'promotion'

export interface Trophy {
  kind: TrophyKind
  /** Nombre del título, con los nombres propios como parámetros. */
  text: Txt
  season: string
}

export type AwardKind =
  | 'ballon' | 'goldenboy' | 'leagueMvp' | 'leagueTopScorer' | 'teamOfTheYear'
  | 'tournamentMvp' | 'puskas' | 'goldenGlove'

export interface Award {
  kind: AwardKind
  text: Txt
  season: string
}

export interface SeasonStats {
  apps: number
  minutes: number
  goals: number
  assists: number
  /** Nota media 4.0-10.0 */
  rating: number
  motm: number
  yellow: number
  red: number
  /** Sólo portero. */
  cleanSheets: number
  conceded: number
}

export interface NationalSeason {
  caps: number
  goals: number
  /** Torneo disputado esa temporada, si lo hubo. */
  tournament?: {
    /** 'worldcup' o 'continental'. */
    key: string
    year: number
    conf: Confederation
    result: TournamentResult
  }
}

export type TournamentResult =
  | 'winner' | 'final' | 'semi' | 'quarter' | 'round16' | 'group' | 'notQualified' | 'notCalled'

export interface SeasonRecord {
  index: number
  /** Ej. "2026/27" */
  season: string
  age: number
  clubId: string
  leagueId: string
  /** El club es una cesión. */
  onLoan: boolean
  parentClubId?: string
  role: SquadRole
  stats: SeasonStats
  leaguePosition: number
  trophies: Trophy[]
  awards: Award[]
  injuries: Injury[]
  national: NationalSeason
  ovrStart: number
  ovrEnd: number
  marketValue: number
  wage: number
  /** Momentos narrados de la temporada. */
  highlights: Txt[]
}

export interface PlayerIdentity {
  firstName: string
  lastName: string
  number: number
  foot: Foot
  nationId: string
  position: Position
  dream: Dream
}

export interface PlayerState {
  identity: PlayerIdentity
  age: number
  attrs: Attributes
  /** Techo de media alcanzable. */
  potential: number
  /** 0-100, condición del momento; sube y baja con minutos y decisiones. */
  form: number
  /** 0-100, felicidad con su situación. */
  morale: number
  /** 0-100, resistencia física acumulada; baja con la edad y las lesiones. */
  fitness: number
  /** 0-100, propensión a lesionarse. */
  injuryProneness: number
  /** 0-100, fama mediática; abre puertas de mercado y patrocinios. */
  reputation: number
  clubId: string
  /** Club dueño del pase cuando está cedido. */
  parentClubId?: string
  contractYears: number
  /** Salario anual en millones. */
  wage: number
  marketValue: number
  /** Temporadas completadas en el club actual. 0 = acaba de llegar. */
  seasonsAtClub: number
  /** Si es capitán del club. */
  captain: boolean
  /** Se ha retirado de la selección. */
  retiredFromNT: boolean
  /** Selección con la que juega (puede cambiar por doble nacionalidad). */
  ntNationId: string
  /** Ha pedido salir del club: fuerza el mercado del próximo verano. */
  wantsOut?: boolean
  /** Ha anunciado su retirada; la carrera acaba tras esta temporada. */
  retiringNow?: boolean
  /** Representado por un superagente: más ofertas cada verano. */
  superAgent?: boolean
  /** Ha creado su fundación benéfica. */
  foundation?: boolean
}

export interface CareerTotals {
  apps: number
  goals: number
  assists: number
  minutes: number
  motm: number
  yellow: number
  red: number
  cleanSheets: number
  caps: number
  intlGoals: number
  clubs: string[]
  trophies: Trophy[]
  awards: Award[]
  injuries: number
  peakOvr: number
  peakValue: number
  careerEarnings: number
}

export type Phase = 'preseason' | 'season' | 'postseason' | 'done'

export interface DecisionOption {
  id: string
  label: Txt
  hint?: Txt
  /** Etiqueta de riesgo mostrada en la UI. */
  tone?: 'safe' | 'bold' | 'risky' | 'money'
}

export interface Decision {
  id: string
  /** Clave del evento que la generó. */
  eventKey: string
  title: Txt
  text: Txt
  options: DecisionOption[]
  /** Datos que el efecto necesita (ids de club, etc.). */
  payload?: Record<string, unknown>
}

export interface CareerSetup {
  identity: PlayerIdentity
  /** Puntos repartidos por el usuario sobre la plantilla base de su posición. */
  attributeBoosts: Partial<Record<AttributeKey, number>>
  seed: number
  /** Año natural en el que arranca la primera temporada. */
  startYear: number
}

export type Step =
  | { kind: 'decision'; decision: Decision }
  | { kind: 'season'; record: SeasonRecord }
  | { kind: 'news'; title: Txt; text: Txt }
  | { kind: 'retired'; legacy: Legacy }

export interface Legacy {
  score: number
  /** Nivel medio (prestigio de club + fuerza de liga) al que jugó, 30-96. */
  level: number
  /** Clave del veredicto: 'immortal' | 'legend' | 'worldClass' | ... */
  tier: string
  dreamAchieved: boolean
  totals: CareerTotals
  seasons: number
  peakOvr: number
  retiredAt: number
  bestSeason?: SeasonRecord
}

export interface CareerState {
  setup: CareerSetup
  player: PlayerState
  phase: Phase
  seasonIndex: number
  year: number
  history: SeasonRecord[]
  totals: CareerTotals
  legacy?: Legacy
  /** La cola de la fase actual ya está generada. */
  prepared: boolean
  /** Cola de decisiones pendientes de la fase actual. */
  queue: Decision[]
  pending: Decision | null
  /** Noticias pendientes de mostrar. */
  news: { title: Txt; text: Txt }[]
  /** Efectos temporales que aplicará la próxima temporada. */
  modifiers: SeasonModifiers
  rngState: number
  /** Eventos únicos ya vistos, para no repetirlos. */
  seenEvents: string[]
  /** Ofertas de traspaso calculadas este verano (las consume el evento `transfer`). */
  pendingOffersCache?: OfferLike[]
  /** Ofertas de cesión calculadas este verano. */
  pendingLoansCache?: OfferLike[]
}

/** Copia estructural de `Offer` para poder tipar el estado sin importar transfers.ts. */
export interface OfferLike {
  clubId: string
  fee: number
  wage: number
  promise: SquadRole
  loan: boolean
  years: number
}

export interface SeasonModifiers {
  /** Suma directa al share de minutos (-0.3..0.3). */
  minutes: number
  /** Multiplicador de crecimiento de atributos. */
  growth: number
  /** Multiplicador de riesgo de lesión. */
  injuryRisk: number
  /** Bonus a la nota media. */
  rating: number
  /** Atributos a los que apunta el entrenamiento de este año. */
  trainingFocus: AttributeKey[]
}
