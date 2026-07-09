'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function MundoAFV() {
  const [expediciones, setExpediciones] = useState([])
  const [seleccionada, setSeleccionada] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from('expediciones')
        .select('*')
        .order('fecha', { ascending: false })
      setExpediciones(data || [])
      setLoading(false)
    }
    cargar()

    // Cargar Leaflet dinámicamente
    if (typeof window !== 'undefined' && !window.L) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setLoading(prev => prev)
      document.head.appendChild(script)
    }
  }, [])

  useEffect(() => {
    if (loading || expediciones.length === 0 || typeof window === 'undefined') return
    if (!window.L) {
      setTimeout(() => setLoading(false), 500)
      return
    }

    const L = window.L
    const contenedor = document.getElementById('mapa-afv')
    if (!contenedor || contenedor._leaflet_id) return

    const mapa = L.map('mapa-afv', { zoomControl: true }).setView([40, -3], 5)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapa)

    const iconoNaranja = L.divIcon({
      className: '',
      html: `<div style="
        width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
        background: #D4721A; border: 3px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -30],
    })

    expediciones.forEach(exp => {
      const fecha = new Date(exp.fecha + 'T12:00:00')
      const fechaStr = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      const tipoLabel = exp.tipo === 'partido' ? '🏟️ Partido' :
                        exp.tipo === 'torneo' ? '🏆 Torneo' :
                        exp.tipo === 'viaje' ? '✈️ Viaje' : '🎉 Evento'

      const popupHTML = `
        <div style="min-width:180px; max-width:220px; font-family:sans-serif;">
          ${exp.foto_url ? `<img src="${exp.foto_url}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />` : ''}
          <div style="font-size:15px;font-weight:700;color:#0D3F7A;margin-bottom:4px;">${exp.titulo}</div>
          <div style="font-size:12px;color:#666;margin-bottom:2px;">📍 ${exp.lugar}</div>
          <div style="font-size:12px;color:#666;margin-bottom:2px;">📅 ${fechaStr}</div>
          <div style="font-size:12px;color:#D4721A;font-weight:600;margin-bottom:4px;">${tipoLabel}</div>
          ${exp.notas ? `<div style="font-size:11px;color:#888;margin-top:6px;border-top:1px solid #eee;padding-top:6px;">${exp.notas}</div>` : ''}
        </div>
      `
      L.marker([exp.latitud, exp.longitud], { icon: iconoNaranja })
        .addTo(mapa)
        .bindPopup(popupHTML)
    })

    // Ajustar vista para incluir todos los puntos
    if (expediciones.length > 1) {
      const bounds = L.latLngBounds(expediciones.map(e => [e.latitud, e.longitud]))
      mapa.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [loading, expediciones])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ color: 'var(--azul-marino)', fontSize: '26px', fontWeight: '600', marginBottom: '8px' }}>
        🌍 Mundo AFV
      </h1>
      <p style={{ color: 'var(--azul-medio)', fontSize: '14px', marginBottom: '24px' }}>
        Todos los rincones del mundo que hemos visitado juntos
      </p>

      {/* Mapa */}
      <div id="mapa-afv" style={{
        width: '100%', height: '500px', borderRadius: '12px',
        border: '1px solid var(--azul-claro)', marginBottom: '32px',
        backgroundColor: 'var(--azul-palido)',
      }} />

      {/* Lista de expediciones */}
      <h2 style={{ color: 'var(--azul-marino)', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        📋 Todas las expediciones
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {expediciones.map(exp => {
          const fecha = new Date(exp.fecha + 'T12:00:00')
          const fechaStr = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
          const tipoLabel = exp.tipo === 'partido' ? '🏟️ Partido' :
                            exp.tipo === 'torneo' ? '🏆 Torneo' :
                            exp.tipo === 'viaje' ? '✈️ Viaje' : '🎉 Evento'
          return (
            <div key={exp.id} style={{
              backgroundColor: 'var(--blanco)',
              border: '1px solid var(--azul-claro)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              {exp.foto_url && (
                <img src={exp.foto_url} alt={exp.titulo}
                  style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
              )}
              <div style={{ padding: '14px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--azul-marino)', marginBottom: '4px' }}>{exp.titulo}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>📍 {exp.lugar}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>📅 {fechaStr}</div>
                <div style={{ fontSize: '12px', color: 'var(--naranja)', fontWeight: '600' }}>{tipoLabel}</div>
                {exp.notas && <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>{exp.notas}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {expediciones.length === 0 && !loading && (
        <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
          Aún no hay expediciones registradas
        </p>
      )}
    </div>
  )
}