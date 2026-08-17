/**
 * PRNG determinista (mulberry32). Guardamos el estado en el `CareerState`
 * para que una partida sea reproducible desde su semilla y para que
 * guardar/cargar no cambie el resultado.
 */
export class Rng {
  private s: number

  constructor(seed: number) {
    this.s = seed >>> 0
  }

  get state(): number {
    return this.s
  }

  set state(v: number) {
    this.s = v >>> 0
  }

  /** [0, 1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0
    let t = this.s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Entero en [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /** Real en [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** true con probabilidad p. */
  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick() sobre array vacío')
    return arr[Math.floor(this.next() * arr.length)]
  }

  /** Elige por pesos relativos. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const weights = items.map((i) => Math.max(0, weight(i)))
    const total = weights.reduce((a, b) => a + b, 0)
    if (total <= 0) return this.pick(items)
    let roll = this.next() * total
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i]
      if (roll <= 0) return items[i]
    }
    return items[items.length - 1]
  }

  /** Baraja una copia del array. */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  /** Normal aproximada (suma de 3 uniformes), acotada a ±3σ. */
  gauss(mean = 0, sd = 1): number {
    const u = (this.next() + this.next() + this.next()) / 3
    return mean + (u - 0.5) * 3.464 * sd
  }
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/** Interpolación lineal recortada entre dos puntos. */
export function lerpClamped(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin
  const t = clamp((v - inMin) / (inMax - inMin), 0, 1)
  return outMin + t * (outMax - outMin)
}
