import { useEffect, useMemo, useRef, useState } from 'react'
import { Nota } from './tip.jsx'
import { dDE, dMedia, dODc } from '../calculos.js'
import { Campo, MenuContextual, Modal, Vacio, useMenuContextual } from './ui.jsx'
import { BotonCinta, CampoCinta, Cinta, Grupo, InterruptorCinta } from './cinta.jsx'
import { GrupoBlanco } from './blanco.jsx'
import { usosMuestra } from '../modelo.js'
import { CLASES, COLOR_CLASE, FILAS, aCSV, descargarTexto, fmt, pocillos96 } from '../utils.js'

export { Vacio }

// Lee un layout en CSV (Pocillo, Muestra y opcionalmente Replica y Blanco)
async function leerLayout(file, avisar) {
  const txt = (await file.text()).replace(/^﻿/, '')
  const lineas = txt.split(/\r?\n/).filter(Boolean)
  if (!lineas.length) { avisar('El archivo está vacío.', 'error'); return null }
  const sep = lineas[0].includes(';') ? ';' : lineas[0].includes('\t') ? '\t' : ','
  const cab = lineas[0].split(sep).map((x) => x.trim().toLowerCase().replace(/^"|"$/g, ''))
  const ix = (n) => cab.findIndex((c) => n.includes(c))
  const iP = ix(['pocillo', 'well']), iM = ix(['muestra', 'sample']), iR = ix(['replica', 'réplica', 'rep']), iB = ix(['blanco', 'blank', 'esblanco'])
  if (iP < 0 || iM < 0) { avisar('El layout necesita las columnas «Pocillo» y «Muestra».', 'error'); return null }
  const validos = new Set(pocillos96())
  const cfg = []
  for (const l of lineas.slice(1)) {
    const c = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ''))
    const p = c[iP]?.toUpperCase().replace(/^([A-H])0+(\d)/, '$1$2')
    if (!p || !validos.has(p) || !c[iM] || cfg.some((x) => x.Pocillo === p)) continue
    cfg.push({ Pocillo: p, Muestra: c[iM], Replica: iR >= 0 ? Number(c[iR]) || 0 : 0,
      EsBlanco: iB >= 0 && ['1', 'true', 'si', 'sí', 'yes', 'x'].includes((c[iB] || '').toLowerCase()) })
  }
  if (!cfg.length) { avisar('Ningún pocillo válido (A1 a H12) con muestra en el layout.', 'error'); return null }
  const ord = cfg.sort((a, b) => pocillos96().indexOf(a.Pocillo) - pocillos96().indexOf(b.Pocillo))
  const cont = {}
  ord.forEach((c) => { cont[c.Muestra] = (cont[c.Muestra] || 0) + 1; if (!c.Replica) c.Replica = cont[c.Muestra] })
  return ord
}

