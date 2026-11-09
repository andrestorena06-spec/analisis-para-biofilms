// Botones para llevar una figura o una tabla a un documento (Google Docs, Word): siempre sobre papel blanco
import { useState } from 'react'
import { Icono } from './iconos.jsx'
import { descargarBlob, svgAPNG } from '../utils.js'

const TINTA = '#3A2005'
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// tabla del DOM → HTML con estilos en línea (tres líneas, fondo blanco), que Docs pega como tabla editable
function tablaAHTML(tabla, titulo) {
  const filas = [...tabla.querySelectorAll('tr')]
  const nCab = tabla.tHead ? tabla.tHead.rows.length : 1
  const celda = (c, i, cab) => {
    const der = i > 0 && /^[\s−\-+<>≤≥~]*[\d,.]+/.test(c.innerText.trim()) || c.classList.contains('num')
    const borde = cab ? `border-bottom:0.8px solid ${TINTA};` : ''
    return `<${cab ? 'th' : 'td'} style="padding:3px 10px;text-align:${der ? 'right' : 'left'};font-weight:${cab ? 700 : 400};${borde}">${esc(c.innerText.trim())}</${cab ? 'th' : 'td'}>`
  }
  const cuerpo = filas.map((tr, k) => `<tr>${[...tr.cells].map((c, i) => celda(c, i, k < nCab)).join('')}</tr>`).join('')
  const cap = titulo ? `<p style="font-family:Georgia,serif;font-size:11pt;margin:0 0 4pt;color:${TINTA}">${esc(titulo)}</p>` : ''
  return `<div style="background:#ffffff">${cap}<table style="border-collapse:collapse;background:#ffffff;color:${TINTA};font-family:Arial,sans-serif;font-size:10pt;border-top:1.5px solid ${TINTA};border-bottom:1.5px solid ${TINTA}">${cuerpo}</table></div>`
}
const tablaATexto = (tabla) => [...tabla.querySelectorAll('tr')].map((tr) => [...tr.cells].map((c) => c.innerText.trim()).join('\t')).join('\n')

async function copiar(items) {
  try {
    if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error('sin API')
    await navigator.clipboard.write([new ClipboardItem(items)])
    return
  } catch (e) {
    if (!items['text/html']) throw e   // una imagen solo se puede copiar con la API del portapapeles
  }
  // respaldo para tablas: copiar el HTML seleccionándolo
  const html = await items['text/html'].text()
  if (!html) throw new Error('sin portapapeles')
  const div = document.createElement('div')
  div.innerHTML = html
  div.style.cssText = 'position:fixed;left:-9999px;top:0'
  document.body.appendChild(div)
  const r = document.createRange(); r.selectNodeContents(div)
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  document.execCommand('copy')
  sel.removeAllRanges(); div.remove()
}

// obtener(): devuelve el <svg> o la <table>; titulo: leyenda en texto plano (solo para tablas)
export function ExportarFig({ obtener, nombre, tipo = 'svg', titulo }) {
  const [hecho, setHecho] = useState('')
  const avisar = (t) => { setHecho(t); setTimeout(() => setHecho(''), 1600) }
  const el = () => obtener?.()
  const copiarIt = async () => {
    const x = el(); if (!x) return
    try {
      if (tipo === 'svg') await copiar({ 'image/png': svgAPNG(x) })
      else await copiar({ 'text/html': new Blob([tablaAHTML(x, titulo)], { type: 'text/html' }), 'text/plain': new Blob([tablaATexto(x)], { type: 'text/plain' }) })
      avisar('Copiado')
    } catch {
      // sin permiso para el portapapeles: la imagen se descarga como PNG
      if (tipo === 'svg') { descargarBlob(await svgAPNG(x), `${nombre}.png`); avisar('Descargado PNG') } else avisar('No se pudo copiar')
    }
  }
  const png = async () => { const x = el(); if (x) descargarBlob(await svgAPNG(x), `${nombre}.png`) }
  return (
    <span className="exportar-fig">
      <button type="button" className="chico" onClick={copiarIt}
        data-tip={tipo === 'svg' ? 'Copiar como imagen con fondo blanco\nPegala en Google Docs o Word con Ctrl+V' : 'Copiar la tabla con fondo blanco\nEn Google Docs o Word se pega como tabla editable'}>
        <Icono n="copiar" size={14} />{hecho || (tipo === 'svg' ? 'Copiar imagen' : 'Copiar tabla')}
      </button>
      {tipo === 'svg' && <button type="button" className="chico" onClick={png} data-tip="Descargar PNG con fondo blanco"><Icono n="bajar" size={14} />PNG</button>}
    </span>
  )
}
