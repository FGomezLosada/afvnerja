'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Equipaciones() {
  const [patrocinadores, setPatrocinadores] = useState([])
  const [listado, setListado] = useState([])
  const [tabEquipacion, setTabEquipacion] = useState('primera')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [{ data }, { data: dorsales }, { data: socios }] = await Promise.all([
        supabase.from('patrocinadores').select('*').eq('activo', true).order('prenda'),
        supabase.from('dorsales').select('socio_id, numero, equipacion'),
        supabase.from('socios').select('id, apodo, nombre_completo, talla_general, talla_superior, talla_inferior').eq('activo', true).order('apodo'),
      ])
      setPatrocinadores(data || [])

      const dorsalMap = {}
      dorsales?.forEach(d => {
        if (!dorsalMap[d.socio_id]) dorsalMap[d.socio_id] = {}
        dorsalMap[d.socio_id][d.equipacion] = d.numero
      })

      const lista = (socios || []).map(s => ({
        id: s.id,
        nombre: s.apodo || s.nombre_completo,
        tallaSuperior: s.talla_superior || s.talla_general || '—',
        tallaInferior: s.talla_inferior || s.talla_general || '—',
        tallaGeneral: s.talla_general || '—',
        dorsalPrimera: dorsalMap[s.id]?.primera ?? null,
        dorsalSegunda: dorsalMap[s.id]?.segunda ?? null,
      }))

      setListado(lista)
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
      {/* LISTADO PEDIDO EQUIPACIÓN */}
      <div style={{ marginTop: '48px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>
          📋 Listado de tallas y dorsales
        </h2>
        <p style={{ color: 'var(--azul-medio)', fontSize: '13px', marginBottom: '20px' }}>
          Datos para pedidos de equipación. Los socios sin dorsal asignado aparecen al final.
        </p>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[
            { key: 'primera', label: '🔵 1ª Equipación (azul)' },
            { key: 'segunda', label: '🟢 2ª Equipación (verde)' },
          ].map(t => (
            <button key={t.key} onClick={() => setTabEquipacion(t.key)} style={{
              padding: '8px 18px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
              backgroundColor: tabEquipacion === t.key ? 'var(--azul-marino)' : 'var(--azul-palido)',
              color: tabEquipacion === t.key ? 'white' : 'var(--azul-medio)',
              border: `1px solid ${tabEquipacion === t.key ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
              fontWeight: tabEquipacion === t.key ? '600' : '400',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--azul-claro)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--azul-marino)', color: 'white' }}>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', width: '70px' }}>Dorsal</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600' }}>Nombre</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>T. Superior</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>T. Inferior</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600' }}>T. General</th>
              </tr>
            </thead>
            <tbody>
              {[...listado]
                .sort((a, b) => {
                  const da = tabEquipacion === 'primera' ? a.dorsalPrimera : a.dorsalSegunda
                  const db = tabEquipacion === 'primera' ? b.dorsalPrimera : b.dorsalSegunda
                  if (da === null && db === null) return a.nombre.localeCompare(b.nombre)
                  if (da === null) return 1
                  if (db === null) return -1
                  return da - db
                })
                .map((s, i) => {
                  const dorsal = tabEquipacion === 'primera' ? s.dorsalPrimera : s.dorsalSegunda
                  return (
                    <tr key={s.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : 'var(--azul-palido)', borderBottom: '1px solid var(--azul-claro)' }}>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '700', color: dorsal ? 'var(--azul-marino)' : '#ccc', fontSize: '15px' }}>
                        {dorsal ?? '—'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--azul-marino)', fontWeight: '500' }}>{s.nombre}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--azul-medio)' }}>{s.tallaSuperior}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--azul-medio)' }}>{s.tallaInferior}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--azul-medio)' }}>{s.tallaGeneral}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}