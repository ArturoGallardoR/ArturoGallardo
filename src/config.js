// ─────────────────────────────────────────────────────────────
//  Configuración del sitio. Lo único que hay que editar para
//  conectar la agenda y los datos de contacto. Ver README.md.
// ─────────────────────────────────────────────────────────────
export const SITE = {
  name: 'Arturo Gallardo',

  booking: {
    // 'cal'    → Cal.com (recomendado): conectado a Google Calendar, muestra
    //            disponibilidad real, crea el evento + Google Meet y envía
    //            confirmación y recordatorios.
    // 'google' → Página de reservas de Google Calendar (Appointment schedule).
    provider: 'cal',

    cal: {
      // Usuario/evento de Cal.com, p. ej. 'arturo-gallardo/primera-llamada'.
      // También acepta la URL completa: 'https://cal.com/arturo-gallardo/primera-llamada'.
      link: 'https://cal.com/arturo-gallardo/15min',
      // Cambia a 'https://app.cal.eu' si la cuenta se crea en la región UE.
      origin: 'https://app.cal.com',
    },

    google: {
      // URL pública de la página de reservas, p. ej. 'https://calendar.app.google/XXXXXXXX'
      url: '',
    },

    durationMinutes: 15,
    timeZone: 'America/Mexico_City',
  },

  // Canales de respaldo si la agenda no carga. Deja vacío lo que no aplique.
  contact: {
    whatsapp: '', // solo dígitos con lada de país, p. ej. '5215512345678'
    email: '',
  },

  legal: {
    // Agentes de seguros en México: muestra tu cédula CNSF.
    cedula: '',
    privacyUrl: '', // Aviso de privacidad (LFPDPPP)
  },
};
