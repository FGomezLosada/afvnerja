'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Historico() {
  const [temporadas, setTemporadas] = useState([])
  const [statsPorTemporada, setStatsPorTemporada] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: temps } = await supabase
        .from('temporadas')
        .select('*')
        .order('fecha_inicio', { ascending: false })

      setTemporadas(temps || [])

      const stats = {}
      for (const temp of temps || []) {
        const [{ data: eventos }, { data: asistencias }, { data: goles }] = await Promise.all([
          supabase.from('eventos').select('id, tipo, recaudacion_benefica, es_benefico').eq('temporada_id', temp.id),
          supabase.from('asistencias').select('socio_id, estado, evento_id, socios(apodo, nombre_completo)').eq('estado', 'asistio'),
          supabase.from('goles').select('cantidad, socios(apodo, nombre_completo), eventos!inner(temporada_id)').eq('eventos.temporada_id', temp.id),
        ])

        const eventoIds = eventos?.map(e => e.id) || []
        const asistenciasTemp = asistencias?.filter(a => eventoIds.includes(a.evento_id)) || []

        const rankingAsist = {}
        asistenciasTemp.forEach(a => {
          const nombre = a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido'
          rankingAsist[nombre] = (rankingAsist[nombre] || 0) + 1
        })
        const topAsistencia = Object.entries(rankingAsist).sort((a, b) => b[1] - a[1])[0]

        const rankingGoles = {}
        goles?.forEach(g => {
          const nombre = g.socios?.apodo || g.socios?.nombre_completo || 'Desconocido'
          rankingGoles[nombre] = (rankingGoles[nombre] || 0) + (g.cantidad || 1)
        })
        const topGoleador = Object.entries(rankingGoles).sort((a, b) => b[1] - a[1])[0]

        const totalBenefico = eventos?.filter(e => e.es_benefico).reduce((sum, e) => sum + (e.recaudacion_benefica || 0), 0) || 0

        stats[temp.id] = {
          totalEventos: eventos?.length || 0,
          totalBenefico,
          totalEntrenos: eventos?.filter(e => e.tipo === 'entreno').length || 0,
          totalPartidos: eventos?.filter(e => e.tipo === 'partido').length || 0,
          totalTorneos: eventos?.filter(e => e.tipo === 'torneo').length || 0,
          topAsistencia: topAsistencia ? { nombre: topAsistencia[0], valor: topAsistencia[1] } : null,
          topGoleador: topGoleador ? { nombre: topGoleador[0], valor: topGoleador[1] } : null,
        }
      }
      setStatsPorTemporada(stats)
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando histórico...</div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
        Histórico de temporadas
      </h1>
      <p style={{ color: 'var(--azul-medio)', fontSize: '14px', marginBottom: '32px' }}>
        Archivo de todas las temporadas de la A.F.V. Nerja
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {temporadas.map(temp => {
          const stats = statsPorTemporada[temp.id] || {}
          return (
            <div key={temp.id} style={{
              backgroundColor: 'var(--blanco)',
              border: `2px solid ${temp.activa ? 'var(--azul-medio)' : 'var(--azul-claro)'}`,
              borderRadius: '16px',
              overflow: 'hidden',
            }}>
              <div style={{
                backgroundColor: 'var(--azul-marino)',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}>
                <div>
                  <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>
                    Temporada {temp.nombre}
                  </div>
                  <div style={{ color: 'var(--azul-claro)', fontSize: '12px', marginTop: '2px' }}>
                    {new Date(temp.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' — '}
                    {new Date(temp.fecha_fin).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                {temp.activa && (
                  <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '11px', fontWeight: '600', padding: '4px 12px', borderRadius: '20px' }}>
                    TEMPORADA ACTUAL
                  </span>
                )}
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* Stats numéricos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { label: 'Entrenos', valor: stats.totalEntrenos },
                    { label: 'Partidos', valor: stats.totalPartidos },
                    { label: 'Torneos', valor: stats.totalTorneos },
                  ].map(s => (
                    <div key={s.label} style={{ backgroundColor: 'var(--azul-palido)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--azul-marino)' }}>{s.valor || 0}</div>
                      <div style={{ fontSize: '10px', color: 'var(--azul-medio)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Top jugador y goleador */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {stats.topAsistencia && (
                    <div style={{
                      backgroundColor: '#FAEEDA', borderRadius: '10px', padding: '14px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <span style={{ fontSize: '24px' }}>🏆</span>
                      <div>
                        <div style={{ fontSize: '11px', color: '#633806' }}>Mayor asistencia</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#633806' }}>
                          {stats.topAsistencia.nombre} ({stats.topAsistencia.valor})
                        </div>
                      </div>
                    </div>
                  )}
                  {stats.topGoleador && (
                    <div style={{
                      backgroundColor: '#FAECE7', borderRadius: '10px', padding: '14px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <span style={{ fontSize: '24px' }}>⚽</span>
                      <div>
                        <div style={{ fontSize: '11px', color: '#993C1D' }}>Máximo goleador</div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#993C1D' }}>
                          {stats.topGoleador.nombre} ({stats.topGoleador.valor})
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(
                  <div style={{
                    marginTop: '12px', backgroundColor: '#FEE2E2', borderRadius: '10px', padding: '14px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{ fontSize: '24px' }}>❤️</span>
                    <div>
                      <div style={{ fontSize: '11px', color: '#991B1B' }}>Recaudado benéfico</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#991B1B' }}>
                        {stats.totalBenefico}€
                      </div>
                    </div>
                  </div>
                )}

                {temp.notas && (
                  <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--azul-medio)', fontStyle: 'italic' }}>
                    {temp.notas}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}