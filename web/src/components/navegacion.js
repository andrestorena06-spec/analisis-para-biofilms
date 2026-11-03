// Pantallas del programa y orden del menú
import { TITULO_PASO } from '../progreso.js'
import { PlacaTab, AnalisisTab } from './tabs.jsx'
import { ExcluirTab, DatosTab, MetodosTab } from './tabs2.jsx'
import { PlacasVista } from './placas.jsx'
import { GraficoPestana } from './graficos.jsx'
import { EstadisticaTab } from './estadistica.jsx'
import { Resumen } from './resumen.jsx'

// pantallas: [título, vista, ícono]
export const PASOS = {
  resumen: [TITULO_PASO.resumen, Resumen, 'resumen'],
  placas: [TITULO_PASO.placas, PlacasVista, 'placas'],
  pocillos: [TITULO_PASO.pocillos, PlacaTab, 'placa'],
  calidad: [TITULO_PASO.calidad, ExcluirTab, 'escudo'],
  odc: [TITULO_PASO.odc, AnalisisTab, 'umbral'],
  grafico: [TITULO_PASO.grafico, GraficoPestana, 'barras'],
  estadistica: [TITULO_PASO.estadistica, EstadisticaTab, 'sigma'],
  datos: [TITULO_PASO.datos, DatosTab, 'tabla'],
  metodos: [TITULO_PASO.metodos, MetodosTab, 'libro'],
}
export const ORDEN = ['resumen', 'placas', 'pocillos', 'odc', 'calidad', 'grafico', 'estadistica', 'datos', 'metodos']
// los pasos que trabajan sobre la placa elegida van juntos en el menú
export const GRUPOS = { placa: { titulo: 'Por placa', icono: 'placa', hijos: ['pocillos', 'odc', 'calidad'] } }
export const grupoDe = (id) => Object.keys(GRUPOS).find((g) => GRUPOS[g].hijos.includes(id))
// pantallas que muestran la barra de placas (trabajan sobre la placa activa)
export const CON_PLACAS = new Set(['pocillos', 'calidad', 'odc', 'grafico', 'datos', 'metodos'])
