import { supabase } from '@/lib/supabase'

export const revalidate = 0

export default async function Home() {
  const { data: eventos } = await supabase
    .from('eventos')
    .select('*')
    .gte('fecha', new Date().toISOString().split('T')[0])
    .order('fecha', { ascending: true })
    .limit(3)

  const { data: temporadaActiva } = await supabase
    .from('temporadas')
    .select('id')
    .eq('activa', true)
    .single()

  const tempId = temporadaActiva?.id

  const [
    { count: sociosActivos },
    { data: eventosTemporada },
    { data: asistenciasTemporada },
    { data: eventosBenefico },
  ] = await Promise.all([
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('eventos').select('id, tipo, estado, fecha').eq('temporada_id', tempId),
    supabase.from('asistencias').select('id, evento_id, estado').eq('estado', 'asistio'),
    supabase.from('eventos').select('recaudacion_benefica').eq('temporada_id', tempId).eq('es_benefico', true),
  ])

  const entronosFinalizados = eventosTemporada?.filter(e => e.tipo === 'entreno' && e.estado !== 'cancelado').length || 0
  const entrenosAnulados = eventosTemporada?.filter(e => e.tipo === 'entreno' && e.estado === 'cancelado').length || 0
  const hoy = new Date().toISOString().split('T')[0]
  const partidosTemp = eventosTemporada?.filter(e => e.tipo === 'partido' && e.estado !== 'cancelado' && (e.estado === 'jugado' || e.fecha < hoy)).length || 0
  const torneosTemp = eventosTemporada?.filter(e => e.tipo === 'torneo' && e.estado !== 'cancelado' && (e.estado === 'jugado' || e.fecha < hoy)).length || 0
  const eventoIdsTemp = eventosTemporada?.map(e => e.id) || []
  const asistenciasTemp = asistenciasTemporada?.filter(a => eventoIdsTemp.includes(a.evento_id)).length || 0
  const entrenoIds = eventosTemporada?.filter(e => e.tipo === 'entreno').map(e => e.id) || []
  const asistenciasEntrenos = asistenciasTemporada?.filter(a => entrenoIds.includes(a.evento_id)).length || 0
  const mediaAsistencia = entronosFinalizados > 0 ? (asistenciasEntrenos / entronosFinalizados).toFixed(1) : 0
  const totalBenefico = eventosBenefico?.reduce((sum, e) => sum + (e.recaudacion_benefica || 0), 0) || 0

  const statsTemporada = {
    socios: sociosActivos || 0,
    entrenos: entronosFinalizados,
    entrenosAnulados,
    asistencias: asistenciasTemp,
    partidos: partidosTemp,
    torneos: torneosTemp,
    mediaAsistencia,
    benefico: totalBenefico,
  }

  const { data: golesData } = await supabase
    .from('goles')
    .select('cantidad, socios(apodo, nombre_completo)')

  const rankingGoles = {}
  golesData?.forEach(g => {
    const nombre = g.socios?.apodo || g.socios?.nombre_completo || 'Desconocido'
    rankingGoles[nombre] = (rankingGoles[nombre] || 0) + (g.cantidad || 1)
  })
  const topGoleadores = Object.entries(rankingGoles)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const { data: asistencias } = await supabase
    .from('asistencias')
    .select('socio_id, estado, socios(nombre_completo, apodo)')
    .in('estado', ['asistio', 'no_aparecio'])

  const ranking = {}
  if (asistencias) {
    asistencias.forEach(a => {
      const nombre = a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido'
      if (a.estado === 'asistio') ranking[nombre] = (ranking[nombre] || 0) + 1
      else if (a.estado === 'no_aparecio') ranking[nombre] = (ranking[nombre] || 0) - 1
    })
  }
  const top10 = Object.entries(ranking)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const maxAsist = top10[0]?.[1] || 1

  const { data: sociosListaCompleta } = await supabase
    .from('socios')
    .select('id, apodo, nombre_completo')
    .eq('activo', true)

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

  const topRachas = (sociosListaCompleta || [])
    .map(socio => {
      let racha = 0
      for (const evento of entrenosTemporadaRacha || []) {
        if (asistioSetRacha.has(`${evento.id}_${socio.id}`)) racha++
        else break
      }
      return { nombre: socio.apodo || socio.nombre_completo, racha }
    })
    .filter(s => s.racha > 0)
    .sort((a, b) => b.racha - a.racha)
    .slice(0, 5)

  const { data: entrenosTemporadaGrafico } = await supabase
    .from('eventos')
    .select('id, fecha')
    .eq('temporada_id', tempId)
    .eq('tipo', 'entreno')
    .eq('estado', 'jugado')
    .order('fecha', { ascending: true })

  const idsEntrenosGrafico = entrenosTemporadaGrafico?.map(e => e.id) || []

  const { data: asistenciasGrafico } = idsEntrenosGrafico.length > 0
    ? await supabase.from('asistencias').select('evento_id').eq('estado', 'asistio').in('evento_id', idsEntrenosGrafico)
    : { data: [] }

  const asistenciasPorEvento = {}
  asistenciasGrafico?.forEach(a => {
    asistenciasPorEvento[a.evento_id] = (asistenciasPorEvento[a.evento_id] || 0) + 1
  })

  const entrenosPorMes = {}
  const asistenciasPorMes = {}
  entrenosTemporadaGrafico?.forEach(ev => {
    const mesKey = ev.fecha.slice(0, 7)
    entrenosPorMes[mesKey] = (entrenosPorMes[mesKey] || 0) + 1
    asistenciasPorMes[mesKey] = (asistenciasPorMes[mesKey] || 0) + (asistenciasPorEvento[ev.id] || 0)
  })

  const nombresMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  const evolucionMensual = Object.keys(entrenosPorMes).sort().map(mesKey => {
    const mesNum = parseInt(mesKey.split('-')[1])
    const media = entrenosPorMes[mesKey] > 0 ? asistenciasPorMes[mesKey] / entrenosPorMes[mesKey] : 0
    return { mesKey, label: nombresMes[mesNum - 1], media: Math.round(media * 10) / 10 }
  })

  const OBJETIVO_ASISTENCIA = 18
  const padLeft = 10
  const padTop = 30
  const padBottom = 30
  const barWidth = 40
  const gap = 24
  const chartHeight = 220
  const maxValor = Math.ceil((Math.max(OBJETIVO_ASISTENCIA, ...evolucionMensual.map(m => m.media), 1) * 1.15) / 2) * 2
  const chartWidth = padLeft + evolucionMensual.length * (barWidth + gap) + 10
  const yObjetivo = chartHeight - padBottom - (OBJETIVO_ASISTENCIA / maxValor) * (chartHeight - padBottom - padTop)

  const hoyDate = new Date()
  const mesCumple = String(hoyDate.getMonth() + 1).padStart(2, '0')
  const diaCumple = String(hoyDate.getDate()).padStart(2, '0')

  const { data: todosSociosCumple } = await supabase
    .from('socios')
    .select('nombre_completo, apodo, fecha_nacimiento, foto_url')
    .eq('activo', true)
    .not('fecha_nacimiento', 'is', null)

  const cumpleaneros = (todosSociosCumple || []).filter(s => {
    const fn = s.fecha_nacimiento
    return fn && fn.slice(5, 7) === mesCumple && fn.slice(8, 10) === diaCumple
  }).map(s => ({
    nombre: s.apodo || s.nombre_completo,
    años: hoyDate.getFullYear() - new Date(s.fecha_nacimiento).getFullYear(),
    foto: s.foto_url,
  }))

  const { data: premiosHome } = await supabase
    .from('premios_temporada')
    .select('*')
    .eq('temporada_id', tempId)
    .eq('visible_home', true)
    .single()

  return (
    <div>
      {/* BANNER */}
      <style>{`
        .banner-home {
          background-color: var(--azul-marino);
          background-image: url('https://oewqclyiykoplygumshh.supabase.co/storage/v1/object/public/fotos/banner-home.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          aspect-ratio: 3.6 / 1;
          min-height: 180px;
        }
        @media (max-width: 600px) {
          .banner-home {
            background-position: 78% center;
            aspect-ratio: 2.2 / 1;
          }
        }
      `}</style>
      <div className="banner-home" style={{
        padding: '40px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        maxWidth: '100%',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ color: 'white', fontSize: '13px', marginBottom: '8px', fontWeight: '600', textShadow: '0 1px 4px rgba(0,0,0,0.6)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Temporada 2025-26
          </div>
          <h1 style={{ color: 'var(--blanco)', fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: '700', lineHeight: '1.2', marginBottom: '12px', textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
            Asociación de Fútbol<br />Veteranos de Nerja
          </h1>
          <p style={{ color: 'white', fontSize: 'clamp(12px, 3vw, 15px)', textShadow: '0 1px 6px rgba(0,0,0,0.7)', opacity: 0.9, fontStyle: 'italic' }}>
            Pasión, compromiso y comunidad
          </p>
        </div>
         
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
      }}>

        {/* STATS RÁPIDAS */}
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            📊 La temporada en números
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Socios activos', valor: statsTemporada.socios },
              { label: 'Entrenos finalizados', valor: statsTemporada.entrenos },
              { label: 'Entrenos anulados', valor: statsTemporada.entrenosAnulados },
              { label: 'Asistencias totales', valor: statsTemporada.asistencias },
              { label: 'Media asistencia', valor: statsTemporada.mediaAsistencia },
              { label: 'Partidos', valor: statsTemporada.partidos },
              { label: 'Torneos', valor: statsTemporada.torneos },
              { label: 'Recaudado benéfico', valor: `${statsTemporada.benefico}€` },
            ].map(stat => (
              <div key={stat.label} style={{
                backgroundColor: 'var(--azul-palido)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--azul-marino)' }}>{stat.valor}</div>
                <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CUMPLEAÑOS */}
        {cumpleaneros.length > 0 && (
          <div style={{
            backgroundColor: 'var(--blanco)',
            border: '2px solid var(--naranja)',
            borderRadius: '12px',
            padding: '20px',
            gridColumn: '1 / -1',
            background: 'linear-gradient(135deg, #fff8f0, #fff3e6)',
          }}>
            <h2 style={{ color: 'var(--naranja)', fontSize: '16px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
              🎂 ¡Hoy es el cumpleaños de...!
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
              {cumpleaneros.map((s, i) => (
                <div key={i} style={{ textAlign: 'center', minWidth: '100px' }}>
                  {s.foto ? (
                    <img src={s.foto.split('?')[0]} alt={s.nombre}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--naranja)', marginBottom: '8px' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--azul-palido)', border: '3px solid var(--naranja)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 8px' }}>
                      👤
                    </div>
                  )}
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--azul-marino)' }}>{s.nombre}</div>
                  <div style={{ fontSize: '13px', color: 'var(--naranja)', fontWeight: '600' }}>🎉 {s.años} años</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--naranja)', fontWeight: '600', marginTop: '16px' }}>
              ¡Muchas felicidades! 💙
            </p>
          </div>
        )}

        {/* GRÁFICO EVOLUCIÓN MEDIA ASISTENCIA */}
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
          gridColumn: '1 / -1',
        }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            📈 Evolución de la Media de Asistencia
          </h2>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>
            Objetivo de temporada: <strong style={{ color: 'var(--naranja)' }}>{OBJETIVO_ASISTENCIA}.0</strong> asistentes de media por entreno
          </p>
          {evolucionMensual.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>Aún no hay datos suficientes esta temporada</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ minWidth: `${chartWidth}px`, height: '240px', display: 'block' }}>
                <defs>
                  <linearGradient id="barNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A6BB5" />
                    <stop offset="100%" stopColor="#5BB8E8" />
                  </linearGradient>
                  <linearGradient id="barObjetivo" x1="0" y1="0" x2="0" y2="1">
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
                      <rect x={x} y={y} width={barWidth} height={barH} rx="6" fill={alcanzado ? 'url(#barObjetivo)' : 'url(#barNormal)'} />
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

        {/* PREMIOS FIN DE TEMPORADA */}
        {premiosHome && premiosHome.premios?.length > 0 && (
          <div style={{
            backgroundColor: 'var(--blanco)',
            border: '1px solid var(--azul-claro)',
            borderRadius: '12px',
            padding: '20px',
            gridColumn: '1 / -1',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '22px' }}>🏆</span>
              <div>
                <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '700', margin: 0 }}>
                  Premios Final de Temporada
                </h2>
                <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Mayor implicación y asistencia</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {premiosHome.premios.map((p, i) => (
                <div key={i} style={{ padding: '12px', backgroundColor: 'var(--azul-palido)', borderRadius: '8px', border: '1px solid var(--azul-claro)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--azul-medio)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>{p.categoria}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--azul-marino)', marginBottom: '4px' }}>{p.ganador}</div>
                  {p.descripcion && <div style={{ fontSize: '12px', color: '#666' }}>🎁 {p.descripcion}</div>}
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--azul-medio)', fontWeight: '600' }}>
              👏 ¡Enhorabuena a los premiados! 💙
            </p>
          </div>
        )}

        {/* PRÓXIMOS EVENTOS */}
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            📅 Próximos eventos
          </h2>
          {!eventos || eventos.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>No hay eventos próximos</p>
          ) : (
            eventos.map(evento => (
              <a key={evento.id} href={`/eventos/${evento.id}`} style={{
                display: 'block',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '8px',
                backgroundColor: 'var(--azul-palido)',
                borderLeft: `3px solid ${evento.tipo === 'partido' ? 'var(--naranja)' : evento.tipo === 'social' ? '#639922' : 'var(--azul-medio)'}`,
                textDecoration: 'none',
              }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-marino)' }}>
                  {evento.titulo || evento.tipo}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>
                  {new Date(evento.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {evento.hora ? ` · ${evento.hora.slice(0,5)}` : ''}
                  {evento.lugar ? ` · ${evento.lugar}` : ''}
                </div>
              </a>
            ))
          )}
          <a href="/calendario" style={{
            display: 'block',
            marginTop: '12px',
            fontSize: '12px',
            color: 'var(--azul-medio)',
            textDecoration: 'none',
          }}>Ver calendario completo →</a>
        </div>

        {/* TOP 10 */}
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            🏆 Top 10 Asistencias — Temporada
          </h2>
          {top10.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>Sin datos aún</p>
          ) : (
            top10.map(([nombre, total], i) => (
              <div key={nombre} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 0',
                borderBottom: i < top10.length - 1 ? '1px solid var(--azul-palido)' : 'none',
              }}>
                <span style={{
                  minWidth: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: i === 0 ? '#B07800' : i === 1 ? '#888' : i === 2 ? '#993C1D' : 'var(--azul-medio)',
                }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--negro)' }}>{nombre}</span>
                <div style={{
                  width: '60px',
                  height: '5px',
                  backgroundColor: 'var(--azul-palido)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(total / maxAsist) * 100}%`,
                    height: '100%',
                    backgroundColor: 'var(--azul-medio)',
                    borderRadius: '2px',
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--azul-marino)', minWidth: '24px', textAlign: 'right' }}>{total}</span>
              </div>
            ))
          )}
          <a href="/estadisticas" style={{
            display: 'block',
            marginTop: '12px',
            fontSize: '12px',
            color: 'var(--azul-medio)',
            textDecoration: 'none',
          }}>Ver ranking completo →</a>
        </div>

        {/* TOP RACHA */}
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            🔥 Top 5 Racha Entrenos Consecutivos
          </h2>
          {topRachas.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>Sin rachas activas aún</p>
          ) : (
            topRachas.map((s, i) => (
              <div key={s.nombre} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 0',
                borderBottom: i < topRachas.length - 1 ? '1px solid var(--azul-palido)' : 'none',
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
          <a href="/estadisticas" style={{ display: 'block', marginTop: '12px', fontSize: '12px', color: 'var(--azul-medio)', textDecoration: 'none' }}>
            Ver ranking completo →
          </a>
        </div>

        {/* TOP GOLEADORES */}
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            ⚽ Top Goleadores — Temporada
          </h2>
          {topGoleadores.length === 0 ? (
            <p style={{ color: '#999', fontSize: '13px' }}>Sin goles registrados aún</p>
          ) : (
            topGoleadores.map(([nombre, goles], i) => (
              <div key={nombre} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 0',
                borderBottom: i < topGoleadores.length - 1 ? '1px solid var(--azul-palido)' : 'none',
              }}>
                <span style={{
                  minWidth: '20px', fontSize: '12px', fontWeight: '600',
                  color: i === 0 ? '#B07800' : i === 1 ? '#888' : i === 2 ? '#993C1D' : 'var(--azul-medio)',
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--negro)' }}>{nombre}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--naranja)' }}>⚽ {goles}</span>
              </div>
            ))
          )}
          <a href="/estadisticas" style={{ display: 'block', marginTop: '12px', fontSize: '12px', color: 'var(--azul-medio)', textDecoration: 'none' }}>
            Ver ranking completo →
          </a>
        </div>

        </div>
    </div>
  )
}