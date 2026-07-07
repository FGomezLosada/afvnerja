'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const diasSemana = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const diaNumero = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4,
  viernes: 5, sabado: 6, domingo: 0,
}

function generarFechasEntreno(fechaInicio, fechaFin, dias) {
  const fechas = []
  const inicio = new Date(fechaInicio + 'T12:00:00')
  const fin = new Date(fechaFin + 'T12:00:00')
  const diasNums = dias.map(d => diaNumero[d])

  const actual = new Date(inicio)
  while (actual <= fin) {
    if (diasNums.includes(actual.getDay())) {
      fechas.push(actual.toISOString().split('T')[0])
    }
    actual.setDate(actual.getDate() + 1)
  }
  return fechas
}

export default function AdminConfig() {
  const [temporadas, setTemporadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [premiosData, setPremiosData] = useState({})
  const [editandoPremios, setEditandoPremios] = useState(null)
  const [formPremio, setFormPremio] = useState({ categoria: '', ganador: '', descripcion: '' })
  const router = useRouter()

  const formInicial = {
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    cuota_importe: 60,
    min_asistencias: 15,
    dias_entreno: [],
    hora_entreno: '20:45',
    notas: '',
  }
  const [form, setForm] = useState(formInicial)

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }
      cargarTemporadas()
    }
    cargar()
  }, [])

  async function cargarTemporadas() {
    const { data } = await supabase
      .from('temporadas')
      .select('*')
      .order('fecha_inicio', { ascending: false })
    setTemporadas(data || [])

    const { data: premios } = await supabase
      .from('premios_temporada')
      .select('*')
    const premiosMap = {}
    premios?.forEach(p => { premiosMap[p.temporada_id] = p })
    setPremiosData(premiosMap)
    setLoading(false)
  }

  function toggleDia(dia) {
    const dias = [...form.dias_entreno]
    const idx = dias.indexOf(dia)
    if (idx === -1) dias.push(dia)
    else dias.splice(idx, 1)
    setForm({ ...form, dias_entreno: dias })
  }

  async function guardarTemporada(e) {
    e.preventDefault()
    setGuardando(true)

    const { data: nuevaTemp, error } = await supabase.from('temporadas').insert({
      nombre: form.nombre,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      cuota_importe: parseFloat(form.cuota_importe),
      min_asistencias: parseInt(form.min_asistencias),
      dias_entreno: form.dias_entreno,
      hora_entreno: form.hora_entreno,
      notas: form.notas || null,
      activa: false,
    }).select().single()

    if (error) {
      setMensaje('Error: ' + error.message)
      setGuardando(false)
      return
    }

    // Generar entrenos automáticamente si hay días seleccionados
    if (form.dias_entreno.length > 0 && form.fecha_inicio && form.fecha_fin) {
      setGenerando(true)
      const fechas = generarFechasEntreno(form.fecha_inicio, form.fecha_fin, form.dias_entreno)

      const entrenos = fechas.map(fecha => ({
        temporada_id: nuevaTemp.id,
        tipo: 'entreno',
        fecha,
        hora: form.hora_entreno,
        titulo: `Entreno ${fecha}`,
        estado: 'programado',
        cuenta_asistencia: true,
        lista_entreno_activa: false,
      }))

      // Insertar en bloques de 50
      for (let i = 0; i < entrenos.length; i += 50) {
        await supabase.from('eventos').insert(entrenos.slice(i, i + 50))
      }
      setGenerando(false)
      setMensaje(`✅ Temporada creada con ${fechas.length} entrenos generados automáticamente`)
    } else {
      setMensaje('✅ Temporada creada')
    }

    setForm(formInicial)
    setMostrarForm(false)
    cargarTemporadas()
    setGuardando(false)
    setTimeout(() => setMensaje(''), 5000)
  }

  async function toggleVisibleHome(tempId) {
    const actual = premiosData[tempId]
    if (actual) {
      await supabase.from('premios_temporada').update({ visible_home: !actual.visible_home }).eq('id', actual.id)
      setPremiosData(prev => ({ ...prev, [tempId]: { ...actual, visible_home: !actual.visible_home } }))
    } else {
      const { data } = await supabase.from('premios_temporada').insert({ temporada_id: tempId, visible_home: true, premios: [] }).select().single()
      if (data) setPremiosData(prev => ({ ...prev, [tempId]: data }))
    }
  }

  async function guardarPremio(tempId) {
    if (!formPremio.categoria.trim() || !formPremio.ganador.trim()) return
    const actual = premiosData[tempId]
    const listaPremios = actual?.premios || []
    const nuevaLista = [...listaPremios, formPremio]
    if (actual) {
      await supabase.from('premios_temporada').update({ premios: nuevaLista }).eq('id', actual.id)
      setPremiosData(prev => ({ ...prev, [tempId]: { ...actual, premios: nuevaLista } }))
    } else {
      const { data } = await supabase.from('premios_temporada').insert({ temporada_id: tempId, visible_home: false, premios: nuevaLista }).select().single()
      if (data) setPremiosData(prev => ({ ...prev, [tempId]: data }))
    }
    setFormPremio({ categoria: '', ganador: '', descripcion: '' })
  }

  async function eliminarPremio(tempId, index) {
    const actual = premiosData[tempId]
    if (!actual) return
    const nuevaLista = actual.premios.filter((_, i) => i !== index)
    await supabase.from('premios_temporada').update({ premios: nuevaLista }).eq('id', actual.id)
    setPremiosData(prev => ({ ...prev, [tempId]: { ...actual, premios: nuevaLista } }))
  }

  async function activarTemporada(id) {
    if (!confirm('¿Activar esta temporada? La temporada actual quedará como histórico.')) return
    await supabase.from('temporadas').update({ activa: false }).neq('id', id)
    await supabase.from('temporadas').update({ activa: true }).eq('id', id)
    setMensaje('✅ Temporada activada')
    cargarTemporadas()
    setTimeout(() => setMensaje(''), 3000)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: 'var(--azul-marino)', fontSize: '22px', fontWeight: '600' }}>
          Configuración — Temporadas
        </h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} style={{
          padding: '10px 20px', backgroundColor: 'var(--azul-marino)', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
        }}>
          {mostrarForm ? 'Cancelar' : '+ Nueva temporada'}
        </button>
      </div>

      {mensaje && (
        <div style={{ padding: '10px 16px', backgroundColor: '#E6F1FB', color: 'var(--azul-marino)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {mensaje}
        </div>
      )}

      {/* Formulario nueva temporada */}
      {mostrarForm && (
        <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
            Nueva temporada
          </h2>
          <form onSubmit={guardarTemporada}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              {[
                { label: 'Nombre (ej: 2026-27) *', key: 'nombre', type: 'text' },
                { label: 'Fecha inicio *', key: 'fecha_inicio', type: 'date' },
                { label: 'Fecha fin *', key: 'fecha_fin', type: 'date' },
                { label: 'Cuota estándar (€)', key: 'cuota_importe', type: 'number' },
                { label: 'Mínimo asistencias', key: 'min_asistencias', type: 'number' },
                { label: 'Hora de entreno', key: 'hora_entreno', type: 'time' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.label.includes('*')}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            {/* Días de entreno */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '8px' }}>
                Días de entreno (se generarán automáticamente)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {diasSemana.map(dia => (
                  <button key={dia.key} type="button" onClick={() => toggleDia(dia.key)} style={{
                    padding: '7px 14px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
                    backgroundColor: form.dias_entreno.includes(dia.key) ? 'var(--azul-marino)' : 'var(--azul-palido)',
                    color: form.dias_entreno.includes(dia.key) ? 'white' : 'var(--azul-medio)',
                    border: `1px solid ${form.dias_entreno.includes(dia.key) ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
                    fontWeight: form.dias_entreno.includes(dia.key) ? '600' : '400',
                  }}>
                    {dia.label}
                  </button>
                ))}
              </div>
              {form.dias_entreno.length > 0 && form.fecha_inicio && form.fecha_fin && (
                <div style={{ fontSize: '12px', color: 'var(--azul-medio)', marginTop: '8px' }}>
                  Se generarán aprox. {generarFechasEntreno(form.fecha_inicio, form.fecha_fin, form.dias_entreno).length} entrenos
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>Notas / resumen de temporada</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <button type="submit" disabled={guardando || generando} style={{
              padding: '10px 24px', backgroundColor: 'var(--azul-marino)', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
            }}>
              {generando ? '⏳ Generando entrenos...' : guardando ? 'Guardando...' : 'Crear temporada'}
            </button>
          </form>
        </div>
      )}

      {/* Lista temporadas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {temporadas.map(temp => (
          <div key={temp.id} style={{
            backgroundColor: 'var(--blanco)',
            border: `2px solid ${temp.activa ? 'var(--azul-medio)' : 'var(--azul-claro)'}`,
            borderRadius: '12px',
            padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--azul-marino)', margin: 0 }}>
                    Temporada {temp.nombre}
                  </h2>
                  {temp.activa && (
                    <span style={{ backgroundColor: 'var(--azul-medio)', color: 'white', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' }}>
                      ACTIVA
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--azul-medio)' }}>
                  {new Date(temp.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' → '}
                  {new Date(temp.fecha_fin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--azul-cielo)', marginTop: '4px' }}>
                  Cuota: {temp.cuota_importe}€ · Mínimo: {temp.min_asistencias} asistencias
                </div>
                {temp.dias_entreno?.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--azul-medio)', marginTop: '4px' }}>
                    Entrenos: {temp.dias_entreno.join(', ')} a las {temp.hora_entreno?.slice(0,5)}
                  </div>
                )}
                {temp.notas && (
                  <div style={{ fontSize: '12px', color: 'var(--azul-medio)', marginTop: '6px', fontStyle: 'italic' }}>
                    {temp.notas}
                  </div>
                )}
              </div>
              {!temp.activa && (
                <button onClick={() => activarTemporada(temp.id)} style={{
                  padding: '8px 16px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)',
                  border: '1px solid var(--azul-claro)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                }}>
                  Activar temporada
                </button>
              )}
            </div>

            {/* Premios */}
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--azul-claro)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-marino)' }}>🏆 Premios de temporada</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--azul-medio)' }}>Mostrar en home</span>
                  <button onClick={() => toggleVisibleHome(temp.id)} style={{
                    width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    backgroundColor: premiosData[temp.id]?.visible_home ? 'var(--azul-medio)' : '#ccc',
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                    <span style={{
                      position: 'absolute', top: '3px',
                      left: premiosData[temp.id]?.visible_home ? '22px' : '3px',
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: 'white', transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              </div>

              {/* Lista de premios */}
              {(premiosData[temp.id]?.premios || []).length === 0 ? (
                <p style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>Sin premios registrados aún.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {(premiosData[temp.id]?.premios || []).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'var(--azul-palido)', borderRadius: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--azul-marino)' }}>{p.categoria}</span>
                        <span style={{ fontSize: '12px', color: 'var(--azul-medio)' }}> · {p.ganador}</span>
                        {p.descripcion && <span style={{ fontSize: '12px', color: '#666' }}> — {p.descripcion}</span>}
                      </div>
                      <button onClick={() => { setEditandoPremios(temp.id); setFormPremio({ ...p }); eliminarPremio(temp.id, i) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--azul-medio)', fontSize: '13px', marginRight: '4px' }}>✏️</button>
                      <button onClick={() => eliminarPremio(temp.id, i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C92F2F', fontSize: '14px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Añadir premio */}
              {editandoPremios === temp.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input placeholder="Categoría (ej: 🥇 Mayor asistencia)" value={formPremio.categoria}
                    onChange={e => setFormPremio(p => ({ ...p, categoria: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--azul-claro)', fontSize: '13px' }} />
                  <input placeholder="Ganador (nombre del socio)" value={formPremio.ganador}
                    onChange={e => setFormPremio(p => ({ ...p, ganador: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--azul-claro)', fontSize: '13px' }} />
                  <input placeholder="Premio (ej: Vale 60€ — Pizzería La Roima)" value={formPremio.descripcion}
                    onChange={e => setFormPremio(p => ({ ...p, descripcion: e.target.value }))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--azul-claro)', fontSize: '13px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => guardarPremio(temp.id)} style={{ padding: '8px 16px', backgroundColor: 'var(--azul-marino)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      Guardar premio
                    </button>
                    <button onClick={() => { setEditandoPremios(null); setFormPremio({ categoria: '', ganador: '', descripcion: '' }) }} style={{ padding: '8px 16px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-medio)', border: '1px solid var(--azul-claro)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditandoPremios(temp.id)} style={{ padding: '6px 14px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)', border: '1px solid var(--azul-claro)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  + Añadir premio
                </button>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}