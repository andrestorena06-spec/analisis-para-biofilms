import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ACEPTA_LIBRO } from './libro.js'
import { MODO, ping } from './api.js'
import { aArchivo, eliminarMuestra as sacarMuestra, expNuevo, nombreArchivo, normalizarExp, renombrarMuestra as renMuestra } from './modelo.js'
import { listo as listoDe } from './progreso.js'
import { elegirSesion, escribir, guardarComo as guardarComoArchivo, hayAccesoArchivos, leerManejador, recordarManejador } from './archivos.js'
import { leer, usarRecientes } from './usarRecientes.js'
import { usarHistorial } from './usarHistorial.js'
import { usarAnalisis } from './usarAnalisis.js'
import { accionesPlacas } from './accionesPlacas.js'
import { CON_PLACAS, PASOS } from './components/navegacion.js'
import { MenuLateral, Migas } from './components/menulateral.jsx'
import { BarraPlacas } from './components/barraplacas.jsx'
import { DialogoPlacaNueva, DialogoRenombrar } from './components/dialogosplaca.jsx'
import { Inicio } from './components/inicio.jsx'
import { EditarExperimento } from './components/editar.jsx'
import { GloboInfo } from './components/tip.jsx'
import { CintaCtx } from './components/cinta.jsx'
import { Icono, LogoPlaca } from './components/iconos.jsx'
import { MenuContextual, useMenuContextual } from './components/ui.jsx'
import { descargarBlob } from './utils.js'
import { corregirAnalisis } from './correccion.js'

const CLAVE_TEMA = 'biofilm-v3-tema'
const CLAVE_MENU = 'biofilm-v3-menu-corto'
const CLAVE_CHROME = 'biofilm-v3-aviso-chrome'

const esChrome = () => /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\/|Brave/.test(navigator.userAgent)

