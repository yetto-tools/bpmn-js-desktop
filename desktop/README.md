# Aplicación de escritorio

Empaqueta el modelador como aplicación de Windows con Electron, y genera un
instalador con accesos directos y desinstalador.

La interfaz es exactamente la misma aplicación web de `../app`: se copia dentro
del paquete y se sirve desde un servidor local en un puerto libre. No se carga
con `file://` porque el modelador usa módulos ES y el navegador los bloquea en
ese esquema.

## Construir el instalador

```bash
# 1. la aplicación web debe estar lista (bundles incluidos)
cd ..
npm --prefix app/build run build
npm run app:sync

# 2. copiar la aplicación dentro del paquete y construir
cd desktop
npm install
node prepare-app.mjs
npm run dist
```

El resultado queda en `dist/`:

| Archivo | Qué es |
|---|---|
| `Modelador-BPMN-1.0.0-instalador.exe` | instalador NSIS (~79 MB) |
| `win-unpacked/` | la aplicación ya montada, ejecutable sin instalar |

`npm run dist:dir` genera solo `win-unpacked/`, sin instalador: útil para
probar cambios sin esperar al empaquetado completo.

## El instalador

- Pide la carpeta de instalación (no es de un solo clic).
- Instala por usuario, así que **no requiere permisos de administrador**.
- Crea acceso directo en el escritorio y en el menú de inicio.
- Registra el desinstalador en «Aplicaciones instaladas».
- Está en español.

## Detalles de la configuración

**Sin firma digital.** `signAndEditExecutable: false` en `package.json`. Firmar
requiere descargar las herramientas de firma de electron-builder, cuya
extracción falla en Windows sin privilegios para crear enlaces simbólicos. La
consecuencia es que Windows mostrará el aviso de SmartScreen la primera vez que
se ejecute el instalador, y que el `.exe` usa el icono por defecto de Electron
(el instalador y los accesos directos sí llevan el icono propio). Para
distribuirlo fuera de tu organización conviene firmarlo con un certificado real:
basta añadir `certificateFile` y `certificatePassword`, y quitar esa línea.

**La carpeta se llama `web`, no `app`.** electron-builder reserva el nombre
`app` para el directorio de la aplicación y buscaría allí su propio punto de
entrada.

**Menú en español** con las acciones del modelador (archivo, edición, vista,
ayuda), que se comunican con la interfaz web pulsando sus botones.

**Una sola instancia**: si se abre la aplicación otra vez, se enfoca la ventana
existente en lugar de abrir una segunda.

## Diferencias respecto a la versión servida

- El autoguardado vive en los datos de la aplicación, no en el navegador: cada
  instalación tiene su propio historial.
- No hay que arrancar ningún servidor ni recordar una URL.
- El puerto interno es aleatorio y solo escucha en `127.0.0.1`, así que no
  interfiere con otros servicios ni es accesible desde la red.

## Actualizar la aplicación empaquetada

Después de cambiar la aplicación web:

```bash
cd .. && npm run app:sync && cd desktop
node prepare-app.mjs
npm run dist
```

Sube el número de `version` en `package.json` para que el instalador refleje la
nueva versión.
