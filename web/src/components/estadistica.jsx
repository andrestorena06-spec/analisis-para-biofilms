// Pestaña «Estadística».
// Orden: 1) en la cinta, qué se compara (placas, medios, cepas, a medida o concordancia) y cómo; 2) «Qué se compara»: fichas
// seleccionables con la cepa, el medio y las placas; 3) dos paneles que se actualizan juntos: a la izquierda los grupos que se
// comparan (cada valor y de dónde sale) y a la derecha el resultado de la prueba; 4) el resumen de todas las cepas (un clic
// pone esa cepa en los paneles); 5) los modelos con todas las cepas juntas y el diagnóstico de supuestos, plegados.
import { useMemo } from 'react'
import { Nota } from './tip.jsx'
import { Vacio } from './ui.jsx'
import { Cinta } from './cinta.jsx'
import { DiagnosticoGlobal, NOMBRE_TEST, Tabla, diagnosticoGlobal, f, juntarDe, pTxt } from './pruebas.jsx'
import { ComparadorLibre, GrupoModo, modoBase } from './seleccion.jsx'
import { ReproTab } from './repro.jsx'
import { Fichas, PanelGrupos, PanelResultado } from './estpaneles.jsx'
import { Sensibilidad, correrSensibilidad } from './estsensibilidad.jsx'
import { ResumenLibres, ResumenSerotipos, ResumenTodas, resultadoTxt } from './estresumen.jsx'
import { CintaEstadistica } from './estcinta.jsx'
import { NIVEL_SERO_TXT, seroDe, serotiposDe, valoresSerotipo } from '../serotipos.js'
import { dentroDeGrupo, nombreGrupo, usaPlaca } from '../grupolibre.js'
import { analizarBloques, escalaSugerida, puedeBloques } from '../bloques.js'
import { armarComparacion } from '../comparacion.js'
import { UNIDAD, prepararDatos, unidadDe } from '../resumenes.js'
import { analizar, anidada, parcelasDivididas, placaCepa } from '../decision.js'
import { media } from '../estadistica.js'

const finito = Number.isFinite
// líneas de clase que se dibujan en el gráfico de los grupos (las escalas relativas al ODc tienen umbrales fijos)
const UMBRALES = { odc: [[1, 'ODc'], [2, '2 × ODc'], [4, '4 × ODc']] }

