# SmartCampus AR - Guía Multimodal de Laboratorios (Docker Edition)

Aplicación web móvil desplegada en Docker que guía a estudiantes y visitantes
por los laboratorios de la facultad usando los **sensores del teléfono**
(brújula, acelerómetro, cámara y micrófono). La interfaz se adapta al contexto
físico (caminata e iluminación) y permite interacción **Zero-Touch** por voz,
inclinación y gesto *shake*.

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) con Docker Compose v2.
- Un PC y un smartphone conectados a **la misma red Wi-Fi**.

## Levantar la aplicación (único comando)

```bash
docker compose up -d --build
```

El servicio `smartcampus-hci-web` compila la imagen `node:20-alpine`, instala
dependencias y sirve Vite por **HTTPS** en el puerto `5173` con *hot-reload*
habilitado (el código fuente se monta como volumen).

## Modo producción (recomendado para instalar en el celular)

El servicio `smartcampus-hci-prod` construye el sitio estático y lo sirve con
**nginx por HTTPS** en el puerto **`8443`**. En este modo el *service worker* y
el manifest funcionan de forma fiable, que es lo que **Chrome/Android exige
para ofrecer "Instalar app"** (en modo dev Chrome suele mostrar solo
"Crear acceso directo").

Hay **dos formas** de conseguir un HTTPS que Chrome acepte para instalar:

### Opción A: Túnel HTTPS (recomendado, sin instalar nada en el celular)

El servicio `tunnel` (Cloudflare Quick Tunnel) expone la PWA en una URL pública
`https://<algo>.trycloudflare.com` con **certificado válido y real**. Chrome
ofrece "Instalar app" al instante, **sin instalar ninguna CA en el celular**,
en cualquier dispositivo.

```bash
docker compose up -d --build smartcampus-hci-prod tunnel
docker compose logs -f tunnel     # aquí aparece la URL https://<algo>.trycloudflare.com
```

Copia la URL `https://<algo>.trycloudflare.com` que imprimen los logs y ábrela
en el celular.

> - La URL es **pública**: cualquiera con el enlace puede entrar. Úsala solo
>   mientras haces pruebas.
> - Es **temporal**: cambia si reinicias el contenedor `tunnel`.
> - Requiere **internet** en el celular (no basta la Wi-Fi local).

### Opción B: Certificado de CA local (100% red local, sin internet)

Si necesitas que funcione **sin internet** y solo en tu Wi-Fi, usa un
certificado emitido por una **CA local**. Chrome no permite instalar sobre un
certificado autofirmado en IP de LAN, así que hay que confiar en la CA **en
cada dispositivo**.

#### 1. Genera el certificado (una sola vez en el PC)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\gen-certs.ps1 -Ip 192.168.100.11
```

Esto crea en `certs/`:

| Archivo        | Uso                                                    |
| -------------- | ------------------------------------------------------ |
| `rootCA.crt`   | **Instalar en el celular** (certificado de confianza)  |
| `server.crt`   | Certificado del servidor (nginx)                       |
| `server.key`   | Clave del servidor                                     |
| `rootCA.key`   | Clave de la CA (**no compartir**)                      |

> Usa la IP real de tu PC. `gen-certs.ps1` añade automáticamente la IP,
> `127.0.0.1` y `localhost` como *Subject Alternative Name*.

#### 2. Construye y levanta

```bash
docker compose up -d --build smartcampus-hci-prod
```

Luego abre en el celular: `https://<IP_DE_TU_PC>:8443`

> **Importante:** escribe la URL con `https://` de forma explícita. Si Chrome
> abre `http://...:8443` verás un error `400 Bad Request` (HTTP plano a puerto
> SSL). Para evitarlo, el servicio también escucha HTTP en el puerto **`8080`**
> y **redirige automáticamente a HTTPS**, así que `http://<IP>:8080` funciona.
> Usa siempre `https://<IP_DE_TU_PC>:8443`.

```bash
docker compose logs -f smartcampus-hci-prod    # ver logs
docker compose stop  smartcampus-hci-prod      # detener
```

Puedes levantar ambos a la vez (dev en `5173` + prod en `8443`).

Para ver los logs o detener toda la app:

```bash
docker compose logs -f      # ver logs
docker compose down          # detener y eliminar los contenedores
```

