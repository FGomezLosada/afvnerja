'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const posicionIcon = {
  portero: '🧤', defensa: '🛡️', centrocampista: '⚙️', delantero: '⚡'
}

export default function DetalleEvento() {
  const { id } = useParams()
  const [evento, setEvento] = useState(null)
  const [socios, setSocios] = useState([])
  const [apuntados, setApuntados] = useState([])
  const [socioSeleccionado, setSocioSeleccionado] = useState('')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [esAdmin, setEsAdmin] = useState(false)
  const [nombreInvitado, setNombreInvitado] = useState('')
  const [posicionInvitado, setPosicionInvitado] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { session } } = await supabase.auth.getSession()
      setEsAdmin(!!session)

      const { data: ev } = await supabase.from('eventos').select('*').eq('id', id).single()
      setEvento(ev)

      const { data: soc } = await supabase.from('socios').select('id, apodo, nombre_completo').eq('activo', true).order('apodo')
      setSocios(soc || [])

      await cargarApuntados()
      setLoading(false)
    }
    if (id) cargar()
  }, [id])

  async function cargarApuntados() {
    const { data } = await supabase
      .from('apuntes_entreno')
      .select('*, socios(apodo, nombre_completo, posicion, posiciones)')
      .eq('evento_id', id)
      .eq('estado', 'apuntado')
      .order('created_at')
    setApuntados(data || [])
  }

  async function notificarTelegram(mensaje) {
    try {
      await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      })
    } catch (e) {
      console.error('Error notificando a Telegram:', e)
    }
  }

  function dentroDeVentana() {
    if (!evento) return false
    const ahora = new Date()
    const fechaEntreno = new Date(`${evento.fecha}T${evento.hora || '20:45'}`)

    const horasApertura = (evento.tipo === 'partido' || evento.tipo === 'torneo') ? 10 * 24 : 36
    const horasCierre = 1

    const aperturaApunte = new Date(fechaEntreno.getTime() - horasApertura * 60 * 60 * 1000)
    const cierreApunte = new Date(fechaEntreno.getTime() - horasCierre * 60 * 60 * 1000)
    return ahora >= aperturaApunte && ahora <= cierreApunte
  }

  function ventanaYaCerro() {
    if (!evento) return false
    const ahora = new Date()
    const fechaEntreno = new Date(`${evento.fecha}T${evento.hora || '20:45'}`)
    const cierreApunte = new Date(fechaEntreno.getTime() - 60 * 60 * 1000)
    return ahora > cierreApunte
  }

  async function apuntarse() {
    if (!socioSeleccionado) return
    setGuardando(true)

    const yaApuntado = apuntados.some(a => a.socio_id === socioSeleccionado)
    if (yaApuntado) {
      setMensaje('Ya estás apuntado en esta lista')
      setGuardando(false)
      return
    }

    const { error } = await supabase.from('apuntes_entreno').upsert({
      evento_id: id,
      socio_id: socioSeleccionado,
      estado: 'apuntado',
      fecha_borrado: null,
    }, { onConflict: 'evento_id,socio_id' })

    if (error) {
      setMensaje('Error: ' + error.message)
    } else {
      const socio = socios.find(s => s.id === socioSeleccionado)
      const nombreSocio = socio?.apodo || socio?.nombre_completo || 'Alguien'
      notificarTelegram(
        `📋 ${evento.tipo?.toUpperCase()} · ${evento.titulo || evento.lugar || ''} · ${evento.fecha}\n✅ Se apuntó: ${nombreSocio}\n👥 Apuntados ahora: ${apuntados.length + 1}${evento.min_jugadores ? ` / mínimo ${evento.min_jugadores}` : ''}`
      )
      setMensaje('✅ Te has apuntado correctamente')
      setSocioSeleccionado('')
      cargarApuntados()
    }
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  
  async function añadirInvitado() {
    if (!nombreInvitado.trim()) return

    const etiqueta = `Invitado (${nombreInvitado.trim()})`

    const { error } = await supabase.from('apuntes_entreno').insert({
      evento_id: id,
      es_invitado: true,
      nombre_invitado: etiqueta,
      posicion_invitado: posicionInvitado || null,
    })

    if (!error) {
      notificarTelegram(
        `📋 ${evento.tipo?.toUpperCase()} · ${evento.titulo || evento.lugar || ''} · ${evento.fecha}\n👤 Invitado añadido: ${nombreInvitado.trim()}\n👥 Apuntados ahora: ${apuntados.length + 1}${evento.min_jugadores ? ` / mínimo ${evento.min_jugadores}` : ''}`
      )
      setNombreInvitado('')
      setPosicionInvitado('')
      cargarApuntados()
    }
  }

  async function eliminarInvitado(apunteId) {
    if (!confirm('¿Eliminar a este invitado?')) return
    const invitado = apuntados.find(a => a.id === apunteId)
    await supabase.from('apuntes_entreno')
      .update({ estado: 'borrado', fecha_borrado: new Date().toISOString() })
      .eq('id', apunteId)

    notificarTelegram(
      `📋 ${evento.tipo?.toUpperCase()} · ${evento.titulo || evento.lugar || ''} · ${evento.fecha}\n❌ Invitado eliminado: ${invitado?.nombre_invitado || ''}\n👥 Apuntados ahora: ${apuntados.length - 1}${evento.min_jugadores ? ` / mínimo ${evento.min_jugadores}` : ''}`
    )
    cargarApuntados()
  }

  async function borrarseDeListaSocio(socioId) {
    if (!confirm('¿Seguro que quieres borrarte de la lista?')) return
    await supabase.from('apuntes_entreno')
      .update({ estado: 'borrado', fecha_borrado: new Date().toISOString() })
      .eq('evento_id', id)
      .eq('socio_id', socioId)

    const socio = socios.find(s => s.id === socioId)
    const nombreSocio = socio?.apodo || socio?.nombre_completo || 'Alguien'
    notificarTelegram(
      `📋 ${evento.tipo?.toUpperCase()} · ${evento.titulo || evento.lugar || ''} · ${evento.fecha}\n❌ Se borró: ${nombreSocio}\n👥 Apuntados ahora: ${apuntados.length - 1}${evento.min_jugadores ? ` / mínimo ${evento.min_jugadores}` : ''}`
    )
    cargarApuntados()
  }

  function mezclar(arr) {
    const copia = [...arr]
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
    }
    return copia
  }

  async function generarEquipos() {
    const jugadores = mezclar(apuntados.map(a => ({
      id: a.id,
      nombre: a.es_invitado ? a.nombre_invitado : (a.socios?.apodo || a.socios?.nombre_completo),
      posicion: a.es_invitado ? (a.posicion_invitado || null) : (a.socios?.posiciones?.[0] || a.socios?.posicion || null),
    })))

    const equipoA = []
    const equipoB = []
    let turno = 0

    // Ordenar por posición para repartir uno a uno equilibrando totales
    const orden = ['portero', 'defensa', 'centrocampista', 'delantero', null]
    const agrupados = orden.flatMap(pos => jugadores.filter(j => j.posicion === pos))

    agrupados.forEach(jugador => {
      if (equipoA.length < equipoB.length) {
        equipoA.push(jugador)
      } else if (equipoB.length < equipoA.length) {
        equipoB.push(jugador)
      } else {
        // empatados, alterna
        if (turno % 2 === 0) equipoA.push(jugador)
        else equipoB.push(jugador)
        turno++
      }
    })

    const nuevosEquipos = { equipoA, equipoB, generadoEn: new Date().toISOString() }

    await supabase.from('eventos').update({ equipos_generados: nuevosEquipos }).eq('id', id)
    setEvento(prev => ({ ...prev, equipos_generados: nuevosEquipos }))
  }

  async function borrarEquipos() {
    if (!confirm('¿Borrar los equipos generados?')) return
    await supabase.from('eventos').update({ equipos_generados: null }).eq('id', id)
    setEvento(prev => ({ ...prev, equipos_generados: null }))
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Cargando evento...</div>
  if (!evento) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>Evento no encontrado</div>

  const fecha = new Date(evento.fecha + 'T12:00:00')
  const enVentana = dentroDeVentana()
  const ventanaCerrada = ventanaYaCerro()
  const sociosDisponibles = socios.filter(s => !apuntados.some(a => a.socio_id === s.id))
  const equipos = evento.equipos_generados

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '32px 24px' }}>
      <a href="/calendario" style={{ color: 'var(--azul-medio)', fontSize: '13px', textDecoration: 'none' }}>← Calendario</a>

      <div style={{ backgroundColor: 'var(--azul-marino)', borderRadius: '16px', padding: '24px', marginTop: '12px', marginBottom: '24px' }}>
        <div style={{ color: 'var(--azul-claro)', fontSize: '13px', marginBottom: '6px' }}>
          {fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          {evento.hora ? ` · ${evento.hora.slice(0,5)}` : ''}
        </div>
        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '600', marginBottom: '6px' }}>
          {evento.titulo || 'Entreno'}
        </h1>
        {evento.lugar && (
          <div style={{ color: 'var(--azul-claro)', fontSize: '13px' }}>📍 {evento.lugar}</div>
        )}
      </div>

      {!evento.lista_entreno_activa ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'var(--azul-palido)', borderRadius: '12px', color: 'var(--azul-medio)' }}>
          📋 Lista gestionada por WhatsApp
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--azul-marino)' }}>
              {apuntados.length} <span style={{ fontSize: '16px', color: 'var(--azul-medio)' }}>/ {evento.min_jugadores}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--azul-medio)' }}>
              jugadores apuntados {apuntados.length >= evento.min_jugadores ? '— ✅ Entreno confirmado' : `— faltan ${evento.min_jugadores - apuntados.length} para confirmar`}
            </div>
            {ventanaCerrada && apuntados.length < evento.min_jugadores && (
              <div style={{ marginTop: '10px', padding: '10px 16px', backgroundColor: '#FEE2E2', color: '#C92F2F', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>
                ❌ Entreno anulado — no se alcanzó el mínimo de jugadores
              </div>
            )}
          </div>

          {enVentana ? (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <select value={socioSeleccionado} onChange={e => setSocioSeleccionado(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '10px 14px', border: '1px solid var(--azul-claro)', borderRadius: '8px', fontSize: '14px' }}>
                <option value="">— Selecciona tu nombre —</option>
                {sociosDisponibles.map(s => (
                  <option key={s.id} value={s.id}>{s.apodo || s.nombre_completo}</option>
                ))}
              </select>
              <button onClick={apuntarse} disabled={guardando || !socioSeleccionado} style={{
                padding: '10px 24px', backgroundColor: 'var(--azul-marino)', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
              }}>
                {guardando ? '...' : 'Apuntarme'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#FEF9C3', borderRadius: '8px', color: '#854D0E', fontSize: '13px', marginBottom: '24px' }}>
              ⏰ La ventana de apunte está cerrada (se abre 36h antes y cierra 1h antes del entreno)
            </div>
          )}

          {mensaje && (
            <div style={{ padding: '10px 16px', backgroundColor: '#E6F1FB', color: 'var(--azul-marino)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
              {mensaje}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {apuntados.map((a, i) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)',
                borderRadius: '8px', padding: '10px 14px',
              }}>
                <span style={{ fontSize: '12px', color: 'var(--azul-medio)', minWidth: '20px' }}>{i + 1}</span>
                <span style={{ fontSize: '16px' }}>
                  {a.es_invitado ? '👤' : posicionIcon[a.socios?.posiciones?.[0] || a.socios?.posicion] || '⚽'}
                </span>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--azul-marino)', fontWeight: '500' }}>
                  {a.es_invitado ? a.nombre_invitado : (a.socios?.apodo || a.socios?.nombre_completo)}
                </span>
                {!a.es_invitado && (
                  <button onClick={() => borrarseDeListaSocio(a.socio_id)} style={{
                    fontSize: '11px', color: '#C92F2F', backgroundColor: 'transparent',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  }}>
                    Borrarme
                  </button>
                )}
                {a.es_invitado && esAdmin && (
                  <button onClick={() => eliminarInvitado(a.id)} style={{
                    fontSize: '11px', color: '#C92F2F', backgroundColor: 'transparent',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  }}>
                    Eliminar
                  </button>
                )}
              </div>
            ))}

            {esAdmin && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', padding: '12px', backgroundColor: 'var(--azul-palido)', borderRadius: '8px' }}>
                <input type="text" placeholder="Nombre del invitado" value={nombreInvitado}
                  onChange={e => setNombreInvitado(e.target.value)}
                  style={{ flex: 1, minWidth: '150px', padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px' }} />
                <select value={posicionInvitado} onChange={e => setPosicionInvitado(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--azul-claro)', borderRadius: '6px', fontSize: '13px' }}>
                  <option value="">Sin posición</option>
                  <option value="portero">🧤 Portero</option>
                  <option value="defensa">🛡️ Defensa</option>
                  <option value="centrocampista">⚙️ Centrocampista</option>
                  <option value="delantero">⚡ Delantero</option>
                </select>
                <button onClick={añadirInvitado} style={{
                  padding: '8px 16px', backgroundColor: 'var(--azul-marino)', color: 'white',
                  border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                }}>
                  + Invitado
                </button>
              </div>
            )}
            {apuntados.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--azul-medio)', fontSize: '13px' }}>
                Aún no hay nadie apuntado
              </div>
            )}
          </div>

          {esAdmin && apuntados.length > 0 && apuntados.length < 2 && (
            <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#FEF9C3', borderRadius: '8px', color: '#854D0E', fontSize: '13px', marginTop: '16px' }}>
              ⚠️ Se necesitan al menos 2 jugadores apuntados para formar equipos
            </div>
          )}

          {esAdmin && apuntados.length >= 2 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={generarEquipos} style={{
                flex: 1, padding: '14px',
                backgroundColor: 'var(--azul-marino)', color: 'white',
                border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              }}>
                🎲 {equipos ? 'Regenerar equipos' : 'Formar equipos aleatoriamente'}
              </button>
              {equipos && (
                <button onClick={borrarEquipos} style={{
                  padding: '14px 20px',
                  backgroundColor: '#FEE2E2', color: '#C92F2F',
                  border: '1px solid #FCA5A5', borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                }}>
                  Borrar
                </button>
              )}
            </div>
          )}

          {equipos && (
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ backgroundColor: '#E6F1FB', borderRadius: '12px', padding: '14px' }}>
                <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#185FA5', marginBottom: '10px' }}>
                  🔵 Equipo A ({equipos.equipoA.length})
                </div>
                {equipos.equipoA.map((j, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#185FA5', padding: '4px 0', borderBottom: i < equipos.equipoA.length - 1 ? '1px solid rgba(24,95,165,0.15)' : 'none' }}>
                    {posicionIcon[j.posicion] || '⚽'} {j.nombre}
                  </div>
                ))}
              </div>
              <div style={{ backgroundColor: '#FEF2E8', borderRadius: '12px', padding: '14px' }}>
                <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#993C1D', marginBottom: '10px' }}>
                  🟠 Equipo B ({equipos.equipoB.length})
                </div>
                {equipos.equipoB.map((j, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#993C1D', padding: '4px 0', borderBottom: i < equipos.equipoB.length - 1 ? '1px solid rgba(153,60,29,0.15)' : 'none' }}>
                    {posicionIcon[j.posicion] || '⚽'} {j.nombre}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}