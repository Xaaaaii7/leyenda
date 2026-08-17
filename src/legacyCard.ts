/**
 * Dibuja la carta de legado en un canvas. Recibe los textos ya traducidos para
 * no depender del i18n aquí: así la misma función sirve para cualquier idioma.
 */
export interface LegacyCardData {
  playerName: string
  number: number
  positionShort: string
  nation: string
  tier: string
  verdict: string
  peakOvr: number
  score: number
  retiredLine: string
  dreamLine: string
  dreamAchieved: boolean
  stats: { label: string; value: string }[]
  clubsLabel: string
  clubs: string[]
  honoursLabel: string
  honours: { label: string; count: number }[]
  footer: string
}

const W = 900
const H = 1400

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Escribe texto ajustado al ancho y devuelve la Y siguiente. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 99,
): number {
  const words = text.split(' ')
  let line = ''
  let lines = 0
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      y += lineHeight
      lines++
      if (lines >= maxLines) return y
      line = word
    } else {
      line = test
    }
  }
  if (line) {
    ctx.fillText(line, x, y)
    y += lineHeight
  }
  return y
}

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

export function drawLegacyCard(canvas: HTMLCanvasElement, data: LegacyCardData): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.aspectRatio = `${W} / ${H}`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0b1219')
  bg.addColorStop(0.55, '#0a1017')
  bg.addColorStop(1, '#08131a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Halo verde superior
  const halo = ctx.createRadialGradient(W / 2, 40, 20, W / 2, 40, 620)
  halo.addColorStop(0, 'rgba(53,224,138,0.20)')
  halo.addColorStop(1, 'rgba(53,224,138,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, W, 700)

  // Marco
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'
  ctx.lineWidth = 2
  roundRect(ctx, 18, 18, W - 36, H - 36, 26)
  ctx.stroke()

  const pad = 62
  let y = 92

  // Cabecera
  ctx.textAlign = 'left'
  ctx.fillStyle = '#5d7387'
  ctx.font = `700 20px ${FONT}`
  ctx.fillText('LEYENDA · CARRERA COMPLETA', pad, y)
  y += 54

  // Escalón (veredicto)
  const tierGrad = ctx.createLinearGradient(pad, y - 40, pad + 620, y)
  tierGrad.addColorStop(0, '#f3c552')
  tierGrad.addColorStop(0.5, '#fff3cd')
  tierGrad.addColorStop(1, '#f3c552')
  ctx.fillStyle = tierGrad
  ctx.font = `900 52px ${FONT}`
  ctx.fillText(data.tier, pad, y)
  y += 46

  // Nombre + badge de media
  ctx.fillStyle = '#e8f0f7'
  ctx.font = `800 44px ${FONT}`
  const nameMax = W - pad * 2 - 150
  let nameFont = 44
  while (ctx.measureText(data.playerName).width > nameMax && nameFont > 26) {
    nameFont -= 2
    ctx.font = `800 ${nameFont}px ${FONT}`
  }
  ctx.fillText(data.playerName, pad, y + 12)

  ctx.fillStyle = '#8ea3b5'
  ctx.font = `600 22px ${FONT}`
  ctx.fillText(
    `#${data.number} · ${data.positionShort} · ${data.nation}`,
    pad,
    y + 46,
  )

  // Badge de media máxima
  const badgeSize = 118
  const bx = W - pad - badgeSize
  const by = y - 62
  const badge = ctx.createLinearGradient(bx, by, bx + badgeSize, by + badgeSize)
  badge.addColorStop(0, '#35e08a')
  badge.addColorStop(1, '#0f7a49')
  ctx.fillStyle = badge
  roundRect(ctx, bx, by, badgeSize, badgeSize, 24)
  ctx.fill()
  ctx.fillStyle = '#04150c'
  ctx.textAlign = 'center'
  ctx.font = `900 52px ${FONT}`
  ctx.fillText(String(data.peakOvr), bx + badgeSize / 2, by + 68)
  ctx.font = `800 14px ${FONT}`
  ctx.fillText('PEAK', bx + badgeSize / 2, by + 92)
  ctx.textAlign = 'left'

  y += 92

  // Retirada
  ctx.fillStyle = '#5d7387'
  ctx.font = `600 20px ${FONT}`
  ctx.fillText(data.retiredLine, pad, y)
  y += 40

  // Veredicto
  ctx.fillStyle = '#c8d8e6'
  ctx.font = `400 23px ${FONT}`
  y = wrapText(ctx, data.verdict, pad, y, W - pad * 2, 33, 4)
  y += 22

  // Rejilla de estadísticas
  const cols = 3
  const cellW = (W - pad * 2 - 16 * (cols - 1)) / cols
  const cellH = 92
  data.stats.slice(0, 9).forEach((stat, i) => {
    const cx = pad + (i % cols) * (cellW + 16)
    const cy = y + Math.floor(i / cols) * (cellH + 14)
    ctx.fillStyle = 'rgba(255,255,255,0.035)'
    roundRect(ctx, cx, cy, cellW, cellH, 14)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    roundRect(ctx, cx, cy, cellW, cellH, 14)
    ctx.stroke()

    ctx.fillStyle = '#e8f0f7'
    ctx.font = `800 34px ${FONT}`
    ctx.fillText(stat.value, cx + 18, cy + 46)
    ctx.fillStyle = '#7d93a6'
    ctx.font = `700 14px ${FONT}`
    ctx.fillText(stat.label.toUpperCase(), cx + 18, cy + 72)
  })
  y += Math.ceil(Math.min(data.stats.length, 9) / cols) * (cellH + 14) + 16

  // Palmarés
  if (data.honours.length > 0) {
    ctx.fillStyle = '#5d7387'
    ctx.font = `700 16px ${FONT}`
    ctx.fillText(data.honoursLabel.toUpperCase(), pad, y)
    y += 30
    ctx.font = `600 22px ${FONT}`
    for (const honour of data.honours.slice(0, 6)) {
      ctx.fillStyle = '#f3c552'
      ctx.fillText(`×${honour.count}`, pad, y)
      ctx.fillStyle = '#dbe7f1'
      ctx.fillText(honour.label, pad + 58, y)
      y += 32
    }
    y += 12
  }

  // Clubes
  ctx.fillStyle = '#5d7387'
  ctx.font = `700 16px ${FONT}`
  ctx.fillText(data.clubsLabel.toUpperCase(), pad, y)
  y += 30
  ctx.fillStyle = '#a9bdcd'
  ctx.font = `500 21px ${FONT}`
  y = wrapText(ctx, data.clubs.join('  ·  '), pad, y, W - pad * 2, 30, 4)

  // Pie: sueño + puntuación
  const footY = H - 96
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.fillRect(pad, footY - 42, W - pad * 2, 1)

  ctx.fillStyle = data.dreamAchieved ? '#35e08a' : '#6a7f92'
  ctx.font = `700 21px ${FONT}`
  ctx.fillText(`${data.dreamAchieved ? '★' : '☆'} ${data.dreamLine}`, pad, footY)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#e8f0f7'
  ctx.font = `800 27px ${FONT}`
  ctx.fillText(String(data.score), W - pad, footY)
  ctx.fillStyle = '#5d7387'
  ctx.font = `600 14px ${FONT}`
  ctx.fillText(data.footer.toUpperCase(), W - pad, footY + 26)
  ctx.textAlign = 'left'
}

/** Dispara la descarga del canvas como PNG. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const url = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}
