# ⚽ Leyenda

Simulador de carrera de futbolista al estilo del juego *Copero*: creas un jugador
de 16 años, eliges cantera y el motor simula hasta 24 temporadas parándose en los
momentos que importan. Cuando te retiras, genera una carta de legado descargable.

Todo corre en el navegador. Sin cuenta, sin backend, sin esperas.

**Jugar:** https://xaaaaii7.github.io/leyenda/

---

## Qué hay dentro

- **Motor determinista.** Un PRNG con semilla guardado en el propio estado: la misma
  semilla con las mismas decisiones produce exactamente la misma carrera, y
  guardar/cargar no altera el resultado.
- **666 clubes reales** en 38 ligas de 33 países. Cada liga está **completa**: tiene
  tantos equipos como la competición de verdad, y un test lo comprueba. Segundas
  divisiones incluidas, para que empezar abajo sea una posibilidad real.
- **75 selecciones** con su fuerza, confederación y calendario de torneos: Mundial
  cada cuatro años, continental en los pares intermedios.
- **Simulación por temporada:** rol en la plantilla, minutos, goles, asistencias,
  nota media, tarjetas, porterías a cero, puesto en liga, títulos, premios
  individuales, lesiones con secuelas y convocatorias.
- **20 tipos de decisión:** cantera, mercado de fichajes, cesiones, renovaciones,
  plan de pretemporada, nutrición, choque con el entrenador, capitanía, rehabilitación,
  entrevistas, patrocinios, cambio de posición, doble nacionalidad, retirada de la
  selección, superagente, fundación, bache de forma y retirada.
- **Mercado creíble**: las ofertas pesan la geografía y el nivel, así que un
  canterano español no aparece fichado por la liga india a los diecisiete, y nadie
  salta de una liga menor a la élite de un verano para otro.
- **Rejilla de carrera** con las 24 temporadas visibles desde el primer minuto, que
  se va rellenando año a año.
- **Carta de legado** dibujada en canvas y descargable como PNG.
- **Tres idiomas** (español, inglés, catalán). El motor no produce ni una sola frase
  escrita: emite claves de traducción con parámetros, así que una partida guardada se
  puede leer en cualquier idioma.

## Cómo se juega

1. Creas tu jugador: nombre, dorsal, pie, nacionalidad, posición y el sueño con el que
   se medirá tu carrera (Balón de Oro, Mundial o leyenda de club).
2. Repartes 12 puntos entre los seis atributos. La media inicial ronda 50; el techo lo
   marca un potencial oculto que sólo descubrirás jugando.
3. Cada verano tomas decisiones; cada temporada el motor la resuelve.
4. Te retiras entre los 33 y los 41 años y recibes tu carta.

Elegir el club más grande no siempre gana: allí tendrás títulos y nivel, pero pelearás
por los minutos, y cada mudanza cuesta una temporada de adaptación. En un club a tu
medida jugarás mucho más y marcarás más, pero tu producción vale menos a la hora del
veredicto final.

## Cómo progresa el jugador

El modelo está calibrado contra carreras reales jugadas en el simulador de Copero, que
sirvió de referencia. Dos curvas de media medidas allí, de los 16 a la retirada:

```
50 55 59 66 69 70 75 78 81 81 82 82 81 81 81 81 79 76 74 72 70 64 61 61
50 57 61 70 74 79 81 83 84 85 83 84 84 83 83 81 81 80 77 77 74 68
```

De ahí salen las cuatro reglas del motor:

- **La mejora es absoluta, no proporcional al margen que queda.** Se suman unos cuatro
  o cinco puntos de media por temporada mientras eres joven, con un tope de nueve. Un
  potencial altísimo no te dispara en dos años: te da *más años mejorando*.
- **Los minutos y las actuaciones mandan.** Jugar mucho y rendir por encima de tu nivel
  acelera la mejora; una temporada gris la frena. Y **una temporada sin minutos y sin
  rendir hace retroceder**, aunque tengas veintidós años.
