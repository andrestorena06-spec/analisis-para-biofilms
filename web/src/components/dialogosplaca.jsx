// Ventanas para renombrar una placa y para crear una placa sin Excel
import { Campo, Modal, Select } from './ui.jsx'

export function DialogoRenombrar({ renombrar, setRenombrar, renombrarPlaca }) {
  return (
    <Modal titulo="Renombrar placa" onClose={() => setRenombrar(null)} ancho={420}
      pie={<><button onClick={() => setRenombrar(null)}>Cancelar</button><button className="primario" onClick={() => { renombrarPlaca(renombrar.id, renombrar.nombre.trim()); setRenombrar(null) }}>Guardar</button></>}>
      <Campo label="Nombre de la placa"><input autoFocus value={renombrar.nombre} onChange={(e) => setRenombrar({ ...renombrar, nombre: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter') { renombrarPlaca(renombrar.id, renombrar.nombre.trim()); setRenombrar(null) } }} /></Campo>
      <p className="ayuda">Este nombre aparece en la barra de placas, en los gráficos y en las comparaciones.</p>
    </Modal>
  )
}

export function DialogoPlacaNueva({ exp, placas, placaNueva, setPlacaNueva, crearPlacaVacia }) {
  return (
    <Modal titulo="Placa sin Excel" onClose={() => setPlacaNueva(null)} ancho={460}
      pie={<><button onClick={() => setPlacaNueva(null)}>Cancelar</button><button className="primario" onClick={() => crearPlacaVacia(placaNueva)}>Crear placa</button></>}>
      <p className="ayuda" style={{ marginTop: 0 }}>Queda lista con su nombre, medio y pocillos; los datos se cargan después desde el Excel o se escriben a mano.</p>
      <Campo label="Nombre"><input autoFocus value={placaNueva.nombre} placeholder={`Placa ${placas.length + 1}`} onChange={(e) => setPlacaNueva({ ...placaNueva, nombre: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && crearPlacaVacia(placaNueva)} /></Campo>
      <Campo label="Medio de cultivo"><Select value={placaNueva.medio} onChange={(v) => setPlacaNueva({ ...placaNueva, medio: v })} opciones={[['', '(sin indicar)'], ...exp.medios.map((m) => [m, m])]} /></Campo>
    </Modal>
  )
}
