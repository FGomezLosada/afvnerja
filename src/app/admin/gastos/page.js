'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const categoriaOpciones = ['arbitro', 'equipacion', 'comida', 'viaje', 'instalaciones', 'otros']

export default function AdminGastos() {
  const [gastos, setGastos] = useState([])
  const [eventos, setEventos] = useState([])
  const [temporada, setTemporada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [gastoEditando, setGastoEditando] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const router = useRouter()

  const formInicial = {
    concepto: '', importe: '', categoria: 'otros',
    pagado_por: '', fecha: '', evento_id: '', reembolsado: false,
  }
  const [form, setForm] = useState(formInicial)

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }

      const { data: temp } = await supabase
        .from('temporadas').select('*').eq('activa', true).single()
      setTemporada(temp)

      const [{ data: g }, { data: ev }] = await Promise.all([
        supabase.from('gastos').select('*, eventos(titulo, fecha)').eq('temporada_id', temp?.id).order('fecha', { ascending: false, nullsFirst: false }),
        supabase.from('eventos').select('id, titulo, fecha, tipo').order('fecha', { ascending: false, nullsFirst: false }),
      ])
      setGastos(g || [])
      setEventos(ev || [])
      setLoading(false)
    }
    cargar()
  }, [])

  async function cargarGastos(tempId) {
    const { data } = await supabase
      .from('gastos')
      .select('*, eventos(titulo, fecha)')
      .eq('temporada_id', tempId)
      .order('fecha', { ascending: false, nullsFirst: false })
    setGastos(data || [])
  }

  function editarGasto(gasto) {
    setForm({
      concepto: gasto.concepto || '',
      importe: gasto.importe || '',
      categoria: gasto.categoria || 'otros',
      pagado_por: gasto.pagado_por || '',
      fecha: gasto.fecha || '',
      evento_id: gasto.evento_id || '',
      reembolsado: gasto.reembolsado || false,
    })
    setGastoEditando(gasto.id)
    setMostrarForm(true)
    window.scrollTo(0, 0)
  }

  async function guardarGasto(e) {
    e.preventDefault()
    setGuardando(true)

    const datos = {
      concepto: form.concepto,
      importe: parseFloat(form.importe),
      categoria: form.categoria,
      pagado_por: form.pagado_por || null,
      fecha: form.fecha || null,
      evento_id: form.evento_id || null,
      reembolsado: form.reembolsado,
      temporada_id: temporada?.id,
    }

    let error
    if (gastoEditando) {
      const { error: e } = await supabase.from('gastos').update(datos).eq('id', gastoEditando)
      error = e
    } else {
      const { error: e } = await supabase.from('gastos').insert(datos)
      error = e
    }

    if (error) {
      setMensaje('Error: ' + error.message)
    } else {
      setMensaje(gastoEditando ? '✅ Gasto actualizado' : '✅ Gasto registrado')
      setForm(formInicial)
      setGastoEditando(null)
      setMostrarForm(false)
      cargarGastos(temporada?.id)
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  async function eliminarGasto(id) {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    cargarGastos(temporada?.id)
  }

  const totalGastos = gastos.reduce((sum, g) => sum + (g.importe || 0), 0)
  const porCategoria = categoriaOpciones.map(cat => ({
    cat,
    total: gastos.filter(g => g.categoria === cat).reduce((sum, g) => sum + (g.importe || 0), 0)
  })).filter(c => c.total > 0)

  const categoriaColor = {
    arbitro: '#8B2FC9', equipacion: 'var(--azul-marino)', comida: '#D4721A',
    viaje: '#1D9E75', instalaciones: 'var(--azul-cielo)', otros: '#888',
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ color: 'var(--azul-marino)', fontSize: '22px', fontWeight: '600' }}>
          Gastos — {temporada?.nombre}
        </h1>
        <button onClick={() => { setForm(formInicial); setGastoEditando(null); setMostrarForm(!mostrarForm) }} style={{
          padding: '10px 20px', backgroundColor: 'var(--azul-marino)', color: 'white',
          border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
        }}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo gasto'}
        </button>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'var(--azul-marino)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>{totalGastos.toFixed(2)}€</div>
          <div style={{ fontSize: '11px', color: 'var(--azul-claro)' }}>Total gastos</div>
        </div>
        {porCategoria.map(c => (
          <div key={c.cat} style={{ backgroundColor: 'var(--azul-palido)', border: '1px solid var(--azul-claro)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: categoriaColor[c.cat] }}>{c.total.toFixed(2)}€</div>
            <div style={{ fontSize: '11px', color: 'var(--azul-medio)' }}>{c.cat}</div>
          </div>
        ))}
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
            {gastoEditando ? 'Editar gasto' : 'Nuevo gasto'}
          </h2>
          <form onSubmit={guardarGasto}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              {[
                { label: 'Concepto *', key: 'concepto', type: 'text' },
                { label: 'Importe (€) *', key: 'importe', type: 'number' },
                { label: 'Pagado por', key: 'pagado_por', type: 'text' },
                { label: 'Fecha', key: 'fecha', type: 'date' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.label.includes('*')}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>Categoría</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px' }}>
                  {categoriaOpciones.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>Evento relacionado</label>
                <select value={form.evento_id} onChange={e => setForm({ ...form, evento_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px' }}>
                  <option value="">— Sin evento específico —</option>
                  {eventos.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {ev.titulo || ev.tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '20px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.reembolsado} onChange={e => setForm({ ...form, reembolsado: e.target.checked })} />
              Ya reembolsado al pagador
            </label>
            <button type="submit" disabled={guardando} style={{
              padding: '10px 24px', backgroundColor: 'var(--azul-marino)', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
            }}>
              {guardando ? 'Guardando...' : gastoEditando ? 'Actualizar' : 'Registrar gasto'}
            </button>
          </form>
        </div>
      )}

      {/* Filtro por categoría */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {['todos', ...categoriaOpciones].map(cat => (
          <button key={cat} onClick={() => setFiltroCategoria(cat)} style={{
            padding: '6px 14px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer',
            backgroundColor: filtroCategoria === cat ? 'var(--azul-marino)' : 'var(--azul-palido)',
            color: filtroCategoria === cat ? 'white' : 'var(--azul-medio)',
            border: `1px solid ${filtroCategoria === cat ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
            fontWeight: filtroCategoria === cat ? '600' : '400',
            textTransform: 'capitalize',
          }}>
            {cat === 'todos' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {/* Lista gastos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {gastos.filter(g => filtroCategoria === 'todos' || g.categoria === filtroCategoria).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--azul-medio)', fontSize: '14px' }}>
            No hay gastos registrados todavía
          </div>
        ) : gastos.filter(g => filtroCategoria === 'todos' || g.categoria === filtroCategoria).map(gasto => (
          <div key={gasto.id} style={{
            backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)',
            borderLeft: `4px solid ${categoriaColor[gasto.categoria] || '#888'}`,
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)' }}>{gasto.concepto}</div>
              <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>
                {gasto.categoria} {gasto.pagado_por ? `· Pagado por ${gasto.pagado_por}` : ''}
                {gasto.fecha ? ` · ${new Date(gasto.fecha + 'T12:00:00').toLocaleDateString('es-ES')}` : ''}
                {gasto.eventos ? ` · ${gasto.eventos.titulo || 'evento'}` : ''}
                {gasto.reembolsado ? ' · ✅ Reembolsado' : ''}
              </div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--naranja)', minWidth: '70px', textAlign: 'right' }}>
              {gasto.importe}€
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => editarGasto(gasto)} style={{
                padding: '6px 14px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)',
                border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              }}>Editar</button>
              <button onClick={() => eliminarGasto(gasto.id)} style={{
                padding: '6px 14px', backgroundColor: '#FEE2E2', color: '#C92F2F',
                border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              }}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}