## Acceso desde el celular

1. Descubre la IP local de tu PC:
   - **Windows:** `ipconfig` (dirección IPv4, ej: `192.168.1.50`)
   - **Linux/macOS:** `ip addr` o `ifconfig`
2. En el navegador del celular (Chrome o Safari), abre:
   - **Desarrollo:** `https://<IP_DE_TU_PC>:5173`
   - **Producción (instalable):** `https://<IP_DE_TU_PC>:8443`

   Ejemplo: `https://192.168.1.50:8443`

3. **Confía en el HTTPS** en el celular (necesario para instalar la PWA):
   - **Con túnel (Opción A):** no hay que hacer nada, el certificado ya es válido.
   - **Con CA local (Opción B):** instala `rootCA.crt` (abre
     `https://<IP_DE_TU_PC>:8443/rootCA.crt` y acepta el aviso) — ver
     **"Instalar como App (PWA)"** más abajo.
4. Toca **"Activar Sensores y Cámara"** en la pantalla de bienvenida y acepta
   los permisos (obligatorio en iOS 13+ que la solicitud ocurra dentro de un
   gesto del usuario).

> Si el celular no abre la página, revisa que el firewall del PC permita el
> puerto `5173` (TCP) y que ambos equipos estén en la misma red.

## Instalar como App (PWA)

La app es una **PWA instalable**: incluye `manifest.webmanifest`, iconos y un
*service worker* (funciona offline tras la primera carga).

### Android (Chrome) — Opción A: túnel HTTPS (más fácil)

1. Levanta producción + túnel:
   `docker compose up -d --build smartcampus-hci-prod tunnel`.
2. Copia la URL `https://<algo>.trycloudflare.com` que aparece en
   `docker compose logs -f tunnel`.
3. Ábrela en Chrome del celular: menú ⋮ → **"Instalar aplicación"**.
4. No hay que instalar ningún certificado.

### Android (Chrome) — Opción B: confiar en la CA local

Chrome solo ofrece **"Instalar aplicación"** si el HTTPS es de confianza y hay
*service worker* activo. Con un certificado de CA local hay que instalar la CA
en **cada** dispositivo:

1. Genera los certificados (`scripts\gen-certs.ps1`) y levanta producción
   (`docker compose up -d --build smartcampus-hci-prod`).
2. En el celular descarga la CA: abre `https://<IP_DE_TU_PC>:8443/rootCA.crt`
   (acepta el aviso de certificado la primera vez). Se guarda en *Descargas*.
3. **Ajustes → Seguridad → Cifrado y credenciales → Instalar un certificado →
   Certificado de CA** y elige `rootCA.crt`.
   - Ruta alternativa según fabricante: *Ajustes → Contraseñas y cuentas →
     Instalación desde almacenamiento*. En algunos equipos: *Ajustes → Seguridad
     → Otros ajustes de seguridad → Instalar desde almacenamiento*.
   - Acepta el aviso de que el certificado podría ser supervisado.
4. **Cierra Chrome por completo** y vuelve a abrir `https://<IP_DE_TU_PC>:8443`.
   - Verás el candado sin advertencias.
   - Menú ⋮ → **"Instalar aplicación"** (o *"Agregar a pantalla principal"*).

> Si sigue apareciendo "Crear acceso directo": revisa que el candado del sitio
> sea válido (sin "No seguro"), que el *service worker* esté activo (DevTools →
> Application → Service Workers) y que sea la versión de **producción**.

### iPhone (Safari)

- Botón **Compartir** → **"Añadir a pantalla de inicio"**.
- Para confiar en la CA: *Ajustes → General → VPN y gestión de dispositivos →
  instalar el perfil* y luego *Ajustes → General → Información → Ajustes de
  confianza de certificados → activar* la CA.

### Escritorio (Chrome/Edge)

- Icono de **instalar** en la barra de direcciones.

> En iOS abre el link primero en Safari (no en otro navegador) para ver la
> opción de instalar.

## Cómo probar la experiencia (en PC o en el celular)

- **Navegación por inclinación:** inclina el teléfono a la derecha
  (`gamma > 25°`) para ir al siguiente laboratorio; a la izquierda
  (`gamma < -25°`) para volver al anterior. Cooldown de 1.5 s.
