// Estadística: tablas de resumen debajo de los paneles
import { NOMBRE_TEST, f, pTxt } from './pruebas.jsx'
import { desvio, marcaSig, media } from '../estadistica.js'
import { SIN_MEDIO } from '../resumenes.js'
import { COLOR_CLASE } from '../utils.js'

const finito = Number.isFinite

// ---------------------------------------------------------------
// resumen de todas las cepas: valores por placa (agrupadas por medio) y el resultado de cada una
// ---------------------------------------------------------------
export function ResumenTodas({ titulo, nota, placas, apagadas, filas, conMedia, medios, colResultado }) {
  const grupos = []
  placas.forEach((p) => { const md = p.medio || SIN_MEDIO; const g = grupos.find((x) => x.medio === md); if (g) g.placas.push(p); else grupos.push({ medio: md, placas: [p] }) })
  const dosFilas = grupos.length > 1 || conMedia
  return (
    <section className="tarjeta resumen-todas">
      <div className="cabeza-tarjeta"><span className="etiqueta-seccion">{titulo}</span>{nota && <span className="ayuda">{nota}</span>}</div>
      <div className="tabla-scroll">
        <table className="tabla compacta matriz-clase">
          <thead>
            {dosFilas && (
              <tr><th rowSpan={2}>Muestra</th>
                {grupos.map((g) => <th key={g.medio} colSpan={g.placas.length + (conMedia && medios.includes(g.medio) ? 1 : 0)} className="grupo-medio">{g.medio}</th>)}
                <th rowSpan={2} className="col-resultado">{colResultado}</th></tr>
            )}
            <tr>
              {!dosFilas && <th>Muestra</th>}
              {grupos.flatMap((g) => [
                ...g.placas.map((p) => <th key={p.id} className={`num ${apagadas.includes(p.id) ? 'apagada' : ''}`} data-tip={apagadas.includes(p.id) ? `${p.nombre}\nNo entra en la prueba (destildada arriba)` : p.nombre}>{p.nombre}</th>),
                ...(conMedia && medios.includes(g.medio) ? [<th key={'m' + g.medio} className="num col-media">Media</th>] : []),
              ])}
              {!dosFilas && <th className="col-resultado">{colResultado}</th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((fi) => (
              <tr key={fi.cepa} className={`${fi.elegida ? 'elegida' : ''} ${fi.onClick ? 'fila-clic' : ''} ${fi.apagada ? 'fuera' : ''}`} onClick={fi.onClick} data-tip={fi.onClick && !fi.elegida ? `Ver ${fi.cepa} en los paneles` : undefined}>
                <td className="nombre-fila">{fi.cepa}</td>
                {grupos.flatMap((g) => [
                  ...g.placas.map((p) => {
                    const c = fi.celdas[p.id]
                    return c ? <td key={p.id} className={`num celda-clase ${apagadas.includes(p.id) ? 'apagada' : ''}`} style={{ '--clase': COLOR_CLASE[c.clase] || 'transparent' }} data-tip={c.tip}>{f(c.v, 3)}</td>
                      : <td key={p.id} className="num tenue">—</td>
                  }),
                  ...(conMedia && medios.includes(g.medio) ? [(() => { const c = fi.medias?.[g.medio]; return <td key={'m' + g.medio} className="num col-media" data-tip={c?.tip}>{c ? f(c.v, 3) : '—'}</td> })()] : []),
                ])}
                <td className={`col-resultado ${fi.res.nivel || ''}`} data-tip={fi.res.tip}>{fi.res.texto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="leyenda-clases">
        {Object.entries(COLOR_CLASE).filter(([k]) => k.startsWith('No') || k.startsWith('Productor')).map(([k, col]) => <span key={k}><i className="punto" style={{ background: col }} />{k}</span>)}
      </div>
    </section>
  )
}

export const resultadoTxt = (r) => {
  if (!r) return { texto: '—', nivel: 'na', tip: 'Sin datos' }
  if (!r.ok) return { texto: '—', nivel: 'na', tip: r.motivo }
  const p = r.global.p, sig = p < 0.05
  const orden = [...r.grupos].sort((a, z) => media(z.v) - media(a.v))
  return {
    texto: <><b>{sig ? (orden.length === 2 ? `${orden[0].nombre} > ${orden[1].nombre}` : 'difieren') : 'sin dif.'}</b> <small>p {pTxt(p)}{sig ? ` ${marcaSig(p)}` : ''}</small></>,
    nivel: sig ? 'dif' : 'ok',
    tip: `${NOMBRE_TEST[r.tipo]}: ${r.global.est} = ${f(r.global.valor, 3)} · p = ${pTxt(p)}\n${r.grupos.map((g) => `${g.nombre}: x̄ = ${f(media(g.v), 3)} (n ${g.v.length})`).join('\n')}`,
  }
}

// todos los serotipos con sus cepas, la media y la letra
export function ResumenSerotipos({ s, foco, X, seros, serosIn, cepasSero, seroC, usada, juntar, medioSel }) {
  const r = foco.r
  const sinSero = X.cepas.filter((c) => !seroC(c))
  const mediaCepa = (c) => { const v = X.obsPlaca.filter((x) => x.cepa === c && usada(x)).map((x) => x.y); return v.length ? media(v) : NaN }
  return (
    <section className="tarjeta resumen-todas">
      <div className="cabeza-tarjeta"><span className="etiqueta-seccion">Todos los serotipos{juntar ? ' · todos los medios' : ` · ${medioSel}`}</span><span className="ayuda">Las letras corresponden a la comparación de arriba</span></div>
      <div className="tabla-scroll"><table className="tabla compacta">
        <thead><tr><th>Serotipo</th><th>Cepas (media de cada una)</th><th className="num">n</th><th className="num">Media</th><th className="num">DE</th><th className="col-resultado">{foco.ctrl ? 'Contra el control' : 'Letra'}</th></tr></thead>
        <tbody>{seros.map((sr) => {
          const dentro = serosIn.includes(sr)
          const g = foco.grupos.find((x) => x.nombre === sr)
          const cs = X.cepas.filter((c) => seroC(c) === sr)
          const res = !dentro ? { texto: <span className="tenue">no entra</span>, nivel: 'na' }
            : !r?.ok || !g?.v.length ? { texto: '—', nivel: 'na' }
              : foco.ctrl ? (sr === foco.ctrl ? { texto: <b>control</b>, nivel: 'na' } : (() => { const p = r.pares.find((x) => x.a === sr); return p && finito(p.pa) ? { texto: <><b>{p.pa < 0.05 ? '≠ control' : '= control'}</b> <small>p {pTxt(p.pa)}</small></>, nivel: p.pa < 0.05 ? 'dif' : 'ok' } : { texto: '—', nivel: 'na' } })())
                : { texto: <b>{r.letras?.[sr] || '—'}</b>, nivel: r.global.p < 0.05 ? 'dif' : 'ok', tip: 'Los serotipos que comparten una letra no difieren (p ajustado ≥ 0,05)' }
          return (
            <tr key={sr} className={dentro ? '' : 'apagada'}>
              <td><b>{sr}</b></td>
              <td>{cs.map((c) => <span key={c} className={`chip-cepa ${cepasSero.includes(c) ? '' : 'tenue'}`}>{c} <small>{finito(mediaCepa(c)) ? f(mediaCepa(c), 3) : '—'}</small></span>)}</td>
              <td className="num">{g?.v.length || 0}</td><td className="num">{g?.v.length ? f(media(g.v), 3) : '—'}</td><td className="num">{g?.v.length > 1 ? f(desvio(g.v), 3) : '—'}</td>
              <td className={`col-resultado ${res.nivel}`} data-tip={res.tip}>{res.texto}</td>
            </tr>
          )
        })}</tbody>
      </table></div>
      {sinSero.length > 0 && <p className="ayuda">Sin serotipo (no entran): {sinSero.join(', ')}. <button className="fantasma chico" onClick={s.abrirEditar}>Cargar serotipos</button></p>}
    </section>
  )
}

// todas las comparaciones «a medida»
export function ResumenLibres({ libres, iLibre, gruposLibre, analizarG, setO }) {
  return (
    <section className="tarjeta resumen-todas">
      <div className="cabeza-tarjeta"><span className="etiqueta-seccion">Todas las comparaciones a medida</span><span className="ayuda">Clic en una para verla arriba</span></div>
      <div className="tabla-scroll"><table className="tabla compacta">
        <thead><tr><th>Comparación</th><th>Grupos</th><th className="col-resultado">Resultado</th></tr></thead>
        <tbody>{libres.map((c, i) => { const gs = gruposLibre(c); const { r } = analizarG(gs); const res = resultadoTxt(r); return (
          <tr key={i} className={`${i === iLibre ? 'elegida' : 'fila-clic'}`} onClick={() => setO('selLibre', i)}><td><b>ANOVA {i + 1}</b></td><td>{gs.map((g) => g.nombre).join(' vs ')}</td><td className={`col-resultado ${res.nivel}`} data-tip={res.tip}>{res.texto}</td></tr>) })}</tbody>
      </table></div>
    </section>
  )
}
