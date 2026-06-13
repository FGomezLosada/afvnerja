'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [usuario, setUsuario] = useState(null)
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/admin')
          return
        }
      }
      setUsuario(session.user)

      // Cargar stats
      const [{ count: socios }, { count: eventos }, { count: asistencias }, { count: cuotas }] = await Promise.all([
        supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('eventos').select('*', { count: 'exact', head: true }),
        supabase.from('asistencias').select('*', { count: 'exact', head: true }),
        supabase.from('socios').select('*', { count: 'exact', head: true }).eq('activo', true),
      ])

      const { data: cuotasPagadas } = await supabase
        .from('cuotas')
        .select('socio_id')
        .in('estado', ['pagado', 'exento'])

      const pagoIds = cuotasPagadas?.map(c => c.socio_id) || []
      const pendientes = (socios || 0) - pagoIds.length

      setStats({ socios, eventos, asistencias, cuotas_pendientes: pendientes })
      setLoading(false)
    }
    cargarDatos()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--azul-medio)' }}>
      Cargando panel...
    </div>
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--azul-marino)', fontSize: '24px', fontWeight: '600' }}>
            Panel de Administración
          </h1>
          <p style={{ color: 'var(--azul-medio)', fontSize: '13px', marginTop: '4px' }}>
            AFV Nerja — Temporada 2025-26
          </p>
        </div>
        <button onClick={handleLogout} style={{
          padding: '8px 16px',
          backgroundColor: 'transparent',
          border: '1px solid var(--azul-claro)',
          borderRadius: '8px',
          color: 'var(--azul-medio)',
          fontSize: '13px',
          cursor: 'pointer',
        }}>
          Cerrar sesión
        </button>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Socios activos', valor: stats.socios, icono: '👥', color: 'var(--azul-marino)' },
          { label: 'Eventos', valor: stats.eventos, icono: '📅', color: 'var(--azul-medio)' },
          { label: 'Asistencias', valor: stats.asistencias, icono: '✅', color: 'var(--azul-cielo)' },
          { label: 'Cuotas pendientes', valor: stats.cuotas_pendientes, icono: '💰', color: stats.cuotas_pendientes > 0 ? 'var(--naranja)' : 'var(--azul-medio)' },
        ].map(s => (
          <div key={s.label} style={{
            backgroundColor: 'var(--blanco)',
            border: '1px solid var(--azul-claro)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icono}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: s.color }}>{s.valor}</div>
            <div style={{ fontSize: '12px', color: 'var(--azul-medio)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <h2 style={{ color: 'var(--azul-marino)', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        Gestión
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Gestionar socios', icono: '👤', href: '/admin/socios', desc: 'Ver, añadir y editar socios' },
          { label: 'Registrar asistencia', icono: '✅', href: '/admin/asistencias', desc: 'Marcar asistencia de un evento' },
          { label: 'Gestionar eventos', icono: '📅', href: '/admin/eventos', desc: 'Crear y editar eventos' },
          { label: 'Gestionar cuotas', icono: '💰', href: '/admin/cuotas', desc: 'Estado de pagos por socio' },
          { label: 'Gestionar gastos', icono: '💸', href: '/admin/gastos', desc: 'Registro económico' },
          { label: 'Configuración', icono: '⚙️', href: '/admin/config', desc: 'Temporadas y ajustes' },
        ].map(accion => (
          <a key={accion.href} href={accion.href} style={{
            backgroundColor: 'var(--blanco)',
            border: '1px solid var(--azul-claro)',
            borderRadius: '12px',
            padding: '20px',
            textDecoration: 'none',
            display: 'block',
            transition: 'border-color 0.15s',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{accion.icono}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)', marginBottom: '4px' }}>
              {accion.label}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--azul-medio)' }}>
              {accion.desc}
            </div>
          </a>
        ))}
      </div>

    </div>
  )
}