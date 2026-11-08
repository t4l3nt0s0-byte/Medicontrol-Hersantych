# MediControl — Instalar y usar SIN internet (versión corregida)

IMPORTANTE: sube TODOS estos archivos juntos, en el MISMO nivel (sin carpetas).
Así ya están aquí; no crees ninguna carpeta.

Archivos (todos a la raíz del repositorio):
- index.html
- app.js
- tailwind.css
- manifest.json
- sw.js
- icon-192.png, icon-512.png, icon-180.png
- react.production.min.js
- react-dom.production.min.js
- jspdf.umd.min.js
- jspdf.plugin.autotable.min.js

## Por qué estaba en blanco
La versión anterior buscaba las librerías dentro de una carpeta "lib/".
Al subirlas sueltas, no las encontraba y la pantalla quedaba vacía.
Esta versión las busca en la raíz, igual que como tú las subes.

## Pasos para actualizar tu página
1. En tu repositorio borra los archivos viejos (o súbelos encima reemplazando).
2. Sube TODOS los de este ZIP a la raíz.
3. En el celular: desinstala la app vieja y, en el navegador, entra a los
   ajustes del sitio y toca "Borrar datos" (esto quita el service worker viejo).
4. Abre la página otra vez CON internet. Verás el botón "Instalar app".
5. Instálala. Ya funciona sin internet.

## Compartir por QR
Dentro de la app, botón flotante 📲 → muestra el QR para que otra persona
lo escanee e instale en su teléfono. Cada quien guarda su propia información.
