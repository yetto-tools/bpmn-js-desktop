# Modelador BPMN autoalojado

Aplicación web completa para modelar diagramas BPMN 2.0, en español y pensada
para instalarse **on-premise**. No usa CDN, no hace llamadas a internet y no
requiere backend: todo el modelado ocurre en el navegador.

## Contenido

| Archivo | Función |
|---|---|
| `index.html` | página de la aplicación |
| `app.js` | modelador, acciones de archivo, autoguardado y atajos |
| `app.css` | estilos de la cabecera y el lienzo |
| `export.js` | rasterizado del diagrama a PNG |
| `validate.mjs` | validación de archivos `.bpmn` por línea de comandos |
| `.bpmnlintrc` | reglas de validación (compartidas por la app y el comando) |
| `translations/lint-es.js` | mensajes de validación en español |
| `translations/simulation-es.js` | etiquetas del simulador en español |
| `translations/es.js` | catálogo de traducciones al español (cobertura completa) |
| `translations/customTranslate.js` | servicio `translate` que sustituye al de bpmn-js |
| `serve.mjs` | servidor estático mínimo, sin dependencias |
| `sync-vendor.mjs` | copia `../dist` y `build/out` a `vendor/` |
| `build/` | genera el bundle del panel de propiedades (ver abajo) |
| `vendor/` | bundle de bpmn-js, panel y recursos (generado, no versionado) |

## Puesta en marcha

```bash
# 1. generar el bundle de la librería (solo si ../dist no existe o cambió lib/)
npm run distro

# 2. construir el panel de propiedades (una sola vez)
npm --prefix app/build install
npm --prefix app/build run build

# 3. copiar el bundle y los recursos dentro de app/vendor
npm run app:sync

# 4. levantar el servidor local
npm run app
# → http://127.0.0.1:3000
```

### Por qué el panel se construye aparte

`bpmn-js-properties-panel` se publica solo como módulos ES y arrastra Preact,
así que necesita empaquetarse para poder cargarse con una etiqueta `<script>`.
Sus dependencias viven en `app/build/` y no en el repositorio, porque el panel
exige `camunda-bpmn-moddle >= 7` mientras que las pruebas de `bpmn-js` usan la
versión 4: instalarlo en la raíz rompería `npm test`.

El bundle solo incluye los proveedores de BPMN estándar; los de Camunda y
Zeebe se dejan fuera a propósito.

Opciones del servidor:

```bash
node app/serve.mjs --port 8080 --host 0.0.0.0   # accesible desde la red local
```

## Despliegue on-premise

Tras ejecutar `npm run app:sync`, la carpeta `app/` es autocontenida: se puede
copiar tal cual al servidor web que uses. Son archivos estáticos, sin proceso
de build ni runtime de servidor.

- **IIS / Apache / nginx**: publica la carpeta `app/` como raíz del sitio.
- **Node**: copia la carpeta y ejecuta `node serve.mjs --host 0.0.0.0 --port 8080`.
- **Contenedor**: cualquier imagen de servidor estático sirve; monta `app/` en el
  directorio público (`/usr/share/nginx/html` en la imagen de nginx).

Sirve la aplicación por HTTPS si va a estar accesible fuera de la máquina; los
navegadores restringen algunas APIs en orígenes no seguros.

## Funciones

**Archivo**

- **Nuevo**: descarta el diagrama actual y crea uno vacío.
- **Abrir…**: carga un `.bpmn` del disco (`Ctrl+O`). También se puede arrastrar
  y soltar el archivo sobre la ventana.
- **Guardar**: descarga el diagrama como `.bpmn` (`Ctrl+S`).
- **SVG** / **PNG**: descarga el diagrama como imagen. El PNG se genera a doble
  resolución y con fondo blanco.

**Autoguardado**

Cada cambio se guarda en el `localStorage` del navegador tras 800 ms de
inactividad, y el diagrama se restaura al volver a abrir la página. La
cabecera muestra la hora del último guardado automático. Es una red de
seguridad ante recargas o cierres accidentales, no un sistema de persistencia
compartida: los datos viven solo en ese navegador y en esa máquina. Para
conservar un diagrama, descárgalo.

