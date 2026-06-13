'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const estadoOpciones = ['pendiente', 'pagado', 'parcial', 'exento']
const metodoPagoOpciones = ['efectivo', 'transferencia', 'especie']

export default function AdminCuotas() {
  const [cuotas, setCuotas] = useState([])
  const [socios, setSocios] = useState([])
  const [temporada, setTemporada] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [editandoId, setEditandoId] = useState(null)
  const [formEdicion, setFormEdicion] = useState({})
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }

      const { data: temp } = await supabase
        .from('temporadas')
        .select('*')
        .eq('activa', true)
        .single()
      setTemporada(temp)

      const { data: soc } = await supabase
        .from('socios')
        .select('*')
        .eq('activo', true)
        .order('apodo')
      setSocios(soc || [])

      await cargarCuotas(temp?.id, soc || [])
    }
    cargar()
  }, [])

  async function cargarCuotas(temporadaId, listaSocios) {
    const { data: cuotasDb } = await supabase
      .from('cuotas')
      .select('*')
      .eq('temporada_id', temporadaId)

    // Combinar socios con sus cuotas
    const combinado = (listaSocios || socios).map(socio => {
      const cuota = cuotasDb?.find(c => c.socio_id === socio.id)
      return {
        socio,
        cuota: cuota || null,
        estado: cuota?.estado || 'pendiente',
      }
    })
    setCuotas(combinado)
    setLoading(false)
  }

  async function guardarCuota(socioId, datos) {
    setGuardando(true)
    const cuotaExistente = cuotas.find(c => c.socio.id === socioId)?.cuota

    if (cuotaExistente) {
      const datosLimpios = { ...datos }
      if (!datosLimpios.fecha_pago) datosLimpios.fecha_pago = null
      if (!datosLimpios.importe_pagado) datosLimpios.importe_pagado = null
      if (!datosLimpios.importe_acordado) datosLimpios.importe_acordado = null
      await supabase.from('cuotas').update(datosLimpios).eq('id', cuotaExistente.id)
    } else {
      const datosLimpios2 = { ...datos }
      if (!datosLimpios2.fecha_pago) datosLimpios2.fecha_pago = null
      if (!datosLimpios2.importe_pagado) datosLimpios2.importe_pagado = null
      if (!datosLimpios2.importe_acordado) datosLimpios2.importe_acordado = null
      await supabase.from('cuotas').insert({
        ...datosLimpios2,
        socio_id: socioId,
        temporada_id: temporada.id,
      })
    }

    setMensaje('✅ Cuota actualizada')
    setEditandoId(null)
    await cargarCuotas(temporada?.id, socios)
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  function iniciarEdicion(item) {
    setEditandoId(item.socio.id)
    setFormEdicion({
      estado: item.cuota?.estado || 'pendiente',
      importe_pagado: item.cuota?.importe_pagado || '',
      importe_acordado: item.cuota?.importe_acordado || temporada?.cuota_importe || 60,
      fecha_pago: item.cuota?.fecha_pago || '',
      metodo_pago: item.cuota?.metodo_pago || 'efectivo',
      notas: item.cuota?.notas || '',
    })
  }

  const estadoColor = {
    pagado: { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' },
    pendiente: { bg: '#FEF9C3', color: '#854D0E', border: '#FDE047' },
    parcial: { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
    exento: { bg: 'var(--azul-palido)', color: 'var(--azul-medio)', border: 'var(--azul-claro)' },
  }

  const resumen = {
    pagado: cuotas.filter(c => c.estado === 'pagado').length,
    pendiente: cuotas.filter(c => c.estado === 'pendiente').length,
    parcial: cuotas.filter(c => c.estado === 'parcial').length,
    exento: cuotas.filter(c => c.estado === 'exento').length,
    totalRecaudado: cuotas.reduce((sum, c) => sum + (c.cuota?.importe_pagado || 0), 0),
  }

  const cuotasFiltradas = cuotas.filter(c => {
    const nombre = (c.socio.apodo || c.socio.nombre_completo || '').toLowerCase()
    const coincideBusqueda = nombre.includes(busqueda.toLowerCase())
    const coincideEstado = filtroEstado === 'todos' || c.estado === filtroEstado
    return coincideBusqueda && coincideEstado
  })

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '22px', fontWeight: '600', margin: '8px 0 24px' }}>
        Gestionar cuotas — {temporada?.nombre}
      </h1>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Pagadas', valor: resumen.pagado, ...estadoColor.pagado },
          { label: 'Pendientes', valor: resumen.pendiente, ...estadoColor.pendiente },
          { label: 'Parciales', valor: resumen.parcial, ...estadoColor.parcial },
          { label: 'Exentos', valor: resumen.exento, ...estadoColor.exento },
          { label: 'Recaudado', valor: `${resumen.totalRecaudado}€`, bg: 'var(--azul-marino)', color: 'white', border: 'var(--azul-marino)' },
        ].map(s => (
          <div key={s.label} style={{
            backgroundColor: s.bg, border: `1px solid ${s.border}`,
            borderRadius: '10px', padding: '12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {mensaje && (
        <div style={{ padding: '10px 16px', backgroundColor: '#E6F1FB', color: 'var(--azul-marino)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {mensaje}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <input type="text" placeholder="Buscar socio..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '8px', fontSize: '13px' }} />
        {['todos', ...estadoOpciones].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)} style={{
            padding: '8px 14px', fontSize: '12px', borderRadius: '8px', cursor: 'pointer',
            backgroundColor: filtroEstado === e ? 'var(--azul-marino)' : 'var(--azul-palido)',
            color: filtroEstado === e ? 'white' : 'var(--azul-medio)',
            border: `1px solid ${filtroEstado === e ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
          }}>{e}</button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {cuotasFiltradas.map(item => {
          const cfg = estadoColor[item.estado] || estadoColor.pendiente
          const editando = editandoId === item.socio.id

          return (
            <div key={item.socio.id} style={{
              backgroundColor: 'var(--blanco)',
              border: `1px solid ${editando ? 'var(--azul-medio)' : 'var(--azul-claro)'}`,
              borderRadius: '10px',
              padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)' }}>
                    {item.socio.apodo || item.socio.nombre_completo}
                  </div>
                  {item.cuota && (
                    <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>
                      {item.cuota.importe_pagado ? `${item.cuota.importe_pagado}€ pagados` : ''}
                      {item.cuota.fecha_pago ? ` · ${new Date(item.cuota.fecha_pago).toLocaleDateString('es-ES')}` : ''}
                      {item.cuota.notas ? ` · ${item.cuota.notas}` : ''}
                    </div>
                  )}
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                }}>
                  {item.estado}
                </span>
                <button onClick={() => editando ? setEditandoId(null) : iniciarEdicion(item)} style={{
                  padding: '6px 14px', backgroundColor: 'var(--azul-palido)', color: 'var(--azul-marino)',
                  border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                }}>
                  {editando ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              {editando && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--azul-claro)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    {[
                      { label: 'Estado', key: 'estado', type: 'select', opciones: estadoOpciones },
                      { label: 'Importe pagado (€)', key: 'importe_pagado', type: 'number' },
                      { label: 'Importe acordado (€)', key: 'importe_acordado', type: 'number' },
                      { label: 'Fecha de pago', key: 'fecha_pago', type: 'date' },
                      { label: 'Método de pago', key: 'metodo_pago', type: 'select', opciones: metodoPagoOpciones },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>{f.label}</label>
                        {f.type === 'select' ? (
                          <select value={formEdicion[f.key]} onChange={e => setFormEdicion({ ...formEdicion, [f.key]: e.target.value })}
                            style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px' }}>
                            {f.opciones.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type={f.type} value={formEdicion[f.key]} onChange={e => setFormEdicion({ ...formEdicion, [f.key]: e.target.value })}
                            style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '4px' }}>Notas</label>
                    <input type="text" value={formEdicion.notas} onChange={e => setFormEdicion({ ...formEdicion, notas: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                  <button onClick={() => guardarCuota(item.socio.id, formEdicion)} disabled={guardando} style={{
                    padding: '8px 20px', backgroundColor: 'var(--azul-marino)', color: 'white',
                    border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
                  }}>
                    {guardando ? 'Guardando...' : '💾 Guardar'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}