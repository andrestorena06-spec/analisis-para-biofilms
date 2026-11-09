// Estadística: fichas de selección, gráfico de los grupos y los dos paneles (grupos que se comparan y resultado)
import { Nota } from './tip.jsx'
import { Select, Vacio } from './ui.jsx'
import { Chip, Hip, MatrizP, NOMBRE_TEST, Tabla, f, hipotesisGrupos, lecturaDe, pTxt } from './pruebas.jsx'
import { desvio, marcaSig, media } from '../estadistica.js'
import { dDE, dMedia } from '../calculos.js'
import { FUENTE, fmtTick, ticksBonitos } from '../utils.js'
import { TEMA } from '../tema.js'

const finito = Number.isFinite

// ---------------------------------------------------------------
// fichas seleccionables
// ---------------------------------------------------------------
export function Fichas({ etiqueta, tip, opciones, activa, onClick, multi, extra }) {
  return (
    <div className="fila-sel">
      <span className="fila-sel-t">{etiqueta}{tip && <Nota>{tip}</Nota>}</span>
      <div className="fichas">
        {opciones.map((x) => (
          <button key={x.id} type="button" className={`ficha ${activa(x.id) ? 'on' : ''} ${multi ? 'multi' : ''}`} disabled={x.desactivada} data-tip={x.tip} onClick={() => onClick(x.id)}>
            {multi && <i className="caja-ficha" aria-hidden>{activa(x.id) ? '✓' : ''}</i>}
            {x.color && <i className="punto" style={{ background: x.color }} />}
            {x.texto}{x.sub && <small>{x.sub}</small>}
          </button>
        ))}
        {extra}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// gráfico de los grupos: cada punto es un valor que entra en la prueba (placa o pocillo), con la media ± DE y la letra
// ---------------------------------------------------------------
function Dispersion({ grupos, letras, colorDe, unidad, umbrales }) {
  const vals = grupos.flatMap((g) => g.v)
  if (!vals.length) return null
  const W = 560, H = 270, m = { l: 54, r: 12, t: 24, b: 58 }
  const lo = Math.min(0, ...vals), hi = Math.max(...vals, 1e-9)
  const t = ticksBonitos(lo, hi * 1.08, 5)
  const y = (v) => m.t + (1 - (v - t.min) / (t.max - t.min)) * (H - m.t - m.b)
  const band = (W - m.l - m.r) / grupos.length
  const corto = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
  const yEje = H - m.b
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dispersion" role="img" aria-label="Valores de cada grupo" style={{ fontFamily: FUENTE }}>
      <rect width={W} height={H} fill="#fff" />
      {t.ticks.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke={TEMA.grilla} />
          <line x1={m.l - TEMA.marca} x2={m.l} y1={y(v)} y2={y(v)} stroke={TEMA.tinta} />
          <text x={m.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={TEMA.texto}>{fmtTick(v, t.paso)}</text>
        </g>
      ))}
      <text transform={`translate(14 ${(m.t + yEje) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11.5" fill={TEMA.texto}>{unidad}</text>
      {(umbrales || []).filter(([u]) => u >= t.min && u <= t.max).map(([u, nom]) => (
        <g key={u} data-tip={`${u} = ${nom} de cada placa (límite de clase)`}>
          <line x1={m.l} x2={W - m.r} y1={y(u)} y2={y(u)} stroke={TEMA.umbral} strokeDasharray="5 3" />
          <text x={W - m.r - 3} y={y(u) - 3} textAnchor="end" fontSize="10" fill={TEMA.tenue}>{nom}</text>
        </g>
      ))}
      {grupos.map((g, i) => {
        const cx = m.l + band * (i + 0.5)
        const mu = g.v.length ? media(g.v) : NaN, sd = g.v.length > 1 ? desvio(g.v) : 0
        const paso = Math.min(band * 0.07, 7)
        const ancho = Math.min(band * 0.3, 26)
        const cima = Math.max(...g.v, finito(mu) ? mu + sd : -Infinity)
        return (
          <g key={i}>
            {finito(mu) && (
              <g data-tip={`${g.nombre}\n${dMedia(g.v)}${g.v.length > 1 ? `\n\n${dDE(g.v)}` : ''}`}>
                {sd > 0 && <g stroke={TEMA.tinta} strokeWidth="1.1"><line x1={cx} x2={cx} y1={y(mu - sd)} y2={y(mu + sd)} /><line x1={cx - 5} x2={cx + 5} y1={y(mu + sd)} y2={y(mu + sd)} /><line x1={cx - 5} x2={cx + 5} y1={y(mu - sd)} y2={y(mu - sd)} /></g>}
                <line x1={cx - ancho} x2={cx + ancho} y1={y(mu)} y2={y(mu)} stroke={TEMA.tinta} strokeWidth="2" />
              </g>
            )}
            {g.det.map((d, k) => (
              <circle key={k} cx={cx + ((k % 5) - 2) * paso + 0.5 * paso * (Math.floor(k / 5) % 2)} cy={y(d.y)} r="3.8" fill={colorDe(d)} stroke={TEMA.tinta} strokeWidth={TEMA.contorno}
                data-tip={`${g.nombre}\n${d.etq}: ${f(d.y, 4)}`} />
            ))}
            {letras?.[g.nombre] && finito(cima) && <text x={cx} y={Math.max(y(cima) - 8, m.t - 8)} textAnchor="middle" fontSize="13" fontWeight="700" fill={TEMA.tinta}>{letras[g.nombre]}</text>}
            <line x1={cx} x2={cx} y1={yEje} y2={yEje + TEMA.marca} stroke={TEMA.tinta} />
            <text x={cx} y={yEje + 17} textAnchor="middle" fontSize="11.5" fill={TEMA.texto}>{corto(g.nombre, Math.max(6, Math.floor(band / 6.5)))}</text>
            <text x={cx} y={yEje + 31} textAnchor="middle" fontSize="10.5" fill={TEMA.tenue}>n = {g.v.length}</text>
          </g>
        )
      })}
      <line x1={m.l} x2={m.l} y1={m.t - 4} y2={yEje} stroke={TEMA.tinta} />
      <line x1={m.l} x2={W - m.r} y1={yEje} y2={yEje} stroke={TEMA.tinta} />
    </svg>
  )
}

// ---------------------------------------------------------------
// panel izquierdo: los grupos que se comparan
// ---------------------------------------------------------------
// sin bloque efectivo (faltan placas o hay exclusiones) la leyenda no habla del bloque
const leyendaNivel = (t, r) => { const x = /bloque/.test(t) && !r?.bloques ? 'cada punto es una placa' : t; return x.charAt(0).toUpperCase() + x.slice(1) }

export function PanelGrupos({ foco, unidad, nivelTxt, colorDe, fuera, comp, onCtrl, umbrales }) {
  const { grupos, r } = foco
  const ctrl = foco.ctrl
  const letra = (g) => {
    if (!r?.ok) return '–'
    if (ctrl) {
      if (g.nombre === ctrl) return 'control'
      const p = r.pares.find((x) => x.a === g.nombre)
      return p && finito(p.pa) ? (p.pa < 0.05 ? `≠ ${marcaSig(p.pa)}` : '=') : '–'
    }
    return r.letras?.[g.nombre] || '–'
  }
  return (
    <section className="tarjeta panel-est">
      <div className="cabeza-tarjeta"><span className="etiqueta-seccion">Grupos que se comparan</span><span className="ayuda">{unidad} · {nivelTxt}</span></div>
      <h2 className="pregunta">{foco.pregunta}</h2>
      {comp === 'control' && grupos.length > 1 && (
        <label className="campo fila-control"><span>Grupo control</span>
          <Select value={ctrl || ''} onChange={onCtrl} opciones={grupos.filter((g) => g.v.length).map((g) => [g.nombre, g.nombre])} /></label>
      )}
      {grupos.some((g) => g.v.length) ? (
        <>
          <p className="leyenda-fig"><b>Figura 1.</b> <i>{leyendaNivel(nivelTxt, r)}. Línea: media ± DE.{ctrl ? '' : ' Letras distintas, medias distintas.'}</i></p>
          <div className="figura"><Dispersion grupos={grupos} letras={ctrl ? null : r?.ok ? r.letras : null} colorDe={colorDe} unidad={unidad} umbrales={umbrales} /></div>
          <div className="tabla-scroll sin-marco">
            <table className="tabla compacta tres-lineas">
              <thead><tr><th>Grupo</th><th className="num">n</th><th className="num">Media</th><th className="num">DE</th><th className="num">CV %</th><th>{ctrl ? 'Contra el control' : 'Letra'}</th></tr></thead>
              <tbody>
                {grupos.map((g, i) => {
                  const mu = g.v.length ? media(g.v) : NaN, sd = g.v.length > 1 ? desvio(g.v) : NaN
                  return (
                    <tr key={i} className={!g.v.length ? 'fuera' : ''}>
                      <td data-tip={g.v.length ? `${g.nombre}: valores que entran\n${g.det.map((d) => `${d.etq}: ${f(d.y, 4)}`).join('\n')}` : 'Sin datos con esta selección'}><b>{g.nombre}</b></td>
                      <td className="num">{g.v.length}</td>
                      <td className="num">{f(mu, 3)}</td>
                      <td className="num">{f(sd, 3)}</td>
                      <td className="num">{finito(sd) && mu ? f((100 * sd) / Math.abs(mu), 1) : '–'}</td>
                      <td><b>{letra(g)}</b></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="ayuda nota-panel">
            {ctrl ? 'Cada grupo se compara con el control; «≠» difiere (p ajustado < 0,05), «=» no se distingue.' : 'Grupos con la misma letra no difieren (p ajustado ≥ 0,05).'}
            {fuera.length > 0 && <span data-tip={`Pocillos que no entran\n${fuera.map((x) => `${x.etq} (${x.cepa}): OD ${f(x.od, 3)} — ${x.motivo}`).join('\n')}`}> {fuera.length} {fuera.length === 1 ? 'pocillo excluido' : 'pocillos excluidos'} en esta selección (pasá el mouse).</span>}
          </p>
        </>
      ) : <Vacio texto="No hay datos con esta selección." />}
    </section>
  )
}

// ---------------------------------------------------------------
// panel derecho: el resultado de la prueba
// ---------------------------------------------------------------
export function PanelResultado({ foco, alDesarrollo, extra, contexto }) {
  const { r, ctrl } = foco
  if (!r) return <section className="tarjeta panel-est"><Vacio texto="Elegí al menos 2 grupos con datos." /></section>
  if (!r.ok) return <section className="tarjeta panel-est"><div className="cabeza-tarjeta"><span className="etiqueta-seccion">Resultado</span></div><Vacio titulo="No se puede hacer la prueba" texto={r.motivo} /></section>
  const p = r.global.p, sig = p < 0.05
  const dunnett = r.pares[0]?.metodo === 'Dunnett'
  const hip = hipotesisGrupos(r.tipo, foco.sujeto, foco.factor, r.grupos, ctrl, dunnett)
  const sw = r.sw, lev = r.lev
  return (
    <section className="tarjeta panel-est">
      <div className="cabeza-tarjeta"><span className="etiqueta-seccion">Resultado de la estadística</span><span className="ayuda">α = 0,05</span></div>
      {contexto && <p className={`contexto-est ${contexto.alerta ? 'alerta' : ''}`}>{contexto.texto}</p>}
      <div className={`veredicto ${sig ? 'dif' : 'ok'}`}>
        <svg className="veredicto-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" />{sig ? <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" /> : <path d="M7.5 12.5l3 3 6-6.5" />}</svg>
        <b>{sig ? 'Hay diferencias' : 'No hay diferencia clara'}</b>
        <span>{NOMBRE_TEST[r.tipo]} · {r.global.est} = {f(r.global.valor, 3)}{r.global.df2 ? ` (${r.global.df1}; ${f(r.global.df2, 1)} gl)` : ` (${r.global.df1} gl)`} · p = {pTxt(p)} {sig ? marcaSig(p) : ''}</span>
      </div>
      <p className="lectura">{lecturaDe(r, ctrl)}</p>
      <details className="plegable"><summary>Hipótesis</summary><Hip titulo="Hipótesis" items={hip.slice(0, 1)} /></details>

      <h4>Cómo se eligió la prueba</h4>
      <div className="indicadores">
        <div className="ind" data-tip={sw ? `Normalidad de los residuos (Shapiro-Wilk)\nW = ${f(sw.W, 3)}, p = ${pTxt(sw.p)}\nCon menos de 8 datos tiene poco poder: no decide` : 'Hacen falta al menos 3 datos con variación'}>
          <small>Normalidad</small>{sw ? <Chip tipo={sw.p < 0.05 ? 'alerta' : 'ok'}>{sw.p < 0.05 ? 'No normal' : 'Normal'} · p {pTxt(sw.p)}</Chip> : <Chip tipo="neutro">sin datos</Chip>}
        </div>
        <div className="ind" data-tip={lev ? `Igualdad de varianzas (Levene, Brown-Forsythe)\nF = ${f(lev.F, 3)}, p = ${pTxt(lev.p)}\nmayor DE / menor DE = ${f(lev.razonSD, 2)}` : 'Levene necesita 3 o más datos por grupo'}>
          <small>Varianzas</small>{lev ? <Chip tipo={lev.p < 0.05 ? 'alerta' : 'ok'}>{lev.p < 0.05 ? 'Distintas' : 'Parecidas'} · p {pTxt(lev.p)}</Chip> : <Chip tipo="neutro">no calculable</Chip>}
        </div>
        <div className="ind" data-tip={r.razon}><small>Prueba</small><Chip tipo="prueba">{NOMBRE_TEST[r.tipo]}</Chip></div>
        {r.bloques && <div className="ind" data-tip={`La placa como bloque\nCada placa mide todos los grupos: su variación (${f(r.bloques.pct, 0)} % del total) se saca del error.\nEfecto de la placa: p = ${pTxt(r.bloques.pBloque)}`}><small>Placa (bloque)</small><Chip tipo="prueba">{f(r.bloques.pct, 0)} % de la variación</Chip></div>}
      </div>
      <p className="razon-test">{r.razon}{dunnett && ` Contra el control se usó la prueba de Dunnett (p ajustado exacto).`}</p>

      {r.pares.length > 0 && (
        <>
          <h4>{ctrl ? `Cada grupo contra «${ctrl}»` : 'Comparaciones de a pares'}</h4>
          <p className="leyenda-fig"><b>Tabla 1.</b> <i>{ctrl ? 'Cada grupo contra el control' : 'Diferencia de medias de cada par'}; p ajustado por {r.pares[0]?.metodo || 'Holm'}.</i></p>
          <div className="tabla-scroll sin-marco">
            <table className="tabla compacta tres-lineas">
              <thead><tr><th>Par</th><th className="num">Diferencia</th><th className="num">p ajustado</th><th>Resultado</th></tr></thead>
              <tbody>
                {r.pares.map((x) => (
                  <tr key={x.a + '|' + x.b} className={finito(x.pa) && x.pa < 0.05 ? 'par-distinto' : 'par-igual'}>
                    <td data-tip={`${x.a}: x̄ = ${f(x.ma, 4)}\n${x.b}: x̄ = ${f(x.mb, 4)}\n${r.tipo === 'kw' ? 'z de Dunn' : r.tipo === 'friedman' ? 'z (rangos de Friedman)' : 't'} = ${f(x.est, 3)}${finito(x.df) ? ` · gl = ${f(x.df, 1)}` : ''}\np sin ajustar = ${pTxt(x.p)}`}>{x.a} vs {x.b}</td>
                    <td className="num">{f(x.dif, 3)}</td>
                    <td className="num">{pTxt(x.pa)}</td>
                    <td className={finito(x.pa) && x.pa < 0.05 ? 'dif-txt' : 'tenue'}>{!finito(x.pa) ? 'faltan datos' : x.pa < 0.05 ? `distintos ${marcaSig(x.pa)}` : 'sin diferencia'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!ctrl && r.grupos.length > 3 && <MatrizP r={r} />}
        </>
      )}

      <details className="plegable">
        <summary>Tabla de la prueba global{r.tipo === 'anova' || r.tipo === 'bloques' ? ' (ANOVA)' : ''}</summary>
        <p className="leyenda-fig"><b>Tabla 2.</b> <i>{r.global.nombre}.</i></p>
        <Tabla cols={['Prueba', 'Estadístico', 'gl', 'p']} filas={[[r.global.nombre, `${r.global.est} = ${f(r.global.valor, 3)}`, r.global.df2 ? `${r.global.df1}; ${f(r.global.df2, 2)}` : r.global.df1, pTxt(p)]]} />
        {r.global.filas && <Tabla cols={['Fuente', 'Suma de cuadrados', 'gl', 'Cuadrado medio', 'F', 'p']} filas={r.global.filas.map((x) => [x[0], f(x[1], 6), x[2], finito(x[3]) ? f(x[3], 6) : '', finito(x[4]) ? f(x[4], 3) : '', finito(x[5]) ? pTxt(x[5]) : ''])} />}
        {r.tipo === 'anova' && r.global.tabla && (
          <Tabla cols={['Fuente', 'Suma de cuadrados', 'gl', 'Cuadrado medio', 'F', 'p']}
            filas={[['Entre grupos', f(r.global.tabla.ssb, 6), r.global.tabla.df1, f(r.global.tabla.msb, 6), f(r.global.tabla.F, 3), pTxt(r.global.tabla.p)],
              ['Dentro (error)', f(r.global.tabla.ssw, 6), r.global.tabla.df2, f(r.global.tabla.msw, 6), '', ''], ['Total', f(r.global.tabla.sst, 6), r.global.tabla.df1 + r.global.tabla.df2, '', '', '']]} />
        )}
      </details>
      {extra}
      <button className="chico" onClick={alDesarrollo}>Ver el cálculo paso a paso<Nota>Abre «Métodos» con esta misma comparación desarrollada: residuos, Levene, la prueba y los pares.</Nota></button>
    </section>
  )
}
