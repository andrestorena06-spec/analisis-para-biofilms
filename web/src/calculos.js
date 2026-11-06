import { t95 } from './utils.js'
import { ec, fr, rz, sb, tit } from './ecuacion.js'

// Desarrollo paso a paso de cada número, con los valores reales, para mostrar al pasar el mouse (data-tip).
// Cada función devuelve texto: un título y el desarrollo, con las ecuaciones marcadas como en ecuacion.js.
export const F = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '–')
const suma = (v) => v.reduce((a, b) => a + b, 0)
const lista = (v) => (v.length > 6 ? `${v.slice(0, 5).map((x) => F(x)).join(' + ')} + … (${v.length} valores)` : v.map((x) => F(x)).join(' + '))

export function estad(v) {
  const n = v.length
  const m = n ? suma(v) / n : NaN
  const ss = suma(v.map((x) => (x - m) ** 2))
  const sd = n > 1 ? Math.sqrt(ss / (n - 1)) : NaN
  const sem = n > 1 ? sd / Math.sqrt(n) : NaN
  const t = n > 1 ? t95(n) : NaN
  return { n, m, ss, sd, sem, t, ic: t * sem, cv: m ? (100 * sd) / m : NaN }
}

export const dMedia = (v) => {
  const e = estad(v)
  return `${tit('Media (x̄)')}\n${ec('x̄', fr('Σ OD', 'n'), fr(lista(v), e.n), F(e.m, 4))}`
}
export const dDE = (v) => {
  const e = estad(v)
  if (e.n < 2) return `${tit('Desviación estándar (DE)')}\nNecesita n ≥ 2`
  const desvios = e.n <= 6 ? v.map((x) => `(${F(x)} − ${F(e.m)})²`).join(' + ') : null
  return `${tit('Desviación estándar muestral (DE)')}\n${ec('DE', rz(fr('Σ(OD − x̄)²', 'n − 1')), rz(fr(F(e.ss, 5), e.n - 1)), F(e.sd, 4))}${desvios ? `\n${ec('Σ(OD − x̄)²', desvios, F(e.ss, 5))}` : ''}`
}
export const dSEM = (v) => {
  const e = estad(v)
  return e.n < 2 ? `${tit('Error estándar (SEM)')}\nNecesita n ≥ 2` : `${tit('Error estándar de la media (SEM)')}\n${ec('SEM', fr('DE', rz('n')), fr(F(e.sd, 4), rz(e.n)), F(e.sem, 4))}`
}
export const dIC = (v) => {
  const e = estad(v)
  return e.n < 2 ? `${tit('IC 95 %')}\nNecesita n ≥ 2` : `${tit('Intervalo de confianza 95 % (±)')}\n${ec('IC', `t${sb('0,975; n−1')} × SEM`, `${F(e.t, 3)} × ${F(e.sem, 4)}`, F(e.ic, 4))}\nt de Student con ${e.n - 1} gl\nva de ${F(e.m - e.ic, 3)} a ${F(e.m + e.ic, 3)}`
}
export const dCV = (v) => {
  const e = estad(v)
  return e.n < 2 ? `${tit('Coeficiente de variación (CV)')}\nNecesita n ≥ 2` : `${tit('Coeficiente de variación (CV)')}\n${ec('CV', `100 × ${fr('DE', 'x̄')}`, `100 × ${fr(F(e.sd, 4), F(e.m, 4))}`, `${F(e.cv, 2)} %`)}`
}
// el error elegido con todo su desarrollo: la DE, y de ahí el SEM y el IC
export const dError = (tipo, v) => (tipo === 'sd' ? dDE(v) : tipo === 'sem' ? `${dDE(v)}\n\n${dSEM(v)}` : tipo === 'ic95' ? `${dDE(v)}\n\n${dSEM(v)}\n\n${dIC(v)}` : '')
export const dRazon = (media, odc, resta = 0) => `${tit('Razón OD / ODc' + (resta ? ' (con la OD leída)' : ''))}\n${ec('OD / ODc', fr(resta ? `${F(media - resta, 4)} + ${F(resta, 4)}` : F(media, 4), F(odc, 4)), F(media / odc, 2))}`
// media: OD media leída. resta: blanco restado (si la OD está corregida), para mostrar de dónde sale la OD leída
export const dClase = (media, odc, clase, resta = 0) => `${tit('Clasificación (Stepanović et al., 2000)')}\nODc = ${F(odc, 4)} · 2×ODc = ${F(2 * odc, 4)} · 4×ODc = ${F(4 * odc, 4)}\n${resta ? `Se clasifica con la OD leída = corregida + blanco\n= ${F(media - resta, 4)} + ${F(resta, 4)} = ${F(media, 4)}` : `OD media = ${F(media, 4)}`}\n≤ ODc: no productor · ≤ 2×ODc: débil\n≤ 4×ODc: moderado · > 4×ODc: fuerte\n→ ${clase}`
export const dODc = (bl) => {
  const e = estad(bl)
  return `${tit('Punto de corte (ODc)')}\n${ec('ODc', 'media(blancos) + 3 × DE(blancos)', `${F(e.m, 4)} + 3 × ${F(e.sd, 4)}`, F(e.m + 3 * e.sd, 4))}\nblancos aceptados (n = ${e.n}): ${lista(bl)}`
}
// media y error elegido de un grupo de valores
export const dGrupo = (titulo, v, tipoError) => `${titulo}\n${dMedia(v)}${tipoError && tipoError !== 'ninguno' && v.length > 1 ? `\n\n${dError(tipoError, v)}` : ''}`
// bloque completo de una barra: media, error elegido y, si corresponde, clasificación
// resta: blanco restado a cada OD de v (la clasificación usa la OD leída)
export const dBarra = (titulo, v, tipoError, odc, clase, resta = 0) => {
  const base = dGrupo(titulo, v, tipoError)
  return Number.isFinite(odc) && clase ? `${base}\n\n${dClase(estad(v).m + resta, odc, clase, resta)}` : base
}
// posición de un cuantil por interpolación lineal (la misma que usa R por defecto)
const cuantil = (v, q) => {
  const a = [...v].sort((x, y) => x - y)
  const pos = (a.length - 1) * q
  const i = Math.floor(pos)
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (pos - i)
}
export const dCaja = (v) => {
  const a = [...v].sort((x, y) => x - y)
  const q1 = cuantil(a, 0.25), q3 = cuantil(a, 0.75)
  return `Caja: cuartiles Q1–Q3\nvalores ordenados: ${a.map((x) => F(x)).join(', ')}\nQ1 (25 %) = ${F(q1)} · Q3 (75 %) = ${F(q3)}\nRIC = Q3 − Q1 = ${F(q3 - q1)}\nEl 50 % central de los datos está dentro de la caja.`
}
export const dMediana = (v) => {
  const a = [...v].sort((x, y) => x - y)
  return `Mediana\nvalores ordenados: ${a.map((x) => F(x)).join(', ')}\nmediana = ${F(cuantil(a, 0.5), 4)}\nLa mitad de los datos queda por debajo y la otra mitad por encima.`
}
export const dBigotes = (v) => `Bigotes: mínimo y máximo\nmínimo = ${F(Math.min(...v))} · máximo = ${F(Math.max(...v))}\nrango = ${F(Math.max(...v) - Math.min(...v))}`
