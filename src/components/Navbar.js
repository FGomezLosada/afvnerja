'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FaFacebook, FaInstagram } from 'react-icons/fa'

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/calendario', label: 'Calendario' },
  { href: '/estadisticas', label: 'Estadísticas' },
  { href: '/socios', label: 'Plantilla' },
  { href: '/equipaciones', label: 'Equipaciones' },
  { href: '/asociacion', label: 'La Asociación' },
  { href: '/historico', label: 'Histórico' },
  { href: '/mundo-afv', label: '🌍 Mundo AFV' },
]

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <>
      <nav style={{
        backgroundColor: 'var(--azul-marino)',
        padding: '0 16px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo-cfv.png" alt="CFV Nerja" style={{ height: '40px', width: 'auto' }} />
          <div>
            <div style={{ color: 'var(--blanco)', fontWeight: '600', fontSize: '14px', lineHeight: '1.2' }}>
              Veteranos Nerja
            </div>
            <div style={{ color: 'var(--azul-claro)', fontSize: '10px' }}>
              A.F.V. Nerja
            </div>
          </div>
        </Link>

        {/* Menú escritorio */}
        <div style={{ display: 'flex', gap: '2px' }} className="desktop-menu">
          {links.map(item => (
            <Link key={item.href} href={item.href} style={{
              color: 'var(--azul-claro)',
              textDecoration: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '13px',
            }}>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Iconos derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a href="https://www.facebook.com/profile.php?id=61551139957241" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--azul-claro)', width: '36px', height: '36px',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.1)', textDecoration: 'none', fontSize: '22px'
          }}><FaFacebook /></a>
          <a href="https://www.instagram.com/vetfcnerja" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--azul-claro)', width: '36px', height: '36px',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.1)', textDecoration: 'none', fontSize: '22px'
          }}><FaInstagram /></a>
          <Link href="/admin" style={{ color: 'var(--azul-claro)', fontSize: '18px', marginLeft: '4px' }}>🔒</Link>

          {/* Botón hamburguesa — solo móvil */}
          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="hamburger"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--blanco)',
              fontSize: '24px',
              padding: '4px',
              display: 'none',
            }}
          >
            {menuAbierto ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Menú móvil desplegable */}
      {menuAbierto && (
        <div style={{
          backgroundColor: 'var(--azul-marino)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 0',
          position: 'sticky',
          top: '60px',
          zIndex: 99,
        }}>
          {links.map(item => (
            <Link key={item.href} href={item.href}
              onClick={() => setMenuAbierto(false)}
              style={{
                display: 'block',
                color: 'var(--azul-claro)',
                textDecoration: 'none',
                padding: '12px 20px',
                fontSize: '15px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-menu { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </>
  )
}