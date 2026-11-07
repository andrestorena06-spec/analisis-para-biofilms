// Revisión entre réplicas: en vez de los pocillos de una placa, se compara el promedio de cada placa para cada cepa.
// Una placa es una réplica biológica. Se usan los mismos tests que con los pocillos (Dixon, Grubbs, CV), pero sobre la
// escala elegida: en OD ÷ ODc porque comparar absorbancias de placas distintas no tiene sentido.
// Se excluye solo el resultado de una cepa en una placa (la placa sigue para las demás cepas): deja de contar entre placas
// (Comparar, Estadística, Orden e informe), no dentro de la placa.
import { marcarAtipicos } from './motor.js'

export const replicasDef = () => ({
  escala: 'odc', agrupar: 'medio',                  // agrupar: 'medio' (dentro de cada medio) o 'todas' (todas juntas)
  metodo: 'q', conf: '95', cvMax: 20, usar: false,   // por defecto solo marca: «Excluir solos» se activa a mano
  puntos: true, medias: true, errores: true, error: 'sd', rotar: 45, orden: 'lista',
  cepa: '',                                          // la cepa que se está revisando
  manual: [], forzado: [], comentario: '',           // listas de «idPlaca|muestra»
})

const finito = Number.isFinite
export const claveReplica = (placaId, muestra) => `${placaId}|${muestra}`

export function analizarReplicas(placas, analisisMap, muestras, op0) {
  const op = { ...replicasDef(), ...op0 }
  const escala = op.escala === 'od' ? 'od' : 'odc'
  const con = placas.filter((p) => !p.oculta && analisisMap[p.id]?.resumen?.length)
  const variosMedios = new Set(con.map((p) => p.medio || '')).size > 1
  const porMedio = op.agrupar !== 'todas' && variosMedios
  const filas = []
  const sinOdc = []
  con.forEach((p) => {
    const a = analisisMap[p.id], odc = a.odc?.odc, resta = a.odc?.resta || 0
    if (escala === 'odc' && !(odc > 0)) { sinOdc.push(p); return }
    a.resumen.forEach((r) => {
      const y = !finito(r.Media) ? NaN : escala === 'odc' ? (r.Media + resta) / odc : r.Media
      if (!finito(y)) return
      filas.push({
        Pocillo: claveReplica(p.id, r.Muestra), Muestra: porMedio ? `${r.Muestra} · ${p.medio || 'sin medio'}` : r.Muestra,
        Cepa: r.Muestra, Replica: 0, EsBlanco: false, OD: y, placaId: p.id, placa: p.nombre, medio: p.medio || '',
      })
    })
  })
  const estado = marcarAtipicos(filas, op.manual, op.forzado, { metodo: op.metodo, conf: op.conf, cvMax: op.cvMax, usar: op.usar })
  estado.forEach((e) => {
    e.Replica = estado.filter((x) => x.Muestra === e.Muestra && con.findIndex((p) => p.id === x.placaId) <= con.findIndex((p) => p.id === e.placaId)).length
    e.Motivo = e.Motivo.replace('pocillo más alejado', 'resultado más alejado')
  })
  // grupos del eje X, en el orden de la lista de muestras (y dentro de cada cepa, por medio)
  const rango = (m) => { const i = muestras.indexOf(m); return i < 0 ? 1e6 : i }
  const orden = [...new Set(estado.map((e) => e.Muestra))].sort((a, b) => {
    const ea = estado.find((e) => e.Muestra === a), eb = estado.find((e) => e.Muestra === b)
    return rango(ea.Cepa) - rango(eb.Cepa) || ea.medio.localeCompare(eb.medio)
  })
  return { escala, estado, orden, sinOdc, porMedio, variosMedios, nPlacas: con.length }
}

// El análisis de cada placa sin las cepas excluidas entre réplicas: es lo que usan las comparaciones entre placas
export function analisisEntrePlacas(analisisMap, excluidas) {
  if (!excluidas.length) return analisisMap
  const out = { ...analisisMap }
  excluidas.forEach((x) => {
    const a = out[x.placaId]
    if (!a) return
    out[x.placaId] = { ...a, resumen: a.resumen.filter((r) => r.Muestra !== x.Cepa), estado: a.estado.filter((e) => e.Muestra !== x.Cepa) }
  })
  return out
}
