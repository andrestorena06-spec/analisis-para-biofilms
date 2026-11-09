import { useState } from 'react'
import { Campo, Select } from './ui.jsx'
import { Nota } from './tip.jsx'
import { Icono } from './iconos.jsx'
import { detectarCV, detectarGrubbs, detectarQ } from '../motor.js'
import { media } from '../estadistica.js'
import { estad } from '../calculos.js'
import { CLASES, COLOR_CLASE } from '../utils.js'

const f = (x, d = 4) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : x === Infinity ? '∞' : '–')

// tabla de resultados con formato de tres líneas; `pie` = filas de totales; `marcar` = índice de fila resaltada
export function Tabla({ cols, filas, pie, leyenda, marcar }) {
  return (
    <>
      {leyenda && <p className="leyenda-fig">{leyenda}</p>}
      <div className="tabla-scroll chica sin-marco">
        <table className="tabla paso-tabla tres-lineas">
          <thead><tr>{cols.map((c, i) => <th key={c} className={i ? 'num' : ''}>{c}</th>)}</tr></thead>
          <tbody>{filas.map((r, i) => <tr key={i} className={i === marcar ? 'marcada' : ''}>{r.map((v, j) => <td key={j} className={j ? 'num' : ''}>{v}</td>)}</tr>)}</tbody>
          {pie && <tfoot>{pie.map((r, i) => <tr key={i}><th colSpan={cols.length - 1}>{r[0]}</th><td className="num">{r[1]}</td></tr>)}</tfoot>}
        </table>
      </div>
    </>
  )
}

// un paso del cálculo: ícono con su número, título en lenguaje común, el porqué y el para qué, y después tablas y cuentas
export function Paso({ n, icono, titulo, children, porque }) {
  return (
    <div className="paso-mt">
      <div className="paso-ico" aria-hidden><em>{n}</em><Icono n={icono} size={22} ancho={1.6} /></div>
      <div className="paso-cuerpo">
        <h3>{titulo}</h3>
        <p className="paso-porque">{porque}</p>
        {children}
      </div>
    </div>
  )
}

// una cuenta en una línea: izquierda = pasos intermedios = resultado (resaltado)
export const Cuenta = ({ izq, pasos = [], res }) => (
  <p className="cuenta">{izq} = {pasos.map((p, i) => <span key={i}>{p} = </span>)}<b>{res}</b></p>
)

