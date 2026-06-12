'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const tipoOpciones = ['entreno', 'partido', 'torneo', 'viaje', 'social', 'benefico']

const estadoOpciones = ['programado', 'confirmado', 'cancelado', 'jugado']

export default function AdminEventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [eventoEditando, setEventoEditando] = useState(null)
  const router = useRouter()

  const [form, setForm] = useState({
    tipo: 'entreno',
    fecha: '',
    hora: '',
    titulo: '',
    lugar: '',
    rival: '',
    goles_favor: '',
    goles_contra: '',
    notas_resultado: '',
    estado: 'programado',
    cuenta_asistencia: true,
    es_benefico: false,
    recaudacion_benefica: '',
    beneficiario: '',
    min_jugadores: 14,
    lista_entreno_activa: false,
  })

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }
      cargarEventos()
    }
    cargar()
  }, [])

  async function cargarEventos() {
    const { data } = await supabase
      .from('eventos')
      .select('*')
      .order('fecha', { ascending: false })
    setEventos(data || [])
    setLoading(false)
  }

  function resetForm() {
    setForm({
      tipo: 'entreno', fecha: '', hora: '', titulo: '', lugar: '',
      rival: '', goles_favor: '', goles_contra: '', notas_resultado: '',
      estado: 'programado', cuenta_asistencia: true, es_benefico: false,
      recaudacion_benefica: '', beneficiario: '', min_jugadores: 14,
      lista_entreno_activa: false,
    })
    setEventoEditando(null)
  }

  function editarEvento(evento) {
    setForm({
      tipo: evento.tipo || 'entreno',
      fecha: evento.fecha || '',
      hora: evento.hora?.slice(0, 5) || '',
      titulo: evento.titulo || '',
      lugar: evento.lugar || '',
      rival: evento.rival || '',
      goles_favor: evento.goles_favor ?? '',
      goles_contra: evento.goles_contra ?? '',
      notas_resultado: evento.notas_resultado || '',
      estado: evento.estado || 'programado',
      cuenta_asistencia: evento.cuenta_asistencia ?? true,
      es_benefico: evento.es_benefico ?? false,
      recaudacion_benefica: evento.recaudacion_benefica || '',
      beneficiario: evento.beneficiario || '',
      min_jugadores: evento.min_jugadores || 14,
      lista_entreno_activa: evento.lista_entreno_activa ?? false,
    })
    setEventoEditando(evento.id)
    setMostrarForm(true)
    window.scrollTo(0, 0)
  }

  async function guardarEvento(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    // Obtener temporada activa
    const { data: temporada } = await supabase
      .from('temporadas')
      .select('id')
      .eq('activa', true)
      .single()

    const datos = {
      temporada_id: temporada?.id,
      tipo: form.tipo,
      fecha: form.fecha,
      hora: form.hora || null,
      titulo: form.titulo || null,
      lugar: form.lugar || null,
      rival: form.rival || null,
      goles_favor: form.goles_favor !== '' ? parseInt(form.goles_favor) : null,
      goles_contra: form.goles_contra !== '' ? parseInt(form.goles_contra) : null,
      notas_resultado: form.notas_resultado || null,
      estado: form.estado,
      cuenta_asistencia: form.cuenta_asistencia,
      es_benefico: form.es_benefico,
      recaudacion_benefica: form.recaudacion_benefica !== '' ? parseFloat(form.recaudacion_benefica) : null,
      beneficiario: form.beneficiario || null,
      min_jugadores: form.min_jugadores,
      lista_entreno_activa: form.lista_entreno_activa,
    }

    let error
    if (eventoEditando) {
      const { error: e } = await supabase.from('eventos').update(datos).eq('id', eventoEditando)
      error = e
    } else {
      const { error: e } = await supabase.from('eventos').insert(datos)
      error = e
    }

    if (error) {
      setMensaje('Error: ' + error.message)
    } else {
      setMensaje(eventoEditando ? '✅ Evento actualizado' : '✅ Evento creado')
      resetForm()
      setMostrarForm(false)
      cargarEventos()
    }
    setGuardando(false)
  }

  async function eliminarEvento(id) {
    if (!confirm('¿Seguro que quieres eliminar este evento?')) return
    await supabase.from('eventos').delete().eq('id', id)
    cargarEventos()
  }

  const campo = (label, key, type = 'text', opciones = null) => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>
        {label}
      </label>
      {opciones ? (
        <select value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px' }}>
          {opciones.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'checkbox' ? (
        <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} />
      ) : (
        <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
      )}
    </div>
  )

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
          <h1 style={{ color: 'var(--azul-marino)', fontSize: '22px', fontWeight: '600', marginTop: '4px' }}>Gestionar eventos</h1>
        </div>
        <button onClick={() => { resetForm(); setMostrarForm(!mostrarForm) }} style={{
          padding: '10px 20px', backgroundColor: 'var(--azul-marino)', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
        }}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo evento'}
        </button>
      </div>

      {mensaje && (
        <div style={{ padding: '10px 16px', backgroundColor: '#E6F1FB', color: 'var(--azul-marino)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {mensaje}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
            {eventoEditando ? 'Editar evento' : 'Nuevo evento'}
          </h2>
          <form onSubmit={guardarEvento}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              {campo('Tipo', 'tipo', 'text', tipoOpciones)}
              {campo('Fecha *', 'fecha', 'date')}
              {campo('Hora', 'hora', 'time')}
              {campo('Título / nombre del evento', 'titulo')}
              {campo('Lugar', 'lugar')}
              {campo('Rival (partidos/torneos)', 'rival')}
              {campo('Goles AFV Nerja', 'goles_favor', 'number')}
              {campo('Goles rival', 'goles_contra', 'number')}
              {campo('Notas resultado (ej: penaltis)', 'notas_resultado')}
              {campo('Estado', 'estado', 'text', estadoOpciones)}
              {campo('Mínimo jugadores entreno', 'min_jugadores', 'number')}
              {campo('Recaudación benéfica (€)', 'recaudacion_benefica', 'number')}
              {campo('Beneficiario', 'beneficiario')}
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.cuenta_asistencia} onChange={e => setForm({ ...form, cuenta_asistencia: e.target.checked })} />
                Cuenta para estadísticas
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.es_benefico} onChange={e => setForm({ ...form, es_benefico: e.target.checked })} />
                Evento benéfico
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.lista_entreno_activa} onChange={e => setForm({ ...form, lista_entreno_activa: e.target.checked })} />
                Lista de apunte activa
              </label>
            </div>
            <button type="submit" disabled={guardando} style={{
              padding: '10px 24px', backgroundColor: 'var(--azul-marino)', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
            }}>
              {guardando ? 'Guardando...' : eventoEditando ? 'Actualizar evento' : 'Crear evento'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de eventos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {eventos.map(evento => {
          const fecha = new Date(evento.fecha + 'T12:00:00')
          const fechaStr = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
          return (
            <div key={evento.id} style={{
              backgroundColor: 'var(--blanco)',
              border: '1px solid var(--azul-claro)',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-marino)' }}>
                  {fechaStr} — {evento.titulo || evento.tipo}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>
                  {evento.tipo} {evento.lugar ? `· ${evento.lugar}` : ''} {evento.rival ? `· vs ${evento.rival}` : ''}
                  {evento.goles_favor !== null ? ` · ${evento.goles_favor}-${evento.goles_contra}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => editarEvento(evento)} style={{
                  padding: '6px 14px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)',
                  border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                }}>Editar</button>
                <button onClick={() => eliminarEvento(evento.id)} style={{
                  padding: '6px 14px', backgroundColor: '#FEE2E2', color: '#C92F2F',
                  border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                }}>Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}