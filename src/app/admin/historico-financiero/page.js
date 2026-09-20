'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const categoriaColor = {
  arbitro: '#1A6BB5', equipacion: '#8B2FC9', comida: '#D4721A',
  viaje: '#1D9E75', instalaciones: '#639922', tesoreria: '#B07800', otros: '#666'
}

export default function HistoricoFinanciero() {
  const [temporadas, setTemporadas] = useState([])
  const [tempSeleccionada, setTempSeleccionada] = useState(null)
  const [gastos, setGastos] = useState([])
  const [cuotas, setCuotas] = useState([])
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }

      const { data: temps } = await supabase
        .from('temporadas').select('*').order('fecha_inicio', { ascending: false })
      setTemporadas(temps || [])

      const activa = temps?.find(t => t.activa)
      if (activa) {
        setTempSeleccionada(activa.id)
        await cargarDatos(activa.id)
      }
      setLoading(false)
    }
    cargar()
  }, [])

  async function cargarDatos(tempId) {
    const [{ data: g }, { data: c }] = await Promise.all([
      supabase.from('gastos').select('*').eq('temporada_id', tempId).order('fecha', { ascending: false, nullsFirst: false }),
      supabase.from('cuotas').select('importe_pagado, estado').eq('temporada_id', tempId).in('estado', ['pagado', 'parcial']),
    ])
    setGastos(g || [])
    setCuotas(c || [])
  }

  async function handleTemporadaChange(tempId) {
    setTempSeleccionada(tempId)
    setFiltroCategoria('todos')
    await cargarDatos(tempId)
  }

  const totalCuotas = cuotas.reduce((sum, c) => sum + (c.importe_pagado || 0), 0)
  const gastosFiltrados = filtroCategoria === 'todos' ? gastos : gastos.filter(g => g.categoria === filtroCategoria)
  const gastosReales = gastos.filter(g => (g.importe || 0) > 0).reduce((sum, g) => sum + g.importe, 0)
  const otrosIngresos = gastos.filter(g => (g.importe || 0) < 0).reduce((sum, g) => sum + Math.abs(g.importe), 0)
  const saldo = totalCuotas + otrosIngresos - gastosReales

  const categorias = [...new Set(gastos.map(g => g.categoria).filter(Boolean))]
  const tempNombre = temporadas.find(t => t.id === tempSeleccionada)?.nombre || ''

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
      <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '24px', fontWeight: '600', margin: '8px 0 24px' }}>
        💶 Histórico financiero
      </h1>

      {/* Selector de temporada */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-medio)' }}>Temporada:</label>
        <select value={tempSeleccionada || ''} onChange={e => handleTemporadaChange(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--azul-claro)', fontSize: '13px', color: 'var(--azul-marino)' }}>
          {temporadas.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}{t.activa ? ' (activa)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Resumen financiero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: '💰 Cuotas', valor: totalCuotas, color: '#1D9E75' },
          { label: '📈 Otros ingresos', valor: otrosIngresos, color: '#1D9E75' },
          { label: '📉 Gastos reales', valor: gastosReales, color: 'var(--naranja)' },
          { label: '🏦 Saldo en caja', valor: saldo, color: saldo >= 0 ? '#1D9E75' : 'var(--naranja)', highlight: true },
        ].map(s => (
          <div key={s.label} style={{
            backgroundColor: s.highlight ? (saldo >= 0 ? '#e8f8f2' : '#fef0e7') : 'var(--azul-palido)',
            borderRadius: '10px', padding: '16px', textAlign: 'center',
            border: s.highlight ? `1px solid ${s.color}` : 'none',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginBottom: '6px', fontWeight: '600' }}>{s.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: s.color }}>
              {s.label === '🏦 Saldo en caja' && saldo >= 0 ? '+' : ''}{s.valor.toFixed(2)}€
            </div>
          </div>
        ))}
      </div>

      {/* Filtros por categoría */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {['todos', ...categorias].map(cat => (
          <button key={cat} onClick={() => setFiltroCategoria(cat)} style={{
            padding: '6px 14px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer',
            backgroundColor: filtroCategoria === cat ? 'var(--azul-marino)' : 'var(--azul-palido)',
            color: filtroCategoria === cat ? 'white' : 'var(--azul-medio)',
            border: `1px solid ${filtroCategoria === cat ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
            fontWeight: filtroCategoria === cat ? '600' : '400', textTransform: 'capitalize',
          }}>
            {cat === 'todos' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      {/* Lista de gastos/ingresos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {gastosFiltrados.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>Sin registros para esta temporada</p>
        ) : gastosFiltrados.map(g => {
          const esIngreso = (g.importe || 0) < 0
          const fecha = g.fecha ? new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
          return (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              backgroundColor: 'var(--blanco)', borderRadius: '10px',
              borderLeft: `4px solid ${esIngreso ? '#1D9E75' : (categoriaColor[g.categoria] || '#ccc')}`,
              border: '1px solid var(--azul-claro)',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)' }}>{g.concepto}</div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                  {g.categoria} · {g.pagado_por ? `Pagado por ${g.pagado_por}` : ''} · {fecha}
                  {g.reembolsado ? ' · ✅ Reembolsado' : ''}
                </div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: esIngreso ? '#1D9E75' : 'var(--naranja)', whiteSpace: 'nowrap' }}>
                {esIngreso ? '+' : ''}{esIngreso ? Math.abs(g.importe) : g.importe}€
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}