Para poder utilizar esta app debemos de tener instalado canalpeer en nuestro ordenador https://canalpeer.com

TV APP - Versión web para Windows y macOS
=========================================

CONTENIDO
- index.html, app.js, channels.js, style.css, tv-nav.js
- manifest.webmanifest, sw.js, icons/
- vendor/ (fuentes e iconos incluidos: funciona sin internet)
- server.py, server.rb, server.ps1 (servidores locales)
- Iniciar TV App (Windows).bat
- Iniciar TV App (macOS).command

REQUISITOS
- Windows 10/11 o macOS
- Navegador Chrome, Edge, Brave o Safari
- Ace Stream Media instalado (para reproducir los canales)
- En Windows: Python 3 o, si no está, PowerShell (incluido en Windows)
- En macOS: Python 3 o Ruby (incluido en macOS)

CÓMO USARLO
Windows:
  1. Descomprime el ZIP.
  2. Doble clic en "Iniciar TV App (Windows).bat".
     Si SmartScreen lo bloquea: clic derecho en el .bat > Propiedades > Desbloquear.
  3. Se abrirá el navegador en http://127.0.0.1:4173/

macOS:
  1. Descomprime el ZIP.
  2. Doble clic en "Iniciar TV App (macOS).command".
     Si macOS lo bloquea: clic derecho > Abrir.
     Si no se ejecuta, abre Terminal en esta carpeta y ejecuta:
       chmod +x "Iniciar TV App (macOS).command"
  3. Se abrirá el navegador en http://127.0.0.1:4173/

No cierres la ventana negra/Terminal mientras uses la app.

INSTALAR COMO APLICACIÓN
- Chrome/Edge: menú (tres puntos) > "Instalar TV App" o
  "Aplicaciones" > "Instalar este sitio como aplicación".
- macOS Safari: menú Archivo > "Añadir al Dock" (macOS Sonoma o superior).
La app queda como acceso directo, pero necesita que el lanzador esté en marcha.

REPRODUCIR CANALES
- Instala Ace Stream Media desde su web oficial.
- Al pulsar un canal, el navegador pedirá abrir "acestream://".
  Marca la casilla de recordar y acepta.
- Si no ocurre nada, comprueba que Ace Stream está instalado y asociado
  al protocolo acestream://.

DATOS Y COPIA DE SEGURIDAD
- Favoritos y canales personalizados se guardan en el navegador (localStorage).
- Usa "Exportar" en la app para guardar una copia JSON.
- Si borras los datos del navegador, perderás esos datos.

NOTAS
- El servidor solo escucha en 127.0.0.1 (no accesible desde otros equipos).
- La primera vez necesita conexión para cargar la página; después el
  service worker permite usarla sin internet.
- Los canales no vienen incluidos: edita channels.js o añádelos en la app.
- El puerto 4173 debe estar libre. Si está ocupado, el lanzador intentará
  abrir la app que ya esté en marcha en ese puerto.
