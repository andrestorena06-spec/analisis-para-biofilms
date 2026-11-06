// Estadística: la cinta con los datos, la réplica, la prueba y el ajuste
import { useState } from 'react'
import { Select } from './ui.jsx'
import { BotonCinta, Cajon, CampoCinta, Cinta, Grupo, OpcionesCinta } from './cinta.jsx'
import { GrupoBlanco } from './blanco.jsx'

const NOM_PRUEBA = { auto: 'Automática', anova: 'ANOVA', welch: 'Welch', kw: 'Kruskal-Wallis' }

export function CintaEstadistica({ s, o, setO, grupoModo, variable, modo, nivel, conBloque, usaPlacaLibre, comp, ajuste, irDesarrollo }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
    <Cinta>
      {grupoModo}
      <Grupo titulo="Datos">
        <OpcionesCinta valor={variable} onChange={(v) => setO('variable', v)} opciones={[
          ['od', 'OD', 'OD', null, s.restarBlanco ? 'OD corregida (OD leída − blanco)' : 'OD tal cual'], ['ln', 'ln(OD)', 'ln', null, 'Logaritmo natural de la OD\nEstabiliza la varianza cuando la DE crece con la media'], ['odc', 'OD ÷ ODc', '÷', null, 'Cada OD dividida por el ODc de su placa: cada unidad es un ODc (1 = ODc, 2 = 2 × ODc, 4 = 4 × ODc)\nQuita la diferencia de tinción entre placas; la dispersión sigue creciendo con la OD'],
        ]} />
      </Grupo>
      {modo === 'serotipos' && (
        <Grupo titulo="Réplica">
          <OpcionesCinta valor={nivel} onChange={(v) => setO('nivelSero', v)} opciones={[
            ['cepa', 'Cepa', null, 'etiqueta', 'Un valor por cepa: la media de sus placas\nLa cepa es la réplica del serotipo: la opción correcta para concluir'],
            ['bloque', 'Placa como bloque', null, 'resumen', 'Un valor por placa de cada cepa, con la placa como bloque\nCada placa mide todos los serotipos: se saca su variación del error'],
            ['placa', 'Placa', null, 'placas', 'Un valor por placa de cada cepa\nLas placas de una misma cepa no son independientes como cepas distintas: los p salen más chicos'],
            ['pocillo', 'Pocillos', null, 'puntos', 'Cada pocillo cuenta como réplica\nMuchos más datos, pero no son independientes: los p salen demasiado chicos'],
          ]} />
        </Grupo>
      )}
      {modo !== 'placas' && modo !== 'serotipos' && !usaPlacaLibre && (
        <Grupo titulo="Réplica">
          <OpcionesCinta valor={nivel} onChange={(v) => setO('nivel', v)} opciones={[
            ...(conBloque ? [['bloque', 'Placa como bloque', null, 'resumen', 'Un valor por placa, con la placa como bloque (recomendado al comparar cepas)\nCada placa es un día de experimento y mide todas las cepas: si una placa tiñó más, sube a todas. El modelo en bloques saca esa variación del error y la prueba detecta mejor las diferencias.\nHacen falta 3 o más placas con todos los grupos.']] : []),
            ['placa', 'Placa', null, 'placas', 'Un valor por placa (OD media de sus pocillos)\nEs la réplica biológica: la opción correcta para concluir'],
            ['pocillo', 'Pocillos', null, 'puntos', 'Cada pocillo cuenta como réplica\nDa más datos, pero los pocillos de una placa no son independientes: los p salen demasiado chicos'],
          ]} />
        </Grupo>
      )}
      <Grupo titulo="Prueba"><BotonCinta simbolo="Σ" texto={NOM_PRUEBA[o.prueba || 'auto']} activo={abierto} onClick={() => setAbierto(!abierto)} tip="Prueba global, comparaciones y ajuste de los pares" /></Grupo>
      <GrupoBlanco s={s} />
      <Grupo titulo="Desarrollo"><BotonCinta icono="libro" texto="Cálculos" onClick={irDesarrollo} tip="La comparación de los paneles desarrollada paso a paso (pestaña «Métodos»)" /></Grupo>
    </Cinta>
    <Cajon titulo="Opciones de la prueba" abierto={abierto} onClose={() => setAbierto(false)}>
      <div className="cajon-grupos">
      <Grupo titulo="Prueba">
        <CampoCinta etiqueta="Prueba global" tip={'Automática: Kruskal-Wallis si los residuos no son normales (con 8 o más datos), ANOVA de Welch si las varianzas son distintas (Levene) y, si no, ANOVA clásico'}>
          <Select value={o.prueba || 'auto'} onChange={(v) => setO('prueba', v)} opciones={[['auto', 'Automática'], ['anova', 'ANOVA clásico'], ['welch', 'ANOVA de Welch'], ['kw', 'Kruskal-Wallis']]} />
        </CampoCinta>
        <OpcionesCinta valor={comp} onChange={(v) => setO('comp', v)} opciones={[
          ['pares', 'Todos los pares', null, 'copiar', 'Compara todos los grupos de a pares'],
          ['control', 'Contra control', null, 'flecha', 'Compara cada grupo con uno de referencia (Dunnett con ANOVA clásico)'],
        ]} />
        <CampoCinta etiqueta="Ajuste" tip={'Holm: controla el error de todas las comparaciones; sirve con cualquier prueba\nTukey / Games-Howell: hecho para comparar todos los pares; Tukey-Kramer con el ANOVA clásico y Games-Howell con el de Welch (con Kruskal-Wallis se usa Dunn con Holm)\nLSD de Fisher: sin ajuste; solo con ANOVA clásico significativo y pocos grupos\nContra un control con ANOVA clásico se usa Dunnett'}>
          <Select value={ajuste} onChange={(v) => setO('ajuste', v)} opciones={[['holm', 'Holm / Dunnett'], ['tukey', 'Tukey / Games-Howell'], ['lsd', 'LSD de Fisher']]} />
        </CampoCinta>
      </Grupo>
      </div>
    </Cajon>
    </>
  )
}
