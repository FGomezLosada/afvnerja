'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const prendaOpciones = ['primera equipacion', 'segunda equipacion', 'polo', 'ropa calle', 'otros']
const posicionOpciones = ['centro pecho', 'manga derecha', 'manga izquierda', 'pantalon', 'espalda', 'otros']

export default function AdminPatrocinadores() {
  const [patrocinadores, setPatrocinadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const router = useRouter()

  const formInicial = {
    nombre: '',
    web_url: '',
    tipo: 'equipacion',
    prenda: '',
    posicion: '',
    temporada_inicio: '',
    activo: true,
  }
  const [form, setForm] = useState(formInicial)

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }
      cargarPatrocinadores()
    }
    cargar()
  }, [])

  async function cargarPatrocinadores() {
    const { data } = await supabase
      .from('patrocinadores')
      .select('*')
      .order('activo', { ascending: false })
    setPatrocinadores(data || [])
    setLoading(false)
  }

  function editarPatrocinador(p) {
    setForm({
      nombre: p.nombre || '',
      web_url: p.web_url || '',
      tipo: p.tipo || 'equipacion',
      prenda: p.prenda || '',
      posicion: p.posicion || '',
      temporada_inicio: p.temporada_inicio || '',
      activo: p.activo ?? true,
    })
    setEditandoId(p.id)
    setMostrarForm(true)
    window.scrollTo(0, 0)
  }

  async function guardarPatrocinador(e) {
    e.preventDefault()
    setGuardando(true)

    const datos = {
      nombre: form.nombre,
      web_url: form.web_url || null,
      tipo: form.tipo,
      prenda: form.prenda || null,
      posicion: form.posicion || null,
      temporada_inicio: form.temporada_inicio || null,
      activo: form.activo,
    }

    let error
    if (editandoId) {
      const { error: e } = await supabase.from('patrocinadores').update(datos).eq('id', editandoId)
      error = e
    } else {
      const { error: e } = await supabase.from('patrocinadores').insert(datos)
      error = e
    }

    if (error) {
      setMensaje('Error: ' + error.message)
    } else {
      setMensaje(editandoId ? '✅ Patrocinador actualizado' : '✅ Patrocinador creado')
      setForm(formInicial)
      setEditandoId(null)
      setMostrarForm(false)
      cargarPatrocinadores()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  async function subirLogo(e, patrocinadorId) {
    const archivo = e.target.files[0]
    if (!archivo) return
    setSubiendoLogo(true)

    const extension = archivo.name.split('.').pop()
    const nombreArchivo = `patrocinador-${patrocinadorId}.${extension}`

    const { error: errUpload } = await supabase.storage
      .from('fotos')
      .upload(nombreArchivo, archivo, { upsert: true })

    if (errUpload) {
      setMensaje('Error subiendo logo: ' + errUpload.message)
      setSubiendoLogo(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('fotos')
      .getPublicUrl(nombreArchivo)

    const urlConCache = `${urlData.publicUrl}?t=${Date.now()}`
    await supabase.from('patrocinadores').update({ logo_url: urlConCache }).eq('id', patrocinadorId)
    setMensaje('✅ Logo actualizado')
    setSubiendoLogo(false)
    cargarPatrocinadores()
  }

  async function toggleActivo(p) {
    await supabase.from('patrocinadores').update({ activo: !p.activo }).eq('id', p.id)
    cargarPatrocinadores()
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
      <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: 'var(--azul-marino)', fontSize: '22px', fontWeight: '600' }}>
          Gestionar patrocinadores
        </h1>
        <button onClick={() => { setForm(formInicial); setEditandoId(null); setMostrarForm(!mostrarForm) }} style={{
          padding: '10px 20px', backgroundColor: 'var(--azul-marino)', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
        }}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo patrocinador'}
        </button>
      </div>

      {mensaje && (
        <div style={{ padding: '10px 16px', backgroundColor: '#E6F1FB', color: 'var(--azul-marino)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {mensaje}
        </div>
      )}

      {mostrarForm && (
        <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>
            {editandoId ? 'Editar patrocinador' : 'Nuevo patrocinador'}
          </h2>
          <form onSubmit={guardarPatrocinador}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              {[
                { label: 'Nombre *', key: 'nombre', type: 'text' },
                { label: 'Web (opcional)', key: 'web_url', type: 'url' },
                { label: 'Desde temporada (ej: 2023-24)', key: 'temporada_inicio', type: 'text' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.label.includes('*')}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              ))}
              {[
                { label: 'Prenda', key: 'prenda', opciones: prendaOpciones },
                { label: 'Posición en prenda', key: 'posicion', opciones: posicionOpciones },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>{f.label}</label>
                  <select value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px' }}>
                    <option value="">— Sin especificar —</option>
                    {f.opciones.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '20px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
              Patrocinador activo
            </label>
            <button type="submit" disabled={guardando} style={{
              padding: '10px 24px', backgroundColor: 'var(--azul-marino)', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
            }}>
              {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Crear patrocinador'}
            </button>
          </form>
        </div>
      )}

      {/* Lista patrocinadores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {patrocinadores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--azul-medio)' }}>
            No hay patrocinadores registrados todavía
          </div>
        ) : patrocinadores.map(p => (
          <div key={p.id} style={{
            backgroundColor: 'var(--blanco)',
            border: '1px solid var(--azul-claro)',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            opacity: p.activo ? 1 : 0.5,
          }}>
            {/* Logo */}
            <div style={{ width: '50px', height: '50px', borderRadius: '8px', backgroundColor: 'var(--azul-palido)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '20px' }}>🏢</span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)' }}>{p.nombre}</div>
              <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>
                {p.prenda ? `${p.prenda}` : ''}
                {p.posicion ? ` · ${p.posicion}` : ''}
                {p.temporada_inicio ? ` · Desde ${p.temporada_inicio}` : ''}
              </div>
              {p.web_url && (
                <a href={p.web_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--azul-medio)', textDecoration: 'none' }}>
                  🔗 {p.web_url}
                </a>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{
                padding: '6px 14px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)',
                border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              }}>
                {subiendoLogo ? '⏳' : '🖼️ Logo'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => subirLogo(e, p.id)} />
              </label>
              <button onClick={() => editarPatrocinador(p)} style={{
                padding: '6px 14px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)',
                border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              }}>Editar</button>
              <button onClick={() => toggleActivo(p)} style={{
                padding: '6px 14px',
                backgroundColor: p.activo ? '#FEF9C3' : '#DCFCE7',
                color: p.activo ? '#854D0E' : '#166534',
                border: `1px solid ${p.activo ? '#FDE047' : '#86EFAC'}`,
                borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              }}>
                {p.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}