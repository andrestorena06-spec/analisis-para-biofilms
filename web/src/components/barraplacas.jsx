// Barra de placas: elegir la placa activa, ordenarlas arrastrando y agregar más
import { useRef, useState } from 'react'
import { Icono } from './iconos.jsx'
import { paletaMuestras } from '../utils.js'

export function BarraPlacas({ exp, placas, activa, analisisMap, setActivaId, setOpts, reordenarPlacas, setRenombrar, setMenuPlaca, abrirMenu, inputPlacas }) {
  const arrastrada = useRef(null)
  const [arrastrandoSobre, setArrastrandoSobre] = useState(null)
  const colores = paletaMuestras(placas.map((p) => p.id))
  return (
    <div className="barra-placas" role="tablist" aria-label="Placas">
      {placas.filter((p) => !p.oculta || exp.opts.archivo.verOcultas).map((p) => {
        const an = analisisMap[p.id]
        return (
          <div key={p.id} role="tab" tabIndex={0} aria-selected={p.id === activa?.id}
            className={`chip-placa ${p.id === activa?.id ? 'activa' : ''} ${arrastrandoSobre === p.id ? 'sobre' : ''} ${p.oculta ? 'oculta' : ''}`}
            onContextMenu={(e) => { setMenuPlaca(p.id); abrirMenu(e) }}
            draggable
            onDragStart={(e) => { arrastrada.current = p.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.id) }}
            onDragOver={(e) => { if (arrastrada.current) { e.preventDefault(); setArrastrandoSobre(p.id) } }}
            onDragLeave={() => setArrastrandoSobre((v) => (v === p.id ? null : v))}
            onDrop={(e) => { e.preventDefault(); if (arrastrada.current) reordenarPlacas(arrastrada.current, p.id); arrastrada.current = null; setArrastrandoSobre(null) }}
            onDragEnd={() => { arrastrada.current = null; setArrastrandoSobre(null) }}
            onClick={() => setActivaId(p.id)} onKeyDown={(e) => e.key === 'Enter' && setActivaId(p.id)}
            onDoubleClick={() => setRenombrar({ id: p.id, nombre: p.nombre })}
            data-tip={`${p.nombre}${p.medio ? ` · ${p.medio}` : ''}\n${p.placa ? `${p.placa.datos.length} pocillos con datos · ${p.config.length} configurados` : 'Sin datos todavía'}${an && Number.isFinite(an.odc?.odc) ? `\nODc = ${an.odc.odc.toFixed(4)}` : ''}\nClic: ver esta placa · arrastrar: cambiar el orden · doble clic: renombrar · clic derecho: más opciones`}>
            <i className="punto-placa" style={{ background: colores[p.id] }} />
            <span className="nombre-placa">{p.nombre}</span>
            {p.medio && <small className="medio-placa">{p.medio}</small>}
            {!p.placa && <small className="sin-datos-placa">sin datos</small>}
            {p.oculta && <small className="sin-datos-placa">oculta</small>}
          </div>
        )
      })}
      {placas.some((p) => p.oculta) && (
        <button className={`agregar-placa ${exp.opts.archivo.verOcultas ? 'on' : ''}`} onClick={() => setOpts((o) => ({ ...o, archivo: { ...o.archivo, verOcultas: !o.archivo.verOcultas } }))}
          data-tip="Las placas ocultas quedan fuera de los cálculos, la comparación y el informe">
          {exp.opts.archivo.verOcultas ? 'Esconder ocultas' : `Ver ocultas (${placas.filter((p) => p.oculta).length})`}
        </button>
      )}
      <button className="agregar-placa" onClick={() => inputPlacas.current.click()} data-tip={'Agregar placas\nUno o varios Excel: cada archivo (o cada hoja con una placa) es una placa'}><Icono n="mas" size={14} />Placa</button>
    </div>
  )
}
