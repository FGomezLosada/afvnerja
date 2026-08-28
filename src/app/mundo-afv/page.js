'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function MundoAFV() {
  const [expediciones, setExpediciones] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroAño, setFiltroAño] = useState('todos')
  const [mapaListo, setMapaListo] = useState(false)
  const [marcadores, setMarcadores] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('expediciones')
        .select('*')
        .order('fecha', { ascending: false })
      setExpediciones(data || [])
    }
    cargar()

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapaListo(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!mapaListo || expediciones.length === 0 || typeof window === 'undefined') return
    const L = window.L
    const contenedor = document.getElementById('mapa-afv')
    if (!contenedor) return

    // Destruir mapa anterior si existe
    if (contenedor._leaflet_id) {
      contenedor._leaflet_id = null
      contenedor.innerHTML = ''
    }

    const mapa = L.map('mapa-afv', { zoomControl: true }).setView([40, -3], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapa)

    const iconoNaranja = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#D4721A;border:3px solid white;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
      iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -30],
    })

    const nuevosMarcadores = expediciones.map(exp => {
      const fecha = new Date(exp.fecha + 'T12:00:00')
      const fechaStr = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      const año = fecha.getFullYear()
      const tipoLabel = exp.tipo === 'partido' ? '🏟️ Partido' : exp.tipo === 'torneo' ? '🏆 Torneo' : exp.tipo === 'viaje' ? '✈️ Viaje' : '🎉 Evento'

      const popupHTML = `
        <div style="min-width:180px;max-width:220px;font-family:sans-serif;">
          ${exp.foto_url ? `<img src="${exp.foto_url}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />` : ''}
          <div style="font-size:15px;font-weight:700;color:#0D3F7A;margin-bottom:4px;">${exp.titulo}</div>
          <div style="font-size:12px;color:#666;margin-bottom:2px;">📍 ${exp.lugar}</div>
          <div style="font-size:12px;color:#666;margin-bottom:2px;">📅 ${fechaStr}</div>
          <div style="font-size:12px;color:#D4721A;font-weight:600;margin-bottom:4px;">${tipoLabel}</div>
          ${exp.notas ? `<div style="font-size:11px;color:#888;margin-top:6px;border-top:1px solid #eee;padding-top:6px;">${exp.notas}</div>` : ''}
        </div>
      `
      const marcador = L.marker([exp.latitud, exp.longitud], { icon: iconoNaranja })
        .addTo(mapa)
        .bindPopup(popupHTML)

      return { marcador, tipo: exp.tipo, año }
    })

    setMarcadores(nuevosMarcadores)

    if (expediciones.length > 1) {
      const bounds = L.latLngBounds(expediciones.map(e => [e.latitud, e.longitud]))
      mapa.fitBounds(bounds, { padding: [40, 40] })
    }

    window._mapaAFV = mapa
  }, [mapaListo, expediciones])

  // Aplicar filtros sobre los marcadores
  useEffect(() => {
    if (marcadores.length === 0) return
    marcadores.forEach(({ marcador, tipo, año }) => {
      const pasaTipo = filtroTipo === 'todos' || tipo === filtroTipo
      const pasaAño = filtroAño === 'todos' || año === parseInt(filtroAño)
      const elem = marcador.getElement()
      if (elem) elem.style.display = pasaTipo && pasaAño ? '' : 'none'
    })
  }, [filtroTipo, filtroAño, marcadores])

  const años = [...new Set(expediciones.map(e => new Date(e.fecha + 'T12:00:00').getFullYear()))].sort((a, b) => b - a)
  const tipos = ['viaje', 'partido', 'torneo', 'otro']

  const btnStyle = (activo) => ({
    padding: '6px 14px', fontSize: '12px', borderRadius: '20px', cursor: 'pointer',
    backgroundColor: activo ? 'var(--azul-marino)' : 'var(--blanco)',
    color: activo ? 'white' : 'var(--azul-medio)',
    border: `1px solid ${activo ? 'var(--azul-marino)' : 'var(--azul-claro)'}`,
    fontWeight: activo ? '600' : '400',
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '26px', fontWeight: '600', marginBottom: '8px' }}>
        🌍 Mundo AFV
      </h1>
      <p style={{ color: 'var(--azul-medio)', fontSize: '14px', marginBottom: '16px' }}>
        Todos los rincones del mundo que hemos visitado juntos
      </p>

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--azul-marino)', marginRight: '4px' }}>Tipo:</span>
        <button style={btnStyle(filtroTipo === 'todos')} onClick={() => setFiltroTipo('todos')}>Todos</button>
        {tipos.map(t => (
          <button key={t} style={btnStyle(filtroTipo === t)} onClick={() => setFiltroTipo(t)}>
            {t === 'viaje' ? '✈️ Viajes' : t === 'partido' ? '🏟️ Partidos' : t === 'torneo' ? '🏆 Torneos' : '🎉 Otros'}
          </button>
        ))}
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--azul-marino)', marginLeft: '8px', marginRight: '4px' }}>Año:</span>
        <button style={btnStyle(filtroAño === 'todos')} onClick={() => setFiltroAño('todos')}>Todos</button>
        {años.map(a => (
          <button key={a} style={btnStyle(filtroAño === String(a))} onClick={() => setFiltroAño(String(a))}>
            {a}
          </button>
        ))}
      </div>

      {/* Mapa */}
      <style>{`
        #mapa-afv { z-index: 0; position: relative; }
        @media (max-width: 600px) { #mapa-afv { height: 380px !important; } }
      `}</style>
      <div id="mapa-afv" style={{
        width: '100%', height: '550px', borderRadius: '12px',
        border: '1px solid var(--azul-claro)',
        backgroundColor: 'var(--azul-palido)',
      }} />

      <p style={{ fontSize: '12px', color: '#888', marginTop: '12px', textAlign: 'center' }}>
        {expediciones.length} expedición{expediciones.length !== 1 ? 'es' : ''} registrada{expediciones.length !== 1 ? 's' : ''} · Pulsa un pin para ver los detalles
      </p>
    </div>
  )
}