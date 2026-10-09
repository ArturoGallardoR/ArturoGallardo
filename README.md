# Arturo Gallardo · Vivir es increíble

Landing para agendar la primera llamada (15 min) con Arturo Gallardo, asesor patrimonial GNP.
Basada en el Kit A de marca (`../brand-identity/arturo-gallardo/kit/A`).

Stack: Vite · GSAP (ScrollTrigger, SplitText) · Lenis · three.js · Cal.com (agenda).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas de la lógica de agenda
npm run build    # genera dist/
```

## 1. Conectar la agenda con Google Calendar (Cal.com, recomendado)

Cal.com lee la disponibilidad real del Google Calendar de Arturo, crea el evento con liga de Google Meet y manda confirmación y recordatorios. El plan gratuito alcanza.

1. Crear cuenta en https://cal.com con la cuenta de Google de Arturo.
2. **Settings → Calendars**: conectar Google Calendar. Marcar los calendarios que bloquean horarios y elegir en cuál se crean las citas.
3. **Settings → Conferencing**: instalar Google Meet y dejarlo como predeterminado.
4. **Availability**: definir horario y zona `America/Mexico_City`.
5. **Event Types → New**: crear "Primera llamada", 15 min, slug `primera-llamada`.
   - *Limits*: buffer de 5 a 10 min antes y después, aviso mínimo de 4 h.
   - *Advanced → Booking questions*: agregar "WhatsApp" (teléfono, obligatorio) y "¿Qué te gustaría proteger?" (texto, opcional). El sitio llena la nota con el plan que eligió el lead.
6. Copiar el link (`https://cal.com/USUARIO/primera-llamada`) y pegarlo en `src/config.js`:

```js
cal: { link: 'https://cal.com/USUARIO/primera-llamada', origin: 'https://app.cal.com' },
```

El embed toma los colores de marca, guarda `utm_*`, `gclid` y `fbclid` en la cita (metadata) para saber de qué campaña vino cada lead, y dispara `booking_success` en `window.dataLayer` por si después se agrega GA4 o GTM.

**Alternativa sin Cal.com:** página de reservas de Google Calendar (*Crear → Agenda de citas*). Pega su URL pública en `booking.google.url` y cambia `provider: 'google'`. Se ve menos integrada y no se puede tematizar.

Si no hay agenda configurada o no carga, el sitio muestra botones de WhatsApp o correo (`contact` en `src/config.js`).

## 2. Pendientes de contenido

- [x] Foto de Arturo (`public/img/arturo-gallardo.webp`, recorte con fondo transparente sobre el duotono de marca).
- [x] Liga de Cal.com conectada.
- [ ] Calendario en español: en Cal.com, *Settings → General → Language → Español* (el embed usa el idioma del perfil).
- [ ] `contact.whatsapp` y `contact.email` en `src/config.js`.
- [ ] `legal.cedula` (cédula CNSF) y `legal.privacyUrl` (aviso de privacidad, requerido por la LFPDPPP porque la agenda recoge datos personales).
- [ ] Validar con Arturo los textos de producto. Salen de las fichas públicas de GNP (Decide, Consolida, Profesional, Auto, Hogar) y van acompañados de una nota legal en el footer.

## 3. Despliegue

**GitHub Pages:** subir este directorio como repo y activar *Settings → Pages → Source: GitHub Actions*. El workflow `.github/workflows/deploy.yml` corre pruebas, construye y publica en cada push a `main`. `base: './'` en `vite.config.js` hace que funcione bajo `/<repo>/`.

**Cloudflare Pages (con dominio):** conectar el repo. Build command `npm run build`, output `dist`, variable `NODE_VERSION=22`. `public/_headers` define caché y cabeceras de seguridad. Después de agregar el dominio, apagar el workflow de GitHub Pages.

## 4. Video del hero

Hecho con HyperFrames (HTML + GSAP renderizado a video) en `../videos/hero-loop`. Dura 8 s, el último cuadro coincide con el primero y no tiene texto (el titular va en HTML).

```bash
cd ../videos/hero-loop
npx hyperframes render . -q high -o ./renders/hero-loop.mp4
# luego reexportar a web (ver comandos ffmpeg en el historial del proyecto):
#   hero-1080.webm (VP9), hero-1080.mp4 y hero-720.mp4 (H.264), hero-poster.jpg
```

## Estructura

```
src/config.js            ← agenda, contacto, legales (lo único a editar)
src/main.js              ← Lenis, GSAP, loader, reveals, pin del hilo
src/js/thread-path.js    ← geometría del hilo: pulso→corazón, casa, brote, coche y AG (probada)
src/js/thread-scene.js   ← three.js: dibuja el hilo con el scroll y encuadra cada símbolo
src/js/booking*.js       ← embed de Cal.com / Google y lógica probada
src/js/education.js      ← tarjetas de mitos y "¿Y si mañana…?"
src/js/cursor.js         ← puntero de marca
src/js/brand.js          ← trazos oficiales del logo (no redibujar)
```

Accesibilidad: con `prefers-reduced-motion` se apagan Lenis, el loader y el pin, el video se pausa y el hilo se muestra completo. El puntero propio solo aparece con mouse o trackpad.
