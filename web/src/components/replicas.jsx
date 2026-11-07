// Revisión entre réplicas: la misma pantalla que Revisión, con el promedio de cada placa como punto de cada cepa.
// Por defecto solo marca los valores atípicos; «Excluir solos» se activa a mano. Lo excluido deja de contar entre placas.
import { useRef, useState } from 'react'
import { ReplicasChart } from './charts.jsx'
import { EstiloDialog, MenuContextual, Num, RangoDialog, Select, Vacio, useMenuContextual } from './ui.jsx'
import { BotonCinta, BotonOpciones, Cajon, CampoCinta, Cinta, Grupo, InterruptorCinta, OpcionesCinta } from './cinta.jsx'
import { ExportDialog } from './exportar.jsx'
import { Icono } from './iconos.jsx'
import { Nota } from './tip.jsx'
import { GrupoBlanco } from './blanco.jsx'
import { ComentariosRevision } from './tabs2.jsx'
import { tamDe } from './ui.jsx'
import { conRango, estiloDefecto, estiloEscala, fmt } from '../utils.js'
import { normalizarMetodo } from '../motor.js'

const NOMBRE = { q: 'Test Q de Dixon', grubbs: 'Test de Grubbs', cv: 'Coeficiente de variación' }
const ERRORES = [['sd', 'DE'], ['sem', 'SEM'], ['ic95', 'IC 95 %']]

// Botón de la cinta que pasa de la revisión de pocillos a la de réplicas y vuelve
export const GrupoEntreReplicas = ({ s }) => (
  <div className="grupo-replicas"><Grupo titulo="Réplicas">
    <BotonCinta icono="placas" texto="Revisión entre réplicas" activo={!!s.opts.excluir.entreReplicas}
      onClick={() => s.setOpts((x) => ({ ...x, excluir: { ...x.excluir, entreReplicas: !x.excluir.entreReplicas } }))}
      tip={'Revisión entre réplicas\nCompara el promedio de cada placa para cada cepa, con los mismos tests que los pocillos.\nSe excluye solo el resultado de esa cepa en esa placa: deja de contar en las comparaciones entre placas.'} />
  </Grupo></div>
)

