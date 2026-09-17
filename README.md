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
- `npm run clean:runtime`

`NEXT_PUBLIC_API_BASE` configura la base pública de la API. Por defecto es
`/api`, por lo que el frontend desplegado usa `https://notes.neticar.com.ar/api`.
La sesión usa cookies `HttpOnly`, `Secure` y `SameSite=Strict`.
Los artefactos temporales de Sites se pueden limpiar con `npm run clean:runtime`;
`npm run install:ci` limpia automáticamente la caché npm y el preflight al terminar.

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

## Instalación como aplicación

La aplicación incluye `manifest.webmanifest` para instalarse como app en el
celular, con nombre corto, modo `standalone`, colores de Notas e iconos en
`public/icons/`. El diseño del icono conserva el favicon actual: fondo violeta,
cuadrado lavanda y estrella central.

La instalación no usa service worker: no hay funcionamiento offline ni una
capa adicional que retenga una versión vieja. Cada push a `main` pasa por CI,
construye la imagen y solicita el deploy del servicio `notes web`. La nueva
versión se obtiene al volver a abrir o recargar la app instalada, según la
revalidación normal del navegador o del edge que sirva los assets.

Si el acceso directo se creó antes de agregar el manifest, eliminá el icono de
la pantalla de inicio y volvé a instalar la app desde la versión desplegada
para que tome el nombre, modo e icono del manifest. Si el icono cambia en el
futuro, publicá nuevos nombres de archivo y actualizá el manifest para evitar
que el cache conserve el anterior.
