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
  const { data: temporadaActiva } = await supabase
    .from('temporadas')
    .select('id, nombre')
    .eq('activa', true)
    .single()

  const tempId = temporadaActiva?.id

  const { data: eventosTemporada } = await supabase
    .from('eventos')
    .select('id, tipo, cuenta_asistencia')
    .eq('temporada_id', tempId)

  const eventoIdsConCuenta = eventosTemporada?.filter(e => e.cuenta_asistencia).map(e => e.id) || []
  const totalEventos = eventoIdsConCuenta.length
  const totalEntrenos = eventosTemporada?.filter(e => e.tipo === 'entreno' && e.cuenta_asistencia).length || 0
  const totalPartidosOTorneos = eventosTemporada?.filter(e => (e.tipo === 'partido' || e.tipo === 'torneo') && e.cuenta_asistencia).length || 0

  const { data: asistencias } = eventoIdsConCuenta.length > 0
    ? await supabase
        .from('asistencias')
        .select('socio_id, estado, evento_id, socios(nombre_completo, apodo, posicion), eventos(tipo, cuenta_asistencia)')
        .in('estado', ['asistio', 'no_aparecio'])
        .in('evento_id', eventoIdsConCuenta)
    : { data: [] }

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
      if ((a.eventos?.tipo === 'partido' || a.eventos?.tipo === 'torneo') && a.estado === 'asistio') ranking[id].partidos++
    })
  }

  // Añadir socios con 0 asistencias
  const { data: todosSocios } = await supabase
    .from('socios')
    .select('id, nombre_completo, apodo, posicion, posiciones')
    .eq('activo', true)

  todosSocios?.forEach(s => {
    if (!ranking[s.id]) {
      ranking[s.id] = {
        nombre: s.apodo || s.nombre_completo || 'Desconocido',
        posicion: s.posiciones?.[0] || s.posicion,
        total: 0,
        entrenos: 0,
        partidos: 0,
        penalizaciones: 0,
      }
    }
  })

  const lista = Object.values(ranking).sort((a, b) => b.total - a.total)
  const maxTotal = lista[0]?.total || 1

  // Ranking goleadores — TEMPORADA ACTUAL
  const eventoIdsTemporada = eventosTemporada?.map(e => e.id) || []
  const { data: golesTemporadaData } = eventoIdsTemporada.length > 0
    ? await supabase
        .from('goles')
        .select('cantidad, socios(nombre_completo, apodo), evento_id')
        .in('evento_id', eventoIdsTemporada)
    : { data: [] }

  const rankingGoles = {}
  golesTemporadaData?.forEach(g => {
    const nombre = g.socios?.apodo || g.socios?.nombre_completo || 'Desconocido'
    rankingGoles[nombre] = (rankingGoles[nombre] || 0) + (g.cantidad || 1)
  })

  const listaGoles = Object.entries(rankingGoles)
    .sort((a, b) => b[1] - a[1])
  const maxGoles = listaGoles[0]?.[1] || 1

  // Ranking histórico de goleadores — TODAS LAS TEMPORADAS (sin filtrar, a propósito)
  const { data: golesData } = await supabase
    .from('goles')
    .select('cantidad, socios(nombre_completo, apodo)')

  const rankingGolesHistorico = {}
  golesData?.forEach(g => {
    const nombre = g.socios?.apodo || g.socios?.nombre_completo || 'Desconocido'
    rankingGolesHistorico[nombre] = (rankingGolesHistorico[nombre] || 0) + (g.cantidad || 1)
  })
  const listaGolesHistorico = Object.entries(rankingGolesHistorico)
    .sort((a, b) => b[1] - a[1])
  const maxGolesHistorico = listaGolesHistorico[0]?.[1] || 1

  const { data: entrenosTemporadaRacha } = await supabase
    .from('eventos')
    .select('id, fecha')
    .eq('temporada_id', tempId)
    .eq('tipo', 'entreno')
    .eq('estado', 'jugado')
    .order('fecha', { ascending: false })

  const idsEntrenosRacha = entrenosTemporadaRacha?.map(e => e.id) || []

  const { data: asistenciasRacha } = idsEntrenosRacha.length > 0
    ? await supabase.from('asistencias').select('socio_id, evento_id').eq('estado', 'asistio').in('evento_id', idsEntrenosRacha)
    : { data: [] }

  const asistioSetRacha = new Set(asistenciasRacha?.map(a => `${a.evento_id}_${a.socio_id}`))

  const topRachas10 = (todosSocios || [])
    .map(s => {
      let racha = 0
      for (const evento of entrenosTemporadaRacha || []) {
        if (asistioSetRacha.has(`${evento.id}_${s.id}`)) racha++
        else break
      }
      return { nombre: s.apodo || s.nombre_completo || 'Desconocido', racha }
    })
    .filter(s => s.racha > 0)
    .sort((a, b) => b.racha - a.racha)
    .slice(0, 10)

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

      <h1 style={{ color: 'var(--azul-marino)', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
        Estadísticas — Temporada {temporadaActiva?.nombre || ''}
      </h1>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {[
          { label: 'Total eventos', valor: totalEventos },
          { label: 'Entrenos', valor: totalEntrenos },
          { label: 'Partidos', valor: eventosTemporada?.filter(e => e.tipo === 'partido' && e.cuenta_asistencia).length || 0 },
          { label: 'Torneos', valor: eventosTemporada?.filter(e => e.tipo === 'torneo' && e.cuenta_asistencia).length || 0 },
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

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', padding: '10px 14px', backgroundColor: 'var(--azul-palido)', borderRadius: '8px', fontSize: '12px', color: 'var(--azul-medio)' }}>
        <span><strong>Entreno:</strong> 1 (asistió) · 0 (avisó y no fue) · -1 (no avisó, penalización)</span>
        <span><strong>Partido:</strong> 1 asistencia</span>
        <span><strong>Torneo:</strong> 1 asistencia (independiente del nº de partidos que tenga)</span>
      </div>

      <div style={{
        backgroundColor: 'var(--blanco)',
        border: '1px solid var(--azul-claro)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '32px',
      }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
          🔥 Top 10 Racha Asistencias Consecutivas — Temporada
        </h2>
        {topRachas10.length === 0 ? (
          <p style={{ color: '#999', fontSize: '13px' }}>Sin rachas activas aún</p>
        ) : (
          topRachas10.map((s, i) => (
            <div key={s.nombre} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 0',
              borderBottom: i < topRachas10.length - 1 ? '1px solid var(--azul-palido)' : 'none',
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

      <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
        🏆 Ranking de asistencias
      </h2>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid var(--azul-claro)', paddingRight: '16px', marginBottom: '40px' }}>
        <div style={{ minWidth: '600px' }}>
          {/* Cabecera */}
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
            <span style={{ textAlign: 'center' }}>Part/Torn</span>
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
                color: totalEventos > 0 && socio.total / totalEventos > 0.7 ? 'var(--azul-medio)' :
                       totalEventos > 0 && socio.total / totalEventos > 0.4 ? 'var(--azul-cielo)' : '#999',
              }}>
                {totalEventos > 0 ? Math.round((socio.total / totalEventos) * 100) : 0}%
              </span>
            </div>
          ))}

        </div>
      </div>
{/* Ranking goleadores */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          ⚽ Ranking de goleadores — Temporada
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
    {/* Ranking histórico goleadores */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          🏅 Ranking histórico de goleadores
        </h2>
        <p style={{ color: 'var(--azul-medio)', fontSize: '13px', marginBottom: '16px' }}>
          Acumulado desde 2025
        </p>
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
            {listaGolesHistorico.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--azul-medio)', fontSize: '13px' }}>
                No hay goles registrados todavía
              </div>
            ) : listaGolesHistorico.map(([nombre, goles], i) => (
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
                    width: `${(goles / maxGolesHistorico) * 100}%`,
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