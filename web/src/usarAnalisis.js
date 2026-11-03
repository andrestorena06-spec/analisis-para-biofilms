// Análisis de cada placa: se recalcula cuando cambian sus datos, sus pocillos o el criterio de atípicos
import { useEffect, useRef, useState } from 'react'
import { analizar, ErrorRed } from './api.js'

export function usarAnalisis({ exp, placas, deteccion, avisar, setMotor }) {
  const [analisisLeido, setAnalisisMap] = useState({})   // análisis de cada placa con la OD leída
  // ---------- análisis de cada placa (en R o en el navegador, según el modo) ----------
  const versiones = useRef({})
  const claves = useRef({})
  useEffect(() => {
    if (!exp) return
    const t = setTimeout(() => {
      placas.forEach((p) => {
        if (!p.placa || !p.config.length) {
          if (claves.current[p.id] !== 'vacia') { claves.current[p.id] = 'vacia'; setAnalisisMap((m) => ({ ...m, [p.id]: null })) }
          return
        }
        const clave = JSON.stringify([p.config, p.exclManual, p.exclForzado, p.blancosUsados, deteccion, p.placa.datos])
        if (claves.current[p.id] === clave) return
        const v = (versiones.current[p.id] || 0) + 1
        versiones.current[p.id] = v
        analizar({
          datos: p.placa.datos, config: p.config, excl_manual: p.exclManual, excl_forzado: p.exclForzado,
          deteccion: { metodo: deteccion.metodo, usar: deteccion.usar, conf: deteccion.conf, cvMax: Number(deteccion.cvMax) || 20 },
          blancos_usados: p.blancosUsados,
        }).then((r) => {
          if (versiones.current[p.id] !== v) return
          claves.current[p.id] = clave
          setAnalisisMap((m) => ({ ...m, [p.id]: r }))
          setMotor(true)
        }).catch((e) => {
          if (e.name === 'AbortError') return
          if (e instanceof ErrorRed) setMotor(false)
          avisar(`${p.nombre}: ${e.message}`, 'error')
        })
      })
    }, 120)
    return () => clearTimeout(t)
  }, [placas, deteccion, avisar]) // eslint-disable-line react-hooks/exhaustive-deps
  const reiniciarAnalisis = () => { setAnalisisMap({}); claves.current = {} }
  return { analisisLeido, reiniciarAnalisis }
}
