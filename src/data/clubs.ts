import type { Club, League } from '../engine/types'

/**
 * `strength` de liga = nivel medio y prestigio televisivo de la competición.
 * `prestige` de club = 30 (modesto de segunda) a 95 (gigante europeo). Determina
 * el nivel exigido para ser titular, los títulos que pelea y el salario.
 */
const lg = (
  id: string,
  name: string,
  nationId: string,
  tier: number,
  strength: number,
  continental: 'UCL' | 'LIB' | 'CAF' | 'AFC' | 'CONCACAF' | 'NONE',
): League => ({ id, name, nationId, tier, strength, continental })

export const LEAGUES: League[] = [
  lg('ENG1', 'Premier League', 'ENG', 1, 95, 'UCL'),
  lg('ESP1', 'LaLiga', 'ESP', 1, 92, 'UCL'),
  lg('ITA1', 'Serie A', 'ITA', 1, 89, 'UCL'),
  lg('GER1', 'Bundesliga', 'GER', 1, 88, 'UCL'),
  lg('FRA1', 'Ligue 1', 'FRA', 1, 83, 'UCL'),
  lg('POR1', 'Liga Portugal', 'POR', 1, 78, 'UCL'),
  lg('NED1', 'Eredivisie', 'NED', 1, 77, 'UCL'),
  lg('BRA1', 'Brasileirão', 'BRA', 1, 78, 'LIB'),
  lg('ARG1', 'Liga Profesional', 'ARG', 1, 74, 'LIB'),
  lg('TUR1', 'Süper Lig', 'TUR', 1, 73, 'UCL'),
  lg('BEL1', 'Pro League', 'BEL', 1, 71, 'UCL'),
  lg('SAU1', 'Saudi Pro League', 'KSA', 1, 71, 'AFC'),
  lg('ENG2', 'Championship', 'ENG', 2, 71, 'NONE'),
  lg('RUS1', 'Premier Liga', 'RUS', 1, 69, 'NONE'),
  lg('MEX1', 'Liga MX', 'MEX', 1, 68, 'CONCACAF'),
  lg('GER2', '2. Bundesliga', 'GER', 2, 67, 'NONE'),
  lg('USA1', 'Major League Soccer', 'USA', 1, 66, 'CONCACAF'),
  lg('ESP2', 'LaLiga Hypermotion', 'ESP', 2, 66, 'NONE'),
  lg('SCO1', 'Scottish Premiership', 'SCO', 1, 66, 'UCL'),
  lg('GRE1', 'Super League', 'GRE', 1, 65, 'UCL'),
  lg('AUT1', 'Bundesliga austríaca', 'AUT', 1, 65, 'UCL'),
  lg('SUI1', 'Super League suiza', 'SUI', 1, 65, 'UCL'),
  lg('JPN1', 'J1 League', 'JPN', 1, 65, 'AFC'),
  lg('ITA2', 'Serie B', 'ITA', 2, 63, 'NONE'),
  lg('DEN1', 'Superliga', 'DEN', 1, 63, 'UCL'),
  lg('COL1', 'Liga BetPlay', 'COL', 1, 63, 'LIB'),
  lg('CRO1', 'HNL', 'CRO', 1, 61, 'UCL'),
  lg('CZE1', 'Fortuna Liga', 'CZE', 1, 61, 'UCL'),
  lg('POL1', 'Ekstraklasa', 'POL', 1, 60, 'UCL'),
  lg('FRA2', 'Ligue 2', 'FRA', 2, 60, 'NONE'),
  lg('NOR1', 'Eliteserien', 'NOR', 1, 59, 'UCL'),
  lg('SWE1', 'Allsvenskan', 'SWE', 1, 59, 'UCL'),
  lg('KOR1', 'K League 1', 'KOR', 1, 59, 'AFC'),
  lg('MAR1', 'Botola Pro', 'MAR', 1, 57, 'CAF'),
  lg('EGY1', 'Egyptian Premier League', 'EGY', 1, 57, 'CAF'),
  lg('AUS1', 'A-League', 'AUS', 1, 55, 'AFC'),
  lg('RSA1', 'PSL', 'RSA', 1, 53, 'CAF'),
  lg('IND1', 'Indian Super League', 'IND', 1, 46, 'AFC'),
]

export const LEAGUE_BY_ID = new Map(LEAGUES.map((l) => [l.id, l]))

