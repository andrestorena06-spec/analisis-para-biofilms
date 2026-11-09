// Métodos › Estadística: la placa como bloque desarrollada paso a paso con los datos de la comparación elegida
import { Cuenta, Paso, Tabla } from './pasos.jsx'
import { anovaBloques, tablaBloques } from '../bloques.js'
import { fCdf } from '../reproducibilidad.js'

const finito = Number.isFinite
const f = (x, d = 4) => (finito(x) ? x.toFixed(d).replace('.', ',') : '–')
const s = (x, d = 4) => (finito(x) && x > 0 ? '+' : '') + f(x, d)
const pTxt = (p) => (!finito(p) ? '–' : p < 0.0001 ? '< 0,0001' : p.toFixed(4).replace('.', ','))

// grupos: [{ nombre, v, det: [{ placaId, y }] }]; nombrePlaca(id) → nombre visible
export function BloqueConTusDatos({ grupos, nombrePlaca, unidad }) {
  const g = grupos.filter((x) => x.v.length)
  const T = tablaBloques(g)
  if (g.length < 2 || T.bloques.length < 3) return null
  const A = anovaBloques(T.Y)
  const b = A.b, k = A.k
  const ef = A.mb.map((m) => m - A.G)                       // efecto de cada placa
  const Yc = T.Y.map((fila, i) => fila.map((y) => y - ef[i]))  // datos sin el efecto de la placa
  const dfSin = A.dfb + A.dfe, cmSin = (A.ssb + A.sse) / dfSin
  const Fsin = cmSin > 0 ? A.ssg / A.dfg / cmSin : Infinity
  const pSin = cmSin > 0 ? 1 - fCdf(Fsin, A.dfg, dfSin) : 0
  const ee = Math.sqrt((2 * A.mse) / b)
  // par de ejemplo: el de mayor diferencia
  let ej = { i: 0, j: 1, d: -Infinity }
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { const d = Math.abs(A.mg[i] - A.mg[j]); if (d > ej.d) ej = { i, j, d } }
  const dif = A.mg[ej.i] - A.mg[ej.j]
  const nom = g.map((x) => x.nombre)
  const placa0 = nombrePlaca(T.bloques[0])

  return (
    <div className="bloque-pasos">
      <h4>La placa como bloque, con tus datos</h4>
      <p className="ayuda">Método: ANOVA de dos factores sin interacción (grupo + placa), el mismo que <code>aov(y ~ grupo + placa)</code> de R. Entran las {b} placas que tienen todos los grupos{T.sueltas.length ? ` (quedan afuera: ${T.sueltas.map(nombrePlaca).join(', ')})` : ''}. Variable: {unidad}.</p>

      <Paso n={1} icono="placas" titulo="Cada placa tiene su propio nivel"
        porque={<>Cada placa se tiñe en un día distinto: si ese día la tinción salió más fuerte, sube a todos los grupos de esa placa. <b>Primero se mide cuánto se aparta cada placa</b> del promedio general: ese es su efecto.</>}>
        <Tabla leyenda={<>Un valor por placa y grupo. Efecto de la placa = promedio de la placa − promedio general.</>}
          cols={['Placa', ...nom, 'Promedio', 'Efecto']}
          filas={[...T.Y.map((fila, i) => [nombrePlaca(T.bloques[i]), ...fila.map((y) => f(y, 3)), f(A.mb[i], 3), s(ef[i], 3)]),
            ['Promedio', ...A.mg.map((m) => f(m, 3)), f(A.G, 3), '']]} />
        <Cuenta izq={`Efecto de ${placa0}`} pasos={[`${f(A.mb[0], 4)} − ${f(A.G, 4)}`]} res={s(ef[0])} />
      </Paso>

      <Paso n={2} icono="filtro" titulo="Se resta el efecto de la placa"
        porque={<>A cada valor se le resta el efecto de su placa. <b>Los grupos conservan su orden, pero las réplicas se acercan entre sí</b>: lo que se saca es la variación del día, no la diferencia entre grupos.</>}>
        <Tabla leyenda={<>Valores sin el efecto de la placa (valor − efecto). Los promedios de cada grupo no cambian.</>}
          cols={['Placa', ...nom]}
          filas={Yc.map((fila, i) => [nombrePlaca(T.bloques[i]), ...fila.map((y) => f(y, 3))])} />
        <Cuenta izq={`${nom[0]} en ${placa0}`} pasos={[`${f(T.Y[0][0], 4)} − (${s(ef[0])})`]} res={f(Yc[0][0])} />
      </Paso>

      <Paso n={3} icono="sigma" titulo="La variación se reparte en tres partes"
        porque={<>Toda la variación de los datos se divide en la que viene de los grupos, la que viene de las placas y la que sobra (el error, el «ruido»). <b>Sin bloque, la parte de las placas quedaría sumada al ruido</b> y las diferencias entre grupos se verían menos.</>}>
        <Cuenta izq="SC total" pasos={['Σ (valor − promedio general)²']} res={f(A.sst, 5)} />
        <Cuenta izq="SC grupos" pasos={[`${b} placas × Σ (promedio del grupo − promedio general)²`]} res={f(A.ssg, 5)} />
        <Cuenta izq="SC placas" pasos={[`${k} grupos × Σ (efecto de la placa)²`]} res={f(A.ssb, 5)} />
        <Cuenta izq="SC error" pasos={['SC total − SC grupos − SC placas', `${f(A.sst, 5)} − ${f(A.ssg, 5)} − ${f(A.ssb, 5)}`]} res={f(A.sse, 5)} />
        <Tabla leyenda={<>ANOVA con la placa como bloque. CM = SC / gl; F = CM / CM del error.</>}
          cols={['Fuente', 'SC', 'gl', 'CM', 'F', 'p']}
          filas={[['Grupos', f(A.ssg, 5), A.dfg, f(A.ssg / A.dfg, 5), f(A.Fg, 2), pTxt(A.pg)], ['Placas (bloque)', f(A.ssb, 5), A.dfb, f(A.ssb / A.dfb, 5), f(A.Fb, 2), pTxt(A.pb)], ['Error', f(A.sse, 5), A.dfe, f(A.mse, 5), '', '']]}
          pie={[['Total (SC)', f(A.sst, 5)]]} />
        <Tabla leyenda={<>Lo que cambia al sacar las placas del error ({f(A.pctBloque, 0)} % de la variación total era de las placas).</>}
          cols={['', 'CM del error (ruido)', 'F de los grupos', 'p']}
          filas={[['Sin bloque', `${f(cmSin, 5)} (gl ${dfSin})`, f(Fsin, 2), pTxt(pSin)], ['Con la placa como bloque', `${f(A.mse, 5)} (gl ${A.dfe})`, f(A.Fg, 2), pTxt(A.pg)]]} marcar={1} />
      </Paso>

      <Paso n={4} icono="tabla" titulo="Las comparaciones de a pares usan el ruido nuevo"
        porque={<>Para decidir si dos grupos son distintos se compara su diferencia con el ruido. <b>Con el bloque se usa el CM del error sin las placas</b>, que es más chico, así que la misma diferencia pesa más. Después se ajusta el p por la cantidad de pares, igual que sin bloque.</>}>
        <Cuenta izq="EE de una diferencia" pasos={['√(2 × CM error / placas)', `√(2 × ${f(A.mse, 5)} / ${b})`]} res={f(ee)} />
        <Cuenta izq={`t (${nom[ej.i]} − ${nom[ej.j]})`} pasos={['diferencia / EE', `${f(dif)} / ${f(ee)}`]} res={`${f(dif / ee, 2)} con ${A.dfe} gl`} />
      </Paso>
    </div>
  )
}
