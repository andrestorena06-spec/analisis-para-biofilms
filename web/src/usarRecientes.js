// «Recientes»: los últimos experimentos, guardados solos en este navegador
import { useEffect, useState } from 'react'
import { normalizarExp } from './modelo.js'

const CLAVE_VIEJA = 'biofilm-react-v3'            // guardado de la versión 2 (un solo trabajo)
const CLAVE_RECIENTES = 'biofilm-v3-recientes'
const MAX_RECIENTES = 8
export const leer = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }

// Recientes guardados; la primera vez se trae el trabajo guardado por la versión 2
function recientesIniciales() {
  const r = leer(CLAVE_RECIENTES)
  if (Array.isArray(r)) return r.filter((x) => x?.exp?.placas)
  const g = leer(CLAVE_VIEJA)
  if (g?.placas?.length) {
    try { const n = normalizarExp(g); return [{ fecha: g.fecha || new Date().toISOString(), exp: n.exp, tab: n.tab, activaId: n.activaId }] } catch { /* nada */ }
  }
  return []
}

export function usarRecientes(exp, tab, activaId) {
  const [recientes, setRecientes] = useState(recientesIniciales)

  // ---------- guardado automático en «Recientes» (máximo 8; si no hay lugar se guardan menos) ----------
  useEffect(() => {
    if (!exp) return
    const t = setTimeout(() => setRecientes((rs) => {
      const nuevo = [{ fecha: new Date().toISOString(), exp, tab, activaId }, ...rs.filter((r) => r.exp?.id !== exp.id)].slice(0, MAX_RECIENTES)
      for (let n = nuevo.length; n > 0; n--) {
        try { localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(nuevo.slice(0, n))); return nuevo.slice(0, n) } catch { /* sin espacio */ }
      }
      return nuevo
    }), 600)
    return () => clearTimeout(t)
  }, [exp, tab, activaId])
  const borrarReciente = (r) => setRecientes((rs) => {
    const n = rs.filter((x) => x.exp?.id !== r.exp?.id)
    try { localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(n)) } catch { /* nada */ }
    return n
  })
  return { recientes, borrarReciente }
}