const c = (id: string, name: string, leagueId: string, prestige: number, city: string): Club =>
  ({ id, name, leagueId, prestige, city })

export const CLUBS: Club[] = [
  // ── Premier League ────────────────────────────────────────────────
  c('mci', 'Manchester City', 'ENG1', 95, 'Mánchester'),
  c('liv', 'Liverpool', 'ENG1', 93, 'Liverpool'),
  c('ars', 'Arsenal', 'ENG1', 92, 'Londres'),
  c('che', 'Chelsea', 'ENG1', 89, 'Londres'),
  c('mun', 'Manchester United', 'ENG1', 88, 'Mánchester'),
  c('tot', 'Tottenham Hotspur', 'ENG1', 85, 'Londres'),
  c('new', 'Newcastle United', 'ENG1', 83, 'Newcastle'),
  c('avl', 'Aston Villa', 'ENG1', 82, 'Birmingham'),
  c('bha', 'Brighton', 'ENG1', 78, 'Brighton'),
  c('whu', 'West Ham United', 'ENG1', 77, 'Londres'),
  c('cry', 'Crystal Palace', 'ENG1', 74, 'Londres'),
  c('bre', 'Brentford', 'ENG1', 73, 'Londres'),
  c('eve', 'Everton', 'ENG1', 72, 'Liverpool'),
  c('ful', 'Fulham', 'ENG1', 72, 'Londres'),
  c('wol', 'Wolverhampton', 'ENG1', 70, 'Wolverhampton'),
  c('bou', 'Bournemouth', 'ENG1', 70, 'Bournemouth'),
  c('nfo', 'Nottingham Forest', 'ENG1', 70, 'Nottingham'),
  // ── LaLiga ────────────────────────────────────────────────────────
  c('rma', 'Real Madrid', 'ESP1', 96, 'Madrid'),
  c('fcb', 'FC Barcelona', 'ESP1', 94, 'Barcelona'),
  c('atm', 'Atlético de Madrid', 'ESP1', 88, 'Madrid'),
  c('ath', 'Athletic Club', 'ESP1', 81, 'Bilbao'),
  c('rso', 'Real Sociedad', 'ESP1', 79, 'San Sebastián'),
  c('vil', 'Villarreal', 'ESP1', 78, 'Villarreal'),
  c('bet', 'Real Betis', 'ESP1', 76, 'Sevilla'),
  c('sev', 'Sevilla FC', 'ESP1', 76, 'Sevilla'),
  c('val', 'Valencia CF', 'ESP1', 74, 'Valencia'),
  c('cel', 'Celta de Vigo', 'ESP1', 70, 'Vigo'),
  c('osa', 'CA Osasuna', 'ESP1', 68, 'Pamplona'),
  c('gir', 'Girona FC', 'ESP1', 71, 'Girona'),
  c('rym', 'Rayo Vallecano', 'ESP1', 66, 'Madrid'),
  c('mlg', 'RCD Mallorca', 'ESP1', 66, 'Palma'),
  c('gtf', 'Getafe CF', 'ESP1', 65, 'Getafe'),
  c('esp', 'RCD Espanyol', 'ESP1', 66, 'Barcelona'),
  // ── Serie A ───────────────────────────────────────────────────────
  c('int', 'Inter de Milán', 'ITA1', 91, 'Milán'),
  c('acm', 'AC Milan', 'ITA1', 87, 'Milán'),
  c('juv', 'Juventus', 'ITA1', 88, 'Turín'),
  c('nap', 'Napoli', 'ITA1', 86, 'Nápoles'),
  c('rom', 'AS Roma', 'ITA1', 82, 'Roma'),
  c('laz', 'Lazio', 'ITA1', 80, 'Roma'),
  c('atl', 'Atalanta', 'ITA1', 82, 'Bérgamo'),
  c('fio', 'Fiorentina', 'ITA1', 77, 'Florencia'),
  c('bol', 'Bologna', 'ITA1', 74, 'Bolonia'),
  c('tor', 'Torino', 'ITA1', 70, 'Turín'),
  c('udi', 'Udinese', 'ITA1', 68, 'Údine'),
  c('gen', 'Genoa', 'ITA1', 66, 'Génova'),
  // ── Bundesliga ────────────────────────────────────────────────────
  c('bay', 'Bayern de Múnich', 'GER1', 94, 'Múnich'),
  c('bvb', 'Borussia Dortmund', 'GER1', 87, 'Dortmund'),
  c('b04', 'Bayer Leverkusen', 'GER1', 86, 'Leverkusen'),
  c('rbl', 'RB Leipzig', 'GER1', 84, 'Leipzig'),
  c('sge', 'Eintracht Frankfurt', 'GER1', 78, 'Fráncfort'),
  c('vfb', 'VfB Stuttgart', 'GER1', 77, 'Stuttgart'),
  c('bmg', 'Borussia M’gladbach', 'GER1', 73, 'Mönchengladbach'),
  c('wob', 'VfL Wolfsburgo', 'GER1', 72, 'Wolfsburgo'),
  c('fcu', 'Union Berlin', 'GER1', 70, 'Berlín'),
  c('m05', 'Mainz 05', 'GER1', 68, 'Maguncia'),
  c('scf', 'SC Friburgo', 'GER1', 70, 'Friburgo'),
  c('wer', 'Werder Bremen', 'GER1', 68, 'Bremen'),
  // ── Ligue 1 ───────────────────────────────────────────────────────
  c('psg', 'Paris Saint-Germain', 'FRA1', 93, 'París'),
  c('mon', 'AS Monaco', 'FRA1', 81, 'Mónaco'),
  c('mar', 'Olympique de Marsella', 'FRA1', 80, 'Marsella'),
  c('lyo', 'Olympique de Lyon', 'FRA1', 77, 'Lyon'),
  c('lil', 'LOSC Lille', 'FRA1', 77, 'Lille'),
  c('ren', 'Stade Rennais', 'FRA1', 74, 'Rennes'),
  c('nic', 'OGC Nice', 'FRA1', 74, 'Niza'),
  c('len', 'RC Lens', 'FRA1', 73, 'Lens'),
  c('bre2', 'Stade Brestois', 'FRA1', 68, 'Brest'),
  c('tfc', 'Toulouse FC', 'FRA1', 66, 'Toulouse'),
  c('nte', 'FC Nantes', 'FRA1', 66, 'Nantes'),
  c('str', 'RC Estrasburgo', 'FRA1', 67, 'Estrasburgo'),
  // ── Portugal ──────────────────────────────────────────────────────
  c('ben', 'SL Benfica', 'POR1', 84, 'Lisboa'),
  c('spo', 'Sporting CP', 'POR1', 84, 'Lisboa'),
  c('por', 'FC Porto', 'POR1', 83, 'Oporto'),
  c('bra', 'SC Braga', 'POR1', 74, 'Braga'),
  c('vsc', 'Vitória SC', 'POR1', 68, 'Guimarães'),
  c('bfc', 'Boavista', 'POR1', 62, 'Oporto'),
  // ── Países Bajos ──────────────────────────────────────────────────
  c('aja', 'AFC Ajax', 'NED1', 80, 'Ámsterdam'),
  c('psv', 'PSV Eindhoven', 'NED1', 81, 'Eindhoven'),
  c('fey', 'Feyenoord', 'NED1', 79, 'Róterdam'),
  c('az', 'AZ Alkmaar', 'NED1', 72, 'Alkmaar'),
  c('twe', 'FC Twente', 'NED1', 69, 'Enschede'),
  c('utr', 'FC Utrecht', 'NED1', 66, 'Utrecht'),
  // ── Brasil ────────────────────────────────────────────────────────
  c('fla', 'Flamengo', 'BRA1', 82, 'Río de Janeiro'),
  c('pal', 'Palmeiras', 'BRA1', 82, 'São Paulo'),
  c('sao', 'São Paulo FC', 'BRA1', 78, 'São Paulo'),
  c('flu', 'Fluminense', 'BRA1', 75, 'Río de Janeiro'),
  c('cor', 'Corinthians', 'BRA1', 76, 'São Paulo'),
  c('atmg', 'Atlético Mineiro', 'BRA1', 77, 'Belo Horizonte'),
  c('int2', 'Internacional', 'BRA1', 74, 'Porto Alegre'),
  c('gre', 'Grêmio', 'BRA1', 74, 'Porto Alegre'),
  c('bot', 'Botafogo', 'BRA1', 76, 'Río de Janeiro'),
  c('san', 'Santos FC', 'BRA1', 72, 'Santos'),
  // ── Argentina ─────────────────────────────────────────────────────
  c('rvp', 'River Plate', 'ARG1', 80, 'Buenos Aires'),
  c('boc', 'Boca Juniors', 'ARG1', 79, 'Buenos Aires'),
  c('rac', 'Racing Club', 'ARG1', 73, 'Avellaneda'),
  c('ind', 'Independiente', 'ARG1', 71, 'Avellaneda'),
  c('sl', 'San Lorenzo', 'ARG1', 69, 'Buenos Aires'),
  c('vel', 'Vélez Sarsfield', 'ARG1', 70, 'Buenos Aires'),
  c('est', 'Estudiantes', 'ARG1', 69, 'La Plata'),
  c('tal', 'Talleres', 'ARG1', 68, 'Córdoba'),
  // ── Turquía ───────────────────────────────────────────────────────
  c('gal', 'Galatasaray', 'TUR1', 80, 'Estambul'),
  c('fen', 'Fenerbahçe', 'TUR1', 79, 'Estambul'),
  c('bjk', 'Beşiktaş', 'TUR1', 76, 'Estambul'),
  c('tra', 'Trabzonspor', 'TUR1', 71, 'Trebisonda'),
  c('bas2', 'Başakşehir', 'TUR1', 67, 'Estambul'),
  // ── Bélgica ───────────────────────────────────────────────────────
  c('clb', 'Club Brujas', 'BEL1', 76, 'Brujas'),
  c('and', 'RSC Anderlecht', 'BEL1', 72, 'Bruselas'),
  c('gnk', 'KRC Genk', 'BEL1', 71, 'Genk'),
  c('usg', 'Union Saint-Gilloise', 'BEL1', 71, 'Bruselas'),
  c('ant', 'Royal Antwerp', 'BEL1', 68, 'Amberes'),
  c('gnt', 'KAA Gante', 'BEL1', 67, 'Gante'),
  // ── Arabia Saudí ──────────────────────────────────────────────────
  c('hil', 'Al-Hilal', 'SAU1', 83, 'Riad'),
  c('nas', 'Al-Nassr', 'SAU1', 80, 'Riad'),
  c('ahl', 'Al-Ahli', 'SAU1', 79, 'Yeda'),
  c('itt', 'Al-Ittihad', 'SAU1', 79, 'Yeda'),
  c('shb', 'Al-Shabab', 'SAU1', 70, 'Riad'),
  // ── Championship (ENG2) ───────────────────────────────────────────
  c('lee', 'Leeds United', 'ENG2', 68, 'Leeds'),
  c('sou', 'Southampton', 'ENG2', 66, 'Southampton'),
  c('nor', 'Norwich City', 'ENG2', 63, 'Norwich'),
  c('mid', 'Middlesbrough', 'ENG2', 62, 'Middlesbrough'),
  c('cov', 'Coventry City', 'ENG2', 60, 'Coventry'),
  c('sun', 'Sunderland', 'ENG2', 63, 'Sunderland'),
  c('wba', 'West Bromwich Albion', 'ENG2', 61, 'West Bromwich'),
  c('bri', 'Bristol City', 'ENG2', 56, 'Bristol'),
  c('pne', 'Preston North End', 'ENG2', 54, 'Preston'),
  c('mil', 'Millwall', 'ENG2', 53, 'Londres'),
  // ── Rusia ─────────────────────────────────────────────────────────
  c('zen', 'Zenit', 'RUS1', 75, 'San Petersburgo'),
  c('csk', 'CSKA Moscú', 'RUS1', 71, 'Moscú'),
  c('spm', 'Spartak Moscú', 'RUS1', 71, 'Moscú'),
  c('kra', 'Krasnodar', 'RUS1', 70, 'Krasnodar'),
  c('din', 'Dinamo Moscú', 'RUS1', 68, 'Moscú'),
  // ── México ────────────────────────────────────────────────────────
  c('ame', 'Club América', 'MEX1', 73, 'Ciudad de México'),
  c('tig', 'Tigres UANL', 'MEX1', 72, 'Monterrey'),
  c('mty', 'CF Monterrey', 'MEX1', 72, 'Monterrey'),
  c('gua', 'Chivas de Guadalajara', 'MEX1', 69, 'Guadalajara'),
  c('cru', 'Cruz Azul', 'MEX1', 70, 'Ciudad de México'),
  c('tol', 'Toluca', 'MEX1', 68, 'Toluca'),
  c('pum', 'Pumas UNAM', 'MEX1', 66, 'Ciudad de México'),
  // ── 2. Bundesliga ─────────────────────────────────────────────────
  c('h96', 'Hannover 96', 'GER2', 58, 'Hannover'),
  c('s04', 'Schalke 04', 'GER2', 64, 'Gelsenkirchen'),
  c('hsv', 'Hamburger SV', 'GER2', 64, 'Hamburgo'),
  c('n05', '1. FC Núremberg', 'GER2', 57, 'Núremberg'),
  c('kar', 'Karlsruher SC', 'GER2', 55, 'Karlsruhe'),
  c('drs', 'Dynamo Dresden', 'GER2', 53, 'Dresde'),
  // ── MLS ───────────────────────────────────────────────────────────
  c('mia', 'Inter Miami CF', 'USA1', 72, 'Miami'),
  c('lafc', 'Los Angeles FC', 'USA1', 70, 'Los Ángeles'),
  c('lag', 'LA Galaxy', 'USA1', 69, 'Los Ángeles'),
  c('sea', 'Seattle Sounders', 'USA1', 67, 'Seattle'),
  c('atu', 'Atlanta United', 'USA1', 66, 'Atlanta'),
  c('nyc', 'New York City FC', 'USA1', 66, 'Nueva York'),
  c('pfc', 'Philadelphia Union', 'USA1', 65, 'Filadelfia'),
  // ── LaLiga Hypermotion (ESP2) ─────────────────────────────────────
  c('rzg', 'Real Zaragoza', 'ESP2', 58, 'Zaragoza'),
  c('spg', 'Sporting de Gijón', 'ESP2', 57, 'Gijón'),
  c('dep', 'Deportivo de La Coruña', 'ESP2', 59, 'A Coruña'),
  c('rac2', 'Racing de Santander', 'ESP2', 57, 'Santander'),
  c('lpa', 'UD Las Palmas', 'ESP2', 60, 'Las Palmas'),
  c('lev', 'Levante UD', 'ESP2', 59, 'Valencia'),
  c('alb', 'Albacete', 'ESP2', 52, 'Albacete'),
  c('hue', 'SD Huesca', 'ESP2', 52, 'Huesca'),
  c('elc', 'Elche CF', 'ESP2', 58, 'Elche'),
  c('cad', 'Cádiz CF', 'ESP2', 58, 'Cádiz'),
  // ── Escocia ───────────────────────────────────────────────────────
  c('cel2', 'Celtic FC', 'SCO1', 76, 'Glasgow'),
  c('ran', 'Rangers FC', 'SCO1', 74, 'Glasgow'),
  c('hea', 'Heart of Midlothian', 'SCO1', 62, 'Edimburgo'),
  c('hib', 'Hibernian', 'SCO1', 60, 'Edimburgo'),
  c('abe', 'Aberdeen', 'SCO1', 61, 'Aberdeen'),
  // ── Grecia / Austria / Suiza ──────────────────────────────────────
  c('oly', 'Olympiacos', 'GRE1', 74, 'El Pireo'),
  c('pao', 'PAOK', 'GRE1', 71, 'Tesalónica'),
  c('pan', 'Panathinaikos', 'GRE1', 70, 'Atenas'),
  c('aek', 'AEK Atenas', 'GRE1', 69, 'Atenas'),
  c('rbs', 'Red Bull Salzburgo', 'AUT1', 74, 'Salzburgo'),
  c('rap', 'Rapid Viena', 'AUT1', 65, 'Viena'),
  c('stu', 'Sturm Graz', 'AUT1', 67, 'Graz'),
  c('bas', 'FC Basilea', 'SUI1', 70, 'Basilea'),
  c('yb', 'Young Boys', 'SUI1', 71, 'Berna'),
  c('zur', 'FC Zúrich', 'SUI1', 63, 'Zúrich'),
  // ── Japón / Corea ─────────────────────────────────────────────────
  c('kaw', 'Kawasaki Frontale', 'JPN1', 67, 'Kawasaki'),
  c('yfm', 'Yokohama F. Marinos', 'JPN1', 66, 'Yokohama'),
  c('urw', 'Urawa Red Diamonds', 'JPN1', 66, 'Saitama'),
  c('vis', 'Vissel Kobe', 'JPN1', 67, 'Kobe'),
  c('ulsan', 'Ulsan HD', 'KOR1', 65, 'Ulsan'),
  c('jeon', 'Jeonbuk Hyundai', 'KOR1', 65, 'Jeonju'),
  c('fcs', 'FC Seoul', 'KOR1', 62, 'Seúl'),
  // ── Serie B / Ligue 2 ─────────────────────────────────────────────
  c('sam', 'Sampdoria', 'ITA2', 60, 'Génova'),
  c('pal2', 'Palermo', 'ITA2', 58, 'Palermo'),
  c('bar', 'SSC Bari', 'ITA2', 55, 'Bari'),
  c('spe', 'Spezia', 'ITA2', 56, 'La Spezia'),
  c('cat', 'Catanzaro', 'ITA2', 52, 'Catanzaro'),
  c('sce', 'AS Saint-Étienne', 'FRA2', 60, 'Saint-Étienne'),
  c('bor', 'Girondins de Burdeos', 'FRA2', 56, 'Burdeos'),
  c('gui', 'En Avant Guingamp', 'FRA2', 51, 'Guingamp'),
  c('lor', 'FC Lorient', 'FRA2', 58, 'Lorient'),
  // ── Norte y este de Europa ────────────────────────────────────────
  c('cop', 'FC Copenhague', 'DEN1', 71, 'Copenhague'),
  c('mid2', 'FC Midtjylland', 'DEN1', 69, 'Herning'),
  c('bif', 'Brøndby IF', 'DEN1', 64, 'Brøndby'),
  c('bod', 'Bodø/Glimt', 'NOR1', 68, 'Bodø'),
  c('rbk', 'Rosenborg', 'NOR1', 62, 'Trondheim'),
  c('mfk', 'Molde FK', 'NOR1', 64, 'Molde'),
  c('mal', 'Malmö FF', 'SWE1', 67, 'Malmö'),
  c('aik', 'AIK', 'SWE1', 61, 'Estocolmo'),
  c('haq', 'Hammarby', 'SWE1', 61, 'Estocolmo'),
  c('zag', 'Dinamo Zagreb', 'CRO1', 71, 'Zagreb'),
  c('haj', 'Hajduk Split', 'CRO1', 65, 'Split'),
  c('rij', 'HNK Rijeka', 'CRO1', 63, 'Rijeka'),
  c('slp', 'Slavia Praga', 'CZE1', 70, 'Praga'),
  c('spa2', 'Sparta Praga', 'CZE1', 69, 'Praga'),
  c('vik', 'Viktoria Plzeň', 'CZE1', 66, 'Pilsen'),
  c('leg', 'Legia Varsovia', 'POL1', 66, 'Varsovia'),
  c('lech', 'Lech Poznań', 'POL1', 65, 'Poznań'),
  c('rak', 'Raków Częstochowa', 'POL1', 63, 'Częstochowa'),
  // ── Colombia ──────────────────────────────────────────────────────
  c('atn', 'Atlético Nacional', 'COL1', 69, 'Medellín'),
  c('mil2', 'Millonarios', 'COL1', 66, 'Bogotá'),
  c('jun', 'Junior', 'COL1', 65, 'Barranquilla'),
  c('dim', 'Independiente Medellín', 'COL1', 63, 'Medellín'),
  // ── África ────────────────────────────────────────────────────────
  c('wac', 'Wydad Casablanca', 'MAR1', 66, 'Casablanca'),
  c('rca', 'Raja Casablanca', 'MAR1', 65, 'Casablanca'),
  c('fus', 'FUS Rabat', 'MAR1', 58, 'Rabat'),
  c('ahly', 'Al Ahly', 'EGY1', 70, 'El Cairo'),
  c('zam', 'Zamalek', 'EGY1', 67, 'El Cairo'),
  c('pir', 'Orlando Pirates', 'RSA1', 60, 'Johannesburgo'),
  c('sun2', 'Mamelodi Sundowns', 'RSA1', 64, 'Pretoria'),
  c('kai', 'Kaizer Chiefs', 'RSA1', 58, 'Johannesburgo'),
  // ── Oceanía / India ───────────────────────────────────────────────
  c('mvc', 'Melbourne Victory', 'AUS1', 57, 'Melbourne'),
  c('syd', 'Sydney FC', 'AUS1', 57, 'Sídney'),
  c('wsw', 'Western Sydney Wanderers', 'AUS1', 54, 'Sídney'),
  c('mbg', 'Mohun Bagan', 'IND1', 50, 'Calcuta'),
  c('bfc2', 'Bengaluru FC', 'IND1', 48, 'Bangalore'),
  // ── Completando plantillas de liga ────────────────────────────────
  c('lask', 'LASK', 'AUT1', 63, 'Linz'),
  c('avi', 'Austria Viena', 'AUT1', 62, 'Viena'),
  c('ser', 'Servette FC', 'SUI1', 62, 'Ginebra'),
  c('lug', 'FC Lugano', 'SUI1', 61, 'Lugano'),
  c('nsj', 'FC Nordsjælland', 'DEN1', 63, 'Farum'),
  c('agf', 'AGF Aarhus', 'DEN1', 60, 'Aarhus'),
  c('osi', 'NK Osijek', 'CRO1', 58, 'Osijek'),
  c('ban', 'Baník Ostrava', 'CZE1', 59, 'Ostrava'),
  c('jag', 'Jagiellonia', 'POL1', 62, 'Białystok'),
  c('pog', 'Pogoń Szczecin', 'POL1', 60, 'Szczecin'),
  c('brn', 'SK Brann', 'NOR1', 61, 'Bergen'),
  c('vlg', 'Viking FK', 'NOR1', 59, 'Stavanger'),
  c('djg', 'Djurgården', 'SWE1', 63, 'Estocolmo'),
  c('ifk', 'IFK Göteborg', 'SWE1', 58, 'Gotemburgo'),
  c('poh', 'Pohang Steelers', 'KOR1', 62, 'Pohang'),
  c('gwn', 'Gangwon FC', 'KOR1', 57, 'Chuncheon'),
  c('far', 'AS FAR', 'MAR1', 58, 'Rabat'),
  c('rsb', 'RS Berkane', 'MAR1', 59, 'Berkane'),
  c('pyr', 'Pyramids FC', 'EGY1', 63, 'El Cairo'),
  c('ism', 'Ismaily', 'EGY1', 53, 'Ismailía'),
  c('mcy', 'Melbourne City', 'AUS1', 58, 'Melbourne'),
  c('cco', 'Central Coast Mariners', 'AUS1', 55, 'Gosford'),
  c('ssu', 'SuperSport United', 'RSA1', 55, 'Pretoria'),
  c('stel', 'Stellenbosch FC', 'RSA1', 54, 'Stellenbosch'),
  c('mum', 'Mumbai City FC', 'IND1', 50, 'Bombay'),
  c('goa', 'FC Goa', 'IND1', 48, 'Goa'),
]

