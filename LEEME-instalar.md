# MediControl — Instalar y usar SIN internet

Esta app funciona 100% sin conexión y se instala en el celular. Cada persona
guarda su propia información en su teléfono (no se comparte con nadie).

## 1) Subir a GitHub Pages
Sube TODO el contenido de esta carpeta (no la carpeta, su interior) al
repositorio, incluyendo la subcarpeta `lib/`:
- index.html
- app.js
- tailwind.css
- manifest.json
- sw.js
- icon-192.png, icon-512.png, icon-180.png
- lib/ (react, react-dom, jspdf, autotable)

En el repo: Settings → Pages → Branch: main → Save.

## 2) Instalar en el teléfono
Abre la página en Chrome (Android) o Safari (iPhone):
- Android: aparece abajo el botón **“Instalar app”**. Tócalo.
- iPhone: menú Compartir → **“Agregar a inicio”**.

Ábrela una vez CON internet para que se guarde. Después funciona sin datos ni wifi.

## 3) Compartir por QR
Dentro de la app toca el botón flotante **📲**. Se muestra un **código QR**;
la otra persona lo escanea con su cámara, abre la app y la instala en su
teléfono. Su información es independiente (cada quien la suya).

## Si no carga sin internet (ya la tenías instalada antes)
1. Desinstala la app / borra el acceso directo.
2. En el navegador: ajustes del sitio → **borrar datos**.
3. Abre otra vez la página CON internet y reinstala.
