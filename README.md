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
- **252 clubes reales** repartidos en 38 ligas de 33 países, con prestigio por club y
  fuerza por competición. Segundas divisiones incluidas, para que empezar abajo sea
  una posibilidad real.
- **75 selecciones** con su fuerza, confederación y calendario de torneos: Mundial
  cada cuatro años, continental en los pares intermedios.
- **Simulación por temporada:** rol en la plantilla, minutos, goles, asistencias,
  nota media, tarjetas, porterías a cero, puesto en liga, títulos, premios
  individuales, lesiones con secuelas y convocatorias.
- **20 tipos de decisión:** cantera, mercado de fichajes, cesiones, renovaciones,
  plan de pretemporada, nutrición, choque con el entrenador, capitanía, rehabilitación,
  entrevistas, patrocinios, cambio de posición, doble nacionalidad, retirada de la
  selección, superagente, fundación, bache de forma y retirada.
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
por los minutos. En un club a tu medida jugarás mucho más, pero tu producción vale
menos a la hora del veredicto final.

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # 44 tests del motor y de los catálogos de idioma
npm run typecheck  # TypeScript en modo estricto
npm run build      # bundle de producción en dist/
```

## Estructura

```
src/
├── data/          clubs.ts · nations.ts · names.ts   (datasets)
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
├── components/    interfaz React
├── legacyCard.ts  dibujo de la carta en canvas
└── storage.ts     guardado en localStorage
tests/             vitest
```

### Cómo se prueba el motor

Los tests no comprueban sólo que nada explote: fijan propiedades del diseño. Que los
porteros no marquen, que los centrocampistas asistan más que los delanteros, que el
Balón de Oro sea excepcional, que la media suba en la juventud y baje al final, que la
misma semilla reproduzca la carrera al byte, y que jugar siempre en el club grande dé
más títulos y más nivel a cambio de menos minutos.

En i18n se comprueba que los tres catálogos tengan exactamente las mismas claves y los
mismos parámetros, y se recorren 40 carreras completas alternando decisiones para
verificar que ningún texto generado por el motor se queda sin traducir.

## Despliegue

Cada push a `main` dispara el workflow de GitHub Pages: instala, pasa los tests,
construye y publica `dist/`. La base del bundle es `/leyenda/`, definida en
`vite.config.ts`.

## Nota sobre los datos

Los nombres de clubes, ligas y selecciones son reales y se usan únicamente como
referencia dentro de un juego sin ánimo de lucro. Los valores de prestigio y fuerza son
estimaciones propias para equilibrar la simulación, no datos oficiales.
