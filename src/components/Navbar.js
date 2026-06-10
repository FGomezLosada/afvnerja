'use client'
import Image from 'next/image'
import Link from 'next/link'

export default function Navbar() {
  return (
    <nav style={{
      backgroundColor: 'var(--azul-marino)',
      padding: '0 24px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      
      {/* Logo y nombre */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <img src="/logo-cfv.png" alt="CFV Nerja" style={{ height: '44px', width: 'auto' }} />
        <div>
          <div style={{ color: 'var(--blanco)', fontWeight: '600', fontSize: '15px', lineHeight: '1.2' }}>
            Veteranos Nerja
          </div>
          <div style={{ color: 'var(--azul-claro)', fontSize: '11px' }}>
            C.F.V. Nerja
          </div>
        </div>
      </Link>

      {/* Menú central */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {[
          { href: '/', label: 'Inicio' },
          { href: '/estadisticas', label: 'Estadísticas' },
          { href: '/calendario', label: 'Calendario' },
          { href: '/asociacion', label: 'La Asociación' },
          { href: '/equipaciones', label: 'Equipaciones' },
          { href: '/historico', label: 'Histórico' },
        ].map((item) => (
          <Link key={item.href} href={item.href} style={{
            color: 'var(--azul-claro)',
            textDecoration: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Redes sociales */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{
          color: 'var(--azul-claro)',
          width: '32px', height: '32px',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.1)',
          textDecoration: 'none',
          fontSize: '16px'
        }}>f</a>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{
          color: 'var(--azul-claro)',
          width: '32px', height: '32px',
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.1)',
          textDecoration: 'none',
          fontSize: '16px'
        }}>ig</a>
        <Link href="/admin" style={{
          color: 'var(--azul-claro)',
          fontSize: '18px',
          marginLeft: '8px'
        }}>🔒</Link>
      </div>

    </nav>
  )
}