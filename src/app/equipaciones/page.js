'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Equipaciones() {
  const [patrocinadores, setPatrocinadores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('patrocinadores')
        .select('*')
        .eq('activo', true)
        .order('prenda')
      setPatrocinadores(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  // Agrupar patrocinadores por prenda
  const porPrenda = {}
  patrocinadores.forEach(p => {
    const prenda = p.prenda || 'otros'
    if (!porPrenda[prenda]) porPrenda[prenda] = []
    porPrenda[prenda].push(p)
  })

  const equipaciones = [
    {
      key: 'primera equipacion',
      nombre: '1ª Equipación',
      descripcion: 'Azul y blanca',
      color: 'var(--azul-marino)',
      icono: '👕',
    },
    {
      key: 'segunda equipacion',
      nombre: '2ª Equipación',
      descripcion: 'Verde y blanca',
      color: '#1D9E75',
      icono: '👕',
    },
    {
      key: 'polo',
      nombre: 'Polo',
      descripcion: 'Ropa de club',
      color: '#8B2FC9',
      icono: '👔',
    },
    {
      key: 'ropa calle',
      nombre: 'Ropa de calle',
      descripcion: 'Equipación informal',
      color: '#D4721A',
      icono: '🧥',
    },
  ]

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
        Equipaciones
      </h1>
      <p style={{ color: 'var(--azul-medio)', fontSize: '14px', marginBottom: '32px' }}>
        Equipaciones y patrocinadores de la A.F.V. Nerja
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {equipaciones.map(eq => {
          const pats = porPrenda[eq.key] || []

          return (
            <div key={eq.key} style={{
              backgroundColor: 'var(--blanco)',
              border: '1px solid var(--azul-claro)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}>
              {/* Cabecera equipación */}
              <div style={{
                backgroundColor: eq.color,
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '28px' }}>{eq.icono}</span>
                <div>
                  <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>{eq.nombre}</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{eq.descripcion}</div>
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                {pats.length === 0 ? (
                  <p style={{ color: '#999', fontSize: '13px', fontStyle: 'italic' }}>
                    Sin patrocinadores registrados
                  </p>
                ) : (
                  <div>
                    <h3 style={{ color: 'var(--azul-marino)', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                      Patrocinadores
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                      {pats.map(p => (
                        <div key={p.id} style={{
                          backgroundColor: 'var(--azul-palido)',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px',
                          border: '1px solid var(--azul-claro)',
                        }}>
                          {/* Logo */}
                          <div style={{
                            width: '80px', height: '80px',
                            backgroundColor: 'white',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          }}>
                            {p.logo_url ? (
                              <img src={p.logo_url} alt={p.nombre}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                            ) : (
                              <span style={{ fontSize: '32px' }}>🏢</span>
                            )}
                          </div>

                          {/* Info */}
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)' }}>
                              {p.nombre}
                            </div>
                            {p.posiciones?.length > 0 && (
                              <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>
                                📍 {p.posiciones.join(', ')}
                              </div>
                            )}
                            {p.temporada_inicio && (
                              <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>
                                Desde {p.temporada_inicio}
                              </div>
                            )}
                          </div>

                          {/* Link web */}
                          {p.web_url && (
                            <a href={p.web_url.includes('@') ? `mailto:${p.web_url}` : (p.web_url.startsWith('http') ? p.web_url : `https://${p.web_url}`)} target="_blank" rel="noopener noreferrer" style={{
                              fontSize: '11px', color: 'var(--azul-medio)',
                              textDecoration: 'none', padding: '4px 10px',
                              backgroundColor: 'white', borderRadius: '20px',
                              border: '1px solid var(--azul-claro)',
                            }}>
                              🔗 Visitar web
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
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