export default function App() {
  const [tema, setTema] = useState(() => leer(CLAVE_TEMA) || 'claro')
  const [menuCorto, setMenuCorto] = useState(() => leer(CLAVE_MENU) || false)
  const [menuMovil, setMenuMovil] = useState(false)
  const [exp, setExp] = useState(null)
  const [tab, setTab] = useState('resumen')
  const [enArchivo, setEnArchivo] = useState(true)
  const [activaId, setActivaId] = useState(null)
  const [editar, setEditar] = useState(false)
  const [avisoChrome, setAvisoChrome] = useState(() => !esChrome() && !leer(CLAVE_CHROME))
  const [nodoCinta, setNodoCinta] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [motor, setMotor] = useState(true)
  const [menu, abrirMenu, cerrarMenu] = useMenuContextual()
  const [menuPlaca, setMenuPlaca] = useState(null)
  const [renombrar, setRenombrar] = useState(null)        // { id, nombre }
  const [placaNueva, setPlacaNueva] = useState(null)      // { nombre, medio }
  const [archivo, setArchivo] = useState(null)            // archivo de la sesión abierta: { nombre, handle, viejo }
  const archivoRef = useRef(null)
  archivoRef.current = archivo
  const archivosRef = useRef({})        // id de placa -> File (solo mientras la pestaña está abierta)
  const inputPlacas = useRef()
  const inputSesion = useRef()

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'oscuro' ? '#150C01' : '#3A2003')
    try { localStorage.setItem(CLAVE_TEMA, JSON.stringify(tema)) } catch { /* sin almacenamiento */ }
  }, [tema])
  useEffect(() => { try { localStorage.setItem(CLAVE_MENU, JSON.stringify(menuCorto)) } catch { /* nada */ } }, [menuCorto])
  useEffect(() => { ping().then(setMotor) }, [])

  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Math.random()
    setAvisos((a) => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4500)
  }, [])

  const { recientes, borrarReciente } = usarRecientes(exp, tab, activaId)

  const { expRef, hist, upd, deshacer, rehacer } = usarHistorial(exp, setExp)

  // ---------- abrir, crear y guardar ----------
  const abrir = (n, aviso) => {
    hist.current = { pasado: [], futuro: [], ultimo: 0 }
    archivosRef.current = {}
    reiniciarAnalisis()
    setExp(n.exp); setTab(PASOS[n.tab] ? n.tab : n.tab === 'pocillos' ? 'odc' : 'resumen'); setActivaId(n.activaId || n.exp.placas[0]?.id || null); setEnArchivo(false); setMenuMovil(false)
    if (aviso) avisar(aviso)
    ;(n.avisos || []).forEach((a) => avisar(a, 'error'))
  }
  const nuevo = (archivos) => {
    setArchivo(null)
    abrir({ exp: expNuevo(), tab: 'placas', activaId: null }, 'Experimento nuevo: cargá el Excel de cada placa.')
    if (archivos?.length) setTimeout(() => agregarPlacasRef.current(archivos), 0)
  }
  // «Guardar como»: se elige carpeta y nombre; desde ahí «Guardar» escribe en ese archivo
  const guardarComo = useCallback(async () => {
    const e = expRef.current
    if (!e) return
    const texto = JSON.stringify(aArchivo(e, tab, activaId))
    if (!hayAccesoArchivos()) return descargarBlob(new Blob([texto], { type: 'application/json' }), nombreArchivo(e))
    try {
      const h = await guardarComoArchivo(nombreArchivo(e), texto)
      if (!h) return
      setArchivo({ nombre: h.name, handle: h })
      recordarManejador(e.id, h)
      avisar(`Guardado en «${h.name}».`)
    } catch (err) { avisar(`No se pudo guardar: ${err.message}`, 'error') }
  }, [tab, activaId, avisar])
  // «Guardar»: si la sesión se abrió de un archivo (o ya se guardó), lo sobrescribe; si no, pregunta dónde
  const guardar = useCallback(async () => {
    const e = expRef.current
    if (!e) return
    const a = archivoRef.current
    if (!hayAccesoArchivos()) return descargarBlob(new Blob([JSON.stringify(aArchivo(e, tab, activaId))], { type: 'application/json' }), nombreArchivo(e))
    if (a?.handle && !a.viejo) {
      try { await escribir(a.handle, JSON.stringify(aArchivo(e, tab, activaId))); avisar(`Guardado en «${a.nombre}».`); return } catch (err) { avisar(`No se pudo escribir en «${a.nombre}» (${err.message}). Elegí dónde guardarlo.`, 'error') }
    }
    if (a?.viejo) avisar(`«${a.nombre}» es de una versión anterior: se guarda como archivo nuevo para no reemplazar el original.`)
    return guardarComo()
  }, [tab, activaId, avisar, guardarComo])
  const cargarSesion = async (file, handle = null) => {
    try {
      const x = JSON.parse(await file.text())
      const n = normalizarExp(x)
      abrir(n, `«${file.name}» abierto.`)
      const viejo = !(x.version >= 5)
      setArchivo({ nombre: file.name, handle, viejo })
      if (handle && !viejo) recordarManejador(n.exp.id, handle)
    } catch (e) { avisar(`No se pudo abrir «${file.name}»: ${e.message}`, 'error') }
  }
  const pedirSesion = async () => {
    if (!hayAccesoArchivos()) return inputSesion.current.click()
    try { const r = await elegirSesion(); if (r) cargarSesion(r.file, r.handle) } catch (e) { avisar(e.message, 'error') }
  }
  const abrirReciente = async (r) => {
    try {
      abrir({ ...normalizarExp(r.exp), tab: r.tab, activaId: r.activaId }, `«${r.exp.info?.nombre || 'Experimento'}» abierto.`)
      setArchivo(null)
      const h = await leerManejador(r.exp.id)
      if (h) setArchivo({ nombre: h.name, handle: h })
    } catch (e) { avisar(e.message, 'error') }
  }

  useEffect(() => {
    const k = (ev) => {
      if (!(ev.ctrlKey || ev.metaKey)) return
      const t = ev.key.toLowerCase()
      if (t === 's') { ev.preventDefault(); if (ev.shiftKey) guardarComo(); else guardar(); return }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (t === 'z' && !ev.shiftKey) { ev.preventDefault(); deshacer() }
      else if (t === 'y' || (t === 'z' && ev.shiftKey)) { ev.preventDefault(); rehacer() }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [deshacer, rehacer, guardar, guardarComo])

  // ---------- estado derivado ----------
  const placas = exp?.placas || []
  const activa = placas.find((p) => p.id === activaId) || placas.find((p) => !p.oculta) || placas[0] || null
  useEffect(() => { if (activa && activa.id !== activaId) setActivaId(activa.id) }, [activa, activaId])
  const setPlacas = useCallback((f) => upd((e) => ({ placas: typeof f === 'function' ? f(e.placas) : f })), [upd])
  const actualizar = useCallback((id, cambios) => setPlacas((ps) => ps.map((p) => (p.id === id ? { ...p, ...(typeof cambios === 'function' ? cambios(p) : cambios) } : p))), [setPlacas])

  const deteccion = exp?.deteccion
  const { analisisLeido, reiniciarAnalisis } = usarAnalisis({ exp, placas, deteccion, avisar, setMotor })

  // Restar blanco (ODc y mapa, Revisión, Gráfico, Estadística): todo usa la OD corregida (OD leída − media de los blancos)
  const restarBlanco = !!exp?.opts?.blanco?.restar
  const analisisMap = useMemo(() => (restarBlanco
    ? Object.fromEntries(Object.entries(analisisLeido).map(([id, a]) => [id, a ? corregirAnalisis(a) : a]))
    : analisisLeido), [analisisLeido, restarBlanco])
  const analisis = activa ? analisisMap[activa.id] || null : null
  const muestras = exp?.muestras || []
  const ordenMuestras = useMemo(() => {
    const pres = [...new Set((analisis?.estado || []).map((e) => e.Muestra))]
    return [...muestras.filter((m) => pres.includes(m)), ...pres.filter((m) => !muestras.includes(m))]
  }, [analisis, muestras])
  const ejeODLeida = Number.isFinite(activa?.placa?.onda) ? `DO a ${activa.placa.onda} nm` : 'Densidad óptica (OD)'
  const ejeOD = restarBlanco ? (Number.isFinite(activa?.placa?.onda) ? `OD corregida a ${activa.placa.onda} nm` : 'OD corregida (OD − blanco)') : ejeODLeida

  const { agregarPlacas, crearPlacaVacia, cambiarHoja, quitarPlaca, copiarLayoutDe, ocultarPlaca, renombrarPlaca, reordenarPlacas, aplicarLayout, copiarConfig, ponerDatosManual } =
    accionesPlacas({ exp, expRef, placas, activa, activaId, setActivaId, setPlacas, actualizar, upd, avisar, archivosRef, setPlacaNueva })
  const agregarPlacasRef = useRef(agregarPlacas)
  agregarPlacasRef.current = agregarPlacas

  // ---------- exclusión de pocillos (placa activa) ----------
  const alternarPocillo = (p) => {
    const r = analisis?.estado?.find((e) => e.Pocillo === p)
    if (!r || !activa) return
    const { exclManual, exclForzado } = activa
    const uniq = (a) => [...new Set(a)]
    if (r.Usado) actualizar(activa.id, { exclForzado: r.Forzado ? exclForzado.filter((x) => x !== p) : exclForzado, exclManual: uniq([...exclManual, p]) })
    else if (r.Manual) actualizar(activa.id, { exclManual: exclManual.filter((x) => x !== p), exclForzado: r.Sospechoso && deteccion.usar && !r.Forzado ? uniq([...exclForzado, p]) : exclForzado })
    else if (r.AutoExcl) actualizar(activa.id, { exclForzado: uniq([...exclForzado, p]) })
  }

  const irA = (p) => { setTab(p); setEnArchivo(false); setMenuMovil(false); document.querySelector('.principal')?.scrollTo(0, 0) }
  const listo = (id) => listoDe(id, exp, analisisMap)
  const setOpts = (o) => upd((e) => ({ opts: typeof o === 'function' ? o(e.opts) : o }))

  const s = exp && {
    exp, upd, info: exp.info, avisar, irA, guardar, guardarComo, archivo, listo, abrirEditar: () => setEditar(true), tema,
    // placas
    placas, activaId: activa?.id || null, a: activa, setActiva: setActivaId, analisisMap, setPlacas,
    agregarPlacas, nuevaPlacaVacia: () => setPlacaNueva({ nombre: '', medio: '' }), quitarPlaca, renombrarPlaca, pedirRenombre: (p) => setRenombrar({ id: p.id, nombre: p.nombre }),
    cambiarHoja, copiarConfig, copiarLayoutDe, reordenarPlacas, aplicarLayout, ocultarPlaca, ponerDatosManual,
    medios: exp.medios, setMedio: (id, medio) => {
      const m = (medio || '').trim()
      upd((e) => {
        const existe = e.medios.find((x) => x.toLowerCase() === m.toLowerCase())
        return { medios: m && !existe ? [...e.medios, m] : e.medios, placas: e.placas.map((p) => (p.id === id ? { ...p, medio: m ? existe || m : '' } : p)) }
      })
    },
    tieneArchivo: (id) => !!archivosRef.current[id],
    // datos de la placa activa
    archivo: activa?.archivo || null, placa: activa?.placa || null,
    config: activa?.config || [], setConfig: (c) => activa && actualizar(activa.id, { config: c }),
    blancosUsados: activa?.blancosUsados ?? null, setBlancosUsados: (b) => activa && actualizar(activa.id, { blancosUsados: b }),
    // comentarios de la revisión de cada placa (texto libre: el análisis de quien revisa)
    setRevision: (id, t) => actualizar(id, { revision: t }),
    analisis, ordenMuestras, ejeOD, ejeODLeida,
    // corrección por blanco: la placa activa y todas con la OD leída (para el ODc)
    // Restar blanco es uno solo para todo el programa (se cambia desde ODc y mapa, Revisión, Gráfico o Estadística).
    // Al activarlo, lo que estaba en OD ÷ ODc pasa a OD: esa razón se hace con la OD leída y no se vería el cambio.
    restarBlanco, setRestarBlanco: (v) => {
      const o0 = expRef.current?.opts
      const enOdc = v && (o0?.excluir?.escala === 'odc' || o0?.barras?.escala === 'odc' || o0?.comparar?.variable === 'odc' || o0?.comparar?.reproVar === 'odc')
      upd((e) => ({ opts: { ...e.opts, blanco: { ...e.opts.blanco, restar: !!v },
        ...(v ? { excluir: { ...e.opts.excluir, escala: 'od' }, barras: { ...e.opts.barras, escala: 'od' },
          comparar: { ...e.opts.comparar, variable: e.opts.comparar.variable === 'odc' ? 'od' : e.opts.comparar.variable, reproVar: e.opts.comparar.reproVar === 'odc' ? 'od' : e.opts.comparar.reproVar } } : {}) } }))
      if (enOdc) avisar('Blanco restado: lo que estaba en OD ÷ ODc pasó a OD (OD corregida). La escala OD ÷ ODc se calcula siempre con la OD leída.')
    },
    analisisLeido: activa ? analisisLeido[activa.id] || null : null, analisisMapLeido: analisisLeido,
    // globales
    muestras, setMuestras: (m) => upd((e) => ({ muestras: typeof m === 'function' ? m(e.muestras) : m })),
    deteccion: exp.deteccion, setDeteccion: (d) => upd({ deteccion: d }),
    opts: exp.opts, setOpts, estilos: exp.estilos, setEstilos: (x) => upd((e) => ({ estilos: typeof x === 'function' ? x(e.estilos) : x })),
    alternarPocillo,
    restablecerExclusiones: () => { if (activa) { actualizar(activa.id, { exclManual: [], exclForzado: [] }); avisar('Exclusiones restablecidas en esta placa.') } },
    renombrarMuestra: (viejo, nuevo) => {
      if (!nuevo) return avisar('El nombre no puede estar vacío.', 'error')
      if (muestras.some((m) => m !== viejo && m.toLowerCase() === nuevo.toLowerCase())) return avisar(`Ya existe una muestra llamada «${nuevo}».`, 'error')
      upd((e) => renMuestra(e, viejo, nuevo))
    },
    eliminarMuestra: (m) => { upd((e) => sacarMuestra(e, m)); avisar(`Muestra «${m}» eliminada (Ctrl + Z para deshacer).`) },
  }

  // ---------- barra de estado ----------
  const estado = (() => {
    if (!exp) return 'Sin experimento abierto · los experimentos se guardan solos en «Recientes»'
    const vis = placas.filter((p) => !p.oculta)
    const an = vis.map((p) => analisisMap[p.id]).filter((a) => a?.resumen?.length)
    const cepas = new Set(an.flatMap((a) => a.resumen.map((r) => r.Muestra)))
    const p = [`${vis.length} ${vis.length === 1 ? 'placa' : 'placas'}`, `${cepas.size} ${cepas.size === 1 ? 'muestra analizada' : 'muestras analizadas'}`]
    const medios = [...new Set(vis.map((x) => x.medio).filter(Boolean))]
    if (medios.length) p.push(medios.join(' y '))
    if (analisis && Number.isFinite(analisis.odc?.odc)) p.push(`ODc de ${activa.nombre} = ${analisis.odc.odc.toFixed(3)}`)
    p.push(MODO === 'web' ? 'cálculos en este equipo' : 'motor R')
    p.push(archivo ? `archivo: ${archivo.nombre}${archivo.viejo ? ' (versión anterior)' : ''}` : 'sin archivo guardado')
    p.push('copia automática en «Recientes»')
    return p.join(' · ')
  })()

  const Vista = exp && !enArchivo ? PASOS[tab][1] : null
  const verPlacas = Vista && CON_PLACAS.has(tab) && !(tab === 'grafico' && ['comparar', 'orden'].includes(exp.opts.comparar.vistaG))

  return (
    <CintaCtx.Provider value={nodoCinta}>
      <div className="app">
        <header className="barra-titulo">
          <button className="titulo-boton solo-movil" onClick={() => setMenuMovil(!menuMovil)} aria-label="Menú"><Icono n={menuMovil ? 'x' : 'hamburguesa'} size={18} /></button>
          <LogoPlaca /><b>Biofilm</b>
          {exp && <button className="titulo-exp" onClick={() => setEditar(true)} data-tip={'Datos del experimento\nNombre, fecha, condiciones, notas, muestras y medios'}>{exp.info.nombre}</button>}
          <span className="espacio" />
          {exp && <>
            <button className="titulo-boton" onClick={deshacer} disabled={!hist.current.pasado.length} aria-label="Deshacer" data-tip="Deshacer (Ctrl + Z)"><Icono n="deshacer" size={16} /></button>
            <button className="titulo-boton" onClick={rehacer} disabled={!hist.current.futuro.length} aria-label="Rehacer" data-tip="Rehacer (Ctrl + Y)"><Icono n="rehacer" size={16} /></button>
            <button className="titulo-boton solo-compu" onClick={guardar} aria-label="Guardar" data-tip={archivo && !archivo.viejo ? `Guardar (Ctrl + S)\nSobrescribe «${archivo.nombre}»\nCtrl + Mayús + S: guardar como` : 'Guardar (Ctrl + S)\nElegís dónde guardar la sesión (.biofilm.json); después «Guardar» escribe en ese archivo'}><Icono n="guardar" size={16} /></button>
          </>}
          <button className="titulo-boton" onClick={() => setTema(tema === 'oscuro' ? 'claro' : 'oscuro')} aria-label="Tema" data-tip="Cambiar entre tema claro y oscuro">
            <Icono n={tema === 'oscuro' ? 'sol' : 'luna'} size={15} />
          </button>
        </header>
        <div className="cuerpo-app">
          {menuMovil && <div className="velo-menu solo-movil" onClick={() => setMenuMovil(false)} />}
          <MenuLateral exp={exp} tab={tab} enArchivo={enArchivo} setEnArchivo={setEnArchivo} irA={irA} listo={listo} menuCorto={menuCorto} setMenuCorto={setMenuCorto} menuMovil={menuMovil} setMenuMovil={setMenuMovil} />
          <div className="zona-trabajo">
            <div className="cinta" ref={setNodoCinta} />
            <main className="principal">
              {Vista && <Migas tab={tab} activa={activa} irA={irA} />}
              <div className="pagina">
                {avisoChrome && (
                  <div className="aviso-caja info fila">
                    <span style={{ flex: 1 }}>El programa está pensado para <b>Google Chrome</b> (por ejemplo, el cuadro «Guardar como» para elegir la carpeta). En otros navegadores las descargas van directo a la carpeta de descargas.</span>
                    <button className="chico" onClick={() => { setAvisoChrome(false); try { localStorage.setItem(CLAVE_CHROME, 'true') } catch { /* nada */ } }}>Entendido</button>
                  </div>
                )}
                {!motor && <div className="aviso-caja error">No se pudo conectar con el motor de cálculo (R). Abrí la aplicación con <b>abrir_biofilm_web.bat</b>.</div>}
                {verPlacas && <BarraPlacas exp={exp} placas={placas} activa={activa} analisisMap={analisisMap} setActivaId={setActivaId} setOpts={setOpts} reordenarPlacas={reordenarPlacas} setRenombrar={setRenombrar} setMenuPlaca={setMenuPlaca} abrirMenu={abrirMenu} inputPlacas={inputPlacas} />}
                {exp && verPlacas && !placas.length && <div className="vacio"><b>Todavía no hay placas</b><div>Cargá el Excel de cada lectura en «Placas».</div><div style={{ marginTop: 12 }}><button className="primario" onClick={() => irA('placas')}>Ir a Placas</button></div></div>}
                {enArchivo || !exp
                  ? <Inicio exp={exp} archivo={archivo} recientes={recientes} onNuevo={nuevo} onAbrir={pedirSesion} onAbrirArchivo={cargarSesion} onGuardarComo={guardarComo}
                    onAbrirReciente={abrirReciente} onBorrarReciente={borrarReciente} onGuardar={guardar} onVolver={() => setEnArchivo(false)} />
                  : (!verPlacas || placas.length > 0) && <Vista s={s} key={tab} />}
              </div>
            </main>
          </div>
        </div>
        <footer className="barra-estado">{estado}</footer>
        <input ref={inputPlacas} type="file" multiple hidden accept={ACEPTA_LIBRO} onChange={(e) => { agregarPlacas(e.target.files); e.target.value = '' }} />
        <input ref={inputSesion} type="file" hidden accept=".json" onChange={(e) => { if (e.target.files[0]) cargarSesion(e.target.files[0]); e.target.value = '' }} />
        <MenuContextual menu={menu} items={(() => {
          const p = placas.find((x) => x.id === menuPlaca)
          if (!p) return []
          return [
            [p.oculta ? 'Mostrar placa (volver a los cálculos)' : 'Ocultar placa (queda fuera de los cálculos)', () => { cerrarMenu(); ocultarPlaca(p.id, !p.oculta) }],
            ['Renombrar…', () => { cerrarMenu(); setRenombrar({ id: p.id, nombre: p.nombre }) }],
            ['Quitar placa', () => { cerrarMenu(); quitarPlaca(p.id) }],
          ]
        })()} />
        {renombrar && <DialogoRenombrar renombrar={renombrar} setRenombrar={setRenombrar} renombrarPlaca={renombrarPlaca} />}
        {placaNueva && exp && <DialogoPlacaNueva exp={exp} placas={placas} placaNueva={placaNueva} setPlacaNueva={setPlacaNueva} crearPlacaVacia={crearPlacaVacia} />}
        {editar && s && <EditarExperimento s={s} onClose={() => setEditar(false)} />}
        <GloboInfo />
        <div className="toasts">{avisos.map((a) => <div key={a.id} className={`toast ${a.tipo}`}>{a.texto}</div>)}</div>
      </div>
    </CintaCtx.Provider>
  )
}