// ===============================================================
// PÁGINA
// ===============================================================
export function EstadisticaTab({ s: s0 }) {
  // lo excluido en «Revisión entre réplicas» no entra en las pruebas
  const s = s0.entrePlacas || s0
  const o = s.opts.comparar
  const setO = (k, v) => s.setOpts((x) => ({ ...x, comparar: { ...x.comparar, [k]: v } }))
  const setVarios = (c) => s.setOpts((x) => ({ ...x, comparar: { ...x.comparar, ...c } }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const D = useMemo(() => armarComparacion(s), [s.placas, s.analisisMap, s.muestras, o])
  const variable = UNIDAD[o.variable] ? o.variable : 'od'
  const X = useMemo(() => prepararDatos(s, D, variable), [D, variable]) // eslint-disable-line react-hooks/exhaustive-deps
  const modo = modoBase(o)
  // serotipo de cada cepa (se carga en «Datos del experimento»)
  const seroC = (c) => seroDe(s.exp, c)
  const seros = serotiposDe(s.exp, X.cepas)
  const irDesarrollo = () => { s.irA('metodos'); setTimeout(() => document.getElementById('m-estadistica')?.scrollIntoView({ block: 'start' }), 120) }
  const grupoModo = <GrupoModo o={o} setO={setO} />
  const sinAnalisis = s.placas.filter((p) => !p.oculta && !s.analisisMap[p.id]?.resumen?.length)

  if (!D.conAnalisis.length) return <><Cinta>{grupoModo}</Cinta><Vacio titulo="Todavía no hay placas analizadas" texto="Cargá las placas y configurá sus pocillos para compararlas." accion={<button className="primario" onClick={() => s.irA('placas')}>Ir a Placas</button>} /></>
  if (modo === 'concordancia') return <ReproTab s={s} D={D} o={o} setO={setO} grupoModo={grupoModo} />

  // ---- opciones de la prueba ----
  const libres = (o.libres || []).filter((c) => c.grupos.length >= 2)
  const usaPlacaLibre = modo === 'libre' && libres.some((c) => c.grupos.some(usaPlaca))
  // serotipos: la réplica puede ser la cepa (la media de sus placas), la placa de cada cepa o el pocillo
  // la placa como bloque: posible cuando las placas miden todos los grupos (cepas, serotipos y «a medida» sin placas elegidas).
  // Es la opción por defecto al comparar cepas: cada placa es un día de experimento y se saca su variación del error.
  const conBloque = modo === 'cepas' || modo === 'serotipos' || (modo === 'libre' && !usaPlacaLibre)
  const nivel = modo === 'serotipos' ? (['cepa', 'bloque', 'placa', 'pocillo'].includes(o.nivelSero) ? o.nivelSero : 'cepa')
    : modo === 'placas' || usaPlacaLibre ? 'pocillo' : o.nivel === 'pocillo' ? 'pocillo' : conBloque && o.nivel !== 'placa' ? 'bloque' : 'placa'
  const nivelDatos = nivel === 'bloque' ? 'placa' : nivel
  const obsN = nivelDatos === 'pocillo' ? X.obsPozo : X.obsPlaca
  const forzado = o.prueba || 'auto', comp = o.comp || 'pares', ajuste = ['holm', 'lsd', 'tukey'].includes(o.ajuste) ? o.ajuste : 'holm'
  const unidad = unidadDe(variable, X.corregida)
  const nivelTxt = modo === 'serotipos' ? NIVEL_SERO_TXT[nivel] : nivel === 'bloque' ? 'cada punto es una placa; la placa es un bloque (se saca la variación entre placas)' : nivel === 'placa' ? `cada punto es una placa (${variable === 'od' ? `${unidad} media de sus pocillos` : 'calculado con la OD media de sus pocillos'})` : 'cada punto es un pocillo'

  // ---- qué se compara ----
  const juntar = juntarDe(o)
  const medioSel = X.medios.includes(o.selMedio) ? o.selMedio : X.medios[0]
  const cepaSel = X.cepas.includes(o.selCepa) ? o.selCepa : X.cepas[0]
  const fueraPl = o.ePlacasFuera || []
  const enAlcance = (p) => ((modo === 'placas' || modo === 'cepas' || modo === 'serotipos') && !juntar ? p.medio === medioSel : modo === 'medios' ? !!p.medio : true)
  const placasAlc = X.placas.filter(enAlcance)
  const placasUsadas = placasAlc.filter((p) => !fueraPl.includes(p.id))
  const mediosIn = X.medios.filter((m) => !(o.eMediosFuera || []).includes(m))
  const cepasIn = X.cepas.filter((c) => !(o.eCepasFuera || []).includes(c))
  const serosIn = seros.filter((x) => !(o.eSeroFuera || []).includes(x))
  // el modo Serotipos tiene su propia selección de cepas (no la del modo Cepas)
  const cepasSero = X.cepas.filter((c) => !(o.eCepasSeroFuera || []).includes(c))
  const usada = (x) => placasUsadas.some((p) => p.id === x.placaId)
  const nombrePl = (p) => (juntar && p.medio ? `${p.nombre} · ${p.medio}` : p.nombre)
  const conDet = (nombre, d, extra = {}) => ({ nombre, det: d, v: d.map((x) => x.y), ...extra })
  // grupos de la comparación; XX y niv permiten armarlos con otra escala o réplica (escala sugerida y sensibilidad)
  const gruposDe = (c, XX = X, niv = nivelDatos) => {
    const oN = niv === 'pocillo' ? XX.obsPozo : XX.obsPlaca
    if (modo === 'medios') return mediosIn.map((m) => conDet(m, oN.filter((x) => x.cepa === c && x.medio === m && usada(x))))
    if (modo === 'serotipos') return serosIn.map((sr) => { const cs = cepasSero.filter((c) => seroC(c) === sr); const base = oN.filter((x) => usada(x)); return conDet(sr, valoresSerotipo(base, base, cs, niv), { cepas: cs }) })
    if (modo === 'placas') return placasUsadas.map((p) => conDet(nombrePl(p), XX.obsPozo.filter((x) => x.cepa === c && x.placaId === p.id), { placaId: p.id })).filter((g) => g.v.length)
    return cepasIn.map((cc) => conDet(cc, oN.filter((x) => x.cepa === cc && usada(x))))
  }
  const ctrlKey = { medios: 'ctrlMedio', cepas: 'ctrlCepa', serotipos: 'ctrlSero', placas: 'ctrlPlaca', libre: 'ctrlLibre' }[modo]
  const ctrlDe = (gs) => (comp === 'control' && gs.length > 1 ? (gs.some((g) => g.nombre === o[ctrlKey]) ? o[ctrlKey] : gs[0].nombre) : null)
  const nombrePlaca = (id) => X.placas.find((p) => p.id === id)?.nombre || id
  // con la placa como bloque: ANOVA en bloques o Friedman; si no hay 3 placas con todos los grupos, se compara sin bloque
  // una cepa excluida de una placa deja esa placa incompleta: se compara sin bloque, con los datos de todas las placas
  const fueraRep = (s.replicasFuera || []).filter((x) => placasUsadas.some((p) => p.id === x.placaId) && (modo === 'cepas' ? cepasIn.includes(x.Cepa) : modo === 'serotipos' ? cepasSero.includes(x.Cepa) && serosIn.includes(seroC(x.Cepa)) : true))
  const correrPrueba = (c, niv, forz, aj, ctrl) => {
    if (niv === 'bloque') {
      if (!fueraRep.length && puedeBloques(c)) return analizarBloques(c, forz, ctrl, aj, nombrePlaca)
      const r = analizar(c, forz, ctrl, aj)
      if (r.ok) r.razon = (fueraRep.length ? 'Hay cepas excluidas en «Revisión entre réplicas»: se compara sin bloque. ' : 'No se pudo usar la placa como bloque (hacen falta 3 o más placas con todos los grupos): se compara sin bloque. ') + r.razon
      return r
    }
    return analizar(c, forz, ctrl, aj)
  }
  const analizarG = (gs, niv = nivel) => { const c = gs.filter((g) => g.v.length); if (!c.length) return { r: null, ctrl: null }; const ctrl = ctrlDe(c); return { r: correrPrueba(c, niv, forzado, ajuste, ctrl), ctrl } }

  // grupos a medida
  const nombreG = (g) => nombreGrupo(g, (id) => X.placas.find((p) => p.id === id)?.nombre || id)
  // dos grupos iguales llevan (2), (3)… para que las letras y los pares no se mezclen
  const unicos = (ns) => ns.map((n, i) => { const k = ns.slice(0, i).filter((x) => x === n).length; return k ? `${n} (${k + 1})` : n })
  const gruposLibre = (c, XX = X, niv = nivelDatos) => { const oN = niv === 'pocillo' ? XX.obsPozo : XX.obsPlaca; const ns = unicos(c.grupos.map(nombreG)); return c.grupos.map((g, i) => conDet(ns[i], oN.filter((x) => dentroDeGrupo(g, x, seroC)))) }
  const iLibre = Math.min(Math.max(0, o.selLibre || 0), Math.max(0, libres.length - 1))

  // ---- foco (lo que muestran los dos paneles) ----
  let foco
  if (modo === 'medios') foco = { pregunta: `¿Cambia la producción de biofilm de ${cepaSel} según el medio?`, sujeto: `la producción de biofilm de «${cepaSel}»`, factor: 'los medios de cultivo', grupos: gruposDe(cepaSel) }
  else if (modo === 'placas') foco = { pregunta: `¿${cepaSel} da lo mismo en todas las placas${juntar ? '' : ` de ${medioSel}`}?`, sujeto: `la producción de biofilm de «${cepaSel}»`, factor: 'las placas', grupos: gruposDe(cepaSel) }
  else if (modo === 'cepas') foco = { pregunta: `¿Difieren las cepas${juntar ? ' (todos los medios juntos)' : ` en ${medioSel}`}?`, sujeto: `la producción de biofilm${juntar ? '' : ` en ${medioSel}`}`, factor: 'las cepas', grupos: gruposDe() }
  else if (modo === 'serotipos') foco = serosIn.length ? { pregunta: `¿Difieren los serotipos${juntar ? ' (todos los medios juntos)' : ` en ${medioSel}`}?`, sujeto: `la producción de biofilm${juntar ? '' : ` en ${medioSel}`}`, factor: 'los serotipos', grupos: gruposDe() } : null
  else foco = libres.length ? (() => { const gs = gruposLibre(libres[iLibre]); return { pregunta: `¿Difieren ${gs.map((g) => g.nombre).join(', ')}?`, sujeto: 'la OD de los grupos', factor: 'los grupos', grupos: gs } })() : null
  if (foco) Object.assign(foco, analizarG(foco.grupos))
  const gruposFoco = (XX, niv) => (modo === 'medios' || modo === 'placas' ? gruposDe(cepaSel, XX, niv) : modo === 'libre' ? (libres.length ? gruposLibre(libres[iLibre], XX, niv) : []) : modo === 'serotipos' && !serosIn.length ? [] : gruposDe(undefined, XX, niv))
  // escala sugerida por los datos (cómo crece la DE con la media), siempre mirando la OD sin transformar
  const sugerida = foco && variable !== 'odc' ? escalaSugerida(gruposFoco(variable === 'od' ? X : prepararDatos(s, D, 'od'), nivelDatos)) : null
  const bloquePosible = conBloque && foco && !fueraRep.length && puedeBloques(foco.grupos.filter((g) => g.v.length))

  // lo que define el resultado, en una línea junto a él: qué placas entran y cómo se comparó
  const contexto = foco?.r?.ok ? {
    alerta: fueraRep.length > 0 || (modo !== 'libre' && placasUsadas.length < placasAlc.length),
    texto: [
      modo !== 'libre' && `${placasUsadas.length} de ${placasAlc.length} placas`,
      fueraRep.length > 0 && `${fueraRep.length} ${fueraRep.length === 1 ? 'cepa excluida' : 'cepas excluidas'} de alguna placa`,
      NOMBRE_TEST[foco.r.tipo],
      foco.r.bloques ? 'placa como bloque' : nivel === 'bloque' ? (fueraRep.length ? 'sin bloque: hay cepas excluidas entre réplicas' : 'sin bloque: hacen falta 3 placas con todos los grupos') : nivel === 'pocillo' ? 'pocillos como réplica' : nivel === 'cepa' ? 'cepa como réplica' : 'placa como réplica',
      foco.r.pares[0]?.metodo && `pares con ${foco.r.pares[0].metodo}`,
    ].filter(Boolean).join(' · '),
  } : null

  // ---- sensibilidad: la misma comparación con todas las combinaciones razonables de escala, réplica, prueba y ajuste ----
  const sensibilidad = () => correrSensibilidad({ sinBloque: fueraRep.length > 0, s, D, X, variable, modo, conBloque, nivel, nivelDatos, comp, ajuste, gruposFoco, ctrlDe, nombrePlaca, bloquePosible, foco })

  // pocillos excluidos que tocan a la selección
  const fueraFoco = !foco ? [] : X.fuera.filter((x) => (modo === 'cepas' ? cepasIn.includes(x.cepa) : modo === 'serotipos' ? cepasSero.includes(x.cepa) && serosIn.includes(seroC(x.cepa)) : modo === 'libre' ? true : x.cepa === cepaSel) && (modo === 'libre' || placasUsadas.some((p) => p.id === x.placaId)))
  const colorDe = (d) => D.colores[d.placaId] || D.colorBase[d.placaId] || '#5B8FD9'

  // ---- resumen de todas las cepas ----
  const valorCelda = (c, p) => {
    const fuente = modo === 'placas' ? X.obsPozo : obsN
    const v = fuente.filter((x) => x.cepa === c && x.placaId === p.id)
    if (!v.length) return null
    const clase = X.obsPlaca.find((x) => x.cepa === c && x.placaId === p.id)?.clase
    const pozos = X.obsPozo.filter((x) => x.cepa === c && x.placaId === p.id)
    return { v: media(v.map((x) => x.y)), clase, tip: `${c} · ${p.nombre}${p.medio ? ` (${p.medio})` : ''}\n${nivel === 'placa' && modo !== 'placas' ? 'Valor de la placa' : `Media de ${v.length} pocillos`}: ${f(media(v.map((x) => x.y)), 4)}\nPocillos: ${pozos.map((x) => f(x.y, 3)).join(' · ')}${clase ? `\n${clase}` : ''}` }
  }
  const celdasDe = (c) => Object.fromEntries(placasAlc.map((p) => [p.id, valorCelda(c, p)]).filter(([, v]) => v))
  let resumen = null
  if (modo === 'medios' || modo === 'placas') {
    const filas = X.cepas.map((c) => {
      const gs = gruposDe(c)
      const { r } = analizarG(gs)
      const medias = modo === 'medios' ? Object.fromEntries(gs.filter((g) => g.v.length).map((g) => [g.nombre, { v: media(g.v), tip: `Media de ${c} en ${g.nombre}\n${g.det.map((d) => `${d.etq}: ${f(d.y, 3)}`).join('\n')}` }])) : null
      return { cepa: c, celdas: celdasDe(c), medias, res: resultadoTxt(r), elegida: c === cepaSel, onClick: c === cepaSel ? undefined : () => setO('selCepa', c) }
    })
    resumen = <ResumenTodas titulo={modo === 'medios' ? 'Todas las cepas · entre medios' : `Todas las cepas · entre placas${juntar ? '' : ` de ${medioSel}`}`} nota="Clic en una cepa para verla arriba"
      placas={placasAlc} apagadas={fueraPl} filas={filas} conMedia={modo === 'medios'} medios={mediosIn} colResultado={modo === 'medios' ? 'Entre medios' : 'Entre placas'} />
  } else if (modo === 'cepas') {
    const r = foco.r
    const filas = X.cepas.map((c) => {
      const dentro = cepasIn.includes(c)
      const g = foco.grupos.find((x) => x.nombre === c)
      const res = !dentro ? { texto: <span className="tenue">no entra</span>, nivel: 'na', tip: 'Destildada en «Cepas»' }
        : !r?.ok || !g?.v.length ? { texto: '—', nivel: 'na' }
          : foco.ctrl ? (c === foco.ctrl ? { texto: <b>control</b>, nivel: 'na' } : (() => { const p = r.pares.find((x) => x.a === c); return p && finito(p.pa) ? { texto: <><b>{p.pa < 0.05 ? '≠ control' : '= control'}</b> <small>p {pTxt(p.pa)}</small></>, nivel: p.pa < 0.05 ? 'dif' : 'ok' } : { texto: '—', nivel: 'na' } })())
            : { texto: <><b>{r.letras?.[c] || '—'}</b> <small>x̄ {f(media(g.v), 3)}</small></>, nivel: r.global.p < 0.05 ? 'dif' : 'ok', tip: 'Las cepas que comparten una letra no difieren (p ajustado ≥ 0,05)' }
      return { cepa: c, celdas: celdasDe(c), res, apagada: !dentro }
    })
    resumen = <ResumenTodas titulo={`Todas las cepas${juntar ? ' · todos los medios' : ` · ${medioSel}`}`} nota="Las letras corresponden a la comparación de arriba"
      placas={placasAlc} apagadas={fueraPl} filas={filas} conMedia={false} medios={[]} colResultado={foco.ctrl ? 'Contra el control' : 'Letra'} />
  } else if (modo === 'serotipos' && foco) {
    resumen = <ResumenSerotipos s={s} foco={foco} X={X} seros={seros} serosIn={serosIn} cepasSero={cepasSero} seroC={seroC} usada={usada} juntar={juntar} medioSel={medioSel} />
  } else if (libres.length) {
    resumen = <ResumenLibres libres={libres} iLibre={iLibre} gruposLibre={gruposLibre} analizarG={analizarG} setO={setO} />
  }

  // ---- análisis con todas las cepas juntas y supuestos ----
  const pocillosUsados = X.obsPozo.filter((x) => usada(x))
  let modelos = null
  if (modo === 'medios') {
    const sp = parcelasDivididas(X.obsPlaca.filter((x) => usada(x) && mediosIn.includes(x.medio)))
    if (sp) modelos = <><h4>Efecto del medio con todas las cepas juntas <Nota>ANOVA de parcelas divididas: cada placa tiene un solo medio, así que el medio se prueba contra la variación entre placas del mismo medio; la cepa y la interacción cepa × medio, contra la variación dentro de las placas (modelo mixto con la placa como bloque).</Nota></h4>
      <Tabla cols={['Fuente', 'Suma de cuadrados', 'gl', 'Cuadrado medio', 'F', 'p', 'Se prueba contra']} filas={sp.filas.map((x) => [x.nombre, f(x.ss, 5), x.df, f(x.ms, 5), f(x.F, 3), pTxt(x.p), x.error])} /></>
  } else if (modo === 'placas' && juntar) {
    const pc = placaCepa(pocillosUsados)
    if (pc) modelos = <><h4>Todas las cepas: placa, cepa y cepa × placa <Nota>Modelos anidados sobre los pocillos. Cepa × placa responde si las cepas conservan su orden en todas las placas.</Nota></h4>
      <Tabla cols={['Fuente', 'Suma de cuadrados', 'gl', 'Cuadrado medio', 'F', 'p', 'Se prueba contra']} filas={pc.filas.map((x) => [x.nombre, f(x.ss, 5), x.df, f(x.ms, 5), f(x.F, 3), pTxt(x.p), x.error])} /></>
  }
  const an = modo === 'placas' && juntar ? anidada(pocillosUsados.filter((x) => x.cepa === cepaSel)) : null
  const extraResultado = an && (
    <details className="plegable">
      <summary>Medio y placa dentro del medio ({cepaSel})</summary>
      <p className="ayuda">Las placas de distinto medio mezclan el efecto de la placa y el del medio. Este modelo los separa: el medio se prueba contra la variación entre placas del mismo medio.</p>
      <Tabla cols={['Fuente', 'gl', 'F', 'p', 'Se prueba contra']} filas={an.filas.map((x) => [x.nombre, x.df, f(x.F, 3), pTxt(x.p), x.error])} />
    </details>
  )

  // ---- fichas de selección ----
  const fichaPlaca = (p) => ({ id: p.id, texto: p.nombre, sub: p.medio, color: D.colores[p.id] || D.colorBase[p.id], tip: `${p.nombre}${p.medio ? ` · ${p.medio}` : ''}\nClic para ${fueraPl.includes(p.id) ? 'incluirla' : 'sacarla'} de la prueba` })
  const alternarPlaca = (id) => setO('ePlacasFuera', fueraPl.includes(id) ? fueraPl.filter((x) => x !== id) : [...fueraPl, id])
  const alternar = (k, lista) => (id) => setO(k, (o[k] || []).includes(id) ? (o[k] || []).filter((x) => x !== id) : [...(o[k] || []), id])
  const alcance = (todosTxt) => [...X.medios.map((m) => ({ id: m, texto: m, tip: `Solo las placas de ${m}` })), { id: '__todos', texto: todosTxt, tip: 'Las placas de todos los medios juntas' }]
  const elegirAlcance = (id) => (id === '__todos' ? setO('juntar', true) : setVarios({ juntar: false, selMedio: id }))
  const alcanceActivo = (id) => (juntar ? id === '__todos' : id === medioSel)
  const fichasCepa = <Fichas etiqueta="Cepa" tip="La cepa que se analiza en los paneles" opciones={X.cepas.map((c) => ({ id: c, texto: c }))} activa={(id) => id === cepaSel} onClick={(id) => setO('selCepa', id)} />
  const fichasPlacas = <Fichas etiqueta="Placas" tip="Cada placa es una réplica biológica; destildá las que no querés que entren" multi opciones={placasAlc.map(fichaPlaca)} activa={(id) => !fueraPl.includes(id)} onClick={alternarPlaca} />
  const sinMedio = X.placas.filter((p) => !p.medio)

  return (
    <div className="est-pag">
      <CintaEstadistica s={s} o={o} setO={setO} grupoModo={grupoModo} variable={variable} modo={modo} nivel={nivel} conBloque={conBloque} usaPlacaLibre={usaPlacaLibre} comp={comp} ajuste={ajuste} irDesarrollo={irDesarrollo} />

      <section className="tarjeta est-seleccion">
        <div className="cabeza-tarjeta"><span className="etiqueta-seccion">Qué se compara</span>
          <span className="ayuda">{{ medios: 'Una cepa entre medios de cultivo', placas: 'Una cepa entre placas (réplicas)', cepas: 'Las cepas entre sí', serotipos: 'Los serotipos entre sí (las cepas de cada uno juntas)', libre: 'Grupos armados a mano' }[modo]}</span></div>
        {modo === 'medios' && <>
          {fichasCepa}
          <Fichas etiqueta="Medios" tip="Los medios que se comparan (al menos 2)" multi opciones={X.medios.map((m) => ({ id: m, texto: m }))} activa={(id) => mediosIn.includes(id)} onClick={alternar('eMediosFuera')} />
          {fichasPlacas}
        </>}
        {modo === 'placas' && <>
          {fichasCepa}
          <Fichas etiqueta="Medio" tip="Para la reproducibilidad conviene comparar placas del mismo medio" opciones={alcance('Todas las placas')} activa={alcanceActivo} onClick={elegirAlcance} />
          {fichasPlacas}
        </>}
        {modo === 'cepas' && <>
          <Fichas etiqueta="Medio" tip="Las cepas se comparan dentro de un medio, o con todos los medios juntos" opciones={alcance('Todos juntos')} activa={alcanceActivo} onClick={elegirAlcance} />
          <Fichas etiqueta="Cepas" tip="Las cepas que se comparan" multi opciones={X.cepas.map((c) => ({ id: c, texto: c }))} activa={(id) => cepasIn.includes(id)} onClick={alternar('eCepasFuera')}
            extra={<><button className="fantasma chico" onClick={() => setO('eCepasFuera', [])}>Todas</button><button className="fantasma chico" onClick={() => setO('eCepasFuera', X.cepas)}>Ninguna</button></>} />
          {fichasPlacas}
        </>}
        {modo === 'serotipos' && (seros.length ? <>
          <Fichas etiqueta="Medio" tip="Los serotipos se comparan dentro de un medio, o con todos los medios juntos" opciones={alcance('Todos juntos')} activa={alcanceActivo} onClick={elegirAlcance} />
          <Fichas etiqueta="Serotipos" tip="Los serotipos que se comparan (al menos 2)" multi opciones={seros.map((sr) => ({ id: sr, texto: sr, sub: `${X.cepas.filter((c) => seroC(c) === sr).length} cepas` }))} activa={(id) => serosIn.includes(id)} onClick={alternar('eSeroFuera')}
            extra={<button className="fantasma chico" onClick={s.abrirEditar} data-tip="El serotipo de cada cepa se carga en «Datos del experimento»">Editar serotipos</button>} />
          <Fichas etiqueta="Cepas" tip="Las cepas que entran en cada serotipo" multi opciones={X.cepas.filter((c) => seroC(c)).map((c) => ({ id: c, texto: c, sub: seroC(c) }))} activa={(id) => cepasSero.includes(id)} onClick={alternar('eCepasSeroFuera')}
            extra={<><button className="fantasma chico" onClick={() => setO('eCepasSeroFuera', [])}>Todas</button></>} />
          {fichasPlacas}
        </> : (
          <p className="aviso-sel">Todavía ninguna cepa tiene serotipo. Cargalo al lado de cada muestra en «Datos del experimento». <button className="chico" onClick={s.abrirEditar}>Cargar serotipos</button></p>
        ))}
        {modo === 'libre' && <>
          <ComparadorLibre o={o} setO={setO} cepas={X.cepas.map((c) => ({ id: c, nombre: c }))} medios={X.medios.map((m) => ({ id: m, nombre: m }))} placas={X.placas.map((p) => ({ id: p.id, nombre: p.nombre }))} serotipos={seros.map((x) => ({ id: x, nombre: x }))} />
          {libres.length > 1 && <Fichas etiqueta="Ver" opciones={libres.map((c, i) => ({ id: i, texto: `ANOVA ${i + 1}` }))} activa={(id) => id === iLibre} onClick={(id) => setO('selLibre', id)} />}
        </>}
        {sugerida && sugerida.escala !== variable && (
          <p className="aviso-sel sugerencia">Escala sugerida por tus datos: <b>{sugerida.escala === 'ln' ? 'ln(OD)' : 'OD'}</b><Nota>{sugerida.texto + ' Se decide con los datos, no con el resultado de la prueba.'}</Nota>
            <button className="chico" onClick={() => setO('variable', sugerida.escala)}>Usar {sugerida.escala === 'ln' ? 'ln(OD)' : 'OD'}</button></p>
        )}
        {nivel === 'placa' && bloquePosible && (
          <p className="aviso-sel sugerencia">Las placas miden todos los grupos: con la placa como bloque se saca la variación entre placas y la prueba gana potencia.
            <button className="chico" onClick={() => setO(modo === 'serotipos' ? 'nivelSero' : 'nivel', 'bloque')}>Usar bloques</button></p>
        )}
        {(sinAnalisis.length > 0 || X.sinOdc.length > 0 || X.noPos > 0 || (modo !== 'libre' && sinMedio.length > 0 && modo === 'medios')) && (
          <p className="aviso-sel">
            {X.noPos > 0 && <>{X.noPos} {X.noPos === 1 ? 'valor' : 'valores'} de OD corregida ≤ 0 no {X.noPos === 1 ? 'tiene' : 'tienen'} logaritmo y {X.noPos === 1 ? 'queda' : 'quedan'} afuera con {unidad}. </>}
            {X.sinOdc.length > 0 && <>{X.sinOdc.map((p) => `«${p.nombre}»`).join(', ')} no {X.sinOdc.length === 1 ? 'tiene' : 'tienen'} ODc (faltan blancos aceptados): no {X.sinOdc.length === 1 ? 'entra' : 'entran'} con {unidad}. </>}
            {sinAnalisis.length > 0 && <>{sinAnalisis.map((p) => `«${p.nombre}»`).join(', ')} todavía no {sinAnalisis.length === 1 ? 'entra' : 'entran'}: {sinAnalisis.some((p) => !p.placa) ? 'faltan datos o ' : ''}falta configurar los pocillos. </>}
            {modo === 'medios' && sinMedio.length > 0 && <>{sinMedio.map((p) => `«${p.nombre}»`).join(', ')} no {sinMedio.length === 1 ? 'tiene' : 'tienen'} medio: no {sinMedio.length === 1 ? 'entra' : 'entran'} al comparar medios.</>}
          </p>
        )}
      </section>

      {foco ? (
        <div className="est-paneles">
          <PanelResultado foco={foco} alDesarrollo={irDesarrollo} extra={extraResultado} contexto={contexto} />
          <PanelGrupos foco={foco} unidad={unidad} nivelTxt={nivelTxt} colorDe={colorDe} fuera={fueraFoco} comp={comp} onCtrl={(v) => setO(ctrlKey, v)} umbrales={UMBRALES[variable]} />
        </div>
      ) : modo === 'serotipos' ? <Vacio titulo="Todavía no hay serotipos para comparar" texto="Cargá el serotipo de cada cepa en «Datos del experimento» y elegí al menos dos serotipos." accion={<button className="primario" onClick={s.abrirEditar}>Cargar serotipos</button>} />
        : <Vacio titulo="Todavía no hay comparaciones" texto="Agregá una con las plantillas de arriba («Cepa vs cepa», «Una cepa entre medios»…)." />}

      {resumen}

      {foco?.r?.ok && <Sensibilidad correr={sensibilidad} />}

      <details className="tarjeta plegable avanzado">
        <summary>Más análisis: modelos con todas las cepas y supuestos</summary>
        {modelos}
        <DiagnosticoGlobal d={diagnosticoGlobal(pocillosUsados)} unidad={unidad} />
        {!modelos && <p className="ayuda">Los modelos con todas las cepas juntas aparecen al comparar medios o placas de todos los medios.</p>}
      </details>
    </div>
  )
}
