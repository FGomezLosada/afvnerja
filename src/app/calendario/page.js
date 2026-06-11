import { supabase } from '@/lib/supabase'

const tipoConfig = {
  entreno:  { color: 'var(--azul-medio)',  icono: '⚽', label: 'Entreno' },
  partido:  { color: 'var(--naranja)',     icono: '🏟️', label: 'Partido' },
  torneo:   { color: '#8B2FC9',            icono: '🏆', label: 'Torneo' },
  viaje:    { color: '#1D9E75',            icono: '✈️', label: 'Viaje' },
  social:   { color: '#639922',            icono: '🎉', label: 'Social' },
  benefico: { color: '#C92F2F',            icono: '❤️', label: 'Benéfico' },
}

export default async function Calendario() {
  const { data: eventos } = await supabase
    .from('eventos')
    .select('*')
    .order('fecha', { ascending: true })

  // Agrupar por mes
  const meses = {}
  eventos?.forEach(e => {
    const fecha = new Date(e.fecha + 'T12:00:00')
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    const nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    if (!meses[clave]) meses[clave] = { nombre: nombreMes, eventos: [] }
    meses[clave].eventos.push(e)
  })

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

      <h1 style={{ color: 'var(--azul-marino)', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
        Calendario — Temporada 2025-26
      </h1>
      <p style={{ color: 'var(--azul-medio)', fontSize: '14px', marginBottom: '32px' }}>
        {eventos?.length} eventos registrados
      </p>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
        {Object.entries(tipoConfig).map(([tipo, cfg]) => (
          <div key={tipo} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: 'var(--azul-palido)',
            border: `1px solid ${cfg.color}`,
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            color: 'var(--azul-marino)',
          }}>
            <span>{cfg.icono}</span>
            <span>{cfg.label}</span>
          </div>
        ))}
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
              <div key={evento.id} style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                padding: '14px 16px',
                marginBottom: '8px',
                backgroundColor: esFuturo ? 'var(--blanco)' : 'var(--azul-palido)',
                border: `1px solid ${esFuturo ? cfg.color : 'var(--azul-claro)'}`,
                borderLeft: `4px solid ${cfg.color}`,
                borderRadius: '8px',
                opacity: esPasado && evento.estado === 'cancelado' ? 0.5 : 1,
              }}>

                {/* Icono tipo */}
                <div style={{
                  fontSize: '24px',
                  minWidth: '36px',
                  textAlign: 'center',
                  marginTop: '2px',
                }}>
                  {cfg.icono}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
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
                      fontSize: '10px',
                      fontWeight: '600',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: cfg.color,
                      color: 'white',
                    }}>
                      {cfg.label}
                    </span>
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

                {/* Resultado si es partido/torneo jugado */}
                {(evento.tipo === 'partido' || evento.tipo === 'torneo') && 
                 evento.goles_favor !== null && evento.goles_contra !== null && (
                  <div style={{
                    textAlign: 'center',
                    minWidth: '60px',
                    backgroundColor: 'var(--azul-marino)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--azul-claro)', marginBottom: '2px' }}>
                      AFV Nerja
                    </div>
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

              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}