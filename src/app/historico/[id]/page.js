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

const OBJETIVO_ASISTENCIA = 18
const nombresMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function DetalleTemporada() {
  const { id } = useParams()
  const [temporada, setTemporada] = useState(null)
  const [eventos, setEventos] = useState([])
  const [ranking, setRanking] = useState([])
  const [goleadores, setGoleadores] = useState([])
  const [statsTemporada, setStatsTemporada] = useState(null)
  const [evolucionMensual, setEvolucionMensual] = useState([])
  const [topRachasMax, setTopRachasMax] = useState([])
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

      // ---- RANKING DE ASISTENCIAS (con Penalty y %) ----
      const eventosConCuenta = ev?.filter(e => e.cuenta_asistencia) || []
      const totalEventosConCuenta = eventosConCuenta.length
      const eventosConCuentaIds = eventosConCuenta.map(e => e.id)

      const { data: asistencias } = eventoIds.length > 0
        ? await supabase
            .from('asistencias')
            .select('socio_id, estado, evento_id, socios(apodo, nombre_completo)')
            .in('estado', ['asistio', 'no_aparecio'])
            .in('evento_id', eventoIds)
        : { data: [] }

      const rankingMap = {}
      const sociosParticipantesIds = new Set()
      asistencias?.forEach(a => {
        sociosParticipantesIds.add(a.socio_id)
        const nombre = a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido'
        if (!rankingMap[nombre]) {
          rankingMap[nombre] = { total: 0, entrenos: 0, partidos: 0, penalizaciones: 0 }
        }
        const cuenta = eventosConCuentaIds.includes(a.evento_id)
        if (!cuenta) return
        const val = a.estado === 'asistio' ? 1 : -1
        rankingMap[nombre].total += val
        if (a.estado === 'no_aparecio') rankingMap[nombre].penalizaciones++
        const evento = ev?.find(e => e.id === a.evento_id)
        if (evento?.tipo === 'entreno' && a.estado === 'asistio') rankingMap[nombre].entrenos++
        if ((evento?.tipo === 'partido' || evento?.tipo === 'torneo') && a.estado === 'asistio') rankingMap[nombre].partidos++
      })

      const listaRanking = Object.entries(rankingMap)
        .map(([nombre, datos]) => ({
          nombre,
          ...datos,
          pct: totalEventosConCuenta > 0 ? Math.round((datos.total / totalEventosConCuenta) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
      setRanking(listaRanking)

      // ---- GOLEADORES ----
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

      // ---- TEMPORADA EN NÚMEROS ----
      const entrenosFinalizados = ev?.filter(e => e.tipo === 'entreno' && e.estado !== 'cancelado').length || 0
      const entrenosAnulados = ev?.filter(e => e.tipo === 'entreno' && e.estado === 'cancelado').length || 0
      const partidosTemp = ev?.filter(e => e.tipo === 'partido' && e.estado !== 'cancelado').length || 0
      const torneosTemp = ev?.filter(e => e.tipo === 'torneo' && e.estado !== 'cancelado').length || 0

      const entrenoIds = ev?.filter(e => e.tipo === 'entreno').map(e => e.id) || []
      const { data: asistenciasAsistio } = eventoIds.length > 0
        ? await supabase.from('asistencias').select('socio_id, evento_id').eq('estado', 'asistio').in('evento_id', eventoIds)
        : { data: [] }

      const asistenciasTotales = asistenciasAsistio?.length || 0
      const asistenciasEntrenos = asistenciasAsistio?.filter(a => entrenoIds.includes(a.evento_id)).length || 0
      const mediaAsistencia = entrenosFinalizados > 0 ? (asistenciasEntrenos / entrenosFinalizados).toFixed(1) : 0

      const totalBenefico = ev?.filter(e => e.es_benefico).reduce((sum, e) => sum + (e.recaudacion_benefica || 0), 0) || 0

      setStatsTemporada({
        sociosParticipantes: sociosParticipantesIds.size,
        entrenos: entrenosFinalizados,
        entrenosAnulados,
        partidos: partidosTemp,
        torneos: torneosTemp,
        asistenciasTotales,
        mediaAsistencia,
        benefico: totalBenefico,
      })

      // ---- GRÁFICO EVOLUCIÓN MENSUAL ----
      const entrenosJugados = ev?.filter(e => e.tipo === 'entreno' && e.estado === 'jugado') || []
      const asistenciasPorEvento = {}
      asistenciasAsistio?.forEach(a => {
        asistenciasPorEvento[a.evento_id] = (asistenciasPorEvento[a.evento_id] || 0) + 1
      })

      const entrenosPorMes = {}
      const asistenciasPorMes = {}
      entrenosJugados.forEach(evt => {
        const mesKey = evt.fecha.slice(0, 7)
        entrenosPorMes[mesKey] = (entrenosPorMes[mesKey] || 0) + 1
        asistenciasPorMes[mesKey] = (asistenciasPorMes[mesKey] || 0) + (asistenciasPorEvento[evt.id] || 0)
      })

      const evolucion = Object.keys(entrenosPorMes).sort().map(mesKey => {
        const mesNum = parseInt(mesKey.split('-')[1])
        const media = entrenosPorMes[mesKey] > 0 ? asistenciasPorMes[mesKey] / entrenosPorMes[mesKey] : 0
        return { mesKey, label: nombresMes[mesNum - 1], media: Math.round(media * 10) / 10 }
      })
      setEvolucionMensual(evolucion)

      // ---- TOP RACHA MÁXIMA DE LA TEMPORADA ----
      const entrenosOrdenAsc = [...entrenosJugados].sort((a, b) => a.fecha.localeCompare(b.fecha))
      const idsEntrenosAsc = entrenosOrdenAsc.map(e => e.id)

      const { data: todosSociosRacha } = await supabase
        .from('socios')
        .select('id, apodo, nombre_completo')

      const asistioSet = new Set(
        (asistenciasAsistio || [])
          .filter(a => idsEntrenosAsc.includes(a.evento_id))
          .map(a => `${a.evento_id}_${a.socio_id}`)
      )

      const rachasMax = (todosSociosRacha || [])
        .map(s => {
          let actual = 0
          let max = 0
          entrenosOrdenAsc.forEach(evt => {
            if (asistioSet.has(`${evt.id}_${s.id}`)) {
              actual++
              max = Math.max(max, actual)
            } else {
              actual = 0
            }
          })
          return { nombre: s.apodo || s.nombre_completo || 'Desconocido', racha: max }
        })
        .filter(s => s.racha > 0)
        .sort((a, b) => b.racha - a.racha)
        .slice(0, 10)
      setTopRachasMax(rachasMax)

      setLoading(false)
    }
    if (id) cargar()
  }, [id])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando temporada...</div>
  if (!temporada) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Temporada no encontrada</div>

  const maxAsist = ranking[0]?.total || 1
  const maxGoles = goleadores[0]?.[1] || 1

  // Agrupar eventos por mes (tab calendario)
  const meses = {}
  eventos.forEach(e => {
    const fecha = new Date(e.fecha + 'T12:00:00')
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    const nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    if (!meses[clave]) meses[clave] = { nombre: nombreMes, eventos: [] }
    meses[clave].eventos.push(e)
  })

  // Datos del gráfico SVG
  const padLeft = 10
  const padTop = 30
  const padBottom = 30
  const barWidth = 40
  const gap = 24
  const chartHeight = 220
  const maxValor = Math.ceil((Math.max(OBJETIVO_ASISTENCIA, ...evolucionMensual.map(m => m.media), 1) * 1.15) / 2) * 2
  const chartWidth = padLeft + evolucionMensual.length * (barWidth + gap) + 10
  const yObjetivo = chartHeight - padBottom - (OBJETIVO_ASISTENCIA / maxValor) * (chartHeight - padBottom - padTop)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
      <a href="/historico" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Histórico</a>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '26px', fontWeight: '600', margin: '8px 0 24px' }}>
        Temporada {temporada.nombre}
      </h1>

      {/* TEMPORADA EN NÚMEROS */}
      {statsTemporada && (
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            📊 La temporada en números
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
            {[
              { label: 'Socios participantes', valor: statsTemporada.sociosParticipantes },
              { label: 'Entrenos jugados', valor: statsTemporada.entrenos },
              { label: 'Entrenos anulados', valor: statsTemporada.entrenosAnulados },
              { label: 'Partidos', valor: statsTemporada.partidos },
              { label: 'Torneos', valor: statsTemporada.torneos },
              { label: 'Asistencias totales', valor: statsTemporada.asistenciasTotales },
              { label: 'Media asistencia', valor: statsTemporada.mediaAsistencia },
              { label: 'Recaudado benéfico', valor: `${statsTemporada.benefico}€` },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: 'var(--azul-palido)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--azul-marino)' }}>{s.valor}</div>
                <div style={{ fontSize: '10px', color: 'var(--azul-medio)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GRÁFICO EVOLUCIÓN MENSUAL */}
      <div style={{
        backgroundColor: 'var(--blanco)',
        border: '1px solid var(--azul-claro)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
          📈 Evolución de la Media de Asistencia
        </h2>
        <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>
          Objetivo de referencia: <strong style={{ color: 'var(--naranja)' }}>{OBJETIVO_ASISTENCIA}.0</strong> asistentes de media por entreno
        </p>
        {evolucionMensual.length === 0 ? (
          <p style={{ color: '#999', fontSize: '13px' }}>No hay datos suficientes de esta temporada</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ minWidth: `${chartWidth}px`, height: '240px', display: 'block' }}>
              <defs>
                <linearGradient id="barNormalHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1A6BB5" />
                  <stop offset="100%" stopColor="#5BB8E8" />
                </linearGradient>
                <linearGradient id="barObjetivoHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4721A" />
                  <stop offset="100%" stopColor="#F0A050" />
                </linearGradient>
              </defs>

              <line x1={padLeft} y1={yObjetivo} x2={chartWidth - 10} y2={yObjetivo} stroke="#D4721A" strokeWidth="2" strokeDasharray="6,5" />
              <text x={chartWidth - 10} y={yObjetivo - 8} textAnchor="end" fontSize="12" fill="#D4721A" fontWeight="700">
                Objetivo {OBJETIVO_ASISTENCIA}.0
              </text>

              {evolucionMensual.map((m, i) => {
                const x = padLeft + i * (barWidth + gap)
                const barH = (m.media / maxValor) * (chartHeight - padBottom - padTop)
                const y = chartHeight - padBottom - barH
                const alcanzado = m.media >= OBJETIVO_ASISTENCIA
                return (
                  <g key={m.mesKey}>
                    <rect x={x} y={y} width={barWidth} height={barH} rx="6" fill={alcanzado ? 'url(#barObjetivoHist)' : 'url(#barNormalHist)'} />
                    <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--azul-marino)">
                      {m.media}
                    </text>
                    <text x={x + barWidth / 2} y={chartHeight - padBottom + 18} textAnchor="middle" fontSize="12" fill="#888">
                      {m.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </div>

      {/* PREMIOS DE TEMPORADA */}
      {id === '9e5e2100-e4f4-4a33-8949-b27ceb2b169a' && (
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '2px solid #B07800',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #fffbf0, #fff8e1)',
        }}>
          <h2 style={{ color: '#B07800', fontSize: '16px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
            🏆 Premios Final de Temporada 2025-26
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: 'rgba(176,120,0,0.08)', borderRadius: '8px', border: '1px solid rgba(176,120,0,0.2)' }}>
              <span style={{ fontSize: '24px' }}>🥇</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#B07800', marginBottom: '2px' }}>Mayor asistencia a entrenos y eventos</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--azul-marino)' }}>Paco Gómez</div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>🎁 Vale de 60€ — Pizzería La Roima</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: 'rgba(176,120,0,0.08)', borderRadius: '8px', border: '1px solid rgba(176,120,0,0.2)' }}>
              <span style={{ fontSize: '24px' }}>🎲</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#B07800', marginBottom: '2px' }}>Sorteo entre el 2.º y el 10.º del ranking de asistencias</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--azul-marino)' }}>Juan Carlos</div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>🎁 100% descuento en la cuota 2026-27</div>
              </div>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '14px', marginTop: '16px', color: 'var(--azul-marino)' }}>
            👏 ¡Enhorabuena a los premiados! 💙
          </p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { key: 'asistencias', label: '🏆 Asistencias' },
          { key: 'racha', label: '🔥 Racha máxima' },
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
          <div style={{ minWidth: '600px' }}>
            <div style={{
              backgroundColor: 'var(--azul-marino)', padding: '12px 20px',
              display: 'grid', gridTemplateColumns: '40px 1fr 60px 70px 70px 60px 60px',
              gap: '8px', color: 'white', fontSize: '12px', fontWeight: '600',
            }}>
              <span>#</span><span>Socio</span>
              <span style={{ textAlign: 'center' }}>Total</span>
              <span style={{ textAlign: 'center' }}>Entrenos</span>
              <span style={{ textAlign: 'center' }}>Part/Torn</span>
              <span style={{ textAlign: 'center' }}>Penalty</span>
              <span style={{ textAlign: 'center' }}>%</span>
            </div>
            {ranking.map((r, i) => (
              <div key={r.nombre} style={{
                padding: '10px 20px', display: 'grid',
                gridTemplateColumns: '40px 1fr 60px 70px 70px 60px 60px', gap: '8px', alignItems: 'center',
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
                <span style={{ textAlign: 'center', color: r.penalizaciones > 0 ? '#C92F2F' : 'var(--azul-medio)' }}>{r.penalizaciones}</span>
                <span style={{ textAlign: 'center', color: 'var(--azul-medio)' }}>{r.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Racha máxima */}
      {tab === 'racha' && (
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px' }}>
            La mayor racha de entrenos consecutivos asistidos que alcanzó cada socio durante esta temporada.
          </p>
          {topRachasMax.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>Sin datos de racha para esta temporada</p>
          ) : (
            topRachasMax.map((s, i) => (
              <div key={s.nombre} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 0',
                borderBottom: i < topRachasMax.length - 1 ? '1px solid var(--azul-palido)' : 'none',
              }}>
                <span style={{
                  minWidth: '20px', fontSize: '12px', fontWeight: '600',
                  color: i === 0 ? '#B07800' : i === 1 ? '#888' : i === 2 ? '#993C1D' : 'var(--azul-medio)',
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--negro)' }}>{s.nombre}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--naranja)' }}>🔥 {s.racha}</span>
              </div>
            ))
          )}
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