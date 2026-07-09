'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const tipoOpciones = ['viaje', 'partido', 'torneo', 'otro']

const formVacio = {
  titulo: '', lugar: '', fecha: '', tipo: 'viaje',
  latitud: '', longitud: '', notas: '', foto_url: '',
}

export default function AdminExpediciones() {
  const [expediciones, setExpediciones] = useState([])
  const [form, setForm] = useState(formVacio)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }
      const { data } = await supabase.from('expediciones').select('*').order('fecha', { ascending: false })
      setExpediciones(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  function campo(label, key, type = 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--azul-marino)' }}>{label}</label>
        <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--azul-claro)', fontSize: '13px' }} />
      </div>
    )
  }

  async function guardar() {
    if (!form.titulo || !form.lugar || !form.fecha || !form.latitud || !form.longitud) {
      alert('Rellena al menos título, lugar, fecha, latitud y longitud')
      return
    }
    const datos = {
      ...form,
      latitud: parseFloat(form.latitud),
      longitud: parseFloat(form.longitud),
    }
    if (editando) {
      await supabase.from('expediciones').update(datos).eq('id', editando)
    } else {
      await supabase.from('expediciones').insert(datos)
    }
    const { data } = await supabase.from('expediciones').select('*').order('fecha', { ascending: false })
    setExpediciones(data || [])
    setForm(formVacio)
    setEditando(null)
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta expedición?')) return
    await supabase.from('expediciones').delete().eq('id', id)
    setExpediciones(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '24px', fontWeight: '600', margin: '8px 0 24px' }}>
        🌍 Gestionar expediciones
      </h1>

      {/* Formulario */}
      <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          {editando ? 'Editar expedición' : 'Nueva expedición'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          {campo('Título *', 'titulo')}
          {campo('Lugar *', 'lugar')}
          {campo('Fecha *', 'fecha', 'date')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--azul-marino)' }}>Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--azul-claro)', fontSize: '13px' }}>
              {tipoOpciones.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {campo('Latitud * (ej: 41.3851)', 'latitud')}
          {campo('Longitud * (ej: 2.1734)', 'longitud')}
          {campo('URL foto (opcional)', 'foto_url')}
          {campo('Notas (opcional)', 'notas')}
        </div>
        <p style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
          💡 Para obtener las coordenadas: abre Google Maps, haz clic derecho en la ciudad → copia los números que aparecen (latitud, longitud)
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={guardar} style={{ padding: '10px 20px', backgroundColor: 'var(--azul-marino)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
            {editando ? 'Guardar cambios' : 'Añadir expedición'}
          </button>
          {editando && (
            <button onClick={() => { setForm(formVacio); setEditando(null) }} style={{ padding: '10px 20px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-medio)', border: '1px solid var(--azul-claro)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {expediciones.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>Sin expediciones registradas aún</p>
        ) : expediciones.map(exp => {
          const fecha = new Date(exp.fecha + 'T12:00:00')
          const fechaStr = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
          return (
            <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)' }}>{exp.titulo}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>📍 {exp.lugar} · 📅 {fechaStr} · {exp.tipo}</div>
                <div style={{ fontSize: '11px', color: '#999' }}>📌 {exp.latitud}, {exp.longitud}</div>
              </div>
              <button onClick={() => { setForm({ ...exp, latitud: String(exp.latitud), longitud: String(exp.longitud) }); setEditando(exp.id) }}
                style={{ padding: '6px 12px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                ✏️ Editar
              </button>
              <button onClick={() => eliminar(exp.id)}
                style={{ padding: '6px 12px', backgroundColor: '#fef0f0', color: '#C92F2F', border: '1px solid #f5c6c6', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                🗑️ Eliminar
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}