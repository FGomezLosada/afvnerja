import { supabase } from '@/lib/supabase'

const posicionIcon = (p) => {
  if (p === 'portero') return '🧤'
  if (p === 'defensa') return '🛡️'
  if (p === 'centrocampista') return '⚙️'
  if (p === 'delantero') return '⚡'
  return '⚽'
}

export const revalidate = 0

export default async function Estadisticas() {
  const { data: asistencias } = await supabase
    .from('asistencias')
    .select('socio_id, estado, evento_id, socios(nombre_completo, apodo, posicion), eventos(tipo, cuenta_asistencia)')
    .in('estado', ['asistio', 'no_aparecio'])

  const { data: eventos } = await supabase
    .from('eventos')
    .select('id, tipo')
    .eq('cuenta_asistencia', true)

  const totalEventos = eventos?.length || 0
  const totalEntrenos = eventos?.filter(e => e.tipo === 'entreno').length || 0
  const totalPartidos = eventos?.filter(e => e.tipo === 'partido').length || 0

  const ranking = {}
  if (asistencias) {
    asistencias.forEach(a => {
      if (!a.eventos?.cuenta_asistencia) return
      const id = a.socio_id
      if (!ranking[id]) {
        ranking[id] = {
          nombre: a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido',
          posicion: a.socios?.posicion,
          total: 0,
          entrenos: 0,
          partidos: 0,
          penalizaciones: 0,
        }
      }
      const val = a.estado === 'asistio' ? 1 : -1
      ranking[id].total += val
      if (a.estado === 'no_aparecio') ranking[id].penalizaciones++
      if (a.eventos?.tipo === 'entreno' && a.estado === 'asistio') ranking[id].entrenos++
      if (a.eventos?.tipo === 'partido' && a.estado === 'asistio') ranking[id].partidos++
    })
  }

  const lista = Object.values(ranking).sort((a, b) => b.total - a.total)
  const maxTotal = lista[0]?.total || 1

  // Ranking goleadores
  const goleadores = {}
  if (asistencias) {
    asistencias.forEach(a => {
      const nombre = a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido'
      if (!goleadores[nombre]) goleadores[nombre] = 0
    })
  }

  const { data: golesData } = await supabase
    .from('goles')
    .select('cantidad, socios(nombre_completo, apodo)')

  const rankingGoles = {}
  golesData?.forEach(g => {
    const nombre = g.socios?.apodo || g.socios?.nombre_completo || 'Desconocido'
    rankingGoles[nombre] = (rankingGoles[nombre] || 0) + (g.cantidad || 1)
  })

  const listaGoles = Object.entries(rankingGoles)
    .sort((a, b) => b[1] - a[1])
  const maxGoles = listaGoles[0]?.[1] || 1

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

      <h1 style={{ color: 'var(--azul-marino)', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
        Estadísticas — Temporada 2025-26
      </h1>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {[
          { label: 'Total eventos', valor: totalEventos },
          { label: 'Entrenos', valor: totalEntrenos },
          { label: 'Partidos/Torneos', valor: totalPartidos },
          { label: 'Socios', valor: lista.length },
        ].map(s => (
          <div key={s.label} style={{
            backgroundColor: 'var(--azul-palido)',
            border: '1px solid var(--azul-claro)',
            borderRadius: '8px',
            padding: '10px 20px',
            textAlign: 'center',
            minWidth: '80px',
          }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--azul-marino)' }}>{s.valor}</div>
            <div style={{ fontSize: '11px', color: 'var(--azul-medio)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Contenedor con scroll horizontal en móvil */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid var(--azul-claro)', paddingRight: '16px' }}>
        <div style={{ minWidth: '0px' }}>

          {/* Cabecera tabla */}
          <div style={{
            backgroundColor: 'var(--azul-marino)',
            padding: '12px 20px',
            display: 'grid',
            gridTemplateColumns: '40px minmax(120px, 1fr) 70px 70px 70px 70px 65px',
            gap: '8px',
            color: 'var(--blanco)',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            <span>#</span>
            <span>Socio</span>
            <span style={{ textAlign: 'center' }}>Total</span>
            <span style={{ textAlign: 'center' }}>Entrenos</span>
            <span style={{ textAlign: 'center' }}>Partidos</span>
            <span style={{ textAlign: 'center' }}>Penalty</span>
            <span style={{ textAlign: 'center' }}>%</span>
          </div>

          {/* Filas */}
          {lista.map((socio, i) => (
            <div key={i} style={{
              padding: '10px 20px',
              display: 'grid',
              gridTemplateColumns: '40px minmax(120px, 1fr) 70px 70px 70px 70px 65px',
              gap: '8px',
              alignItems: 'center',
              borderBottom: '1px solid var(--azul-palido)',
              backgroundColor: i % 2 === 0 ? 'var(--blanco)' : 'var(--azul-palido)',
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '600',
                color: i === 0 ? '#B07800' : i === 1 ? '#888' : i === 2 ? '#993C1D' : 'var(--azul-medio)',
              }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>

              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '3px' }}>
                  {posicionIcon(socio.posicion)} {socio.nombre}
                </div>
                <div style={{
                  height: '4px',
                  backgroundColor: 'var(--azul-claro)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  maxWidth: '200px',
                }}>
                  <div style={{
                    width: `${Math.max(0, (socio.total / maxTotal) * 100)}%`,
                    height: '100%',
                    backgroundColor: i < 3 ? 'var(--naranja)' : 'var(--azul-medio)',
                    borderRadius: '2px',
                  }} />
                </div>
              </div>

              <span style={{ textAlign: 'center', fontSize: '14px', fontWeight: '700', color: 'var(--azul-marino)' }}>
                {socio.total}
              </span>

              <span style={{ textAlign: 'center', fontSize: '13px', color: 'var(--azul-medio)' }}>
                {socio.entrenos}
              </span>

              <span style={{ textAlign: 'center', fontSize: '13px', color: 'var(--azul-medio)' }}>
                {socio.partidos}
              </span>

              <span style={{
                textAlign: 'center',
                fontSize: '13px',
                color: socio.penalizaciones > 0 ? 'var(--naranja)' : 'var(--azul-claro)',
                fontWeight: socio.penalizaciones > 0 ? '600' : '400',
              }}>
                {socio.penalizaciones > 0 ? `-${socio.penalizaciones}` : '—'}
              </span>

              <span style={{
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '500',
                color: socio.total / totalEventos > 0.7 ? 'var(--azul-medio)' :
                       socio.total / totalEventos > 0.4 ? 'var(--azul-cielo)' : '#999',
              }}>
                {Math.round((socio.total / totalEventos) * 100)}%
              </span>
            </div>
          ))}

        </div>
      </div>
{/* Ranking goleadores */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          ⚽ Ranking de goleadores
        </h2>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid var(--azul-claro)', paddingRight: '16px' }}>
          <div style={{ minWidth: '400px' }}>
            <div style={{
              backgroundColor: 'var(--azul-marino)', padding: '12px 20px',
              display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px',
              gap: '8px', color: 'var(--blanco)', fontSize: '12px', fontWeight: '600',
            }}>
              <span>#</span>
              <span>Socio</span>
              <span style={{ textAlign: 'center' }}>Goles</span>
              <span style={{ textAlign: 'center' }}>Gráfico</span>
            </div>
            {listaGoles.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--azul-medio)', fontSize: '13px' }}>
                No hay goles registrados todavía
              </div>
            ) : listaGoles.map(([nombre, goles], i) => (
              <div key={nombre} style={{
                padding: '10px 20px',
                display: 'grid',
                gridTemplateColumns: '40px 1fr 80px 80px',
                gap: '8px',
                alignItems: 'center',
                borderBottom: '1px solid var(--azul-palido)',
                backgroundColor: i % 2 === 0 ? 'var(--blanco)' : 'var(--azul-palido)',
              }}>
                <span style={{
                  fontSize: '13px', fontWeight: '600',
                  color: i === 0 ? '#B07800' : i === 1 ? '#888' : i === 2 ? '#993C1D' : 'var(--azul-medio)',
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--azul-marino)' }}>{nombre}</span>
                <span style={{ textAlign: 'center', fontSize: '14px', fontWeight: '700', color: 'var(--naranja)' }}>
                  ⚽ {goles}
                </span>
                <div style={{ height: '6px', backgroundColor: 'var(--azul-claro)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(goles / maxGoles) * 100}%`,
                    height: '100%',
                    backgroundColor: 'var(--naranja)',
                    borderRadius: '3px',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}