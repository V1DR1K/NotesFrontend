# Cuaderno

Frontend Vinext sobre Vite para `notes.neticar.com.ar`, conectado al backend real de
Notas mediante cookies de sesión HttpOnly. La interfaz conserva el lenguaje visual
oscuro y editorial de la maqueta, pero no depende de fixtures en runtime.

## Desarrollo

- Node.js `24.18+`
- `npm ci`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm test`

`NEXT_PUBLIC_API_BASE` configura la base pública de la API. Por defecto es
`/api`, por lo que el frontend desplegado usa `https://notes.neticar.com.ar/api`.
La sesión usa cookies `HttpOnly`, `Secure` y `SameSite=Strict`.

## Backend

El cliente cubre autenticación central, configuración, dashboard, días, notas,
movimientos financieros, carpetas y archivos multipart. Los errores ProblemDetail
se convierten en mensajes aptos para la interfaz. El cliente renueva el access
token por `/api/auth/refresh` y muestra el cambio de contraseña requerido por Auth
central.

La paginación interna respeta las páginas 0-based del backend y solo muestra
controles 1-based al usuario. El nombre de los archivos es también su título,
editable y buscable. Las clasificaciones de
Finanzas se filtran por su tipo configurado: ingreso, egreso o transferencia.

## Docker y CI

`Dockerfile` usa Node 24 en tres etapas, compila Vinext, ejecuta como usuario no
root y verifica `/` con un healthcheck. El workflow `.github/workflows/ci.yml`
ejecuta `npm ci`, lint y build; en `main` publica:

- `ghcr.io/v1dr1k/notes-frontend:latest`
- `ghcr.io/v1dr1k/notes-frontend:<commit-sha>`

Después solicita al VPS `sudo /opt/infra/bin/deploy-service notes web <SHA>`.
