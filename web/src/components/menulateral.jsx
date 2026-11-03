// Menú lateral y migas de la pantalla
import { useState } from 'react'
import { Icono } from './iconos.jsx'
import { GRUPOS, ORDEN, PASOS, grupoDe } from './navegacion.js'

export function MenuLateral({ exp, tab, enArchivo, setEnArchivo, irA, listo, menuCorto, setMenuCorto, menuMovil, setMenuMovil }) {
  const pasos = ORDEN
  const [gruposCerrados, setGruposCerrados] = useState([])
  return (
    <nav className={`menu-lateral ${menuCorto ? 'corto' : ''} ${menuMovil ? 'abierto' : ''}`}>
      <button className={`item-menu archivo ${enArchivo || !exp ? 'on' : ''}`} onClick={() => { setEnArchivo(true); setMenuMovil(false) }} data-tip={menuCorto ? 'Archivo' : undefined}>
        <span className="ico"><Icono n="carpeta" size={18} /></span><span className="txt">Archivo</span>
      </button>
      {exp && <div className="sep-menu" />}
      {exp && (() => {
        const item = (id, sub) => (
          <button key={id} className={`item-menu ${sub ? 'sub' : ''} ${!enArchivo && tab === id ? 'on' : ''}`} onClick={() => irA(id)} data-tip={menuCorto ? PASOS[id][0] : undefined}>
            <span className="ico"><Icono n={PASOS[id][2]} size={sub ? 16 : 18} />{listo(id) && <i className="hecho" aria-label="listo"><Icono n="check" size={9} ancho={4} /></i>}</span>
            <span className="txt">{PASOS[id][0]}</span>
          </button>
        )
        const hechos = new Set()
        return pasos.map((id) => {
          const g = grupoDe(id)
          if (!g) return item(id, false)
          if (hechos.has(g)) return null
          hechos.add(g)
          const hijos = GRUPOS[g].hijos
          const activo = !enArchivo && hijos.includes(tab)
          const abierto = !gruposCerrados.includes(g)
          return (
            <div key={g} className={`grupo-menu ${activo ? 'activo' : ''}`}>
              <div className="fila-grupo">
                <button className="item-menu cabeza" onClick={() => { setGruposCerrados((c) => c.filter((x) => x !== g)); if (!activo) irA(hijos[0]) }} data-tip={menuCorto ? GRUPOS[g].titulo : 'Pasos que se hacen en cada placa'}>
                  <span className="ico"><Icono n={GRUPOS[g].icono} size={18} />{hijos.every((h) => listo(h)) && <i className="hecho" aria-label="listo"><Icono n="check" size={9} ancho={4} /></i>}</span>
                  <span className="txt">{GRUPOS[g].titulo}</span>
                </button>
                <button className="plegar-grupo txt" onClick={() => setGruposCerrados((c) => (c.includes(g) ? c.filter((x) => x !== g) : [...c, g]))} aria-expanded={abierto} aria-label={abierto ? 'Plegar' : 'Desplegar'}>
                  <Icono n="abajo" size={16} style={{ transform: abierto ? 'none' : 'rotate(-90deg)', transition: 'transform .15s' }} />
                </button>
              </div>
              {abierto && <div className="submenu">{hijos.map((h) => item(h, true))}</div>}
            </div>
          )
        })
      })()}
      <span className="espacio" />
      <button className="item-menu plegar" onClick={() => setMenuCorto(!menuCorto)} data-tip={menuCorto ? 'Mostrar los nombres' : 'Solo íconos'}>
        <span className="ico"><Icono n="flecha" size={16} style={{ transform: menuCorto ? 'none' : 'rotate(180deg)' }} /></span><span className="txt">Contraer</span>
      </button>
    </nav>
  )
}

export function Migas({ tab, activa, irA }) {
  const pasos = ORDEN
    const i = pasos.indexOf(tab), g = grupoDe(tab)
    const ant = pasos[i - 1], sig = pasos[i + 1]
  return (
      <nav className="migas no-imprimir" aria-label="Ubicación">
        <span className="ruta">{g && <span>{GRUPOS[g].titulo}</span>}<b>{PASOS[tab][0]}</b>{g && activa && <em className="placa-migas">· {activa.nombre}</em>}</span>
        <span className="paso-n">paso {i + 1} de {pasos.length}</span>
        <span className="espacio" />
        {ant && <button className="fantasma chico" onClick={() => irA(ant)} data-tip={`Anterior: ${PASOS[ant][0]}`}><Icono n="flecha" size={13} style={{ transform: 'rotate(180deg)' }} />{PASOS[ant][0]}</button>}
        {sig && <button className="chico" onClick={() => irA(sig)} data-tip={`Siguiente: ${PASOS[sig][0]}`}>{PASOS[sig][0]}<Icono n="flecha" size={13} /></button>}
      </nav>
  )
}
