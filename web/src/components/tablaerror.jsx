import { Nota } from './tip.jsx'
import { ERROR_REL, tipoRel } from './charts.jsx'
import { fmt, ic95 } from '../utils.js'

// Tabla debajo de los gráficos de Revisión: cada muestra con su media y el error elegido (el mismo que el gráfico).
// Con DE el porcentaje es el CV; con SEM, el EE %; con IC 95 %, el IC %. En naranja si el CV supera el límite.
// grupos: [{ nombre, medio?, n, nTotal, m, sd, sem, ic, excl: [texto], sosp: [texto], blanco? }]
const ETQ = { sd: ['DE', 'CV %'], sem: ['SEM', 'EE %'], ic95: ['IC 95 %', 'IC %'] }

export function TablaError({ grupos, error, cvLim, eje, tituloCol = 'Muestra' }) {
  const tr = tipoRel(error)
  const [etqErr, etqRel] = ETQ[tr]
  const R = ERROR_REL[tr]
  const errDe = (g) => (tr === 'sd' ? g.sd : tr === 'sem' ? g.sem : g.ic)
  const pctDe = (g, e) => (Number.isFinite(e) && g.m > 1e-6 && !g.blanco ? (100 * e) / g.m : NaN)
  return (
    <div className="tabla-scroll tabla-error">
      <table className="tabla">
        <thead>
          <tr>
            <th>{tituloCol}</th><th>Aceptados</th><th>{eje}</th>
            <th>{etqErr}<Nota>{`${R.nombre}\nSe calcula con los valores aceptados que se dibujan (los excluidos no cuentan).`}</Nota></th>
            <th>{etqRel}<Nota>{`${R.nombre} = 100 × ${R.sigla} ÷ media${tr === 'sd' ? `\nEn naranja: más del ${cvLim} % (límite de CV de «Revisión»).` : ''}`}</Nota></th>
            <th>Excluidos</th><th>Sospechosos</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => {
            const e = errDe(g)
            const p = pctDe(g, e)
            const alto = tr === 'sd' && Number.isFinite(p) && p > cvLim
            return (
              <tr key={g.nombre + (g.medio || '')}>
                <td><b>{g.nombre}</b>{g.medio ? <small className="medio-placa">{g.medio}</small> : null}</td>
                <td>{g.n}{g.nTotal !== g.n ? ` de ${g.nTotal}` : ''}</td>
                <td>{Number.isFinite(g.m) ? fmt(g.m, 4) : '–'}</td>
                <td>{Number.isFinite(e) ? fmt(e, 4) : '–'}</td>
                <td className={alto ? 'cv-alto' : ''} style={alto ? { color: '#c25e00', fontWeight: 700 } : undefined}>{Number.isFinite(p) ? `${fmt(p, 1)} %` : '–'}</td>
                <td>{g.excl.length ? g.excl.join(', ') : '–'}</td>
                <td>{g.sosp.length ? g.sosp.join(', ') : '–'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Agrupa el estado de los pocillos por muestra; tv pasa la OD a la escala que se dibuja
export function gruposDeEstado(estado, orden, tv, resta = 0, ficha = (e) => e.Pocillo) {
  return orden.map((m) => {
    const g = estado.filter((e) => e.Muestra === m)
    const u = g.filter((e) => e.Usado).map((e) => tv(e.OD)).filter(Number.isFinite)
    const n = u.length
    const mm = n ? u.reduce((a, b) => a + b, 0) / n : NaN
    const sd = n > 1 ? Math.sqrt(u.reduce((a, b) => a + (b - mm) ** 2, 0) / (n - 1)) : NaN
    const sem = sd / Math.sqrt(n)
    return { nombre: m, n, nTotal: g.length, m: mm, sd, sem, ic: n > 1 ? ic95(sem, n) : NaN, blanco: !!resta && g.some((e) => e.EsBlanco),
      excl: g.filter((e) => !e.Usado).map(ficha), sosp: g.filter((e) => e.Sospechoso && e.Usado).map(ficha) }
  }).filter((g) => g.nTotal)
}
