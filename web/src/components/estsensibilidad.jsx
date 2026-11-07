// Estadística: ¿la conclusión cambia con otra escala, réplica, prueba o ajuste?
import { useState } from 'react'
import { Nota } from './tip.jsx'
import { Chip, NOMBRE_TEST, pTxt } from './pruebas.jsx'
import { analizarBloques, puedeBloques } from '../bloques.js'
import { analizar } from '../decision.js'
import { marcaSig } from '../estadistica.js'
import { prepararDatos, unidadDe } from '../resumenes.js'

const finito = Number.isFinite

// La misma comparación con todas las combinaciones razonables de escala, réplica, prueba y ajuste
export function correrSensibilidad({ sinBloque, s, D, X, variable, modo, conBloque, nivel, nivelDatos, comp, ajuste, gruposFoco, ctrlDe, nombrePlaca, bloquePosible, foco }) {
  const escalas = [['od', unidadDe('od', X.corregida)], ['ln', unidadDe('ln', X.corregida)], ...(X.sinOdc.length ? [] : [['odc', 'OD ÷ ODc']])]
  const disenos = modo === 'serotipos' ? ['cepa', 'bloque', 'placa'] : conBloque ? ['bloque', 'placa'] : [nivelDatos]
  const NOM_D = { cepa: 'Cepa', bloque: 'Placa como bloque', placa: 'Placa', pocillo: 'Pocillos' }
  const ajustes = comp === 'control' ? ['control'] : ['holm', 'tukey', ...(ajuste === 'lsd' ? ['lsd'] : [])]
  const filas = []
  escalas.forEach(([esc, nomE]) => {
    const XX = esc === variable ? X : prepararDatos(s, D, esc)
    disenos.forEach((dis) => {
      const gs = gruposFoco(XX, dis === 'bloque' ? 'placa' : dis).filter((g) => g.v.length)
      if (gs.length < 2) return
      if (dis === 'bloque' && (sinBloque || !puedeBloques(gs))) return
      const ctrl = ctrlDe(gs)
      const pruebas = dis === 'bloque' ? [['anova', 'ANOVA en bloques'], ['kw', 'Friedman']] : [['anova', 'ANOVA'], ['welch', 'ANOVA de Welch'], ['kw', 'Kruskal-Wallis']]
      pruebas.forEach(([forz]) => ajustes.forEach((aj) => {
        // con Kruskal-Wallis los pares son siempre Dunn con Holm: no se repite la fila
        if (forz === 'kw' && dis !== 'bloque' && aj !== ajustes[0]) return
        const r = dis === 'bloque' ? analizarBloques(gs, forz, ctrl, aj === 'control' ? 'holm' : aj, nombrePlaca) : analizar(gs, forz, ctrl, aj === 'control' ? 'holm' : aj)
        if (!r?.ok) return
        const normal = !r.sw || r.sw.p >= 0.05, igual = !r.lev || r.lev.p >= 0.05
        const cumple = r.tipo === 'anova' ? normal && igual : r.tipo === 'welch' || r.tipo === 'bloques' ? normal : true
        const motivo = r.tipo === 'anova' ? (!normal ? 'residuos no normales' : !igual ? 'varianzas distintas' : '') : (r.tipo === 'welch' || r.tipo === 'bloques') && !normal ? 'residuos no normales' : ''
        const sig = r.pares.filter((p) => finito(p.pa) && p.pa < 0.05)
        filas.push({ esc, nomE, dis, nomD: NOM_D[dis], tipo: r.tipo, prueba: NOMBRE_TEST[r.tipo], metodo: r.pares[0]?.metodo || '—', aj, p: r.global.p, sig, nPares: r.pares.length, cumple, motivo,
          elegida: esc === variable && dis === (nivel === 'bloque' && !bloquePosible ? 'placa' : nivel) && r.tipo === foco.r?.tipo && (aj === 'control' || aj === ajuste || (r.tipo === 'kw' && aj === ajustes[0])) })
      }))
    })
  })
  const validas = filas.filter((x) => x.cumple)
  const nSig = validas.filter((x) => x.p < 0.05).length
  const clave = (p) => (p.dif >= 0 ? `${p.a} > ${p.b}` : `${p.b} > ${p.a}`)
  const conjuntos = validas.map((x) => new Set(x.sig.map(clave)))
  const siempre = conjuntos.length ? [...conjuntos[0]].filter((k) => conjuntos.every((c) => c.has(k))) : []
  const alguna = [...new Set(conjuntos.flatMap((c) => [...c]))].filter((k) => !siempre.includes(k))
  const robusta = validas.length > 0 && (nSig === 0 || nSig === validas.length)
  return { filas, validas: validas.length, nSig, siempre, alguna, robusta, sinDif: nSig === 0 }
}

// se calcula solo al abrirla
export function Sensibilidad({ correr }) {
  const [abierto, setAbierto] = useState(false)
  const R = abierto ? correr() : null
  return (
    <details className="tarjeta plegable sensibilidad" onToggle={(e) => setAbierto(e.currentTarget.open)}>
      <summary>¿Cambia la conclusión con otro método? <small className="ayuda">· análisis de sensibilidad</small>
        <Nota>{'Repite esta misma comparación con todas las combinaciones razonables de escala (OD, ln, OD ÷ ODc), réplica, prueba y ajuste.\nSirve para saber si el resultado es firme, no para elegir el que da significativo: elegir el método por el p hace que el p deje de valer.\nSe informa el método elegido por el flujo (resaltado) y, si hace falta, este control.'}</Nota></summary>
      {R && (
        <>
          <div className={`veredicto ${R.robusta ? (R.sinDif ? 'ok' : 'dif') : 'mixto'}`}>
            <b>{R.robusta ? (R.sinDif ? 'Conclusión firme: no hay diferencias' : 'Conclusión firme: hay diferencias') : 'La conclusión depende del método'}</b>
            <span>{R.nSig} de {R.validas} combinaciones que cumplen sus supuestos dan diferencias (p &lt; 0,05)</span>
          </div>
          {R.siempre.length > 0 && <p className="lectura">Pares que difieren en todas las combinaciones válidas: <b>{R.siempre.join('; ')}</b>.</p>}
          {R.alguna.length > 0 && <p className="ayuda">Solo en algunas (tomalos con cautela): {R.alguna.join('; ')}.</p>}
          <div className="tabla-scroll">
            <table className="tabla compacta">
              <thead><tr><th>Escala</th><th>Réplica</th><th>Prueba</th><th>Pares</th><th className="num">p global</th><th>Pares que difieren</th><th>Supuestos</th></tr></thead>
              <tbody>{R.filas.map((x, i) => (
                <tr key={i} className={`${x.elegida ? 'elegida' : ''} ${x.cumple ? '' : 'fuera'}`}>
                  <td>{x.nomE}</td><td>{x.nomD}</td><td>{x.prueba}</td><td>{x.metodo}</td>
                  <td className={`num ${x.p < 0.05 ? 'dif-txt' : ''}`}>{pTxt(x.p)} {x.p < 0.05 ? marcaSig(x.p) : ''}</td>
                  <td>{x.sig.length ? `${x.sig.length} de ${x.nPares}` : '—'}</td>
                  <td>{x.cumple ? <Chip tipo="ok">cumple</Chip> : <Chip tipo="alerta" tip={x.motivo}>no cumple</Chip>}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <p className="ayuda">Resaltada: la combinación que eligió el flujo. En gris: las que no cumplen los supuestos de su prueba (no cuentan para el veredicto). Los pocillos como réplica no entran: no son independientes y darían p demasiado chicos.</p>
        </>
      )}
    </details>
  )
}
