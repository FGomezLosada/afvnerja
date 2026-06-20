'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const tipoConfig = {
  entreno:  { color: 'var(--azul-medio)',  icono: '⚽', label: 'Entreno' },
  partido:  { color: 'var(--naranja)',     icono: '🏟️', label: 'Partido' },
  torneo:   { color: '#8B2FC9',            icono: '🏆', label: 'Torneo' },
  viaje:    { color: '#1D9E75',            icono: '✈️', label: 'Viaje' },
  social:   { color: '#639922',            icono: '🎉', label: 'Social' },
  benefico: { color: '#C92F2F',            icono: '❤️', label: 'Benéfico' },
}

export default function Calendario() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .order('fecha', { ascending: false })
      setEventos(data || [])
      setLoading(false)
    }
    cargar()
  }, [])

  const eventosFiltrados = filtro === 'todos'
    ? eventos
    : eventos.filter(e => e.tipo === filtro)

  // Agrupar por mes
  const meses = {}
  eventosFiltrados.forEach(e => {
    const fecha = new Date(e.fecha + 'T12:00:00')
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    const nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    if (!meses[clave]) meses[clave] = { nombre: nombreMes, eventos: [] }
    meses[clave].eventos.push(e)
  })

  const hoy = new Date().toISOString().split('T')[0]

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando calendario...</div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

      <h1 style={{ color: 'var(--azul-marino)', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
        Calendario — Temporada 2025-26
      </h1>
      <p style={{ color: 'var(--azul-medio)', fontSize: '14px', marginBottom: '24px' }}>
        {eventos.length} eventos registrados
      </p>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <button onClick={() => setFiltro('todos')} style={{
          padding: '7px 14px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer',
          backgroundColor: filtro === 'todos' ? 'var(--azul-marino)' : 'var(--azul-palido)',
          color: filtro === 'todos' ? 'white' : 'var(--azul-medio)',
          border: `1px solid ${filtro === 'todos' ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
          fontWeight: filtro === 'todos' ? '600' : '400',
        }}>
          Todos ({eventos.length})
        </button>
        {Object.entries(tipoConfig).map(([tipo, cfg]) => {
          const count = eventos.filter(e => e.tipo === tipo).length
          if (count === 0) return null
          return (
            <button key={tipo} onClick={() => setFiltro(tipo)} style={{
              padding: '7px 14px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer',
              backgroundColor: filtro === tipo ? cfg.color : 'var(--azul-palido)',
              color: filtro === tipo ? 'white' : 'var(--azul-medio)',
              border: `1px solid ${filtro === tipo ? cfg.color : 'var(--azul-claro)'}`,
              fontWeight: filtro === tipo ? '600' : '400',
            }}>
              {cfg.icono} {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Eventos por mes */}
      {Object.entries(meses).map(([clave, mes]) => (
        <div key={clave} style={{ marginBottom: '32px' }}>
          <h2 style={{
            color: 'var(--blanco)',
            backgroundColor: 'var(--azul-marino)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '600',
            marginBottom: '12px',
            textTransform: 'capitalize',
          }}>
            {mes.nombre}
          </h2>

          {mes.eventos.map(evento => {
            const cfg = tipoConfig[evento.tipo] || tipoConfig.entreno
            const esPasado = evento.fecha < hoy
            const esFuturo = evento.fecha >= hoy
            const fecha = new Date(evento.fecha + 'T12:00:00')
            const fechaStr = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

            return (
              <a key={evento.id} href={`/eventos/${evento.id}`} style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                padding: '14px 16px',
                marginBottom: '8px',
                backgroundColor: esFuturo ? 'var(--blanco)' : 'var(--azul-palido)',
                border: `1px solid ${esFuturo ? cfg.color : 'var(--azul-claro)'}`,
                borderLeft: `4px solid ${cfg.color}`,
                borderRadius: '8px',
                opacity: evento.estado === 'cancelado' ? 0.5 : 1,
                flexWrap: 'wrap',
                textDecoration: 'none',
              }}>
                <div style={{ fontSize: '24px', minWidth: '36px', textAlign: 'center', marginTop: '2px' }}>
                  {cfg.icono}
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)', textTransform: 'capitalize' }}>
                      {fechaStr}
                    </span>
                    {evento.hora && (
                      <span style={{ fontSize: '12px', color: 'var(--azul-medio)' }}>
                        · {evento.hora.slice(0, 5)}
                      </span>
                    )}
                    <span style={{
                      fontSize: '10px', fontWeight: '600', padding: '2px 8px',
                      borderRadius: '10px', backgroundColor: cfg.color, color: 'white',
                    }}>
                      {cfg.label}
                    </span>
                     {evento.es_benefico && (
                      <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#C92F2F', color: 'white' }}>
                        ❤️ Benéfico
                      </span>
                    )}
                    {evento.lista_entreno_activa && (
                      <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', backgroundColor: '#1D9E75', color: 'white' }}>
                        📋 Lista activa
                      </span>
                    )}
                    {evento.estado === 'cancelado' && (
                      <span style={{ fontSize: '10px', color: '#C92F2F', fontWeight: '600' }}>CANCELADO</span>
                    )}
                  </div>

                  {evento.titulo && evento.tipo !== 'entreno' && (
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '2px' }}>
                      {evento.titulo}
                    </div>
                  )}

                  {evento.lugar && (
                    <div style={{ fontSize: '12px', color: 'var(--azul-medio)' }}>
                      📍 {evento.lugar}
                    </div>
                  )}
                </div>

                {(evento.tipo === 'partido' || evento.tipo === 'torneo') &&
                 evento.goles_favor !== null && evento.goles_contra !== null && (
                  <div style={{
                    textAlign: 'center', minWidth: '80px',
                    backgroundColor: 'var(--azul-marino)',
                    borderRadius: '8px', padding: '6px 10px',
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--azul-claro)', marginBottom: '2px' }}>AFV Nerja</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--blanco)' }}>
                      {evento.goles_favor} - {evento.goles_contra}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--azul-claro)', marginTop: '2px' }}>
                      {evento.rival || 'Rival'}
                    </div>
                    {evento.notas_resultado && (
                      <div style={{ fontSize: '9px', color: 'var(--naranja)', marginTop: '2px' }}>
                        {evento.notas_resultado}
                      </div>
                    )}
                  </div>
                )}
              </a>
            )
          })}
        </div>
      ))}

      {Object.keys(meses).length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--azul-medio)' }}>
          No hay eventos de este tipo
        </div>
      )}
    </div>
  )
}