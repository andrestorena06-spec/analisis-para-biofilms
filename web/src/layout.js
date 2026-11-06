import { anchoMax, medir } from './utils.js'

// Calcula márgenes midiendo el texto real, para que nada quede cortado
// sin importar el tamaño de fuente. Todo en píxeles.
export function calcularLayout({
  W, etiquetas, ang, est, yLabels, derecha = 16, titulo = false, extraAbajo = 0, altoPlot = 340, tituloX = false, fijoH = 0, anchoTituloY = 0,
}) {
  const e = est.nombresX
  const a = (ang * Math.PI) / 180
  const wEt = etiquetas.map((t) => medir(t, e.size, e.bold, e.italic))
  const maxW = Math.max(0, ...wEt)
  const alto = e.size * 1.25
  const altoEtiquetas = ang > 0 ? maxW * Math.sin(a) + alto * Math.cos(a) : alto
  const wTick = anchoMax(yLabels, est.numerosY.size, est.numerosY.bold, est.numerosY.italic)
  const tituloEje = est.leyendaY.size * 1.3
  const izqBase = 14 + tituloEje + 10 + wTick + 8

  let left = izqBase
  const n = Math.max(etiquetas.length, 1)
  for (let i = 0; i < 3; i++) {
    const plotW = Math.max(W - left - derecha, 50)
    const band = plotW / n
    // la primera etiqueta rotada se extiende hacia la izquierda
    const sobra = ang > 0 ? wEt[0] * Math.cos(a) + (alto * Math.sin(a)) / 2 - band / 2 + 6
      : wEt[0] / 2 - band / 2 + 6
    left = Math.max(izqBase, sobra)
  }
  const altoTitulo = titulo ? est.titulo.size * 1.5 + 12 : 0
  const top = 14 + altoTitulo
  const altoLeyX = tituloX ? est.leyendaX.size * 1.5 + 6 : 0
  const bottom = 10 + altoEtiquetas + 12 + altoLeyX + extraAbajo
  const plotW = Math.max(W - left - derecha, 50)
  // con alto fijo (ajuste de proporción) el área del gráfico ocupa lo que sobra
  // (nunca más bajo que la leyenda del eje Y, para que el texto no se corte)
  if (fijoH) altoPlot = Math.max(90, anchoTituloY + 24, fijoH - top - bottom)
  return {
    left, right: derecha, top, bottom, plotW, plotH: altoPlot, H: top + altoPlot + bottom,
    band: plotW / n, altoEtiquetas, altoLeyX, altoTitulo,
  }
}

// Ancho de un gráfico según lo que tiene que dibujar: las columnas quedan juntas y crece hacia la derecha si hay más.
// Si no entra en la pantalla se desplaza de costado. Al exportar (tam) manda el tamaño elegido.
export function anchoContenido({ tam, disponible, etiquetas, ang, est, banda, derecha = 16, minimo = 480 }) {
  if (tam) return tam.w
  const e = est.nombresX
  const a = (ang * Math.PI) / 180
  const wEt = etiquetas.map((t) => medir(t, e.size, e.bold, e.italic))
  const alto = e.size * 1.25
  const b = ang > 0 ? banda : Math.max(banda, Math.max(0, ...wEt) + 8)
  const sobra = ang > 0 ? (wEt[0] || 0) * Math.cos(a) + (alto * Math.sin(a)) / 2 - b / 2 + 6 : (wEt[0] || 0) / 2 - b / 2 + 6
  const izq = Math.max(14 + est.leyendaY.size * 1.3 + 10 + 40 + 8, sobra)
  return Math.max(Math.ceil(izq + derecha + etiquetas.length * b), Math.min(minimo, disponible))
}

// Nota al pie repartida en líneas que entren en el ancho del gráfico
export function partirNota(texto, ancho, size = 11) {
  const trozos = String(texto || '').split(/(?<=;| ·) /)
  const lineas = []
  trozos.forEach((t) => {
    const u = lineas[lineas.length - 1]
    if (u !== undefined && medir(`${u} ${t}`, size) <= ancho) lineas[lineas.length - 1] = `${u} ${t}`
    else lineas.push(t)
  })
  return lineas.filter(Boolean)
}

export const estiloTexto = (s) => {
  const dec = [s.underline && 'underline', s.strike && 'line-through'].filter(Boolean).join(' ')
  return {
    fontSize: s.size,
    fill: s.color,
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? 'italic' : 'normal',
    textDecoration: dec || 'none',
  }
}
