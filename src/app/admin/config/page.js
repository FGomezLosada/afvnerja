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
          </div>
        ))}
      </div>
    </div>
  )
}