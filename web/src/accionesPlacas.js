// Placas: agregar, quitar, renombrar, ordenar y copiar su configuración
import { hojasDe, leerPlaca } from './api.js'
import { placaVacia } from './modelo.js'

const nombreUnico = (base, existentes) => {
  let n = base, i = 2
  while (existentes.includes(n)) n = `${base} (${i++})`
  return n
}

export function accionesPlacas({ exp, expRef, placas, activa, activaId, setActivaId, setPlacas, actualizar, upd, avisar, archivosRef, setPlacaNueva }) {
  // Cada archivo se agrega como una placa; cada hoja de Excel que contenga una placa también.
  const agregarPlacas = async (files, idDestino = null) => {
    const nuevas = [], errores = []
    for (const file of Array.from(files)) {
      try {
        const { hojas } = await hojasDe(file)
        const lecturas = []
        for (const hoja of hojas) {
          try { lecturas.push({ hoja, r: await leerPlaca(file, hoja) }) } catch (e) { if (hojas.length === 1) throw e }
        }
        if (!lecturas.length) throw new Error('No encontré una placa (filas A a H con valores numéricos) en ninguna hoja.')
        const base = file.name.replace(/\.[^.]+$/, '')
        lecturas.forEach(({ hoja, r }) => nuevas.push({ file, hoja, hojas, r, nombre: lecturas.length > 1 ? `${base} · ${hoja}` : base }))
      } catch (e) {
        errores.push(`${file.name}: ${e.message}`)
      }
    }
    errores.forEach((m) => avisar(m, 'error'))
    if (!nuevas.length) return
    const e = expRef.current
    const origen = e.placas.find((p) => p.id === e.opts.archivo.layoutBase && p.config.length) || null
    const armar = (n, base) => {
      const disp = new Set(n.r.datos.map((d) => d.Pocillo))
      const hereda = origen && !base.config.length && origen.id !== base.id
      return {
        ...base,
        archivo: { nombre: n.file.name, hoja: n.hoja, hojas: n.hojas },
        placa: { datos: n.r.datos, onda: n.r.onda, fecha: n.r.fecha, preview: n.r.preview },
        ...(hereda ? { config: origen.config.filter((c) => disp.has(c.Pocillo)).map((c) => ({ ...c })), blancosUsados: origen.blancosUsados } : {}),
      }
    }
    const existentes = e.placas.map((p) => p.nombre)
    const creadas = []
    let primeraActiva = null, restantes = nuevas
    // las placas creadas de antemano (sin datos) reciben los archivos en orden; conservan su nombre, medio y configuración
    const vacias = idDestino ? [e.placas.find((p) => p.id === idDestino)].filter(Boolean) : e.placas.filter((p) => !p.placa)
    const asignados = nuevas.slice(0, vacias.length).map((n, i) => [vacias[i], n])
    if (asignados.length) {
      asignados.forEach(([p, n]) => { archivosRef.current[p.id] = n.file })
      primeraActiva = asignados[0][0].id
      restantes = nuevas.slice(asignados.length)
    }
    restantes.forEach((n) => {
      const p = armar(n, placaVacia(nombreUnico(n.nombre, [...existentes, ...creadas.map((c) => c.nombre)])))
      archivosRef.current[p.id] = n.file
      creadas.push(p)
      if (!primeraActiva) primeraActiva = p.id
    })
    setPlacas((ps) => [...ps.map((p) => { const par = asignados.find(([v]) => v.id === p.id); return par ? armar(par[1], p) : p }), ...creadas])
    setActivaId(primeraActiva)
    avisar((nuevas.length === 1 ? `Placa agregada: ${nuevas[0].r.datos.length} pocillos con datos.` : `${nuevas.length} placas agregadas.`)
      + (origen ? ` Se copió el layout de «${origen.nombre}».` : ''))
  }

  // Placa sin Excel: se deja lista de antemano (nombre, medio y pocillos); los datos se cargan después o se escriben a mano
  const crearPlacaVacia = ({ nombre: n, medio }) => {
    const sug = nombreUnico(`Placa ${placas.length + 1}`, placas.map((p) => p.nombre))
    const nombre = (n || '').trim() || sug
    if (placas.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) return avisar(`Ya hay una placa llamada «${nombre}».`, 'error')
    const p = { ...placaVacia(nombre), medio: medio || '' }
    const origen = placas.find((x) => x.id === exp.opts.archivo.layoutBase && x.config.length)
    if (origen) { p.config = origen.config.map((c) => ({ ...c })); p.blancosUsados = origen.blancosUsados }
    setPlacas((ps) => [...ps, p])
    setActivaId(p.id)
    setPlacaNueva(null)
    avisar(`Placa «${nombre}» creada sin datos: cargá el Excel o escribí las OD a mano en «Placas».`)
  }
  const cambiarHoja = async (id, hoja) => {
    const file = archivosRef.current[id]
    if (!file) return avisar('Para cambiar de hoja hay que volver a cargar el archivo.', 'error')
    try {
      const r = await leerPlaca(file, hoja)
      actualizar(id, (p) => ({ archivo: { ...p.archivo, hoja }, placa: { datos: r.datos, onda: r.onda, fecha: r.fecha, preview: r.preview } }))
    } catch (e) { avisar(e.message, 'error') }
  }
  const quitarPlaca = (id) => {
    const p = placas.find((x) => x.id === id)
    if (!p) return
    delete archivosRef.current[id]
    upd((e) => ({
      placas: e.placas.filter((x) => x.id !== id),
      opts: { ...e.opts, comparar: { ...e.opts.comparar, placasFuera: (e.opts.comparar.placasFuera || []).filter((x) => x !== id),
        ePlacasFuera: e.opts.comparar.ePlacasFuera ? e.opts.comparar.ePlacasFuera.filter((x) => x !== id) : e.opts.comparar.ePlacasFuera },
      archivo: { ...e.opts.archivo, layoutBase: e.opts.archivo.layoutBase === id ? '' : e.opts.archivo.layoutBase } },
    }))
    avisar(`Placa «${p.nombre}» quitada (Ctrl + Z para deshacer).`)
  }
  const copiarLayoutDe = (idOrigen, idDestino) => {
    const o = placas.find((p) => p.id === idOrigen), d = placas.find((p) => p.id === idDestino)
    if (!o || !d || !o.config.length) return avisar('La placa elegida no tiene layout.', 'error')
    const disp = d.placa ? new Set(d.placa.datos.map((x) => x.Pocillo)) : null
    const cfg = o.config.filter((c) => !disp || disp.has(c.Pocillo)).map((c) => ({ ...c }))
    actualizar(idDestino, { config: cfg, exclManual: [], exclForzado: [], blancosUsados: o.blancosUsados })
    avisar(`Layout de «${o.nombre}» copiado a «${d.nombre}» (${cfg.length} pocillos).`)
  }
  const ocultarPlaca = (id, v) => {
    actualizar(id, { oculta: v })
    if (v) {
      if (activaId === id) { const otra = placas.find((p) => p.id !== id && !p.oculta); if (otra) setActivaId(otra.id) }
      avisar('Placa oculta: queda fuera de los cálculos. Se ve con «Ver ocultas».')
    }
  }
  const renombrarPlaca = (id, nombre) => {
    if (!nombre) return avisar('El nombre no puede estar vacío.', 'error')
    if (placas.some((p) => p.id !== id && p.nombre.toLowerCase() === nombre.toLowerCase())) return avisar(`Ya hay una placa llamada «${nombre}».`, 'error')
    actualizar(id, { nombre })
  }
  const reordenarPlacas = (idMovida, idDestino) => {
    if (idMovida === idDestino) return
    setPlacas((ps) => {
      const mov = ps.find((p) => p.id === idMovida)
      if (!mov) return ps
      const sin = ps.filter((p) => p.id !== idMovida)
      const i = sin.findIndex((p) => p.id === idDestino)
      sin.splice(ps.findIndex((p) => p.id === idMovida) < ps.findIndex((p) => p.id === idDestino) ? i + 1 : i, 0, mov)
      return sin
    })
  }
  // Aplica un layout leído de un CSV a la placa activa o a todas (solo pocillos con datos en cada una)
  const aplicarLayout = (cfgCrudo, aTodas) => {
    const destinos = aTodas ? placas : activa ? [activa] : []
    if (!destinos.length) return avisar('No hay placas para aplicar el layout.', 'error')
    const orden = 'ABCDEFGH'
    const clave = (p) => orden.indexOf(p[0]) * 100 + Number(p.slice(1))
    upd((e) => ({
      placas: e.placas.map((p) => {
        if (!destinos.some((d) => d.id === p.id)) return p
        const disp = p.placa ? new Set(p.placa.datos.map((d) => d.Pocillo)) : null
        const cfg = cfgCrudo.filter((c) => !disp || disp.has(c.Pocillo)).map((c) => ({ ...c })).sort((a, b) => clave(a.Pocillo) - clave(b.Pocillo))
        return { ...p, config: cfg, exclManual: [], exclForzado: [] }
      }),
      muestras: [...new Set([...e.muestras, ...cfgCrudo.map((c) => c.Muestra)])],
    }))
    avisar(aTodas ? `Layout aplicado a ${destinos.length} ${destinos.length === 1 ? 'placa' : 'placas'}.` : `Layout importado en «${activa.nombre}».`)
  }
  const copiarConfig = () => {
    if (!activa) return
    const otras = placas.filter((p) => p.id !== activa.id)
    if (!otras.length) return avisar('No hay otras placas.', 'error')
    setPlacas((ps) => ps.map((p) => {
      if (p.id === activa.id) return p
      const disp = p.placa ? new Set(p.placa.datos.map((d) => d.Pocillo)) : null
      return { ...p, config: activa.config.filter((c) => !disp || disp.has(c.Pocillo)).map((c) => ({ ...c })), exclManual: [], exclForzado: [], blancosUsados: activa.blancosUsados }
    }))
    avisar(`Layout copiado a ${otras.length} ${otras.length === 1 ? 'placa' : 'placas'} (Ctrl + Z para deshacer).`)
  }
  // OD escritas o pegadas a mano: { A1: 0.523, ... }
  const ponerDatosManual = (id, valores, onda) => {
    const datos = Object.entries(valores).filter(([, v]) => Number.isFinite(v)).map(([Pocillo, OD]) => ({ Pocillo, OD }))
      .sort((a, b) => 'ABCDEFGH'.indexOf(a.Pocillo[0]) * 100 + Number(a.Pocillo.slice(1)) - ('ABCDEFGH'.indexOf(b.Pocillo[0]) * 100 + Number(b.Pocillo.slice(1))))
    actualizar(id, (p) => ({
      placa: datos.length ? { datos, onda: Number.isFinite(onda) ? onda : p.placa?.onda ?? null, fecha: p.placa?.fecha || new Date().toLocaleDateString('es'), preview: null, manual: true } : null,
      archivo: datos.length ? { nombre: 'Cargada a mano', hoja: null, hojas: [] } : null,
    }))
  }
  return { agregarPlacas, crearPlacaVacia, cambiarHoja, quitarPlaca, copiarLayoutDe, ocultarPlaca, renombrarPlaca, reordenarPlacas, aplicarLayout, copiarConfig, ponerDatosManual }
}
