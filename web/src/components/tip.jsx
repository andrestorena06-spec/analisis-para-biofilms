import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { siglaBajo } from '../siglas.js'

// Dibuja el texto marcado con ecuacion.js: fracciones, raíces y subíndices
function trozos(s) {
  let pos = 0
  const leer = (fin) => {
    const out = []
    while (pos < s.length) {
      const k = s.indexOf('⟦', pos)
      if (k < 0) { out.push(s.slice(pos)); pos = s.length; break }
      if (k > pos) out.push(s.slice(pos, k))
      const m = s[k + 1]
      pos = k + 3
      if (m === '.' || m === '|') { if (fin.includes(m)) return out; continue }
      if (m === 'f') {
        const num = leer(['|']), den = leer(['.'])
        out.push(<span className="ec-frac" key={k}><span>{num}</span><span>{den}</span></span>)
      } else if (m === 'r') out.push(<span className="ec-raiz" key={k}><svg viewBox="0 0 12 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0.5 14 L3 12.5 L6.5 23 L11.5 0.5" vectorEffect="non-scaling-stroke" /></svg><span>{leer(['.'])}</span></span>)
      else if (m === 's') out.push(<sub key={k}>{leer(['.'])}</sub>)
    }
    return out
  }
  return leer([])
}
// Una ecuación en una sola fila: izq = paso = paso = resultado (si no entra, sigue abajo cortando en un «=»)
function Ecuacion({ izq, pasos }) {
  return (
    <div className="ec-fila">
      <span className="ec-izq">{izq}</span>
      {pasos.map((p, i) => (
        <span key={i} className={`ec-paso ${i === pasos.length - 1 ? 'ec-res' : ''}`}><i>=</i><span className="ec-der">{trozos(p)}</span></span>
      ))}
    </div>
  )
}
// El cuerpo del globo: títulos de cada bloque, ecuaciones y notas
function Cuerpo({ lineas }) {
  const out = []
  let eq = null
  const cerrar = () => { if (eq) { out.push(<Ecuacion key={out.length} izq={eq.izq} pasos={eq.pasos} />); eq = null } }
  lineas.forEach((l) => {
    if (l.startsWith('⟦e⟧')) {
      const [izq, der] = l.slice(3).split('⟦=⟧')
      if (izq || !eq) { cerrar(); eq = { izq, pasos: [] } }
      eq.pasos.push(der)
      return
    }
    cerrar()
    if (l.startsWith('⟦t⟧')) out.push(<div className="globo-sub" key={out.length}>{l.slice(3)}</div>)
    else if (l.trim()) out.push(<div className="globo-linea" key={out.length}>{l}</div>)
  })
  cerrar()
  return <div className="globo-cuerpo">{out}</div>
}

// Información al pasar el mouse, inmediata y en todos lados:
//  · cualquier elemento con data-tip="texto" (también dentro de gráficos SVG) muestra un globo con ese texto;
//    la primera línea va en negrita y las demás pueden ser fórmulas o desarrollo de cálculo (se respetan los saltos de línea);
//  · los atributos title de los elementos HTML se convierten solos en ese mismo globo (el nativo tarda y a veces no sale).
// Se monta una sola vez en la aplicación.
export function GloboInfo() {
  const [t, setT] = useState(null)
  const caja = useRef(null)
  useEffect(() => {
    let actual = null
    const buscar = (el) => {
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        if (e.hasAttribute('title') && e.namespaceURI === 'http://www.w3.org/1999/xhtml') {
          e.setAttribute('data-tip', e.getAttribute('title'))
          e.removeAttribute('title')
        }
        const v = e.getAttribute('data-tip')
        if (v) return { el: e, txt: v }
      }
      return null
    }
    // si no hay información propia, se busca una sigla o símbolo bajo el cursor (OD, ODc, DE, CV, ANOVA, gl, …)
    const conSigla = (e) => {
      const el = e.target
      if (!el || el.nodeType !== 1 || el.closest('button, input, select, textarea, .globo-info')) return null
      const txt = siglaBajo(e.clientX, e.clientY, !!el.closest('.metodo, table, pre'))
      return txt ? { el, txt, sigla: true } : null
    }
    const mover = (e) => {
      const f = buscar(e.target) || conSigla(e)
      if (!f) { if (actual) { actual = null; setT(null) } return }
      actual = f.el
      setT({ txt: f.txt, x: e.clientX, y: e.clientY })
    }
    const salir = () => { actual = null; setT(null) }
    // en pantallas táctiles no hay «pasar el mouse»: un toque sobre un elemento con información la muestra unos segundos
    let tt = null
    const tocar = (e) => {
      if (!window.matchMedia('(hover: none)').matches) return
      const fh = buscar(e.target)
      clearTimeout(tt)
      if (!fh) { setT(null); return }
      setT({ txt: fh.txt, x: e.clientX, y: Math.max(e.clientY - 150, 70) })
      tt = setTimeout(() => setT(null), 4500)
    }
    document.addEventListener('click', tocar, true)
    document.addEventListener('mousemove', mover)
    document.addEventListener('mouseleave', salir)
    document.addEventListener('mousedown', salir)
    window.addEventListener('scroll', salir, true)
    return () => {
      document.removeEventListener('click', tocar, true); clearTimeout(tt)
      document.removeEventListener('mousemove', mover); document.removeEventListener('mouseleave', salir)
      document.removeEventListener('mousedown', salir); window.removeEventListener('scroll', salir, true)
    }
  }, [])
  // abajo del cursor si entra; si no, arriba; y nunca fuera de la ventana
  useLayoutEffect(() => {
    const el = caja.current
    if (!el || !t) return
    const h = el.offsetHeight, H = window.innerHeight
    el.style.top = `${t.y + 16 + h + 8 <= H ? t.y + 16 : Math.max(8, Math.min(t.y - h - 12, H - h - 8))}px`
  }, [t])
  if (!t) return null
  const [tit, ...resto] = t.txt.split('\n')
  const conEc = t.txt.includes('⟦e⟧')
  // lo que va entre paréntesis al final del título queda como aclaración
  const cab = (tit.replace('⟦t⟧', '').match(/^(.*?)(?: \((.*)\))?$/) || [])
  const ancho = conEc ? 400 : 320
  const left = Math.min(Math.max(8, t.x + 14), window.innerWidth - ancho - 8)
  return (
    <div ref={caja} className="globo-info" style={{ left, maxWidth: ancho }}>
      <b>{cab[1]}{cab[2] && <small>{cab[2]}</small>}</b>
      {resto.length > 0 && <Cuerpo lineas={resto} />}
    </div>
  )
}

// Nota explicativa que no ocupa lugar: un ícono ⓘ que muestra su contenido (puede llevar formato) al pasar el mouse.
export function Nota({ children, titulo }) {
  return (
    <span className="nota" tabIndex={0}>
      <i aria-hidden>ⓘ</i>{titulo && <span className="nota-t">{titulo}</span>}
      <span className="nota-cont">{children}</span>
    </span>
  )
}
