'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [usuario, setUsuario] = useState(null)
  const [stats, setStats] = useState({})
  const [financiero, setFinanciero] = useState({})
  const [temporadas, setTemporadas] = useState([])
  const [temporadaSeleccionada, setTemporadaSeleccionada] = useState(null)
  const [topNoAparecio, setTopNoAparecio] = useState([])
  const [topBorrados, setTopBorrados] = useState([])
  const [historicoData, setHistoricoData] = useState([])
  const [tempIndicadores, setTempIndicadores] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/admin'); return }
      }
      setUsuario(session?.user)

      // Temporadas
      const { data: temps } = await supabase
        .from('temporadas')
        .select('id, nombre, activa')
        .order('fecha_inicio', { ascending: false })
      setTemporadas(temps || [])

      const tempActiva = temps?.find(t => t.activa)
      setTemporadaSeleccionada(tempActiva?.id || temps?.[0]?.id)

      // Socios activos
      const { count: socios } = await supabase
        .from('socios')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true)

      // Eventos de la temporada activa
      const { data: eventosTemp } = await supabase
        .from('eventos')
        .select('id, tipo, estado, torneo_id')
        .eq('temporada_id', tempActiva?.id)

      const entrenos = eventosTemp?.filter(e => e.tipo === 'entreno' && e.estado === 'jugado').length || 0
      const entrenosProgramados = eventosTemp?.filter(e => e.tipo === 'entreno' && e.estado === 'programado').length || 0
      const partidos = eventosTemp?.filter(e => e.tipo === 'partido' && e.estado === 'jugado').length || 0
      const partidosProgramados = eventosTemp?.filter(e => e.tipo === 'partido' && e.estado === 'programado').length || 0
      const torneos = eventosTemp?.filter(e => e.tipo === 'torneo' && e.estado === 'jugado').length || 0
      const torneosProgramados = eventosTemp?.filter(e => e.tipo === 'torneo' && e.estado === 'programado').length || 0
      const partidosEnTorneo = eventosTemp?.filter(e => e.tipo === 'partido' && e.estado === 'jugado' && e.torneo_id).length || 0
      const otros = eventosTemp?.filter(e => !['entreno','partido','torneo'].includes(e.tipo) && e.estado === 'jugado').length || 0
      const otrosProgramados = eventosTemp?.filter(e => !['entreno','partido','torneo'].includes(e.tipo) && e.estado === 'programado').length || 0

      // Cuotas pendientes
      const { data: cuotasPagadas } = await supabase
        .from('cuotas')
        .select('socio_id, importe_pagado')
        .in('estado', ['pagado', 'exento'])
        .eq('temporada_id', tempActiva?.id)

      const pagoIds = cuotasPagadas?.map(c => c.socio_id) || []
      const pendientes = (socios || 0) - pagoIds.length

      const hoy = new Date()
      const { data: sociosSub35 } = await supabase
        .from('socios')
        .select('fecha_nacimiento')
        .eq('activo', true)
        .not('fecha_nacimiento', 'is', null)

      const numSub35 = (sociosSub35 || []).filter(s => {
        const edad = hoy.getFullYear() - new Date(s.fecha_nacimiento).getFullYear()
        return edad < 35
      }).length

      setStats({ socios, entrenos, entrenosProgramados, partidos, partidosProgramados, torneos, torneosProgramados, otros, otrosProgramados, cuotas_pendientes: pendientes, partidosEnTorneo, sub35: numSub35 })

      // Top 3 no_aparecio (temporada activa)
      const eventoIds = eventosTemp?.map(e => e.id) || []
      if (eventoIds.length > 0) {
        const { data: noAparecioData } = await supabase
          .from('asistencias')
          .select('socio_id, socios(apodo, nombre_completo)')
          .eq('estado', 'no_aparecio')
          .in('evento_id', eventoIds)

        const conteoNA = {}
        noAparecioData?.forEach(a => {
          const nombre = a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido'
          conteoNA[nombre] = (conteoNA[nombre] || 0) + 1
        })
        const topNA = Object.entries(conteoNA).sort((a, b) => b[1] - a[1]).slice(0, 3)
        setTopNoAparecio(topNA)

        // Top 3 borrados de lista (asistencias con se_borro)
        const { data: borradosData } = await supabase
          .from('asistencias')
          .select('socio_id, socios(apodo, nombre_completo)')
          .eq('estado', 'se_borro')
          .in('evento_id', eventoIds)

        const conteoB = {}
        borradosData?.forEach(a => {
          const nombre = a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido'
          conteoB[nombre] = (conteoB[nombre] || 0) + 1
        })
        const topB = Object.entries(conteoB).sort((a, b) => b[1] - a[1]).slice(0, 3)
        setTopBorrados(topB)
      }

      // Financiero de la temporada activa
      await cargarFinanciero(tempActiva?.id)

      // Cargar datos históricos de todas las temporadas
      const { data: todasTemps } = await supabase
        .from('temporadas')
        .select('id, nombre, activa, objetivo_media_asistencia, objetivo_socios, objetivo_benefico, objetivo_partidos_torneos')
        .order('fecha_inicio', { ascending: true })

      const historicoData = []
      for (const temp of todasTemps || []) {
        const { data: evTemp } = await supabase
          .from('eventos')
          .select('id, tipo, estado, cuenta_asistencia, recaudacion_benefica, es_benefico')
          .eq('temporada_id', temp.id)

        const entrenosJugados = evTemp?.filter(e => e.tipo === 'entreno' && e.estado === 'jugado') || []
        const idsEntrenos = entrenosJugados.map(e => e.id)

        let mediaAsistencia = 0
        if (idsEntrenos.length > 0) {
          const { data: asistTemp } = await supabase
            .from('asistencias')
            .select('evento_id')
            .eq('estado', 'asistio')
            .in('evento_id', idsEntrenos)
          mediaAsistencia = idsEntrenos.length > 0
            ? Math.round((asistTemp?.length || 0) / idsEntrenos.length * 10) / 10
            : 0
        }

        const { data: cuotasTemp } = await supabase
          .from('cuotas')
          .select('socio_id')
          .eq('temporada_id', temp.id)
          .in('estado', ['pagado', 'parcial', 'exento'])

        const sociosTemp = cuotasTemp?.length || 0

        const minAsist = temp.objetivo_media_asistencia ? (
          await supabase.from('temporadas').select('min_asistencias').eq('id', temp.id).single()
        ).data?.min_asistencias || 15 : 15

        const { data: asistPorSocio } = await supabase
          .from('asistencias')
          .select('socio_id')
          .eq('estado', 'asistio')
          .in('evento_id', (await supabase.from('eventos').select('id').eq('temporada_id', temp.id).eq('cuenta_asistencia', true)).data?.map(e => e.id) || [])

        const conteoPorSocio = {}
        asistPorSocio?.forEach(a => {
          conteoPorSocio[a.socio_id] = (conteoPorSocio[a.socio_id] || 0) + 1
        })
        const sociosActivosDeportivos = Object.values(conteoPorSocio).filter(n => n >= minAsist).length

        const benefico = evTemp?.filter(e => e.es_benefico).reduce((sum, e) => sum + (e.recaudacion_benefica || 0), 0) || 0
        const partidosTorneos = evTemp?.filter(e => (e.tipo === 'partido' || e.tipo === 'torneo') && e.estado === 'jugado').length || 0

        historicoData.push({
          nombre: temp.nombre,
          activa: temp.activa,
          mediaAsistencia,
          socios: sociosTemp,
          sociosActivosDeportivos,
          benefico,
          partidosTorneos,
          objetivos: {
            media: temp.objetivo_media_asistencia || 18,
            socios: temp.objetivo_socios || 20,
            sociosActivos: temp.objetivo_socios || 15,
            benefico: temp.objetivo_benefico || 0,
            partidosTorneos: temp.objetivo_partidos_torneos || 5,
          }
        })
      }
      setHistoricoData(historicoData)
      const activa = historicoData.find(t => t.activa)
      if (activa) setTempIndicadores(activa.nombre)
      setLoading(false)
    }
    cargarDatos()
  }, [])

  async function cargarFinanciero(tempId) {
    if (!tempId) return

    const { data: cuotas } = await supabase
      .from('cuotas')
      .select('importe_pagado, estado')
      .eq('temporada_id', tempId)
      .in('estado', ['pagado', 'parcial'])

    const totalCuotas = cuotas?.reduce((sum, c) => sum + (c.importe_pagado || 0), 0) || 0

    const { data: gastos } = await supabase
      .from('gastos')
      .select('importe')
      .eq('temporada_id', tempId)

    const totalGastosReales = gastos?.filter(g => (g.importe || 0) > 0).reduce((sum, g) => sum + g.importe, 0) || 0
    const totalOtrosIngresos = gastos?.filter(g => (g.importe || 0) < 0).reduce((sum, g) => sum + Math.abs(g.importe), 0) || 0
    const saldo = totalCuotas + totalOtrosIngresos - totalGastosReales

    setFinanciero({ totalCuotas, totalGastosReales, totalOtrosIngresos, saldo })
  }

  async function handleTemporadaChange(tempId) {
    setTemporadaSeleccionada(tempId)
    await cargarFinanciero(tempId)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>
      Cargando panel...
    </div>
  )

  const tempActivaNombre = temporadas.find(t => t.activa)?.nombre || ''

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--azul-marino)', fontSize: '24px', fontWeight: '600' }}>
            Panel de Administración
          </h1>
          <p style={{ color: 'var(--azul-medio)', fontSize: '13px', marginTop: '4px' }}>
            AFV Nerja — {tempActivaNombre}
          </p>
        </div>
        <button onClick={handleLogout} style={{
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '1px solid var(--azul-claro)',
          borderRadius: '8px',
          color: 'var(--azul-medio)',
          fontSize: '13px',
          cursor: 'pointer',
        }}>
          Cerrar sesión
        </button>
      </div>

      {/* Socios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>👥</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--azul-marino)' }}>{stats.socios}</div>
          <div style={{ fontSize: '12px', color: 'var(--azul-medio)', marginTop: '4px' }}>Socios activos</div>
        </div>
        <div style={{ backgroundColor: 'var(--blanco)', border: `1px solid ${stats.cuotas_pendientes > 0 ? 'var(--naranja)' : 'var(--azul-claro)'}`, borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💰</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: stats.cuotas_pendientes > 0 ? 'var(--naranja)' : 'var(--azul-marino)' }}>{stats.cuotas_pendientes}</div>
          <div style={{ fontSize: '12px', color: 'var(--azul-medio)', marginTop: '4px' }}>Cuotas pendientes</div>
        </div>
        <div style={{ backgroundColor: 'var(--blanco)', border: `1px solid ${stats.sub35 > 0 ? 'var(--naranja)' : 'var(--azul-claro)'}`, borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>👶 <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--naranja)' }}>&lt;35</span></div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: stats.sub35 > 0 ? 'var(--naranja)' : 'var(--azul-marino)' }}>{stats.sub35 || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--azul-medio)', marginTop: '4px' }}>Socios sub-35</div>
        </div>
      </div>

      {/* Eventos desglosados */}
      <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
        📅 Eventos — {tempActivaNombre}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Entrenos', jugados: stats.entrenos, programados: stats.entrenosProgramados, icono: '⚽' },
          { label: 'Partidos', jugados: stats.partidos, programados: stats.partidosProgramados, icono: '🏟️' },
          { label: 'Torneos', jugados: stats.torneos, programados: stats.torneosProgramados, icono: '🏆', extra: stats.partidosEnTorneo },
          { label: 'Otros', jugados: stats.otros, programados: stats.otrosProgramados, icono: '🎉' },
        ].map(e => (
          <div key={e.label} style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{e.icono}</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-marino)', marginBottom: '8px' }}>{e.label}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--azul-marino)' }}>{e.jugados}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>jugados</div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'var(--azul-claro)' }} />
              <div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--azul-cielo)' }}>{e.programados}</div>
                <div style={{ fontSize: '10px', color: '#888' }}>pendientes</div>
              </div>
              {e.extra > 0 && (
                <div style={{ width: '100%', marginTop: '6px', fontSize: '10px', color: '#888', textAlign: 'center' }}>
                  ({e.extra} partidos dentro)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bloque financiero */}
      <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
        💶 Resumen financiero
      </h2>
      <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px', color: 'var(--azul-medio)', fontWeight: '600' }}>Temporada:</label>
          <select
            value={temporadaSeleccionada || ''}
            onChange={e => handleTemporadaChange(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--azul-claro)', fontSize: '13px', color: 'var(--azul-marino)', cursor: 'pointer' }}
          >
            {temporadas.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}{t.activa ? ' (activa)' : ''}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--azul-palido)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginBottom: '6px', fontWeight: '600' }}>💰 CUOTAS</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75' }}>{financiero.totalCuotas?.toFixed(2)}€</div>
          </div>
          <div style={{ backgroundColor: 'var(--azul-palido)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginBottom: '6px', fontWeight: '600' }}>📈 OTROS INGRESOS</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75' }}>{financiero.totalOtrosIngresos?.toFixed(2)}€</div>
          </div>
          <div style={{ backgroundColor: 'var(--azul-palido)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginBottom: '6px', fontWeight: '600' }}>📉 GASTOS REALES</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--naranja)' }}>{financiero.totalGastosReales?.toFixed(2)}€</div>
          </div>
          <div style={{ backgroundColor: financiero.saldo >= 0 ? '#e8f8f2' : '#fef0e7', borderRadius: '10px', padding: '16px', textAlign: 'center', border: `1px solid ${financiero.saldo >= 0 ? '#1D9E75' : 'var(--naranja)'}` }}>
            <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginBottom: '6px', fontWeight: '600' }}>🏦 SALDO EN CAJA</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: financiero.saldo >= 0 ? '#1D9E75' : 'var(--naranja)' }}>
              {financiero.saldo >= 0 ? '+' : ''}{financiero.saldo?.toFixed(2)}€
            </div>
          </div>
        </div>
        <p style={{ fontSize: '11px', color: '#999', marginTop: '12px' }}>
          * Los ingresos extras (remanente, subvenciones, ventas...) se registran con importe negativo en "Gestionar gastos/ingresos" y aparecen en "Otros ingresos". El saldo en caja = Cuotas + Otros ingresos − Gastos reales.
        </p>
      </div>

      {/* Seguimiento de implicación */}
      <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
        📋 Seguimiento de implicación — {tempActivaNombre}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>

        <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: 'var(--azul-marino)', fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>
            ⚠️ Top 3 "No apareció" — Temporada
          </h3>
          {topNoAparecio.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#999' }}>Sin penalizaciones esta temporada 🎉</p>
          ) : topNoAparecio.map(([nombre, count], i) => (
            <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: i < topNoAparecio.length - 1 ? '1px solid var(--azul-palido)' : 'none' }}>
              <span style={{ minWidth: '20px', fontSize: '13px', color: i === 0 ? '#C92F2F' : 'var(--azul-medio)', fontWeight: '600' }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--negro)' }}>{nombre}</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#C92F2F' }}>{count}x</span>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: 'var(--azul-marino)', fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>
            🚪 Top 3 "Bajas de lista" — Temporada
          </h3>
          {topBorrados.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#999' }}>Sin bajas de lista esta temporada</p>
          ) : topBorrados.map(([nombre, count], i) => (
            <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: i < topBorrados.length - 1 ? '1px solid var(--azul-palido)' : 'none' }}>
              <span style={{ minWidth: '20px', fontSize: '13px', color: 'var(--azul-medio)', fontWeight: '600' }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--negro)' }}>{nombre}</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--azul-medio)' }}>{count}x</span>
            </div>
          ))}
        </div>

      </div>

      {/* PANEL DE INDICADORES */}
      {historicoData.length > 0 && (() => {
        const actual = historicoData.find(t => t.nombre === tempIndicadores) || historicoData.find(t => t.activa)
        if (!actual) return null
        const indicadores = [
          { label: '📊 Media asistencia', valor: actual.mediaAsistencia, objetivo: actual.objetivos.media, sufijo: '', decimales: 1 },
          { label: '👥 Socios en la asociación', valor: actual.socios, objetivo: actual.objetivos.socios, sufijo: '', decimales: 0 },
          { label: '⚽ Socios activos deportivamente', valor: actual.sociosActivosDeportivos, objetivo: actual.objetivos.sociosActivos, sufijo: '', decimales: 0 },
          { label: '❤️ Recaudado benéfico', valor: actual.benefico, objetivo: actual.objetivos.benefico, sufijo: '€', decimales: 0 },
          { label: '⚽ Partidos y torneos', valor: actual.partidosTorneos, objetivo: actual.objetivos.partidosTorneos, sufijo: '', decimales: 0 },
        ]
        return (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                🎯 Objetivos
              </h2>
              <select value={tempIndicadores || ''} onChange={e => setTempIndicadores(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--azul-claro)', fontSize: '13px', color: 'var(--azul-marino)' }}>
                {historicoData.map(t => (
                  <option key={t.nombre} value={t.nombre}>{t.nombre}{t.activa ? ' (activa)' : ''}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {indicadores.map(ind => {
                const pct = ind.objetivo > 0 ? Math.min(100, Math.round((ind.valor / ind.objetivo) * 100)) : 100
                const color = pct >= 100 ? '#1D9E75' : pct >= 70 ? 'var(--naranja)' : '#C92F2F'
                return (
                  <div key={ind.label} style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--azul-medio)', fontWeight: '600', marginBottom: '8px' }}>{ind.label}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--azul-marino)' }}>
                        {ind.decimales === 1 ? ind.valor.toFixed(1) : ind.valor}{ind.sufijo}
                      </span>
                      <span style={{ fontSize: '12px', color: '#888' }}>/ {ind.objetivo}{ind.sufijo}</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--azul-palido)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: '11px', color, fontWeight: '600', textAlign: 'right' }}>{pct}%</div>
                  </div>
                )
              })}
            </div>

            {/* Gráfico evolución histórica */}
            {historicoData.length > 1 && (() => {
              const maxMedia = Math.max(...historicoData.map(t => Math.max(t.mediaAsistencia, t.objetivos.media)), 1)
              const padL = 8, padT = 24, padB = 28, barW = 40, gap = 20, h = 180
              const totalW = padL + historicoData.length * (barW + gap) + 10
              return (
                <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '16px' }}>
                  <h3 style={{ color: 'var(--azul-marino)', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                    📈 Evolución media asistencia por temporada
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${totalW} ${h}`} style={{ minWidth: `${totalW}px`, height: '200px', display: 'block' }}>
                      {historicoData.map((temp, i) => {
                        const x = padL + i * (barW + gap)
                        const barH = (temp.mediaAsistencia / maxMedia) * (h - padB - padT)
                        const y = h - padB - barH
                        const yObj = h - padB - (temp.objetivos.media / maxMedia) * (h - padB - padT)
                        const color = temp.mediaAsistencia >= temp.objetivos.media ? '#1D9E75' : 'var(--azul-medio)'
                        return (
                          <g key={temp.nombre}>
                            <rect x={x} y={y} width={barW} height={barH} rx="4" fill={color} opacity={temp.activa ? 1 : 0.6} />
                            <line x1={x - 2} y1={yObj} x2={x + barW + 2} y2={yObj} stroke="var(--naranja)" strokeWidth="2" strokeDasharray="4,3" />
                            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--azul-marino)">{temp.mediaAsistencia.toFixed(1)}</text>
                            <text x={x + barW / 2} y={h - padB + 16} textAnchor="middle" fontSize="10" fill="#888">{temp.nombre?.replace('Temporada ', '')}</text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                  <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                    🟠 línea discontinua = objetivo de cada temporada · 🟢 verde = objetivo cumplido · 🔵 azul = en progreso
                  </p>
                </div>
              )
            })()}
          </div>
        )
      })()}

      {/* Acciones rápidas */}
      <h2 style={{ color: 'var(--azul-marino)', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        Gestión
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Gestionar socios', icono: '👤', href: '/admin/socios', desc: 'Ver, añadir y editar socios' },
          { label: 'Registrar asistencia', icono: '✅', href: '/admin/asistencias', desc: 'Marcar asistencia de un evento' },
          { label: 'Gestionar eventos', icono: '📅', href: '/admin/eventos', desc: 'Crear y editar eventos' },
          { label: 'Gestionar cuotas', icono: '💰', href: '/admin/cuotas', desc: 'Estado de pagos por socio' },
          { label: 'Gestionar gastos/ingresos', icono: '💸', href: '/admin/gastos', desc: 'Registro económico de la asociación' },
          { label: 'Patrocinadores', icono: '🏢', href: '/admin/patrocinadores', desc: 'Logos y datos de patrocinadores' },
          { label: 'Histórico financiero', icono: '💶', href: '/admin/historico-financiero', desc: 'Consultar gastos e ingresos por temporada' },
          { label: 'Expediciones', icono: '🌍', href: '/admin/expediciones', desc: 'Gestionar el Mundo AFV' },
          { label: 'Configuración', icono: '⚙️', href: '/admin/config', desc: 'Temporadas y ajustes' },
        ].map(accion => (
          <a key={accion.href} href={accion.href} style={{
            backgroundColor: 'var(--blanco)',
            border: '1px solid var(--azul-claro)',
            borderRadius: '12px',
            padding: '20px',
            textDecoration: 'none',
            display: 'block',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{accion.icono}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)', marginBottom: '4px' }}>
              {accion.label}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--azul-medio)' }}>
              {accion.desc}
            </div>
          </a>
        ))}
      </div>

    </div>
  )
}