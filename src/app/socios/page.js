'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const posicionLabel = {
  portero: 'POR', defensa: 'DEF',
  centrocampista: 'MED', delantero: 'DEL'
}

const posicionFiltros = [
  { key: 'todos', label: '⚽ Todos' },
  { key: 'portero', label: '🧤 Porteros' },
  { key: 'defensa', label: '🛡️ Defensas' },
  { key: 'centrocampista', label: '⚙️ Centrocampistas' },
  { key: 'delantero', label: '⚡ Delanteros' },
  { key: 'sin_posicion', label: '❓ Sin posición' },
]

export default function Socios() {
  const [socios, setSocios] = useState([])
  const [statsMap, setStatsMap] = useState({})
  const [rankMap, setRankMap] = useState({})
  const [maxAsist, setMaxAsist] = useState(1)
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [totalEventos, setTotalEventos] = useState(42)

  useEffect(() => {
    async function cargar() {
      const [{ data: soc }, { data: asist }, { data: gol }] = await Promise.all([
        supabase.from('socios').select('*').eq('activo', true).order('apodo'),
        supabase.from('asistencias').select('socio_id, estado').in('estado', ['asistio', 'no_aparecio']),
        supabase.from('goles').select('socio_id, cantidad'),
      ])

      const sm = {}
      asist?.forEach(a => {
        if (!sm[a.socio_id]) sm[a.socio_id] = { total: 0, goles: 0 }
        sm[a.socio_id].total += a.estado === 'asistio' ? 1 : -1
      })
      gol?.forEach(g => {
        if (!sm[g.socio_id]) sm[g.socio_id] = { total: 0, goles: 0 }
        sm[g.socio_id].goles += g.cantidad || 1
      })

      const ranking = soc?.map(s => ({ id: s.id, total: sm[s.id]?.total || 0 }))
        .sort((a, b) => b.total - a.total)
      const rm = {}
      ranking?.forEach((s, i) => { rm[s.id] = i + 1 })

      const max = Math.max(...(soc?.map(s => sm[s.id]?.total || 0) || [1]))

      const { data: evTotal } = await supabase
        .from('eventos')
        .select('id')
        .eq('cuenta_asistencia', true)
      
      setSocios(soc || [])
      setStatsMap(sm)
      setRankMap(rm)
      setMaxAsist(max)
      setTotalEventos(evTotal?.length || 42)
      setLoading(false)
    }
    cargar()
  }, [])

  const sociosFiltrados = socios.filter(s => {
    const pos = s.posiciones?.[0] || s.posicion || null
    if (filtro === 'todos') return true
    if (filtro === 'sin_posicion') return !pos
    return pos === filtro
  })

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando plantilla...</div>

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
        Plantilla — Temporada 2025-26
      </h1>
      <p style={{ color: 'var(--azul-medio)', fontSize: '14px', marginBottom: '24px' }}>
        {socios.length} socios activos
      </p>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {posicionFiltros.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{
            padding: '7px 14px', fontSize: '13px', borderRadius: '20px', cursor: 'pointer',
            backgroundColor: filtro === f.key ? 'var(--azul-marino)' : 'var(--azul-palido)',
            color: filtro === f.key ? 'white' : 'var(--azul-medio)',
            border: `1px solid ${filtro === f.key ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
            fontWeight: filtro === f.key ? '600' : '400',
          }}>
            {f.label} {filtro === f.key && `(${sociosFiltrados.length})`}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
        gap: '20px',
      }}>
        {sociosFiltrados.map(socio => {
          const stats = statsMap[socio.id] || { total: 0, goles: 0 }
          const rank = rankMap[socio.id] || 0
          const pct = Math.round((stats.total / totalEventos) * 100)
          const posPrincipal = socio.posiciones?.[0] || socio.posicion || null

          const rating = Math.min(99, Math.max(50, Math.round(50 + (stats.total / Math.max(maxAsist, 1)) * 49)))

          const cardBg = posPrincipal === 'portero' ? 'linear-gradient(135deg, #B8860B 0%, #DAA520 40%, #FFD700 60%, #B8860B 100%)' :
                        posPrincipal === 'defensa' ? 'linear-gradient(135deg, #1A3A6B 0%, #1A6BB5 40%, #4A90D9 60%, #1A3A6B 100%)' :
                        posPrincipal === 'centrocampista' ? 'linear-gradient(135deg, #145A32 0%, #1D9E75 40%, #27AE60 60%, #145A32 100%)' :
                        posPrincipal === 'delantero' ? 'linear-gradient(135deg, #7B241C 0%, #C0392B 40%, #E74C3C 60%, #7B241C 100%)' :
                        'linear-gradient(135deg, #0D3F7A 0%, #1A6BB5 40%, #5BB8E8 60%, #0D3F7A 100%)'

          const accentColor = posPrincipal === 'portero' ? '#FFD700' :
                             posPrincipal === 'defensa' ? '#5BB8E8' :
                             posPrincipal === 'centrocampista' ? '#2ECC71' :
                             posPrincipal === 'delantero' ? '#FFD700' : '#5BB8E8'

          return (
            <div key={socio.id} style={{
              background: cardBg,
              borderRadius: '12px',
              padding: '2px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}>
              <div style={{ background: cardBg, borderRadius: '11px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                  pointerEvents: 'none', zIndex: 1,
                }} />

                <div style={{ padding: '10px 10px 0', position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: accentColor, lineHeight: 1, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                        {rating}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em' }}>
                        {posPrincipal ? posicionLabel[posPrincipal] : 'JUG'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>#{rank}</div>
                      <img src="/logo-cfv-transparente.png" alt="CFV" style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 0', position: 'relative', zIndex: 2 }}>
                  {socio.foto_url ? (
                    <img src={socio.foto_url} alt={socio.apodo}
                      style={{ width: '110px', height: '110px', objectFit: 'cover', objectPosition: 'top', borderRadius: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
                  ) : (
                    <div style={{
                      width: '110px', height: '110px', borderRadius: '4px',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '32px', fontWeight: '900', color: 'rgba(255,255,255,0.7)',
                    }}>
                      {(socio.apodo || socio.nombre_completo || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ margin: '6px 10px 0', height: '1px', backgroundColor: `${accentColor}60` }} />

                <div style={{ padding: '4px 8px 2px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                  <div style={{
                    fontSize: '12px', fontWeight: '800', color: 'white',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {socio.apodo || socio.nombre_completo}
                  </div>
                </div>

                <div style={{ padding: '4px 8px 10px', position: 'relative', zIndex: 2 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                    {[
                      { label: 'ASI', valor: stats.total },
                      { label: '%', valor: `${pct}` },
                      { label: 'GOL', valor: stats.goles },
                    ].map(stat => (
                      <div key={stat.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: accentColor, lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                          {stat.valor}
                        </div>
                        <div style={{ fontSize: '8px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}