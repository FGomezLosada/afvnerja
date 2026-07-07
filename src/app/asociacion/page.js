export default function Asociacion() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>

      <h1 style={{ color: 'var(--azul-marino)', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
        La Asociación
      </h1>
      <p style={{ color: 'var(--azul-medio)', fontSize: '14px', marginBottom: '40px' }}>
        A.F.V. Nerja — Asociación de Fútbol Veteranos de Nerja
      </p>

      {/* Historia */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid var(--azul-claro)' }}>
          📖 Historia
        </h2>
        <div style={{ backgroundColor: 'var(--azul-palido)', borderRadius: '12px', padding: '24px', fontSize: '15px', color: 'var(--azul-marino)', lineHeight: '1.8' }}>
          <p>
            <em style={{ color: 'var(--azul-medio)' }}>Próximamente — historia de la asociación por completar.</em>
          </p>
        </div>
      </div>

      {/* Valores */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid var(--azul-claro)' }}>
          💙 Nuestros valores
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { icono: '🤝', titulo: 'Compañerismo', texto: 'La amistad y el respeto son la base de nuestra asociación.' },
            { icono: '⚽', titulo: 'Pasión por el fútbol', texto: 'El amor por este deporte nos une semana tras semana.' },
            { icono: '🏘️', titulo: 'Compromiso con Nerja', texto: 'Orgullosos de representar a nuestra ciudad en cada partido.' },
            { icono: '❤️', titulo: 'Acción social', texto: 'Colaboramos activamente con causas benéficas de nuestra comunidad.' },
          ].map(v => (
            <div key={v.titulo} style={{
              backgroundColor: 'var(--blanco)',
              border: '1px solid var(--azul-claro)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{v.icono}</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)', marginBottom: '6px' }}>{v.titulo}</div>
              <div style={{ fontSize: '12px', color: 'var(--azul-medio)', lineHeight: '1.5' }}>{v.texto}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Directiva y responsables */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid var(--azul-claro)' }}>
          👥 Directiva y responsables
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {[
            { cargo: 'Planificación', nombre: 'Por confirmar' },
            { cargo: 'Cuotas', nombre: 'Por confirmar' },
            { cargo: 'Entrenamientos', nombre: 'Por confirmar' },
            { cargo: 'Redes Sociales', nombre: 'Por confirmar' },
            { cargo: 'Petos', nombre: 'Por confirmar' },
          ].map(r => (
            <div key={r.cargo} style={{
              backgroundColor: 'var(--blanco)',
              border: '1px solid var(--azul-claro)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: 'var(--azul-marino)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '18px', flexShrink: 0,
              }}>👤</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-marino)' }}>{r.nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--azul-medio)', marginTop: '2px' }}>{r.cargo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reglamento */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid var(--azul-claro)' }}>
          📋 Reglamento
        </h2>
        <div style={{ backgroundColor: 'var(--blanco)', border: '1px solid var(--azul-claro)', borderRadius: '12px', padding: '24px' }}>
          {[
            { titulo: 'Cuota anual', texto: 'La cuota de socio es de 60€ por temporada (septiembre a julio).' },
            { titulo: 'Asistencia', texto: 'El compromiso mínimo es de 15 entrenamientos por temporada.' },
            { titulo: 'Penalización', texto: 'Apuntarse a un entreno y no asistir sin avisar resta una asistencia del total.' },
            { titulo: 'Premios de asistencia', texto: '🥇 Mayor asistencia: el socio con mayor asistencia a entrenos y eventos al finalizar la temporada recibe un premio especial.\n\n🎲 Sorteo: entre los clasificados del 2.º al 10.º puesto del ranking final de asistencias se realiza un sorteo con un segundo premio.\n\nEl valor de ambos premios puede variar cada temporada.' },
          ].map((r, i) => (
            <div key={r.titulo} style={{
              display: 'flex', gap: '12px', padding: '12px 0',
              borderBottom: i < 3 ? '1px solid var(--azul-palido)' : 'none',
            }}>
              <div style={{
                minWidth: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: 'var(--azul-marino)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '700', flexShrink: 0, marginTop: '2px',
              }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--azul-marino)', marginBottom: '2px' }}>{r.titulo}</div>
                <div style={{ fontSize: '13px', color: 'var(--azul-medio)', lineHeight: '1.5' }}>{r.texto}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

     {/* Redes sociales */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '20px', fontWeight: '600', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid var(--azul-claro)' }}>
          📱 Síguenos
        </h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <a href="https://www.facebook.com/profile.php?id=61551139957241" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: '#1877F2', color: 'white',
            padding: '12px 20px', borderRadius: '10px',
            textDecoration: 'none', fontSize: '14px', fontWeight: '600',
          }}>
            Facebook — A.F.V. Nerja
          </a>
          <a href="https://www.instagram.com/vetfcnerja" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: '#E1306C', color: 'white',
            padding: '12px 20px', borderRadius: '10px',
            textDecoration: 'none', fontSize: '14px', fontWeight: '600',
          }}>
            Instagram — @vetfcnerja
          </a>
        </div>
      </div>

    </div>
  )
}