// ===============================================================
// ODc Y MAPA: qué muestra hay en cada pocillo, punto de corte con los blancos y clasificación de cada pocillo.
// Se asigna sobre el mismo mapa: los colores y los datos se actualizan a medida que se asignan las muestras.
// ===============================================================
export function AnalisisTab({ s }) {
  const [arr, setArr] = useState(null) // {f,c} inicio del arrastre
  const [act, setAct] = useState(null)
  const [sel, setSel] = useState(null) // pocillos seleccionados para la ventana
  const [muestra, setMuestra] = useState('')
  const [blanco, setBlanco] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [medioNuevo, setMedioNuevo] = useState(null)
  const [menu, abrirMenu, cerrarMenu] = useMenuContextual()
  const [menuM, setMenuM] = useState(null)       // muestra del menú con clic derecho
  const [renM, setRenM] = useState(null)         // { viejo, nombre }
  const [borrarM, setBorrarM] = useState(null)   // { m, n, k }
  const [arrM, setArrM] = useState(null)         // muestra que se arrastra en la lista
  const [sobreM, setSobreM] = useState(null)
  const layoutRef = useRef()
  const aTodas = useRef(false)

  // sin datos todavía: se pueden configurar los 96 pocillos de antemano
  const disp = useMemo(() => new Set(s.placa ? s.placa.datos.map((d) => d.Pocillo) : pocillos96()), [s.placa])
  const cfgDe = (p) => s.config.find((c) => c.Pocillo === p)
  const rect = arr && act ? { f1: Math.min(arr.f, act.f), f2: Math.max(arr.f, act.f), c1: Math.min(arr.c, act.c), c2: Math.max(arr.c, act.c) } : null
  const enRect = (f, c) => rect && f >= rect.f1 && f <= rect.f2 && c >= rect.c1 && c <= rect.c2

  // abre la ventana de configuración para un rectángulo de pocillos (arrastre, un toque o una fila/columna completa)
  const abrirRect = (r) => {
    const ids = []
    for (let f = r.f1; f <= r.f2; f++) for (let c = r.c1; c <= r.c2; c++) { const p = FILAS[f] + (c + 1); if (disp.has(p)) ids.push(p) }
    if (!ids.length) return
    const info = ids.map(cfgDe).filter(Boolean)
    const nombres = [...new Set(info.map((i) => i.Muestra))]
    const estadosBlanco = [...new Set(info.map((i) => !!i.EsBlanco))]
    setSel(ids)
    setMuestra(info.length === ids.length && nombres.length === 1 ? nombres[0] : '')
    setBlanco(estadosBlanco.length === 0 ? false : estadosBlanco.length === 1 ? estadosBlanco[0] : null)
  }
  useEffect(() => {
    const up = () => { if (!arr) return; if (rect) abrirRect(rect); setArr(null); setAct(null) }
    const cancelar = () => { setArr(null); setAct(null) }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancelar)
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancelar) }
  })

  const guardar = (elegida) => {
    const m = (typeof elegida === 'string' ? elegida : muestra).trim()
    if (!m) return s.avisar('Tenés que indicar una muestra.', 'error')
    const nombre = s.muestras.find((x) => x.toLowerCase() === m.toLowerCase()) || m
    if (!s.muestras.includes(nombre)) s.setMuestras((ms) => [...ms, nombre])
    let cfg = [...s.config]
    for (const p of sel) {
      const previo = cfg.find((c) => c.Pocillo === p)
      const otros = cfg.filter((c) => c.Pocillo !== p)
      let rep
      if (previo && previo.Muestra === nombre) rep = previo.Replica
      else { const ex = otros.filter((c) => c.Muestra === nombre).map((c) => c.Replica); rep = ex.length ? Math.max(...ex) + 1 : 1 }
      // blanco === null: la selección era mixta y no se tocó; cada pocillo conserva su estado
      cfg = [...otros, { Pocillo: p, Muestra: nombre, Replica: rep, EsBlanco: blanco === null ? !!previo?.EsBlanco : blanco }]
    }
    s.setConfig(cfg)
    s.avisar(sel.length === 1 ? `${sel[0]} configurado como ${nombre}` : `${sel.length} pocillos configurados como ${nombre}`)
    setSel(null)
  }
  const quitar = () => { s.setConfig(s.config.filter((c) => !sel.includes(c.Pocillo))); setSel(null) }

  const exportarLayout = () => {
    const filas = [...s.config].sort((a, b) => pocillos96().indexOf(a.Pocillo) - pocillos96().indexOf(b.Pocillo))
      .map((c) => ({ Pocillo: c.Pocillo, Muestra: c.Muestra, Replica: c.Replica, Blanco: c.EsBlanco ? 1 : 0 }))
    descargarTexto(aCSV(filas, ['Pocillo', 'Muestra', 'Replica', 'Blanco']), `layout_${s.a.nombre.replace(/[^\w\- ]+/g, '_')}.csv`)
  }
  const importarLayout = async (file) => { const cfg = await leerLayout(file, s.avisar); if (cfg) s.aplicarLayout(cfg, aTodas.current) }
  const ponerMedio = (v) => (v === '__otro' ? setMedioNuevo('') : s.setMedio(s.a.id, v))
  const otrasConLayout = s.placas.filter((x) => x.id !== s.activaId && x.config.length > 0)

  // ---- la lista de muestras: ordenar arrastrando, renombrar y eliminar ----
  const todas = [...new Set([...s.muestras, ...s.config.map((c) => c.Muestra)])]
  const moverMuestra = (mov, dest) => {
    if (!mov || mov === dest) return
    const sin = todas.filter((m) => m !== mov)
    const i = sin.indexOf(dest)
    sin.splice(todas.indexOf(mov) < todas.indexOf(dest) ? i + 1 : i, 0, mov)
    s.setMuestras(sin)
  }
  const pedirBorrar = (m) => {
    const n = usosMuestra(s.exp, m)
    if (n) return setBorrarM({ m, n, k: s.placas.filter((p) => p.config.some((c) => c.Muestra === m)).length })
    s.eliminarMuestra(m)
    if (muestra === m) setMuestra('')
  }
  const hacerRenombre = () => {
    const nuevo = renM.nombre.trim()
    if (nuevo && nuevo !== renM.viejo && !todas.some((m) => m !== renM.viejo && m.toLowerCase() === nuevo.toLowerCase()) && muestra === renM.viejo) setMuestra(nuevo)
    if (nuevo !== renM.viejo) s.renombrarMuestra(renM.viejo, nuevo)
    setRenM(null)
  }

  // ---- el mapa ----
  // «Restar blanco»: el mapa muestra la OD corregida (OD leída − media de los blancos). El ODc se calcula con la OD leída,
  // así que en OD corregida los límites de clase quedan en k × ODc − blanco (la clasificación de cada pocillo no cambia)
  const a = s.analisis
  const corr = !!a?.blanco?.restado
  const resta = corr ? a.odc.resta : 0
  const odc = a?.odc?.odc
  const finito = Number.isFinite(odc)
  const [u1, u2, u3] = [odc - resta, 2 * odc - resta, 4 * odc - resta]
  const datos = Object.fromEntries((s.placa?.datos || []).map((d) => [d.Pocillo, d.OD - resta]))
  const est = Object.fromEntries((a?.estado || []).map((e) => [e.Pocillo, e]))
  const clasif = (od) => (!finito ? null : od <= u1 ? CLASES[0] : od <= u2 ? CLASES[1] : od <= u3 ? CLASES[2] : CLASES[3])
  const nomOD = corr ? 'OD corr.' : 'OD'
  const categoria = (p) => {
    if (!disp.has(p)) return 'Sin datos'
    const c = cfgDe(p)
    if (!c) return 'Sin asignar'
    if (est[p] && !est[p].Usado) return 'Excluido'
    if (c.EsBlanco) return 'Blanco'
    return (Number.isFinite(datos[p]) && clasif(datos[p])) || 'Sin clasificar'
  }
  const blancos = a?.blancos || []
  const usados = s.blancosUsados ?? blancos
  // los blancos del ODc, siempre con la OD leída
  const odBl = (s.analisisLeido || a)?.estado?.filter((r) => r.EsBlanco && r.Usado && usados.includes(r.Muestra)).map((r) => r.OD) || []
  const refs = [
    ['No productor', finito ? `${nomOD} ≤ ${fmt(u1)}` : ''],
    ['Productor débil', finito ? `${fmt(u1)} < ${nomOD} ≤ ${fmt(u2)}` : ''],
    ['Productor moderado', finito ? `${fmt(u2)} < ${nomOD} ≤ ${fmt(u3)}` : ''],
    ['Productor fuerte', finito ? `${nomOD} > ${fmt(u3)}` : ''],
    ['Blanco', 'medio sin inocular'], ['Excluido', 'fuera del análisis'], ['Sin asignar', 'pocillo libre'],
  ]
  const lecturas = (sel || []).filter((p) => Number.isFinite(datos[p]))

  return (
    <div>
      <Cinta>
        <Grupo titulo="Medio de cultivo">
          <CampoCinta etiqueta="Medio de esta placa" tip="Las placas con el mismo medio se agrupan solas en el gráfico de comparación y en la estadística">
            <select value={s.a.medio || ''} onChange={(e) => ponerMedio(e.target.value)}>
              <option value="">(sin indicar)</option>
              {s.medios.map((m) => <option key={m} value={m}>{m}</option>)}
              <option value="__otro">Otro medio…</option>
            </select>
          </CampoCinta>
        </Grupo>
        <Grupo titulo="Layout">
          <BotonCinta icono="bajar" texto="Exportar CSV" onClick={exportarLayout} deshabilitado={!s.config.length} tip="Descarga la distribución de muestras (Pocillo, Muestra, Replica, Blanco)" />
          <BotonCinta icono="subir" texto="Importar CSV" onClick={() => { aTodas.current = false; layoutRef.current.click() }} tip="CSV con las columnas Pocillo y Muestra (y opcionalmente Replica y Blanco 1/0)" />
          {s.placas.length > 1 && <BotonCinta icono="placas" texto="CSV en todas" onClick={() => { aTodas.current = true; layoutRef.current.click() }} tip="Aplica el CSV a todas las placas (solo en los pocillos con datos de cada una)" />}
          {s.placas.length > 1 && <BotonCinta icono="copiar" texto="Copiar a las demás" onClick={s.copiarConfig} deshabilitado={!s.config.length} tip="Copia este layout a todas las demás placas (Ctrl + Z para deshacer)" />}
          {otrasConLayout.length > 0 && (
            <CampoCinta etiqueta="Usar el layout de" tip="Reemplaza el layout de esta placa por el de otra">
              <select value="" onChange={(e) => e.target.value && s.copiarLayoutDe(e.target.value, s.activaId)}>
                <option value="">Elegí una placa…</option>
                {otrasConLayout.map((x) => <option key={x.id} value={x.id}>{x.nombre} ({x.config.length})</option>)}
              </select>
            </CampoCinta>
          )}
          <input ref={layoutRef} type="file" hidden accept=".csv,.txt" onChange={(e) => { e.target.files[0] && importarLayout(e.target.files[0]); e.target.value = '' }} />
        </Grupo>
        <Grupo titulo="Pocillos">
          <BotonCinta icono="borrar" texto="Limpiar" peligro onClick={() => setConfirmar(true)} deshabilitado={!s.config.length} tip="Quita la configuración de todos los pocillos de esta placa" />
        </Grupo>
        {blancos.length > 0 && (
          <Grupo titulo="Blancos para el ODc">
            {blancos.map((b) => <InterruptorCinta key={b} icono="matraz" texto={b} valor={usados.includes(b)} tip={`Usar los pocillos de «${b}» para el punto de corte`}
              onChange={(v) => { const n = v ? [...usados, b] : usados.filter((x) => x !== b); if (!n.length) return s.avisar('Tiene que quedar al menos un blanco.', 'error'); s.setBlancosUsados(n) }} />)}
          </Grupo>
        )}
        <GrupoBlanco s={s} />
      </Cinta>

      {!s.placa && <p className="aviso-caja info">Esta placa todavía no tiene datos. Podés dejar lista la configuración de los pocillos; al cargar el Excel o escribir las OD en «Placas» se procesan solos.</p>}
      {a && s.restarBlanco && !corr && a.odc.n === 0 && <p className="aviso-caja">Esta placa no tiene blancos aceptados: no se le puede restar el blanco y queda con la OD leída.</p>}
      {a && !blancos.length && <p className="aviso-caja">No hay blancos en esta placa: marcá «Es un blanco» al configurar los pocillos del medio sin inocular.</p>}
      {a && blancos.length > 0 && !finito && <p className="aviso-caja">Hacen falta al menos 2 pocillos de blanco aceptados para calcular el ODc.</p>}

      <section className="tarjeta">
        <div className="cabeza-tarjeta">
          <span className="etiqueta-seccion">Mapa de la placa · {corr ? s.ejeOD : s.ejeODLeida} · {s.config.length} configurados</span>
          <span className="ayuda">Clic en un pocillo, o clic y arrastrá para elegir varios; clic en un número o una letra elige la columna o la fila entera.
            <Nota>{'Elegí una muestra de la lista o escribí una nueva y apretá Enter: la réplica se asigna sola. Los pocillos de medio sin inocular se marcan como «blanco» (sirven para el ODc).\nLos pocillos se excluyen o incluyen en «Revisión».\nStepanović et al. (2000): cada muestra se clasifica con la media de sus réplicas aceptadas; acá se colorea cada pocillo con su propia OD.'}</Nota></span>
        </div>
        <div className="placa-wrap">
          <table className="placa mapa">
            <thead><tr><th />{Array.from({ length: 12 }, (_, i) => <th key={i} className="enc-sel" onClick={() => abrirRect({ f1: 0, f2: 7, c1: i, c2: i })} data-tip={`Columna ${i + 1} completa`}>{i + 1}</th>)}</tr></thead>
            <tbody>
              {FILAS.map((f, fi) => (
                <tr key={f}><th className="enc-sel" onClick={() => abrirRect({ f1: fi, f2: fi, c1: 0, c2: 11 })} data-tip={`Fila ${f} completa`}>{f}</th>
                  {Array.from({ length: 12 }, (_, ci) => {
                    const p = f + (ci + 1)
                    const cat = categoria(p)
                    const c = cfgDe(p)
                    const ok = disp.has(p)
                    const enSel = ok && enRect(fi, ci)
                    const conOD = Number.isFinite(datos[p])
                    return (
                      <td key={p}
                        onPointerDown={(e) => { if (e.button === 0 && ok) { if (e.pointerType === 'mouse') e.preventDefault(); setArr({ f: fi, c: ci }); setAct({ f: fi, c: ci }) } }}
                        onPointerEnter={(e) => e.pointerType === 'mouse' && arr && setAct({ f: fi, c: ci })}>
                        <div className={`celda-mapa cat-${CLASES.indexOf(cat)} ${enSel ? 'sel' : ''} ${cat === 'Sin datos' ? 'sin-datos' : ''} ${cat === 'Excluido' ? 'excluido' : ''} ${cat === 'Sin asignar' || cat === 'Sin clasificar' ? 'libre' : ''}`}
                          style={COLOR_CLASE[cat] && cat !== 'Excluido' && !enSel ? { background: COLOR_CLASE[cat] } : undefined}
                          data-tip={ok ? `${p}${c ? ` · ${c.Muestra} R${c.Replica}` : ''}${conOD ? `\n${corr ? `OD corregida = ${fmt(datos[p], 4)} (leída ${fmt(datos[p] + resta, 4)} − blanco ${fmt(resta, 4)})` : `OD = ${fmt(datos[p], 4)}`}` : ''}\n${cat}` : undefined}>
                          {conOD && <b>{fmt(datos[p])}</b>}
                          {c && <><span>{c.Muestra}</span><small>R{c.Replica}</small></>}
                          {!conOD && !c && <small>{p}</small>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="leyenda-cepas">
          {refs.map(([c, t]) => (
            <span key={c}><i className={`punto ${c === 'Excluido' ? 'excluido' : c === 'Sin asignar' ? 'libre' : ''}`} style={COLOR_CLASE[c] && c !== 'Excluido' ? { background: COLOR_CLASE[c] } : undefined} /><b>{c}</b> {t}</span>
          ))}
        </div>
      </section>

      {a?.odc && (
        <div className="grid-kpi">
          <div className="kpi" data-tip={`Blancos aceptados\nPocillos de ${usados.join(', ') || 'blanco'} que no están excluidos`}><small>Blancos aceptados</small><b>{a.odc.n}</b></div>
          <div className="kpi" data-tip={`Media de blancos\n${dMedia(odBl)}${corr ? '\nEs lo que se resta a cada OD (Restar blanco)' : ''}`}><small>{corr ? 'Media de los blancos · se resta' : 'Media de los blancos'}</small><b>{fmt(a.odc.media, 4)}</b></div>
          <div className="kpi" data-tip={dDE(odBl)}><small>DE de los blancos</small><b>{fmt(a.odc.sd, 4)}</b></div>
          <div className="kpi destacado" data-tip={a.odc.n > 1 ? dODc(odBl) : 'Punto de corte (ODc)\nHacen falta al menos 2 blancos aceptados'}><small>ODc = media + 3 × DE</small><b>{fmt(odc, 4)}</b></div>
          {corr && finito && <div className="kpi" data-tip={`Punto de corte en OD corregida\nODc − blanco = ${fmt(odc, 4)} − ${fmt(resta, 4)} = ${fmt(u1, 4)} (= 3 × DE)\nLímites de clase en OD corregida: ${fmt(u1)} · ${fmt(u2)} · ${fmt(u3)}\n(k × ODc − blanco: la clasificación es la misma que con la OD leída)`}><small>ODc − blanco</small><b>{fmt(u1, 4)}</b></div>}
        </div>
      )}

      {sel && (
        <Modal titulo={sel.length > 1 ? `Configurar ${sel.length} pocillos` : `Configurar el pocillo ${sel[0]}`} onClose={() => setSel(null)}
          pie={<>
            <button onClick={() => setSel(null)}>Cancelar</button>
            {sel.some(cfgDe) && <button className="peligro" onClick={quitar}>Quitar</button>}
            <button className="primario" onClick={guardar}>Guardar</button></>}>
          <div onKeyDown={(e) => {
            // Enter: guarda la muestra elegida y cierra la ventana (también sobre una opción de la lista)
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
            const t = e.target
            if (t.tagName === 'BUTTON' && t.getAttribute('role') !== 'option') return
            e.preventDefault()
            guardar(t.getAttribute('role') === 'option' ? t.dataset.muestra : undefined)
          }}>
            {sel.length === 1 && lecturas.length === 1 && (
              <dl className="datos">
                {corr
                  ? <><dt>OD corregida</dt><dd>{fmt(datos[sel[0]], 4)}</dd><dt>OD leída</dt><dd>{fmt(datos[sel[0]] + resta, 4)} (blanco {fmt(resta, 4)})</dd></>
                  : <><dt>Lectura (OD)</dt><dd>{fmt(datos[sel[0]], 4)}</dd></>}
                {est[sel[0]] && !est[sel[0]].Usado && <><dt>Estado</dt><dd>Excluido (se cambia en «Revisión»)</dd></>}
              </dl>
            )}
            {sel.length > 1 && lecturas.length > 0 && <p className="ayuda lecturas-sel"><b>{corr ? 'OD corregida' : 'Lecturas'}:</b> {lecturas.map((p) => `${p} ${fmt(datos[p], 3)}`).join(' · ')}</p>}
            {sel.length > 1 && (() => {
              const cnt = {}
              let libres = 0
              sel.forEach((p) => { const c = cfgDe(p); if (c) cnt[c.Muestra] = (cnt[c.Muestra] || 0) + 1; else libres++ })
              const partes = Object.entries(cnt).map(([m, n]) => `${m} (${n})`)
              if (libres) partes.push(`sin asignar (${libres})`)
              const varias = Object.keys(cnt).length > 1 || (Object.keys(cnt).length === 1 && libres > 0)
              return <p className={varias ? 'aviso-sel' : 'ayuda'} data-tip={`Pocillos elegidos\n${sel.join(', ')}`}>{varias ? 'La selección tiene distintas muestras: ' : 'Muestra actual: '}{partes.join(' · ')}.{varias && ' La que elijas se asigna a todos.'}</p>
            })()}
            <Campo label={<>Muestra<Nota>{'Clic derecho en una muestra de la lista: renombrar o eliminar.\nArrastrala para cambiar el orden: es el de «Como en la lista» en los gráficos.'}</Nota></>}>
              <input autoFocus value={muestra} placeholder="Elegí una muestra de la lista o escribí una nueva" onChange={(e) => setMuestra(e.target.value)} />
            </Campo>
            {(() => {
              const existe = todas.some((m) => m.toLowerCase() === muestra.trim().toLowerCase())
              return (
                <>
                  <div className="opciones-muestra" role="listbox">
                    {todas.map((m) => {
                      const n = s.config.filter((c) => c.Muestra === m).length
                      const on = m.toLowerCase() === muestra.trim().toLowerCase()
                      return (
                        <button key={m} role="option" data-muestra={m} aria-selected={on} draggable
                          className={`${on ? 'on' : ''} ${sobreM === m && arrM !== m ? 'sobre' : ''} ${arrM === m ? 'arrastrada' : ''}`}
                          onClick={() => setMuestra(m)}
                          onContextMenu={(e) => { setMenuM(m); abrirMenu(e) }}
                          onDragStart={(e) => { setArrM(m); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', m) }}
                          onDragOver={(e) => { if (arrM) { e.preventDefault(); setSobreM(m) } }}
                          onDragLeave={() => setSobreM((v) => (v === m ? null : v))}
                          onDrop={(e) => { e.preventDefault(); moverMuestra(arrM, m); setArrM(null); setSobreM(null) }}
                          onDragEnd={() => { setArrM(null); setSobreM(null) }}>
                          <span>{m}</span>{n > 0 && <small>{n} {n === 1 ? 'pocillo' : 'pocillos'}</small>}
                        </button>
                      )
                    })}
                  </div>
                  {muestra.trim() && !existe && <p className="ayuda">Se creará la muestra nueva «{muestra.trim()}».</p>}
                </>
              )
            })()}
            <label className="check">
              <input type="checkbox" checked={blanco === true} ref={(el) => { if (el) el.indeterminate = blanco === null }} onChange={() => setBlanco(blanco !== true)} />
              <span>Es un blanco (medio sin inocular)<small>{blanco === null ? 'Mixto: algunos pocillos son blanco y otros no; si no lo tocás, cada uno conserva su estado.' : 'Los blancos dan el punto de corte (ODc).'}</small></span>
            </label>
            <p className="ayuda">Enter guarda y cierra. {sel.length > 1 ? 'Cada pocillo recibe un número de réplica, en orden por filas.' : 'La réplica se asigna sola.'}</p>
          </div>
        </Modal>
      )}
      <MenuContextual menu={menu} items={menuM ? [
        ['Renombrar…', () => { cerrarMenu(); setRenM({ viejo: menuM, nombre: menuM }) }],
        ['Eliminar', () => { cerrarMenu(); pedirBorrar(menuM) }],
      ] : []} />
      {renM && (
        <Modal titulo="Renombrar la muestra" onClose={() => setRenM(null)} ancho={420}
          pie={<><button onClick={() => setRenM(null)}>Cancelar</button><button className="primario" onClick={hacerRenombre}>Guardar</button></>}>
          <Campo label="Nombre"><input autoFocus value={renM.nombre} onChange={(e) => setRenM({ ...renM, nombre: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && hacerRenombre()} /></Campo>
          <p className="ayuda">Cambia en todas las placas y en los gráficos.</p>
        </Modal>
      )}
      {borrarM && (
        <Modal titulo="Eliminar la muestra" onClose={() => setBorrarM(null)} ancho={440}
          pie={<><button onClick={() => setBorrarM(null)}>Cancelar</button>
            <button className="peligro" onClick={() => { s.eliminarMuestra(borrarM.m); if (muestra === borrarM.m) setMuestra(''); setBorrarM(null) }}>Sí, eliminar</button></>}>
          «{borrarM.m}» está en {borrarM.n} {borrarM.n === 1 ? 'pocillo' : 'pocillos'} de {borrarM.k} {borrarM.k === 1 ? 'placa' : 'placas'}. Si la eliminás, esos pocillos quedan libres (Ctrl + Z para deshacer).
        </Modal>
      )}
      {confirmar && (
        <Modal titulo="Limpiar la configuración" onClose={() => setConfirmar(false)} ancho={440}
          pie={<><button onClick={() => setConfirmar(false)}>Cancelar</button>
            <button className="peligro" onClick={() => { s.setConfig([]); setConfirmar(false); s.avisar('Configuración borrada (Ctrl + Z para deshacer).') }}>Sí, limpiar</button></>}>
          Se quita la muestra de los {s.config.length} pocillos configurados de «{s.a.nombre}».
        </Modal>
      )}
      {medioNuevo !== null && (
        <Modal titulo="Otro medio de cultivo" onClose={() => setMedioNuevo(null)} ancho={420}
          pie={<><button onClick={() => setMedioNuevo(null)}>Cancelar</button><button className="primario" onClick={() => { if (medioNuevo.trim()) s.setMedio(s.a.id, medioNuevo.trim()); setMedioNuevo(null) }}>Guardar</button></>}>
          <Campo label="Nombre del medio (por ejemplo LB, TSB, M9…)"><input autoFocus value={medioNuevo} onChange={(e) => setMedioNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && medioNuevo.trim()) { s.setMedio(s.a.id, medioNuevo.trim()); setMedioNuevo(null) } }} /></Campo>
        </Modal>
      )}
    </div>
  )
}
