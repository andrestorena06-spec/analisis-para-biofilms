// Deshacer y rehacer sobre el experimento
import { useCallback, useRef, useState } from 'react'

export function usarHistorial(exp, setExp) {
  // ---------- deshacer / rehacer (los cambios seguidos, a menos de 0,7 s, cuentan como uno) ----------
  const expRef = useRef(null)
  expRef.current = exp
  const hist = useRef({ pasado: [], futuro: [], ultimo: 0 })
  const [, setNHist] = useState(0)
  const upd = useCallback((patch) => {
    const h = hist.current, ahora = Date.now()
    if (expRef.current && ahora - h.ultimo > 700) { h.pasado.push(expRef.current); if (h.pasado.length > 80) h.pasado.shift() }
    h.ultimo = ahora
    h.futuro = []
    setNHist((n) => n + 1)
    setExp((e) => (e ? { ...e, ...(typeof patch === 'function' ? patch(e) : patch) } : e))
  }, [])
  const deshacer = useCallback(() => {
    const h = hist.current
    if (!h.pasado.length) return
    h.futuro.push(expRef.current); h.ultimo = 0
    setExp(h.pasado.pop()); setNHist((n) => n + 1)
  }, [])
  const rehacer = useCallback(() => {
    const h = hist.current
    if (!h.futuro.length) return
    h.pasado.push(expRef.current); h.ultimo = 0
    setExp(h.futuro.pop()); setNHist((n) => n + 1)
  }, [])
  return { expRef, hist, upd, deshacer, rehacer }
}