// ===============================================================
// CÁLCULO PASO A PASO con los datos de la placa activa
// ===============================================================
export function PasoAPaso({ s }) {
  const a = s.analisis
  const muestras = a.resumen.map((m) => m.Muestra)
  const [m, setM] = useState('')
  const muestra = muestras.includes(m) ? m : muestras[0]
  const det = s.deteccion
  const odc = a.odc.odc
  const resta = a.odc.resta || 0          // blanco restado (Revisión › Restar blanco)
  const leida = (e) => (Number.isFinite(e.ODleida) ? e.ODleida : e.OD)
  const cvMax = Number(det.cvMax) || 20

  // 1 y 2. blancos y punto de corte (siempre con la OD leída)
  const bl = (s.analisisLeido || a).estado.filter((e) => e.EsBlanco && e.Usado)
  const eb = estad(bl.map((e) => e.OD))

  // 3 y 4. una muestra
  const reps = a.estado.filter((e) => e.Muestra === muestra && e.Usado && !e.EsBlanco)
  const es = estad(reps.map((e) => e.OD))
  const res = a.resumen.find((x) => x.Muestra === muestra)
  const sumaOD = reps.reduce((t, e) => t + e.OD, 0)

  // 5. clase: con la OD leída
  const mLeida = es.m + resta
  const claseIdx = res ? CLASES.indexOf(res.Clasificacion) : -1

  // 6. valores atípicos de la muestra (todas sus réplicas no excluidas a mano)
  const todas = a.estado.filter((e) => e.Muestra === muestra && !e.Manual)
  const x = todas.map(leida)   // los tests de atípicos usan la OD leída
  const d = det.metodo === 'grubbs' ? detectarGrubbs(x, det.conf) : det.metodo === 'cv' ? detectarCV(x, cvMax) : detectarQ(x, det.conf)
  const orden = x.map((v, i) => ({ v, e: todas[i] })).sort((p, q) => p.v - q.v)
  const rango = orden.length ? orden[orden.length - 1].v - orden[0].v : NaN
  const nClase = es.n > 1 ? 5 : 4
  const nRaro = nClase + (Number.isFinite(odc) ? 1 : 0)

  return (
    <section className="tarjeta metodo">
      <div className="titulo-fila">
        <h2>Cálculo paso a paso con tus datos <Nota>Cada paso dice para qué sirve, muestra los números de la placa activa en una tabla y hace la cuenta completa. Elegí la muestra para ver sus pasos.</Nota></h2>
        {muestras.length > 0 && <Campo label="Muestra"><Select value={muestra} onChange={setM} opciones={muestras.map((x) => [x, x])} /></Campo>}
      </div>

      <Paso n={1} icono="pozo" titulo="Cuánto marca un pocillo vacío"
        porque={<>Un pocillo sin bacterias igual absorbe algo de luz: el plástico, el medio y un poco de cristal violeta que queda pegado. <b>Se promedian los blancos</b> para saber cuánto vale «nada» y no confundirlo con biofilm.</>}>
        {bl.length > 1 ? (
          <>
            <Tabla leyenda={<>Blancos aceptados de la placa activa. La última columna mide qué tan lejos cae cada uno de la media.</>}
              cols={['Pocillo', 'OD', 'OD − x̄', '(OD − x̄)²']}
              filas={bl.map((e) => [e.Pocillo, f(e.OD), f(e.OD - eb.m), f((e.OD - eb.m) ** 2, 6)])}
              pie={[['Suma', f(eb.ss, 6)]]} />
            <Cuenta izq="x̄ (media)" pasos={['Σ OD / n', `${f(bl.reduce((t, e) => t + e.OD, 0))} / ${eb.n}`]} res={f(eb.m)} />
            <Cuenta izq="DE (desvío)" pasos={['√[ Σ(OD − x̄)² / (n − 1) ]', `√(${f(eb.ss, 6)} / ${eb.n - 1})`]} res={f(eb.sd)} />
          </>
        ) : <p className="ayuda">Hacen falta al menos 2 blancos aceptados.</p>}
      </Paso>

      <Paso n={2} icono="umbral" titulo="La línea de corte (ODc)"
        porque={<>Los blancos no dan todos igual. Si a su media se le suman <b>3 veces su desvío</b>, casi ningún pocillo vacío queda por encima: lo que supera esa línea es biofilm de verdad, no ruido de la lectura.</>}>
        {Number.isFinite(odc) && bl.length > 1
          ? <Cuenta izq="ODc" pasos={['x̄ + 3 × DE', `${f(eb.m)} + 3 × ${f(eb.sd)}`]} res={f(odc)} />
          : <p className="ayuda">Sin blancos suficientes no hay línea de corte.</p>}
      </Paso>

      {res && (
        <>
          <Paso n={3} icono="replicas" titulo={`El valor de «${muestra}»`}
            porque={<>Cada muestra va en varios pocillos (réplicas) y ninguno da exactamente igual. <b>La media la resume en un número</b>; el desvío dice cuánto se separan las réplicas de esa media.{resta ? <> Con «Restar blanco», a cada pocillo se le resta antes la media de los blancos ({f(resta)}).</> : null}</>}>
            <Tabla leyenda={<>Réplicas aceptadas de «{muestra}»{resta ? ', en OD corregida' : ''}.</>}
              cols={[...(resta ? ['Pocillo', 'Réplica', 'OD leída', 'OD corregida'] : ['Pocillo', 'Réplica', 'OD']), 'OD − x̄', '(OD − x̄)²']}
              filas={reps.map((e) => [e.Pocillo, e.Replica, ...(resta ? [f(leida(e))] : []), f(e.OD), f(e.OD - es.m), f((e.OD - es.m) ** 2, 6)])}
              pie={[['Suma', f(es.ss, 6)]]} />
            <Cuenta izq="x̄ (media)" pasos={['Σ OD / n', `${f(sumaOD)} / ${es.n}`]} res={f(es.m)} />
            {es.n > 1 && <Cuenta izq="DE (desvío)" pasos={['√[ Σ(OD − x̄)² / (n − 1) ]', `√(${f(es.ss, 6)} / ${es.n - 1})`]} res={f(es.sd)} />}
          </Paso>

          {es.n > 1 && (
            <Paso n={4} icono="error" titulo="Qué tan confiable es esa media"
              porque={<>Con pocas réplicas la media puede caer lejos del valor real. <b>El error estándar y el intervalo de confianza</b> dicen cuánto podría moverse; el CV compara el desvío con el tamaño de la media (más de {cvMax} % conviene revisarlo).</>}>
              <Cuenta izq="EE (error estándar)" pasos={['DE / √n', `${f(es.sd)} / √${es.n}`]} res={f(es.sem)} />
              <Cuenta izq="IC 95 %" pasos={[`t(0,975; ${es.n - 1}) × EE`, `${f(es.t, 3)} × ${f(es.sem)}`]} res={`± ${f(es.ic)}`} />
              <Cuenta izq="CV" pasos={['100 × DE / x̄', `100 × ${f(es.sd)} / ${f(es.m)}`]} res={`${f(es.cv, 1)} %`} />
              <p className="ayuda">t es el valor de la distribución t de Student con {es.n - 1} grados de libertad: con pocas réplicas es grande y el intervalo se ensancha.</p>
            </Paso>
          )}

          {Number.isFinite(odc) && (
            <Paso n={nClase} icono="etiqueta" titulo="La clase"
              porque={<>La OD sola depende del día de tinción. <b>Comparada con el ODc de su misma placa</b> se vuelve comparable entre días (criterio de Stepanović).{resta ? ' La clase se decide con la OD leída.' : ''}</>}>
              <Tabla leyenda={<>Límites de cada clase en esta placa; resaltada, la que corresponde a «{muestra}».</>}
                cols={['Clase', 'Condición', 'Límite']} marcar={claseIdx}
                filas={[['No productor', 'OD ≤ ODc', f(odc)], ['Productor débil', 'ODc < OD ≤ 2 ODc', f(2 * odc)], ['Productor moderado', '2 ODc < OD ≤ 4 ODc', f(4 * odc)], ['Productor fuerte', 'OD > 4 ODc', f(4 * odc)]]
                  .map(([c, ...r]) => [<span key={c}><i className="punto" style={{ background: COLOR_CLASE[c] }} />{c}</span>, ...r])} />
              <Cuenta izq="x̄ / ODc" pasos={[`${f(mLeida)} / ${f(odc)}`]} res={`${f(mLeida / odc, 2)} ⇒ ${res.Clasificacion || '–'}`} />
            </Paso>
          )}

          <Paso n={nRaro} icono="atipico" titulo="¿Hay algún pocillo raro?"
            porque={<>Un pocillo con una burbuja, mal lavado o con un error de pipeteo puede dar muy distinto a sus réplicas. {det.metodo === 'q'
              ? <><b>El test Q de Dixon</b> mira si el valor del extremo está demasiado lejos de su vecino comparado con el rango de todas las réplicas.</>
              : det.metodo === 'grubbs' ? <><b>El test de Grubbs</b> mide a cuántos desvíos de la media está el valor más extremo.</>
                : <><b>Si el CV supera {cvMax} %</b>, el pocillo más alejado de la media queda como sospechoso.</>}{resta ? ' Se hace con la OD leída.' : ''}</>}>
            {orden.length >= 3 ? (
              <>
                <Tabla leyenda={<>Réplicas de «{muestra}» ordenadas de menor a mayor.</>}
                  cols={['Orden', 'Pocillo', 'OD', 'Hasta el siguiente', det.metodo === 'q' ? 'Distancia / rango' : '|OD − x̄|']}
                  filas={orden.map((r, i) => [i + 1, r.e.Pocillo, f(r.v), i < orden.length - 1 ? f(orden[i + 1].v - r.v) : '–',
                    det.metodo === 'q' ? (i === 0 ? f((orden[1].v - r.v) / rango, 3) : i === orden.length - 1 ? f((r.v - orden[i - 1].v) / rango, 3) : '–') : f(Math.abs(r.v - media(x)))])}
                  pie={det.metodo === 'q' ? [['Rango (máx − mín)', f(rango)]] : [['Media x̄', f(media(x))], ['DE', f(estad(x).sd)]]} />
                <Cuenta izq={det.metodo === 'q' ? 'Q' : det.metodo === 'grubbs' ? 'G' : 'CV'}
                  pasos={[det.metodo === 'q' ? 'mayor distancia / rango' : det.metodo === 'grubbs' ? 'máx |OD − x̄| / DE' : '100 × DE / x̄']}
                  res={`${f(d.stat, 3)} ${d.idx !== null ? '>' : '≤'} ${f(d.crit, 3)} (valor crítico)`} />
                <p className={`decision ${d.idx !== null ? 'dif' : 'ok'}`}>{d.idx !== null ? `Sospechoso: ${todas[d.idx]?.Pocillo} (extremo ${d.lado}). Se decide en «Revisión».` : 'Ningún pocillo raro: todas las réplicas son parecidas.'}</p>
              </>
            ) : <p className="ayuda">Hacen falta al menos 3 réplicas.</p>}
          </Paso>
        </>
      )}

      <p className="ayuda">Las comparaciones entre placas, medios y cepas están más abajo, en «Estadística», con cada prueba desarrollada paso a paso.</p>
    </section>
  )
}
