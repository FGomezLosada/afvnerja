import Link from 'next/link'
import { FaFacebook, FaInstagram } from 'react-icons/fa'

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: 'var(--azul-marino)',
      color: 'var(--azul-claro)',
      marginTop: '60px',
      padding: '40px 24px 24px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '32px',
        marginBottom: '32px',
      }}>

        {/* Logo y descripción */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <img src="/logo-cfv.png" alt="AFV Nerja" style={{ height: '48px', width: 'auto' }} />
            <div>
              <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>Veteranos Nerja</div>
              <div style={{ fontSize: '11px', color: 'var(--azul-claro)' }}>A.F.V. Nerja</div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--azul-claro)', lineHeight: '1.6', marginBottom: '16px' }}>
            Asociación de Fútbol Veteranos de Nerja. Pasión, compromiso y comunidad en la Axarquía - Costa del Sol.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="https://www.facebook.com/profile.php?id=61551139957241" target="_blank" rel="noopener noreferrer" style={{
              color: 'var(--azul-claro)', width: '36px', height: '36px',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.1)', textDecoration: 'none', fontSize: '20px',
            }}><FaFacebook /></a>
            <a href="https://www.instagram.com/vetfcnerja" target="_blank" rel="noopener noreferrer" style={{
              color: 'var(--azul-claro)', width: '36px', height: '36px',
              borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.1)', textDecoration: 'none', fontSize: '20px',
            }}><FaInstagram /></a>
          </div>
        </div>

        {/* Links rápidos */}
        <div>
          <h3 style={{ color: 'white', fontSize: '13px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Navegación
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { href: '/', label: 'Inicio' },
              { href: '/calendario', label: 'Calendario' },
              { href: '/estadisticas', label: 'Estadísticas' },
              { href: '/socios', label: 'Plantilla' },
              { href: '/equipaciones', label: 'Equipaciones' },
              { href: '/asociacion', label: 'La Asociación' },
              { href: '/historico', label: 'Histórico' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{
                color: 'var(--azul-claro)', textDecoration: 'none', fontSize: '13px',
              }}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Patrocinadores */}
        <PatrocinadorFooter />

      </div>

      {/* Copyright */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingTop: '20px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
      }}>
        © {new Date().getFullYear()} A.F.V. Nerja — Asociación de Fútbol Veteranos de Nerja
      </div>
    </footer>
  )
}

async function PatrocinadorFooter() {
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: patrocinadores } = await supabase
    .from('patrocinadores')
    .select('*')
    .eq('activo', true)

  if (!patrocinadores || patrocinadores.length === 0) return null

  // Agrupar por nombre
  const agrupados = {}
  patrocinadores.forEach(p => {
    if (!agrupados[p.nombre]) agrupados[p.nombre] = p
  })
  const lista = Object.values(agrupados)

  return (
    <div>
      <h3 style={{ color: 'white', fontSize: '13px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Patrocinadores
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {lista.map(p => (
          <a key={p.id} href={p.web_url || '#'} target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
            title={p.nombre}>
            {p.logo_url ? (
              <img src={p.logo_url} alt={p.nombre}
                style={{ height: '40px', width: 'auto', maxWidth: '100px', objectFit: 'contain', filter: 'brightness(0) invert(1) opacity(0.7)' }} />
            ) : (
              <div style={{
                padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '6px', fontSize: '12px', color: 'var(--azul-claro)',
              }}>
                {p.nombre}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}