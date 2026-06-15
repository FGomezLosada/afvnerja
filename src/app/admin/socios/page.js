'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const tipoSocioOpciones = ['activo_entrenos', 'activo_partidos', 'activo_entrenos_y_partidos', 'colaborativo', 'otro']
const posicionOpciones = ['portero', 'defensa', 'centrocampista', 'delantero']
const posicionLabel = { portero: '🧤 Portero', defensa: '🛡️ Defensa', centrocampista: '⚙️ Centrocampista', delantero: '⚡ Delantero' }
const procedenciaOpciones = ['escuela_nerja', 'senior_nerja', 'otro_equipo_nerja', 'otros']
const tallaOpciones = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL', 'XXXXXL']

export default function AdminSocios() {
  const [socios, setSocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [socioEditando, setSocioEditando] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const router = useRouter()

  const formInicial = {
    nombre_completo: '', apodo: '', telefono: '',
    fecha_nacimiento: '', tipo_socio: 'activo_entrenos',
    posicion: '', posiciones: [], procedencia: '', fecha_alta: '',
    talla_general: '', talla_superior: '', talla_inferior: '',
    activo: true, notas: '',
  }
  const [form, setForm] = useState(formInicial)

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }
      cargarSocios()
    }
    cargar()
  }, [])

  async function cargarSocios() {
    const { data } = await supabase
      .from('socios')
      .select('*')
      .order('apodo')
    setSocios(data || [])
    setLoading(false)
  }

  function editarSocio(socio) {
    setForm({
      nombre_completo: socio.nombre_completo || '',
      apodo: socio.apodo || '',
      telefono: socio.telefono || '',
      fecha_nacimiento: socio.fecha_nacimiento || '',
      tipo_socio: socio.tipo_socio || 'activo_entrenos',
      posicion: socio.posicion || '',
posiciones: socio.posiciones || [],
      procedencia: socio.procedencia || '',
      fecha_alta: socio.fecha_alta || '',
      talla_general: socio.talla_general || '',
      talla_superior: socio.talla_superior || '',
      talla_inferior: socio.talla_inferior || '',
      activo: socio.activo ?? true,
      notas: socio.notas || '',
    })
    setSocioEditando(socio.id)
    setMostrarForm(true)
    window.scrollTo(0, 0)
  }

  async function guardarSocio(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    const datos = {
      nombre_completo: form.nombre_completo,
      apodo: form.apodo || form.nombre_completo,
      telefono: form.telefono || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      tipo_socio: form.tipo_socio,
      posicion: form.posiciones[0] || form.posicion || null,
posiciones: form.posiciones,
      procedencia: form.procedencia || null,
      fecha_alta: form.fecha_alta || null,
      talla_general: form.talla_general || null,
      talla_superior: form.talla_superior || null,
      talla_inferior: form.talla_inferior || null,
      activo: form.activo,
      notas: form.notas || null,
    }

    let error
    if (socioEditando) {
      const { error: e } = await supabase.from('socios').update(datos).eq('id', socioEditando)
      error = e
    } else {
      const { error: e } = await supabase.from('socios').insert(datos)
      error = e
    }

    if (error) {
      setMensaje('Error: ' + error.message)
    } else {
      setMensaje(socioEditando ? '✅ Socio actualizado' : '✅ Socio creado')
      setForm(formInicial)
      setSocioEditando(null)
      setMostrarForm(false)
      cargarSocios()
    }
    setGuardando(false)
  }

  async function toggleActivo(socio) {
    await supabase.from('socios').update({ activo: !socio.activo }).eq('id', socio.id)
    cargarSocios()
  }

  const sociosFiltrados = socios.filter(s =>
    (s.apodo || s.nombre_completo || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  async function subirFoto(e, socioId) {
    const archivo = e.target.files[0]
    if (!archivo) return
    setSubiendoFoto(true)

    const extension = archivo.name.split('.').pop()
    const nombreArchivo = `socio-${socioId}.${extension}`

    const { error: errUpload } = await supabase.storage
      .from('fotos')
      .upload(nombreArchivo, archivo, { upsert: true })

    if (errUpload) {
      setMensaje('Error subiendo foto: ' + errUpload.message)
      setSubiendoFoto(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('fotos')
      .getPublicUrl(nombreArchivo)

    await supabase.from('socios').update({ foto_url: urlData.publicUrl }).eq('id', socioId)
    setMensaje('✅ Foto actualizada')
    setSubiendoFoto(false)
    cargarSocios()
  }
  const campo = (label, key, type = 'text') => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>
        {label}
      </label>
      <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
    </div>
  )

  const select = (label, key, opciones) => (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>
        {label}
      </label>
      <select value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px' }}>
        <option value="">— Sin especificar —</option>
        {opciones.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: 'var(--azul-marino)', fontSize: '22px', fontWeight: '600' }}>
          Gestionar socios ({socios.length})
        </h1>
        <button onClick={() => { setForm(formInicial); setSocioEditando(null); setMostrarForm(!mostrarForm) }} style={{
          padding: '10px 20px', backgroundColor: 'var(--azul-marino)', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
        }}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo socio'}
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
            {socioEditando ? 'Editar socio' : 'Nuevo socio'}
          </h2>
          <form onSubmit={guardarSocio}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              {campo('Nombre completo *', 'nombre_completo')}
              {campo('Apodo / nombre en el grupo', 'apodo')}
              {campo('Teléfono', 'telefono', 'tel')}
              {campo('Fecha de nacimiento', 'fecha_nacimiento', 'date')}
              {campo('Fecha de alta', 'fecha_alta', 'date')}
              {select('Tipo de socio', 'tipo_socio', tipoSocioOpciones)}
              <div style={{ marginBottom: '14px', gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '8px' }}>
                Posiciones (selecciona por orden de importancia)
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {posicionOpciones.map(p => {
                  const idx = form.posiciones.indexOf(p)
                  const seleccionada = idx !== -1
                  return (
                    <button key={p} type="button" onClick={() => {
                      const nuevas = [...form.posiciones]
                      if (seleccionada) {
                        nuevas.splice(idx, 1)
                      } else if (nuevas.length < 3) {
                        nuevas.push(p)
                      }
                      setForm({ ...form, posiciones: nuevas })
                    }} style={{
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: seleccionada ? '600' : '400',
                      backgroundColor: seleccionada ? 'var(--azul-marino)' : 'var(--azul-palido)',
                      color: seleccionada ? 'white' : 'var(--azul-medio)',
                      border: `1px solid ${seleccionada ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}>
                      {seleccionada && <span style={{ marginRight: '4px', fontSize: '11px', opacity: 0.8 }}>{idx + 1}°</span>}
                      {posicionLabel[p]}
                    </button>
                  )
                })}
              </div>
              {form.posiciones.length > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '6px' }}>
                  Orden: {form.posiciones.map((p, i) => `${i + 1}° ${p}`).join(' → ')}
                </div>
              )}
            </div>
              {select('Procedencia', 'procedencia', procedenciaOpciones)}
              {select('Talla general', 'talla_general', tallaOpciones)}
              {select('Talla superior', 'talla_superior', tallaOpciones)}
              {select('Talla inferior', 'talla_inferior', tallaOpciones)}
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>Notas internas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '20px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} />
              Socio activo
            </label>
            <button type="submit" disabled={guardando} style={{
              padding: '10px 24px', backgroundColor: 'var(--azul-marino)', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
            }}>
              {guardando ? 'Guardando...' : socioEditando ? 'Actualizar socio' : 'Crear socio'}
            </button>
          </form>
        </div>
      )}

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar socio..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: '1px solid var(--azul-claro)',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '16px',
          boxSizing: 'border-box',
        }}
      />

      {/* Lista socios */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sociosFiltrados.map(socio => (
          <div key={socio.id} style={{
            backgroundColor: socio.activo ? 'var(--blanco)' : 'var(--azul-palido)',
            border: '1px solid var(--azul-claro)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            opacity: socio.activo ? 1 : 0.6,
          }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)' }}>
                {socio.apodo || socio.nombre_completo}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>
                {socio.nombre_completo} · {socio.tipo_socio} {socio.posicion ? `· ${socio.posicion}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => editarSocio(socio)} style={{
                padding: '6px 14px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)',
                border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              }}>Editar</button>
              <label style={{
                padding: '6px 14px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)',
                border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              }}>
                {subiendoFoto ? '⏳' : '📷'}
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => subirFoto(e, socio.id)} />
              </label>
              <button onClick={() => toggleActivo(socio)} style={{
                padding: '6px 14px',
                backgroundColor: socio.activo ? '#FEF9C3' : '#DCFCE7',
                color: socio.activo ? '#854D0E' : '#166534',
                border: `1px solid ${socio.activo ? '#FDE047' : '#86EFAC'}`,
                borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              }}>
                {socio.activo ? 'Dar de baja' : 'Reactivar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}