export function RevisionReplicas({ s }) {
  const svg = useRef()
  const [menu, abrirMenu, cerrarMenu] = useMenuContextual()
  const [dlg, setDlg] = useState(false)
  const [rng, setRng] = useState(false)
  const [exp, setExp] = useState(false)
  const [mas, setMas] = useState(false)
  const o = s.opts.replicas
  const setO = (k, v) => s.setOpts((x) => ({ ...x, replicas: { ...x.replicas, [k]: v } }))
  const R = s.replicas
  const metodo = normalizarMetodo(o.metodo)
  const estado = R.estado
  const eje = R.escala === 'odc' ? 'OD ÷ ODc' : s.ejeOD

  // clic en un punto: la misma lógica que con los pocillos
  const alternar = (k) => {
    const r = estado.find((e) => e.Pocillo === k)
    if (!r) return
    const uniq = (a) => [...new Set(a)]
    s.setOpts((x) => {
      const { manual, forzado } = x.replicas
      let m = manual, f = forzado
      if (r.Usado) { f = r.Forzado ? forzado.filter((y) => y !== k) : forzado; m = uniq([...manual, k]) }
      else if (r.Manual) { m = manual.filter((y) => y !== k); f = r.Sospechoso && x.replicas.usar && !r.Forzado ? uniq([...forzado, k]) : forzado }
      else if (r.AutoExcl) f = uniq([...forzado, k])
      return { ...x, replicas: { ...x.replicas, manual: m, forzado: f } }
    })
  }
  // una cepa por vez: sus resultados, un punto por placa, separados por medio si corresponde
  const cepas = [...new Set(R.orden.map((g) => estado.find((e) => e.Muestra === g).Cepa))]
  const cepa = cepas.includes(o.cepa) ? o.cepa : cepas[0]
  const iCepa = cepas.indexOf(cepa)
  const signo = o.orden === 'asc' ? 1 : o.orden === 'desc' ? -1 : 0
  const filas = R.orden.flatMap((g) => {
    const f = estado.filter((e) => e.Muestra === g && e.Cepa === cepa)
    return signo ? [...f].sort((a, b) => signo * (a.OD - b.OD)) : f
  })
  const marcas = (c) => ({ s: estado.filter((e) => e.Cepa === c && e.Sospechoso && e.Usado).length, x: estado.filter((e) => e.Cepa === c && !e.Usado).length })
  const excluidos = estado.filter((e) => !e.Usado)
  const sospechosos = estado.filter((e) => e.Sospechoso && e.Usado)
  const tipPunto = (e) => `${e.placa}${e.medio ? ` · ${e.medio}` : ''}\n${e.Cepa}: ${eje} = ${fmt(e.OD, 3)}\n${e.Manual ? 'Resultado excluido a mano' : e.Motivo || 'Aceptado'}\nClic para excluir o incluir este resultado`
  const chart = (ref, tam, ctx, click) => <ReplicasChart ref={ref} filas={filas} o={o} est={s.estilos.excluir} eje={eje} escala={R.escala} tipPunto={tipPunto} onClickPunto={click} onContext={ctx} tam={tam} />

  const cinta = (
    <Cinta>
      <Grupo titulo="Valores atípicos">
        <OpcionesCinta valor={metodo} onChange={(v) => setO('metodo', v)} opciones={[
          ['q', 'Dixon', 'Q', null, 'Test Q de Dixon (n de 3 a 10)\nCon los promedios de cada placa'],
          ['grubbs', 'Grubbs', 'G', null, 'Test de Grubbs (n ≥ 3)\nCon 3 placas casi nunca declara un atípico'],
          ['cv', 'CV', 'CV', null, 'Coeficiente de variación entre placas\nSi supera el límite, marca el resultado más alejado de la media'],
        ]} />
        {metodo === 'cv'
          ? <CampoCinta etiqueta="CV máximo (%)"><Num value={o.cvMax ?? 20} min={1} max={200} ancho={64} onChange={(v) => setO('cvMax', v === '' ? 20 : v)} /></CampoCinta>
          : <CampoCinta etiqueta="Confianza"><Select value={o.conf} onChange={(v) => setO('conf', v)} opciones={[['90', '90 %'], ['95', '95 %'], ['99', '99 %']]} /></CampoCinta>}
        <InterruptorCinta icono="escudo" texto="Excluir solos" valor={o.usar} onChange={(v) => setO('usar', v)} tip="Excluir automáticamente lo que el test marca. Desactivado: solo lo marca y decidís vos" />
        <BotonCinta icono="refrescar" texto="Restablecer" onClick={() => s.setOpts((x) => ({ ...x, replicas: { ...x.replicas, manual: [], forzado: [] } }))} tip="Vuelve a incluir los resultados excluidos o conservados a mano" />
      </Grupo>
      <GrupoBlanco s={s} />
      <Grupo titulo="Escala">
        <OpcionesCinta valor={R.escala} onChange={(v) => setO('escala', v)} opciones={[
          ['od', 'OD', 'OD', null, s.restarBlanco ? 'OD corregida de cada placa\nEl test se calcula sobre estos valores' : 'OD de cada placa\nEl test se calcula sobre estos valores'],
          ['odc', 'OD ÷ ODc', '÷', null, 'OD ÷ ODc de cada placa: es lo que se puede comparar entre placas\nEl test se calcula sobre estos valores'],
        ]} />
      </Grupo>
      <Grupo titulo="Comparar">
        <OpcionesCinta valor={o.agrupar === 'todas' ? 'todas' : 'medio'} onChange={(v) => setO('agrupar', v)} opciones={[
          ['medio', 'Por medio', null, 'matraz', 'Cada cepa se compara dentro de cada medio de cultivo'],
          ['todas', 'Todas', 'x̄', null, 'Cada cepa se compara en todas las placas, sin separar por medio'],
        ]} />
      </Grupo>
      <Grupo titulo="Mostrar">
        <InterruptorCinta icono="puntos" texto="Puntos" valor={o.puntos} onChange={(v) => setO('puntos', v)} />
        <InterruptorCinta simbolo="x̄" texto="Media" valor={o.medias} onChange={(v) => setO('medias', v)} tip="Valor medio escrito sobre cada grupo" />
        <InterruptorCinta simbolo="±" texto="Error" valor={o.errores} onChange={(v) => setO('errores', v)} tip="Agrega el error junto al valor medio" />
      </Grupo>
      <GrupoEntreReplicas s={s} />
      <BotonOpciones activo={mas} onClick={() => setMas(!mas)} tip="Tipo de error, orden, rotación e imagen" />
    </Cinta>
  )

  return (
    <div>
      {cinta}
      <Cajon titulo="Más opciones" abierto={mas} onClose={() => setMas(false)}>
        <div className="cajon-grupos">
          <Grupo titulo="Mostrar">
          <CampoCinta etiqueta="Error"><Select value={o.error} onChange={(v) => setO('error', v)} opciones={ERRORES} /></CampoCinta>
            <CampoCinta etiqueta="Orden" tip="Orden de las placas en el gráfico: el de la lista de placas o por su valor"><Select value={o.orden || 'lista'} onChange={(v) => setO('orden', v)} opciones={[['lista', 'Como en la lista de placas'], ['asc', 'Creciente'], ['desc', 'Decreciente']]} /></CampoCinta>
            <CampoCinta etiqueta="Rotación (°)"><Num value={o.rotar} min={0} max={90} ancho={56} onChange={(v) => setO('rotar', v === '' ? 0 : v)} /></CampoCinta>
          </Grupo>
          <Grupo titulo="Imagen">
            <BotonCinta icono="imagen" texto="Guardar imagen" onClick={() => setExp(true)} tip="PNG o SVG con el tamaño y la resolución que elijas" />
            <BotonCinta simbolo="Aa" texto="Textos" onClick={() => setDlg(true)} tip="Título, leyendas, etiquetas y números" />
            <BotonCinta icono="ordenar" texto="Eje Y" onClick={() => setRng(true)} tip="Mínimo y máximo del eje Y" />
          </Grupo>
        </div>
      </Cajon>
      {R.sinOdc.length > 0 && <p className="aviso-caja">Sin ODc (faltan blancos aceptados), no entran en OD ÷ ODc: {R.sinOdc.map((p) => p.nombre).join(', ')}.</p>}
      {!estado.length ? <Vacio titulo="Todavía no hay réplicas para comparar" texto="Hacen falta placas con sus pocillos configurados." /> : (
        <section className="tarjeta">
          <div className="cabeza-tarjeta">
            <span className="etiqueta-seccion">Réplicas entre placas · {NOMBRE[metodo]}{metodo === 'cv' ? ` (máx. ${o.cvMax ?? 20} %)` : ` (${o.conf} %)`}{o.usar ? ' · exclusión automática' : ' · solo marca'}</span>
            <span className="ayuda">Cada punto es el resultado de {cepa} en una placa. Clic para excluirlo o incluirlo
              <Nota>{'Azul: aceptado. Cruz roja: excluido. Anillo naranja: sospechoso según el test.\nSe excluye solo el resultado de esa cepa en esa placa: la placa sigue contando para las demás cepas.\nEl resultado excluido no cuenta en Comparar placas, Estadística, Orden ni en el informe entre placas, pero sigue en los análisis de esa placa.\nCon menos de 3 placas por grupo no se puede aplicar el test.'}</Nota></span>
          </div>
          <div className="selector-cepa">
            <button className="chico" disabled={iCepa <= 0} onClick={() => setO('cepa', cepas[iCepa - 1])} aria-label="Cepa anterior" data-tip="Cepa anterior"><Icono n="flecha" size={13} style={{ transform: 'rotate(180deg)' }} /></button>
            <div className="fichas">
              {cepas.map((c) => {
                const m = marcas(c)
                return (
                  <button key={c} type="button" className={`ficha ${c === cepa ? 'on' : ''}`} onClick={() => setO('cepa', c)}
                    data-tip={m.s || m.x ? `${c}\n${m.s ? `${m.s} sospechoso${m.s > 1 ? 's' : ''}` : ''}${m.s && m.x ? ' · ' : ''}${m.x ? `${m.x} excluido${m.x > 1 ? 's' : ''}` : ''}` : undefined}>
                    {c}{m.s > 0 && <i className="marca-sosp" aria-label="sospechoso">{m.s}</i>}{m.x > 0 && <i className="marca-excl" aria-label="excluido">{m.x}</i>}
                  </button>
                )
              })}
            </div>
            <button className="chico" disabled={iCepa >= cepas.length - 1} onClick={() => setO('cepa', cepas[iCepa + 1])} aria-label="Cepa siguiente" data-tip="Cepa siguiente"><Icono n="flecha" size={13} /></button>
          </div>
          <div className="figura">{chart(svg, undefined, abrirMenu, alternar)}</div>
          <div className="fila" style={{ marginTop: 10 }}>
            {sospechosos.length > 0 && <span className="chip aviso" data-tip={`Sospechosos dentro del análisis\n${sospechosos.map((e) => `${e.placa} · ${e.Cepa}: ${e.Motivo}`).join('\n')}`}>{sospechosos.length} {sospechosos.length === 1 ? 'sospechoso' : 'sospechosos'} sin excluir</span>}
            {excluidos.length ? <span className="ayuda"><b>Excluidos:</b> {excluidos.map((e) => <span key={e.Pocillo} className="chip peligro chip-boton" style={{ margin: '0 4px 4px 0' }} data-tip={`${e.placa} · ${e.Cepa}\n${eje} = ${fmt(e.OD, 3)}\n${e.Manual ? 'Excluido a mano' : e.Motivo}\nClic para volver a incluirlo`} onClick={() => alternar(e.Pocillo)}>{e.placa} · {e.Cepa}</span>)}</span>
              : <span className="ayuda">No hay resultados excluidos.</span>}
          </div>
        </section>
      )}
      <ComentariosRevision id="entre-replicas" guardado={o.comentario || ''} onGuardar={(v) => setO('comentario', v)}
        nota="Tu análisis de la comparación entre placas: qué resultado descartaste y por qué. Se guarda con la sesión y sale en el informe." placeholder="Ej.: «Saqué L201 de la placa 3 de BHI: su resultado no coincide con las otras dos.»" />
      <MenuContextual menu={menu} items={[
        ['Estilo de texto…', () => { cerrarMenu(); setDlg(true) }],
        ['Rango del eje Y…', () => { cerrarMenu(); setRng(true) }],
        ['Guardar imagen…', () => { cerrarMenu(); setExp(true) }],
        ['Restablecer estilo de texto', () => { cerrarMenu(); s.setEstilos((e) => ({ ...e, excluir: estiloDefecto() })) }],
      ]} />
      {rng && <RangoDialog est={estiloEscala(s.estilos.excluir, R.escala)} onClose={() => setRng(false)} onGuardar={(e) => { s.setEstilos((x) => ({ ...x, excluir: conRango(x.excluir, e, R.escala) })); setRng(false) }} />}
      {dlg && <EstiloDialog estilo={s.estilos.excluir} conClases={false} ejeDefecto={eje} onClose={() => setDlg(false)} onGuardar={(e) => { s.setEstilos((x) => ({ ...x, excluir: e })); setDlg(false) }} />}
      {exp && svg.current && <ExportDialog nombre={`revision_entre_replicas_${cepa}`} size0={tamDe(svg.current)} onClose={() => setExp(false)} render={(ref, tam) => chart(ref, tam, (e) => e.preventDefault(), () => {})} />}
    </div>
  )
}