export const CLUB_BY_ID = new Map(CLUBS.map((x) => [x.id, x]))

export function getClub(id: string): Club {
  const club = CLUB_BY_ID.get(id)
  if (!club) throw new Error(`Club desconocido: ${id}`)
  return club
}

export function getLeague(id: string): League {
  const league = LEAGUE_BY_ID.get(id)
  if (!league) throw new Error(`Liga desconocida: ${id}`)
  return league
}

export function clubLeague(club: Club): League {
  return getLeague(club.leagueId)
}

/** Clubes de una liga, ordenados de mayor a menor prestigio. */
const BY_LEAGUE = new Map<string, Club[]>()
for (const club of CLUBS) {
  const arr = BY_LEAGUE.get(club.leagueId) ?? []
  arr.push(club)
  BY_LEAGUE.set(club.leagueId, arr)
}
for (const arr of BY_LEAGUE.values()) arr.sort((a, b) => b.prestige - a.prestige)

export function clubsOfLeague(leagueId: string): Club[] {
  return BY_LEAGUE.get(leagueId) ?? []
}

/** Prestigio del club más fuerte de la liga: referencia para pelear el título. */
export function leagueTopPrestige(leagueId: string): number {
  const arr = clubsOfLeague(leagueId)
  return arr.length ? arr[0].prestige : 60
}

/** Clubes de un país (todas sus divisiones). */
export function clubsOfNation(nationId: string): Club[] {
  const leagueIds = LEAGUES.filter((l) => l.nationId === nationId).map((l) => l.id)
  return CLUBS.filter((c2) => leagueIds.includes(c2.leagueId))
}
