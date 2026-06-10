import { supabase } from '@/lib/supabase'

export default async function Home() {
  // Obtener próximos eventos
  const { data: eventos } = await supabase
    .from('eventos')
    .select('*')
    .gte('fecha', new Date().toISOString().split('T')[0])
    .order('fecha', { ascending: true })
    .limit(3)

  // Obtener top 10 asistencias
  const { data: asistencias } = await supabase
    .from('asistencias')
    .select('socio_id, socios(nombre_completo, apodo)')
    .eq('estado', 'asistio')

  // Calcular ranking
  const ranking = {}
  if (asistencias) {
    asistencias.forEach(a => {
      const nombre = a.socios?.apodo || a.socios?.nombre_completo || 'Desconocido'
      ranking[nombre] = (ranking[nombre] || 0) + 1
    })
  }
  const top10 = Object.entries(ranking)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const maxAsist = top10[0]?.[1] || 1

  return (
    <div>
      {/* BANNER */}
      <div style={{
        backgroundColor: 'var(--azul-marino)',
        padding: '40px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '100%',
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ color: 'var(--azul-claro)', fontSize: '13px', marginBottom: '8px' }}>
            Temporada 2025-26
          </div>
          <h1 style={{ color: 'var(--blanco)', fontSize: '32px', fontWeight: '600', lineHeight: '1.2', marginBottom: '12px' }}>
            Asociación de Fútbol<br />Veteranos de Nerja
          </h1>
          <p style={{ color: 'var(--azul-claro)', fontSize: '15px' }}>
            Pasión, compromiso y comunidad · Axarquía - Costa del Sol
          </p>
        </div>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '16px 24px',
          textAlign: 'center',
          minWidth: '120px',
        }}>
          <div style={{ color: 'var(--blanco)', fontSize: '28px', fontWeight: '700' }}>2025</div>
          <div style={{ color: 'var(--azul-claro)', fontSize: '12px' }}>— 26</div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '24px',
      }}>

        {/* TOP 10 */}
        <div style={{
          backgroundColor: 'var(--blanco)',
          border: '1px solid var(--azul-claro)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ color: 'var(--azul-marino)', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
            🏆 Top 10 — Temporada
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
              { label: 'Socios', valor: '59' },
              { label: 'Eventos', valor: '40' },
              { label: 'Asistencias', valor: '672' },
              { label: 'Partidos', valor: '4' },
            ].map(stat => (
              <div key={stat.label} style={{
                backgroundColor: 'var(--azul-palido)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--azul-marino)' }}>{stat.valor}</div>
                <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}