- **El techo se puede empujar hasta 99.** No es un muro: las temporadas descomunales al
  máximo nivel lo suben, y brillar a los diecinueve cuenta mucho más que a los
  veintiocho. Cuanto más alto está, más cuesta subirlo otro punto. Sobre 2.000 carreras
  simuladas, seis llegaron a 99: es posible, pero pide elecciones acertadas y suerte.
- **El declive llega tarde y es suave.** Nada antes de los treinta y dos, y luego unos
  dos puntos por temporada.

El reparto de finales sobre 2.000 carreras queda así: leyenda inmortal 2,5%, leyenda
5,5%, clase mundial 19%, élite 26%, profesional sólido 30%, trotamundos 14%, promesa
apagada 2%.

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # 59 tests del motor, los datos y los catálogos de idioma
npm run typecheck  # TypeScript en modo estricto
npm run build      # bundle de producción en dist/
```

## Estructura

```
src/
├── data/          clubs.ts (666 clubes) · nations.ts · names.ts
├── engine/        motor de simulación, sin dependencias de React
│   ├── rng.ts         PRNG determinista (mulberry32)
│   ├── types.ts       tipos compartidos + el tipo Txt de i18n
│   ├── player.ts      atributos, curvas de desarrollo, valor de mercado
│   ├── season.ts      rol, minutos, estadísticas, lesiones, títulos, premios
│   ├── national.ts    convocatorias y torneos de selección
│   ├── transfers.ts   generación de ofertas y canteras
│   ├── events.ts      catálogo de decisiones y sus efectos
│   ├── career.ts      máquina de estados de la carrera
│   └── legacy.ts      puntuación y veredicto final
├── i18n/          resolutor + catálogos es/en/ca
├── components/    interfaz React (incluye la rejilla de carrera)
├── legacyCard.ts  dibujo de la carta en canvas
└── storage.ts     guardado en localStorage
tests/             vitest
```

### Cómo se prueba el motor

Los tests no comprueban sólo que nada explote: fijan propiedades del diseño. Que los
porteros no marquen, que los centrocampistas asistan más que los delanteros, que el
Balón de Oro sea excepcional, que la misma semilla reproduzca la carrera al byte, y que
jugar siempre en el club grande dé más títulos y más nivel mientras quedarse en uno a tu
medida dé más goles.

También fijan el modelo de progresión: que la subida de una temporada nunca pase del
tope, que jugar más y rendir mejor haga mejorar más, que una temporada tirada haga
retroceder, que reconvertir la posición no hunda la media, que el 99 se roce sin ser la
norma, y que la edad del pico caiga donde cae en la referencia. Y la credibilidad del
mercado: que un español pase la mayor parte de su carrera en Europa y que casi ningún
adolescente aparezca fichado desde otro continente.

Sobre los datos se comprueba que cada liga tenga exactamente los equipos de la
competición real, que no haya ids ni nombres repetidos y que ninguna primera división
sea más débil que su segunda.

En i18n se comprueba que los tres catálogos tengan exactamente las mismas claves y los
mismos parámetros, y se recorren 40 carreras completas alternando decisiones para
verificar que ningún texto generado por el motor se queda sin traducir.

## Despliegue

Cada push a `main` dispara el workflow de GitHub Pages: instala, pasa los tests,
construye y publica `dist/`. La base del bundle es `/leyenda/`, definida en
`vite.config.ts`.

## Nota sobre los datos

Los nombres de clubes, ligas y selecciones son reales y se usan únicamente como
referencia dentro de un juego sin ánimo de lucro. Las plantillas de cada liga
corresponden aproximadamente a la temporada 2025-26; los ascensos y descensos
posteriores no están reflejados. Los valores de prestigio y fuerza son estimaciones
propias para equilibrar la simulación, no datos oficiales.
