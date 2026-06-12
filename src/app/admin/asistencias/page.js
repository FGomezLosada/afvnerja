'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminAsistencias() {
  const [eventos, setEventos] = useState([])
  const [socios, setSocios] = useState([])
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null)
  const [asistencias, setAsistencias] = useState({})
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/admin'); return }

      const [{ data: ev }, { data: so }] = await Promise.all([
        supabase.from('eventos').select('*').order('fecha', { ascending: false }),
        supabase.from('socios').select('*').eq('activo', true).order('apodo'),
      ])
      setEventos(ev || [])
      setSocios(so || [])
      setLoading(false)
    }
    cargar()
  }, [])

  async function seleccionarEvento(evento) {
    setEventoSeleccionado(evento)
    setMensaje('')

    const { data } = await supabase
      .from('asistencias')
      .select('*')
      .eq('evento_id', evento.id)

    const mapa = {}
    data?.forEach(a => {
      mapa[a.socio_id] = a.estado
    })
    setAsistencias(mapa)
  }

  function cambiarEstado(socioId, estado) {
    setAsistencias(prev => {
      const nuevo = { ...prev }
      if (nuevo[socioId] === estado) {
        delete nuevo[socioId]
      } else {
        nuevo[socioId] = estado
      }
      return nuevo
    })
  }

  async function guardarAsistencias() {
    if (!eventoSeleccionado) return
    setGuardando(true)
    setMensaje('')

    // Guardar o actualizar los que tienen estado
    for (const [socioId, estado] of Object.entries(asistencias)) {
      await supabase
        .from('asistencias')
        .upsert({
          socio_id: socioId,
          evento_id: eventoSeleccionado.id,
          estado,
        }, { onConflict: 'socio_id,evento_id' })
    }

    // Eliminar los que se han desmarcado
    const sociosConEstado = Object.keys(asistencias)
    const { data: existentes } = await supabase
      .from('asistencias')
      .select('socio_id')
      .eq('evento_id', eventoSeleccionado.id)

    if (existentes) {
      for (const a of existentes) {
        if (!sociosConEstado.includes(a.socio_id)) {
          await supabase
            .from('asistencias')
            .delete()
            .eq('socio_id', a.socio_id)
            .eq('evento_id', eventoSeleccionado.id)
        }
      }
    }

    setMensaje('✅ Asistencias guardadas correctamente')
    setGuardando(false)
  }

  const estadoColor = {
    asistio: 'var(--azul-marino)',
    se_borro: 'var(--azul-cielo)',
    no_aparecio: 'var(--naranja)',
  }

  const estadoLabel = {
    asistio: '✅ Asistió',
    se_borro: '0️⃣ Se borró',
    no_aparecio: '❌ No avisó',
  }

  const resumen = {
    asistio: Object.values(asistencias).filter(e => e === 'asistio').length,
    se_borro: Object.values(asistencias).filter(e => e === 'se_borro').length,
    no_aparecio: Object.values(asistencias).filter(e => e === 'no_aparecio').length,
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <a href="/admin/dashboard" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</a>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '22px', fontWeight: '600', margin: '8px 0 24px' }}>
        Registrar asistencias
      </h1>

      {/* Selector de evento */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--azul-marino)', marginBottom: '8px' }}>
          Selecciona el evento
        </label>
        <select
          onChange={e => {
            const ev = eventos.find(ev => ev.id === e.target.value)
            if (ev) seleccionarEvento(ev)
          }}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid var(--azul-claro)',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--azul-marino)',
            backgroundColor: 'var(--blanco)',
          }}
        >
          <option value="">— Selecciona un evento —</option>
          {eventos.map(ev => {
            const fecha = new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <option key={ev.id} value={ev.id}>
                {fecha} — {ev.titulo || ev.tipo} {ev.rival ? `vs ${ev.rival}` : ''}
              </option>
            )
          })}
        </select>
      </div>

      {eventoSeleccionado && (
        <>
          {/* Info evento */}
          <div style={{
            backgroundColor: 'var(--azul-marino)',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div>
              <div style={{ color: 'var(--blanco)', fontWeight: '600', fontSize: '15px' }}>
                {eventoSeleccionado.titulo || eventoSeleccionado.tipo}
              </div>
              <div style={{ color: 'var(--azul-claro)', fontSize: '12px', marginTop: '2px' }}>
                {new Date(eventoSeleccionado.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                {eventoSeleccionado.lugar ? ` · ${eventoSeleccionado.lugar}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#4ADE80', fontWeight: '700', fontSize: '18px' }}>{resumen.asistio}</div>
                <div style={{ color: 'var(--azul-claro)', fontSize: '10px' }}>asistieron</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#93C5FD', fontWeight: '700', fontSize: '18px' }}>{resumen.se_borro}</div>
                <div style={{ color: 'var(--azul-claro)', fontSize: '10px' }}>se borraron</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--naranja)', fontWeight: '700', fontSize: '18px' }}>{resumen.no_aparecio}</div>
                <div style={{ color: 'var(--azul-claro)', fontSize: '10px' }}>sin avisar</div>
              </div>
            </div>
          </div>

          {mensaje && (
            <div style={{ padding: '10px 16px', backgroundColor: '#E6F1FB', color: 'var(--azul-marino)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {mensaje}
            </div>
          )}

          {/* Lista de socios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            {socios.map(socio => {
              const estado = asistencias[socio.id]
              return (
                <div key={socio.id} style={{
                  backgroundColor: 'var(--blanco)',
                  border: `1px solid ${estado ? estadoColor[estado] : 'var(--azul-claro)'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--azul-marino)', flex: 1 }}>
                    {socio.apodo || socio.nombre_completo}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['asistio', 'se_borro', 'no_aparecio'].map(e => (
                      <button key={e} onClick={() => cambiarEstado(socio.id, e)} style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: estado === e ? '700' : '400',
                        backgroundColor: estado === e ? estadoColor[e] : 'var(--azul-palido)',
                        color: estado === e ? 'white' : 'var(--azul-medio)',
                        border: `1px solid ${estado === e ? estadoColor[e] : 'var(--azul-claro)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}>
                        {estadoLabel[e]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={guardarAsistencias} disabled={guardando} style={{
            width: '100%',
            padding: '14px',
            backgroundColor: 'var(--azul-marino)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
          }}>
            {guardando ? 'Guardando...' : '💾 Guardar asistencias'}
          </button>
        </>
      )}
    </div>
  )
}