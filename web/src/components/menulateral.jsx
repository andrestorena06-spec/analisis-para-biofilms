// Menú lateral
import { Icono } from './iconos.jsx'
import { ORDEN, PASOS } from './navegacion.js'

export function MenuLateral({ exp, tab, enArchivo, setEnArchivo, irA, listo, menuCorto, setMenuCorto, menuMovil, setMenuMovil }) {
  return (
    <nav className={`menu-lateral ${menuCorto ? 'corto' : ''} ${menuMovil ? 'abierto' : ''}`}>
      <button className={`item-menu archivo ${enArchivo || !exp ? 'on' : ''}`} onClick={() => { setEnArchivo(true); setMenuMovil(false) }} data-tip={menuCorto ? 'Archivo' : undefined}>
        <span className="ico"><Icono n="carpeta" size={18} /></span><span className="txt">Archivo</span>
      </button>
      {exp && <div className="sep-menu" />}
      {exp && ORDEN.map((id) => (
        <button key={id} className={`item-menu ${!enArchivo && tab === id ? 'on' : ''}`} onClick={() => irA(id)} data-tip={menuCorto ? PASOS[id][0] : undefined}>
          <span className="ico"><Icono n={PASOS[id][2]} size={18} />{listo(id) && <i className="hecho" aria-label="listo"><Icono n="check" size={9} ancho={4} /></i>}</span>
          <span className="txt">{PASOS[id][0]}</span>
        </button>
      ))}
      <span className="espacio" />
      <button className="item-menu plegar" onClick={() => setMenuCorto(!menuCorto)} data-tip={menuCorto ? 'Mostrar los nombres' : 'Solo íconos'}>
        <span className="ico"><Icono n="flecha" size={16} style={{ transform: menuCorto ? 'none' : 'rotate(180deg)' }} /></span><span className="txt">Contraer</span>
      </button>
    </nav>
  )
}
