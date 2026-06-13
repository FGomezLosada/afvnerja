'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminConfig() {
  const [temporadas, setTemporadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  const formInicial = {
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    cuota_importe: 60,
    min_asistencias: 15,
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

  async function guardarTemporada(e) {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase.from('temporadas').insert({
      nombre: form.nombre,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      cuota_importe: parseFloat(form.cuota_importe),
      min_asistencias: parseInt(form.min_asistencias),
      notas: form.notas || null,
      activa: false,
    })

    if (error) {
      setMensaje('Error: ' + error.message)
    } else {
      setMensaje('✅ Temporada creada')
      setForm(formInicial)
      setMostrarForm(false)
      cargarTemporadas()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  async function activarTemporada(id) {
    if (!confirm('¿Activar esta temporada? La temporada actual quedará como histórico.')) return
    
    // Desactivar todas
    await supabase.from('temporadas').update({ activa: false }).neq('id', id)
    // Activar la seleccionada
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
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.label.includes('*')}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>Notas / resumen de temporada</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <button type="submit" disabled={guardando} style={{
              padding: '10px 24px', backgroundColor: 'var(--azul-marino)', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
            }}>
              {guardando ? 'Guardando...' : 'Crear temporada'}
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
                  Cuota: {temp.cuota_importe}€ · Mínimo asistencias: {temp.min_asistencias}
                </div>
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