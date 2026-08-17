import type { Confederation, Nation, NameGroup } from '../engine/types'

/**
 * `strength` es la fuerza futbolística de la selección (0-100). Se usa para:
 *  - el umbral de convocatoria (cuanto más fuerte la selección, más difícil entrar),
 *  - la probabilidad de clasificarse y de avanzar en los torneos,
 *  - el atractivo del jugador en el mercado internacional.
 */
const n = (
  id: string,
  name: string,
  conf: Confederation,
  strength: number,
  names: NameGroup,
): Nation => ({ id, name, conf, strength, names })

export const NATIONS: Nation[] = [
  // UEFA
  n('ESP', 'España', 'UEFA', 94, 'es'),
  n('ENG', 'Inglaterra', 'UEFA', 92, 'en'),
  n('FRA', 'Francia', 'UEFA', 94, 'fr'),
  n('GER', 'Alemania', 'UEFA', 90, 'de'),
  n('ITA', 'Italia', 'UEFA', 88, 'it'),
  n('POR', 'Portugal', 'UEFA', 90, 'pt'),
  n('NED', 'Países Bajos', 'UEFA', 87, 'nl'),
  n('BEL', 'Bélgica', 'UEFA', 84, 'nl'),
  n('CRO', 'Croacia', 'UEFA', 82, 'balkan'),
  n('SUI', 'Suiza', 'UEFA', 76, 'de'),
  n('DEN', 'Dinamarca', 'UEFA', 78, 'scandi'),
  n('AUT', 'Austria', 'UEFA', 76, 'de'),
  n('TUR', 'Turquía', 'UEFA', 76, 'tr'),
  n('UKR', 'Ucrania', 'UEFA', 74, 'slavic'),
  n('SRB', 'Serbia', 'UEFA', 74, 'balkan'),
  n('POL', 'Polonia', 'UEFA', 73, 'slavic'),
  n('SWE', 'Suecia', 'UEFA', 72, 'scandi'),
  n('NOR', 'Noruega', 'UEFA', 74, 'scandi'),
  n('CZE', 'Chequia', 'UEFA', 71, 'slavic'),
  n('SCO', 'Escocia', 'UEFA', 70, 'en'),
  n('GRE', 'Grecia', 'UEFA', 70, 'gr'),
  n('HUN', 'Hungría', 'UEFA', 69, 'hu'),
  n('ROU', 'Rumanía', 'UEFA', 68, 'ro'),
  n('RUS', 'Rusia', 'UEFA', 70, 'slavic'),
  n('WAL', 'Gales', 'UEFA', 68, 'en'),
  n('IRL', 'Irlanda', 'UEFA', 66, 'en'),
  n('SVN', 'Eslovenia', 'UEFA', 66, 'balkan'),
  n('SVK', 'Eslovaquia', 'UEFA', 65, 'slavic'),
  n('BIH', 'Bosnia', 'UEFA', 65, 'balkan'),
  n('FIN', 'Finlandia', 'UEFA', 63, 'scandi'),
  n('ALB', 'Albania', 'UEFA', 62, 'balkan'),
  n('GEO', 'Georgia', 'UEFA', 62, 'geo'),
  n('BUL', 'Bulgaria', 'UEFA', 60, 'slavic'),
  n('NIR', 'Irlanda del Norte', 'UEFA', 58, 'en'),
  n('ISL', 'Islandia', 'UEFA', 58, 'scandi'),
  n('ISR', 'Israel', 'UEFA', 60, 'he'),
  n('LUX', 'Luxemburgo', 'UEFA', 48, 'fr'),
  n('AND', 'Andorra', 'UEFA', 28, 'es'),
  // CONMEBOL
  n('BRA', 'Brasil', 'CONMEBOL', 94, 'br'),
  n('ARG', 'Argentina', 'CONMEBOL', 95, 'es'),
  n('URU', 'Uruguay', 'CONMEBOL', 84, 'es'),
  n('COL', 'Colombia', 'CONMEBOL', 82, 'es'),
  n('ECU', 'Ecuador', 'CONMEBOL', 76, 'es'),
  n('CHI', 'Chile', 'CONMEBOL', 74, 'es'),
  n('PER', 'Perú', 'CONMEBOL', 70, 'es'),
  n('PAR', 'Paraguay', 'CONMEBOL', 70, 'es'),
  n('VEN', 'Venezuela', 'CONMEBOL', 66, 'es'),
  n('BOL', 'Bolivia', 'CONMEBOL', 60, 'es'),
  // CONCACAF
  n('MEX', 'México', 'CONCACAF', 78, 'es'),
  n('USA', 'Estados Unidos', 'CONCACAF', 78, 'en'),
  n('CAN', 'Canadá', 'CONCACAF', 72, 'en'),
  n('CRC', 'Costa Rica', 'CONCACAF', 65, 'es'),
  n('PAN', 'Panamá', 'CONCACAF', 63, 'es'),
  n('JAM', 'Jamaica', 'CONCACAF', 62, 'en'),
  n('HON', 'Honduras', 'CONCACAF', 58, 'es'),
  // CAF
  n('MAR', 'Marruecos', 'CAF', 82, 'ar'),
  n('SEN', 'Senegal', 'CAF', 80, 'wafr'),
  n('NGA', 'Nigeria', 'CAF', 78, 'wafr'),
  n('EGY', 'Egipto', 'CAF', 76, 'ar'),
  n('ALG', 'Argelia', 'CAF', 76, 'ar'),
  n('CIV', 'Costa de Marfil', 'CAF', 75, 'wafr'),
  n('TUN', 'Túnez', 'CAF', 72, 'ar'),
  n('CMR', 'Camerún', 'CAF', 72, 'wafr'),
  n('GHA', 'Ghana', 'CAF', 72, 'wafr'),
  n('MLI', 'Malí', 'CAF', 70, 'wafr'),
  n('RSA', 'Sudáfrica', 'CAF', 66, 'wafr'),
  // AFC / OFC
  n('JPN', 'Japón', 'AFC', 80, 'jp'),
  n('KOR', 'Corea del Sur', 'AFC', 78, 'kr'),
  n('IRN', 'Irán', 'AFC', 74, 'fa'),
  n('AUS', 'Australia', 'OFC', 72, 'en'),
  n('KSA', 'Arabia Saudí', 'AFC', 68, 'ar'),
  n('QAT', 'Catar', 'AFC', 64, 'ar'),
  n('CHN', 'China', 'AFC', 56, 'cn'),
  n('IND', 'India', 'AFC', 48, 'in'),
  n('NZL', 'Nueva Zelanda', 'OFC', 56, 'en'),
]

export const NATION_BY_ID = new Map(NATIONS.map((x) => [x.id, x]))

export function getNation(id: string): Nation {
  const nat = NATION_BY_ID.get(id)
  if (!nat) throw new Error(`Nación desconocida: ${id}`)
  return nat
}

/** Nacionalidades sugeridas al crear jugador (las más jugadas primero). */
export const FEATURED_NATIONS = [
  'ESP', 'ARG', 'BRA', 'ENG', 'FRA', 'POR', 'GER', 'ITA', 'NED', 'MEX',
  'COL', 'URU', 'USA', 'MAR', 'JPN', 'NGA', 'CRO', 'BEL', 'NOR', 'TUR',
]