**Edición**

Deshacer/rehacer (`Ctrl+Z` / `Ctrl+Y`), zoom, ajuste al lienzo y todos los
atajos propios de bpmn-js. La interfaz —paleta, menús contextuales, panel de
propiedades y mensajes de error— está en español.

**Panel de propiedades**

Al seleccionar un elemento, el panel lateral permite editar su nombre, su ID,
la documentación y los atributos propios de cada tipo (definiciones de evento,
condiciones de finalización, referencias de mensaje o señal, etc.). Los
cambios se aplican al diagrama al instante y entran en el autoguardado. El
botón **Propiedades** de la barra lo pliega y despliega, y la preferencia se
recuerda entre sesiones.

## Probar los modelos

La aplicación incluye tres formas de comprobar un diagrama, de menor a mayor
coste:

**1. Validación en vivo.** Mientras modelas, las reglas de `bpmnlint` se
aplican al diagrama y los elementos con problemas se marcan sobre el lienzo.
El botón **Validación** abre la lista de problemas, en español, ordenada con
los errores primero; al pulsar uno se selecciona y se centra el elemento
afectado. El contador del botón indica cuántos hay pendientes.

Las reglas se configuran en `.bpmnlintrc`. Por defecto se usa el conjunto
`bpmnlint:recommended` (evento de inicio y de fin obligatorios, elementos sin
nombre, elementos desconectados, compuertas mal usadas, flujos duplicados…).
Para cambiarlas, edita ese archivo y reconstruye:

```bash
npm --prefix app/build run build && npm run app:sync
```

Puedes añadir reglas propias siguiendo la
[documentación de bpmnlint](https://github.com/bpmn-io/bpmnlint); van en un
paquete `bpmnlint-plugin-<nombre>` referenciado desde `.bpmnlintrc`.

**2. Simulación del flujo.** El botón **Simular** activa el modo simulación:
pulsa el evento de inicio para lanzar un token y síguelo por el proceso,
eligiendo el camino en cada compuerta. Sirve para detectar caminos muertos,
bucles no deseados o compuertas mal conectadas antes de ejecutar nada.

**3. Validación por línea de comandos.** Las mismas reglas, aplicables a
archivos sueltos o carpetas enteras:

```bash
npm run app:validate -- diagrama.bpmn
npm run app:validate -- --strict procesos/     # las advertencias también fallan
npm run app:validate -- --json diagrama.bpmn   # salida para otras herramientas
```

Termina con código `1` si hay errores, así que se puede usar como paso de un
pipeline o como comprobación previa a publicar un diagrama.

Para probar la **ejecución real** del proceso (variables, workers, timers)
hace falta un motor; consulta `camunda/tests/README.md`.

## Actualizar las traducciones

El catálogo `translations/es.js` cubre tanto el modelador como el panel de
propiedades: ambos piden sus textos al servicio `translate` de diagram-js. Si
al actualizar bpmn-js aparecen textos en inglés, añádelos a ese archivo: la
clave es el texto original en inglés y el valor, su traducción. Las variables
entre llaves (`{element}`) deben conservarse.

Dos partes no pasan por ese servicio y tienen su propio archivo:

- `translations/lint-es.js` — los mensajes de las reglas de validación, que
  bpmnlint emite en inglés. Incluye patrones para los mensajes con partes
  variables.
- `translations/simulation-es.js` — las etiquetas del simulador, fijadas en el
  código del paquete. Se sustituyen sobre el DOM mientras la simulación está
  activa, así que al actualizar `bpmn-js-token-simulation` conviene revisar
  que los textos sigan coincidiendo; si cambian, simplemente dejan de
  traducirse (no se rompe nada).

Los controles propios de esos dos paquetes (el indicador de errores y el
interruptor «Token Simulation») están ocultos por CSS, porque la barra
superior ya ofrece los equivalentes en español.

## Actualizar la librería

La aplicación consume el bundle del propio repositorio. Después de cambiar
`lib/` o de actualizar el repo:

```bash
npm run distro && npm run app:sync
```
