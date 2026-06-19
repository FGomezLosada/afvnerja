'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const tipoConfig = {
  entreno:  { color: 'var(--azul-medio)',  icono: '⚽', label: 'Entreno' },
  partido:  { color: 'var(--naranja)',     icono: '🏟️', label: 'Partido' },
  torneo:   { color: '#8B2FC9',            icono: '🏆', label: 'Torneo' },
  viaje:    { color: '#1D9E75',            icono: '✈️', label: 'Viaje' },
  social:   { color: '#639922',            icono: '🎉', label: 'Social' },
  benefico: { color: '#C92F2F',            icono: '❤️', label: 'Benéfico' },
}

export default function DetalleTemporada() {
  const { id } = useParams()
  const [temporada, setTemporada] = useState(null)
  const [eventos, setEventos] = useState([])
  const [ranking, setRanking] = useState([])
  const [goleadores, setGoleadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('asistencias')

  useEffect(() => {
    async function cargar() {
      const { data: temp } = await supabase
        .from('temporadas')
        .select('*')
        .eq('id', id)
        .single()
      setTemporada(temp)

      const { data: ev } = await supabase
        .from('eventos')
        .select('*')
        .eq('temporada_id', id)
        .order('fecha', { ascending: false })
      setEventos(ev || [])

      const eventoIds = ev?.map(e => e.id) || []

      const { data: asistencias } = await supabase
        .from('asistencias')
        .select('socio_id, estado, evento_id, socios(apodo, nombre_completo)')
        .in('estado', ['asistio', 'no_aparecio'])

      const asistenciasTemp = asistencias?.filter(a => eventoIds.includes(a.evento_id)) || []

      const rankingMap = {}
      asistenciasTemp.forEach(a => {
        const nombre = a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido'
        if (!rankingMap[nombre]) rankingMap[nombre] = { total: 0, entrenos: 0, partidos: 0 }
        const val = a.estado === 'asistio' ? 1 : -1
        rankingMap[nombre].total += val
        const evento = ev?.find(e => e.id === a.evento_id)
        if (evento?.tipo === 'entreno' && a.estado === 'asistio') rankingMap[nombre].entrenos++
        if (evento?.tipo === 'partido' && a.estado === 'asistio') rankingMap[nombre].partidos++
      })

      const listaRanking = Object.entries(rankingMap)
        .map(([nombre, datos]) => ({ nombre, ...datos }))
        .sort((a, b) => b.total - a.total)
      setRanking(listaRanking)

      const { data: goles } = await supabase
        .from('goles')
        .select('cantidad, socios(apodo, nombre_completo), evento_id')

      const golesTemp = goles?.filter(g => eventoIds.includes(g.evento_id)) || []
      const golesMap = {}
      golesTemp.forEach(g => {
        const nombre = g.socios?.apodo || g.socios?.nombre_completo || 'Desconocido'
        golesMap[nombre] = (golesMap[nombre] || 0) + (g.cantidad || 1)
      })
      const listaGoles = Object.entries(golesMap).sort((a, b) => b[1] - a[1])
      setGoleadores(listaGoles)

      setLoading(false)
    }
    if (id) cargar()
  }, [id])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando temporada...</div>
  if (!temporada) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Temporada no encontrada</div>

  const maxAsist = ranking[0]?.total || 1
  const maxGoles = goleadores[0]?.[1] || 1

  // Agrupar eventos por mes
  const meses = {}
  eventos.forEach(e => {
    const fecha = new Date(e.fecha + 'T12:00:00')
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    const nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    if (!meses[clave]) meses[clave] = { nombre: nombreMes, eventos: [] }
    meses[clave].eventos.push(e)
  })

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
      <a href="/historico" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Histórico</a>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '26px', fontWeight: '600', margin: '8px 0 24px' }}>
        Temporada {temporada.nombre}
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'asistencias', label: '🏆 Asistencias' },
          { key: 'goleadores', label: '⚽ Goleadores' },
          { key: 'calendario', label: '📅 Calendario' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
            backgroundColor: tab === t.key ? 'var(--azul-marino)' : 'var(--azul-palido)',
            color: tab === t.key ? 'white' : 'var(--azul-medio)',
            border: `1px solid ${tab === t.key ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
            fontWeight: tab === t.key ? '600' : '400',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Asistencias */}
      {tab === 'asistencias' && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid var(--azul-claro)', paddingRight: '16px' }}>
          <div style={{ minWidth: '500px' }}>
            <div style={{
              backgroundColor: 'var(--azul-marino)', padding: '12px 20px',
              display: 'grid', gridTemplateColumns: '40px 1fr 70px 70px 70px',
              gap: '8px', color: 'white', fontSize: '12px', fontWeight: '600',
            }}>
              <span>#</span><span>Socio</span>
              <span style={{ textAlign: 'center' }}>Total</span>
              <span style={{ textAlign: 'center' }}>Entrenos</span>
              <span style={{ textAlign: 'center' }}>Partidos</span>
            </div>
            {ranking.map((r, i) => (
              <div key={r.nombre} style={{
                padding: '10px 20px', display: 'grid',
                gridTemplateColumns: '40px 1fr 70px 70px 70px', gap: '8px', alignItems: 'center',
                borderBottom: '1px solid var(--azul-palido)',
                backgroundColor: i % 2 === 0 ? 'white' : 'var(--azul-palido)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: i === 0 ? '#B07800' : i === 1 ? '#888' : i === 2 ? '#993C1D' : 'var(--azul-medio)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--azul-marino)', fontWeight: '500' }}>{r.nombre}</span>
                <span style={{ textAlign: 'center', fontWeight: '700', color: 'var(--azul-marino)' }}>{r.total}</span>
                <span style={{ textAlign: 'center', color: 'var(--azul-medio)' }}>{r.entrenos}</span>
                <span style={{ textAlign: 'center', color: 'var(--azul-medio)' }}>{r.partidos}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Goleadores */}
      {tab === 'goleadores' && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid var(--azul-claro)', paddingRight: '16px' }}>
          <div style={{ minWidth: '400px' }}>
            <div style={{
              backgroundColor: 'var(--azul-marino)', padding: '12px 20px',
              display: 'grid', gridTemplateColumns: '40px 1fr 80px',
              gap: '8px', color: 'white', fontSize: '12px', fontWeight: '600',
            }}>
              <span>#</span><span>Socio</span><span style={{ textAlign: 'center' }}>Goles</span>
            </div>
            {goleadores.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--azul-medio)' }}>Sin goles registrados</div>
            ) : goleadores.map(([nombre, goles], i) => (
              <div key={nombre} style={{
                padding: '10px 20px', display: 'grid',
                gridTemplateColumns: '40px 1fr 80px', gap: '8px', alignItems: 'center',
                borderBottom: '1px solid var(--azul-palido)',
                backgroundColor: i % 2 === 0 ? 'white' : 'var(--azul-palido)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: i === 0 ? '#B07800' : i === 1 ? '#888' : i === 2 ? '#993C1D' : 'var(--azul-medio)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--azul-marino)', fontWeight: '500' }}>{nombre}</span>
                <span style={{ textAlign: 'center', fontWeight: '700', color: 'var(--naranja)' }}>⚽ {goles}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Calendario */}
      {tab === 'calendario' && (
        <div>
          {Object.entries(meses).map(([clave, mes]) => (
            <div key={clave} style={{ marginBottom: '24px' }}>
              <h3 style={{
                color: 'white', backgroundColor: 'var(--azul-marino)', padding: '8px 16px',
                borderRadius: '8px', fontSize: '14px', fontWeight: '600', marginBottom: '10px', textTransform: 'capitalize',
              }}>
                {mes.nombre}
              </h3>
              {mes.eventos.map(evento => {
                const cfg = tipoConfig[evento.tipo] || tipoConfig.entreno
                const fecha = new Date(evento.fecha + 'T12:00:00')
                return (
                  <div key={evento.id} style={{
                    display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 14px',
                    marginBottom: '6px', backgroundColor: 'white', borderLeft: `4px solid ${cfg.color}`,
                    border: '1px solid var(--azul-claro)', borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '20px' }}>{cfg.icono}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-marino)' }}>
                        {fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {evento.titulo || cfg.label}
                      </div>
                      {evento.rival && (
                        <div style={{ fontSize: '11px', color: 'var(--azul-medio)' }}>vs {evento.rival}</div>
                      )}
                    </div>
                    {evento.goles_favor !== null && evento.goles_contra !== null && (
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--azul-marino)' }}>
                        {evento.goles_favor} - {evento.goles_contra}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}