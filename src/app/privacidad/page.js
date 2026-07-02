export default function Privacidad() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>

      <h1 style={{ color: 'var(--azul-marino)', fontSize: '26px', fontWeight: '600', marginBottom: '8px' }}>
        Política de Privacidad
      </h1>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '32px' }}>
        Última actualización: julio de 2026
      </p>

      {/* RESPONSABLE */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
          1. Responsable del tratamiento
        </h2>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7' }}>
          <strong>Nombre:</strong> Asociación de Fútbol Veteranos de Nerja (A.F.V. Nerja)<br />
          <strong>NIF/CIF:</strong> [PENDIENTE: incluir NIF de la asociación]<br />
          <strong>Dirección:</strong> [PENDIENTE: incluir dirección de la sede social]<br />
          <strong>Email de contacto:</strong> [PENDIENTE: incluir email de contacto]<br />
          <strong>Web:</strong> https://afvnerja.vercel.app
        </p>
      </div>

      {/* DATOS QUE RECOGEMOS */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
          2. ¿Qué datos tratamos y para qué?
        </h2>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7', marginBottom: '10px' }}>
          La asociación trata los siguientes datos personales de sus socios:
        </p>
        <div style={{ backgroundColor: 'var(--azul-palido)', borderRadius: '8px', padding: '16px', fontSize: '14px', color: '#333', lineHeight: '1.8' }}>
          <p style={{ marginBottom: '8px' }}>
            <strong>Nombre y apodo:</strong> identificación en la web pública de la asociación, listas de entreno, rankings de asistencia y estadísticas de temporada.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Fotografía:</strong> publicación en la sección "Plantilla" de la web, visible para cualquier visitante. Se requiere consentimiento expreso del socio.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Teléfono y fecha de nacimiento:</strong> uso interno de la asociación para gestión y comunicaciones. Estos datos <strong>nunca se publican</strong> en la web.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>Datos de asistencia y goles:</strong> publicados en la web en forma de estadísticas y rankings anónimos o con nombre/apodo, sin datos de contacto asociados.
          </p>
          <p>
            <strong>Datos de cuotas y pagos:</strong> uso interno exclusivo para gestión económica de la asociación. Nunca se publican.
          </p>
        </div>
      </div>

      {/* BASE LEGAL */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
          3. Base legal del tratamiento
        </h2>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7' }}>
          El tratamiento de los datos personales se basa en:
        </p>
        <ul style={{ fontSize: '14px', color: '#333', lineHeight: '1.8', paddingLeft: '20px', marginTop: '8px' }}>
          <li><strong>Ejecución de la relación asociativa:</strong> gestión de socios, cuotas, asistencias y actividades de la asociación (art. 6.1.b RGPD).</li>
          <li style={{ marginTop: '6px' }}><strong>Consentimiento expreso:</strong> publicación de nombre, apodo y fotografía en la web pública (art. 6.1.a RGPD). El socio puede retirar este consentimiento en cualquier momento.</li>
          <li style={{ marginTop: '6px' }}><strong>Interés legítimo:</strong> publicación de estadísticas de asistencia y goles con nombre/apodo para el correcto funcionamiento de la actividad deportiva de la asociación (art. 6.1.f RGPD).</li>
        </ul>
      </div>

      {/* CONSERVACIÓN */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
          4. ¿Cuánto tiempo conservamos tus datos?
        </h2>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7' }}>
          Los datos se conservan durante el tiempo en que el interesado sea socio activo de la asociación. En caso de baja, los datos serán eliminados o anonimizados en un plazo máximo de 12 meses, salvo que exista obligación legal de conservarlos por un período mayor (por ejemplo, datos contables o fiscales).
        </p>
      </div>

      {/* DESTINATARIOS */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
          5. ¿Con quién compartimos tus datos?
        </h2>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7' }}>
          Los datos no se ceden a terceros salvo obligación legal. La asociación utiliza los siguientes servicios de terceros para el funcionamiento de la web, con los que existe la correspondiente relación de encargado de tratamiento:
        </p>
        <ul style={{ fontSize: '14px', color: '#333', lineHeight: '1.8', paddingLeft: '20px', marginTop: '8px' }}>
          <li><strong>Supabase</strong> (base de datos y almacenamiento) — política de privacidad en supabase.com/privacy</li>
          <li style={{ marginTop: '6px' }}><strong>Vercel</strong> (alojamiento web) — política de privacidad en vercel.com/legal/privacy-policy</li>
          <li style={{ marginTop: '6px' }}><strong>Telegram</strong> (notificaciones internas) — las notificaciones se envían únicamente a los responsables de la asociación, no a terceros</li>
        </ul>
      </div>

      {/* DERECHOS */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
          6. Tus derechos
        </h2>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7', marginBottom: '10px' }}>
          En virtud del RGPD y la LOPDGDD, puedes ejercer los siguientes derechos contactando con la asociación en el email indicado:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {[
            { derecho: '✅ Acceso', desc: 'Saber qué datos tuyos tenemos' },
            { derecho: '✏️ Rectificación', desc: 'Corregir datos inexactos' },
            { derecho: '🗑️ Supresión', desc: 'Solicitar que borremos tus datos' },
            { derecho: '⛔ Oposición', desc: 'Oponerte a ciertos tratamientos' },
            { derecho: '🔒 Limitación', desc: 'Limitar el uso de tus datos' },
            { derecho: '📦 Portabilidad', desc: 'Recibir tus datos en formato digital' },
          ].map(d => (
            <div key={d.derecho} style={{ backgroundColor: 'var(--azul-palido)', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--azul-marino)', marginBottom: '4px' }}>{d.derecho}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{d.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '13px', color: '#666', marginTop: '12px' }}>
          También tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) en <a href="https://www.aepd.es" target="_blank" style={{ color: 'var(--azul-medio)' }}>www.aepd.es</a> si consideras que el tratamiento de tus datos no es correcto.
        </p>
      </div>

      {/* SEGURIDAD */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
          7. Seguridad
        </h2>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7' }}>
          La asociación aplica medidas técnicas y organizativas adecuadas para proteger los datos personales contra accesos no autorizados, pérdida o destrucción accidental. Los datos sensibles (teléfono, fecha de nacimiento, cuotas) solo son accesibles para los administradores de la asociación mediante acceso autenticado.
        </p>
      </div>

      {/* CAMBIOS */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ color: 'var(--azul-marino)', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
          8. Cambios en esta política
        </h2>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.7' }}>
          La asociación puede actualizar esta política cuando sea necesario. Cualquier cambio relevante se comunicará a los socios. La fecha de última actualización siempre aparece al inicio de este documento.
        </p>
      </div>

      <div style={{ borderTop: '1px solid var(--azul-claro)', paddingTop: '20px', marginTop: '32px' }}>
        <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
          A.F.V. Nerja · afvnerja.vercel.app · Nerja, Málaga
        </p>
      </div>

    </div>
  )
}