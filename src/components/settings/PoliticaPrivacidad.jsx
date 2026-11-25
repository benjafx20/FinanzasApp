// Texto de la política de privacidad que se muestra en Ajustes.
export function PoliticaPrivacidad() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, lineHeight: 1.5 }}>
      <p>Última actualización: noviembre de 2026. Esta política explica qué datos guarda la app Mis Finanzas y para qué.</p>
      <section>
        <strong>Qué datos guardamos</strong>
        <p>
          Tu correo y contraseña (la contraseña la gestiona el servicio de acceso, nunca la vemos), tus gastos, ingresos, categorías,
          deudas, metas, presupuestos y las fotos de las boletas que decidas guardar como comprobante.
        </p>
      </section>
      <section>
        <strong>Para qué los usamos</strong>
        <p>Solo para mostrarte tus propias finanzas dentro de la app. No vendemos ni compartimos tus datos con fines comerciales.</p>
      </section>
      <section>
        <strong>Dónde se guardan y quién más participa</strong>
        <p>
          Los datos se guardan en Supabase y la app se publica en Netlify. Si usas el escaneo de boletas o el asistente, se envían a Gemini
          (Google) solo en ese momento y con tu permiso. Estos servicios están fuera de Chile.
        </p>
      </section>
      <section>
        <strong>Tus derechos</strong>
        <p>
          Puedes ver y corregir tus datos en la app, descargar un respaldo en Excel, retirar el permiso de IA y eliminar tu cuenta
          completa desde Ajustes, Privacidad. Al eliminarla se borran tus datos y tus fotos.
        </p>
      </section>
      <section>
        <strong>Seguridad</strong>
        <p>
          Cada usuario solo puede leer y modificar sus propios datos, la conexión es cifrada y se guarda un registro de los cambios
          (qué tabla y qué operación, sin los montos).
        </p>
      </section>
      <section>
        <strong>Si hay un problema</strong>
        <p>
          Si ocurre un incidente que afecte tus datos, te avisaremos por correo lo antes posible, indicando qué pasó y qué debes hacer.
        </p>
      </section>
    </div>
  );
}