- **Comandos de voz:** toca **Voz** y di *"siguiente"*, *"anterior"*,
  *"leer"* o *"cámara"*.
- **Shake:** agita el teléfono para iniciar/detener la lectura por voz.
- **Caminar:** en movimiento, la tarjeta se reduce a un resumen corto en
  tipografía grande y se lee automáticamente (reducción de carga cognitiva).
  El **podómetro** cuenta pasos reales con el acelerómetro y estima distancia y
  cadencia (ppm) de la sesión.
- **Vista AR:** toca **AR** para ver la cámara trasera con el HUD de brújula;
  cuando el rumbo coincide con un laboratorio aparece la tarjeta flotante y
  flechas guía hacia el más cercano.
- **Simulador (botón "Sim"):** panel *DevTools HCI* para probar todo desde un
  PC sin sensores: caminar/shake, nivel de luz (Normal, Oscuro, Sol directo),
  rotar la brújula de 0° a 360°, inclinar (gamma) y sumar/reiniciar pasos del
  podómetro.

## Temas lumínicos

| Modo   | Contexto        | Estilo                                            |
| ------ | --------------- | ------------------------------------------------- |
| normal | Interior        | Fondo claro, texto oscuro                         |
| dark   | Baja luz        | Fondo casi negro, acentos cian                    |
| solar  | Sol directo     | Fondo negro puro `#000000`, bordes amarillos 4px, tipografía extra bold |

## Estructura del proyecto

```
.
├── Dockerfile.dev            # Imagen de desarrollo (node:20-alpine)
├── Dockerfile.prod           # Build + nginx HTTPS con certs de CA local
├── docker-compose.yml        # smartcampus-hci-web (5173) + prod (8080/8443) + tunnel (Cloudflare)
├── nginx.conf                # SSL 8443, redirect 8080, descarga de rootCA.crt
├── scripts/gen-certs.ps1     # Genera CA local + certificado del servidor (OpenSSL/Docker)
├── certs/                    # rootCA.crt, server.crt, server.key (generados)
├── .dockerignore
├── vite.config.js            # Vite + basicSsl + host 0.0.0.0 + polling
├── src/
│   ├── App.jsx               # Integración + pantalla de bienvenida/permisos
│   ├── data/poiData.js       # 4 laboratorios con orientación AR e IoT
│   ├── hooks/
│   │   ├── useMotionSensors.js     # Brújula, caminata, shake, iOS 13+
│   │   ├── useStepCounter.js       # Podómetro: pasos, distancia y cadencia
│   │   ├── useMultimodalVoice.js   # TTS es-ES + comandos de voz
│   │   └── useHaptics.js           # Patrones de vibración semánticos
│   └── components/
│       ├── StatusHeader.jsx          # Estado de sensores en vivo
│       ├── ARCameraView.jsx          # Cámara + HUD de AR
│       ├── AdaptiveCardView.jsx      # Tarjeta adaptativa + telemetría IoT
│       ├── ThumbZoneControls.jsx     # Barra ergonómica inferior
│       └── SensorSimulatorDrawer.jsx # Simulador de sensores (PC)
```

## Solución de problemas

| Problema                              | Solución                                                                |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Cámara/micrófono no se activan        | Usa el túnel (cert válido) o instala la CA local (rootCA.crt) y recarga |
| Chrome solo ofrece "Crear acceso directo" | Usa el túnel `https://<algo>.trycloudflare.com`, o instala la CA local  |
| Aviso "Conexión no privada"           | Usa el túnel, o instala `rootCA.crt`; tras confiar en la CA desaparece  |
| El túnel no da URL                    | Revisa `docker compose logs -f tunnel`; requiere internet               |
| `400 Bad Request` al entrar con `:8443` | Escribe `https://` explícito, o usa `http://<IP>:8080` (redirige a HTTPS) |
| No llegan datos de brújula en iPhone  | Usa Safari; acepta el permiso de "Movimiento y orientación"             |
| El celular no conecta a la IP local   | Misma red Wi-Fi, firewall del PC permite los puertos 5173/8443          |
| El hot-reload no detecta cambios      | `CHOKIDAR_USEPOLLING=true` ya está activo; reinicia con `docker compose restart` |
