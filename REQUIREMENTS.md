# Especificación de Requerimientos: "SmartCampus AR - Guía Multimodal de Laboratorios (Docker Edition)"

> **Estado de implementación (revisión contra el código fuente):**
> ✅ Implementado · ⚠️ Parcial · ❌ Pendiente

## Descripción General
Aplicación web móvil progresiva (PWA) desplegada en contenedores Docker para guiar a estudiantes y visitantes por los laboratorios de la facultad utilizando sensores del teléfono, adaptando su interfaz al contexto físico y permitiendo interacción sin tocar la pantalla (Zero-Touch).

## Requerimientos de Infraestructura (Docker & Red Móvil)
- ✅ **RI.1 Contenedor de Desarrollo con Hot-Reload:** ✅ Implementado. `docker-compose.yml` servicio `smartcampus-hci-web` (`container_name: smartcampus-ar-movil-dev`), `Dockerfile.dev` (`node:20-alpine`), volumen `.:/app`, volumen anónimo `/app/node_modules`, `CHOKIDAR_USEPOLLING=true`. Se levanta con `docker compose up -d --build`.
- ✅ **RI.2 Acceso HTTPS desde Smartphones en Red Local:** ✅ Implementado. `vite.config.js` usa `@vitejs/plugin-basic-ssl` con `server: { host:'0.0.0.0', port:5173, https:true, watch:{usePolling:true} }`. Verificado que el contenedor sirve HTTPS en `:5173`. *(Nota: el certificado autofirmado hace que Chrome no ofrezca "Instalar app"; se añadió un servicio de producción con CA local en `:8443` y `scripts/gen-certs.ps1`.)*

## Datos de Prueba (Puntos de Interés / Nodos IoT)
- ✅ **`src/data/poiData.js` con 4 laboratorios:** ✅ Implementado. Incluye los 4 puntos con sus rangos `alpha` y helpers `normalizeAngle`, `getActivePOI`, `getDirectionToNearestPOI`.
1. ✅ **Laboratorio de Redes y Telecomunicaciones** (Norte, `alpha`: 340° a 20°) — `poiData[0]`.
2. ✅ **Laboratorio de Ingeniería de Software e IA** (Este, `alpha`: 70° a 110°) — `poiData[1]`.
3. ✅ **Laboratorio de Ciberseguridad y Forense** (Sur, `alpha`: 160° a 200°) — `poiData[2]`.
4. ✅ **Decanato y Atención Estudiantil** (Oeste, `alpha`: 250° a 290°) — `poiData[3]`.
- ✅ Cada punto tiene: `id`, `nombre`, `ubicacion`, `descripcionCompleta`, `resumenCorto`, `anguloMin`, `anguloMax`, `capacidadActual` y `estado`. Se añadió además `capacidadTotal` y `telemetria`.

---

## Módulos Funcionales a Implementar

### Módulo 1: Interfaz Adaptativa al Contexto (Unidad 1 - Cognición, Ergonomía e IA Adaptativa)
- ✅ **RF1.1 Detección de Marcha (Carga Cognitiva):** ✅ Implementado. `useMotionSensors.js` calcula la magnitud de aceleración (`detectWalking`, umbrales on/off con muestreo) y expone `isWalking`; el simulador también lo activa.
  - ✅ Ocultar `descripcionCompleta` y mostrar solo `resumenCorto` en fuente `text-2xl font-bold` — `AdaptiveCardView.jsx` (`isWalking ? text-2xl font-bold`).
  - ✅ Activar lectura automática por voz (TTS) de la tarjeta activa — `App.jsx` (efecto `isWalking` → `readCurrentCard`).
  - ✅ **(Extra)** Podómetro real con acelerómetro: `useStepCounter.js` (pasos, distancia, cadencia) integrado en header, tarjeta y simulador.
- ⚠️ **RF1.2 Adaptación Visual por Iluminación:** ⚠️ Parcial. Los 3 temas (`normal`, `dark`, `solar`) están implementados con las clases Tailwind correctas en todos los componentes, **pero el nivel de luz solo se cambia manualmente desde el simulador** (`SensorSimulatorDrawer`); no hay detección real de luz ambiental (`AmbientLightSensor`).
  - ✅ Modo `solar` (alto contraste): bordes gruesos `border-4 border-yellow-400`, textos enormes y contraste máximo — `AdaptiveCardView.jsx`, `ARCameraView.jsx`, `ThumbZoneControls.jsx`.
- ✅ **RF1.3 Diseño Ergonómico (Thumb Zone):** ✅ Implementado. `ThumbZoneControls.jsx` es `fixed bottom-0` con botones `min-h-[64px]`.

### Módulo 2: Interacción Natural y Multimodal "Zero-Touch" (Unidad 2.2)
- ✅ **RF2.1 Navegación por Gestos Físicos (Giroscopio):** ✅ Implementado en `useMotionSensors.js` (`processGammaChange`), conectado en `App.jsx` vía `onOrientationChange`.
  - ✅ Inclinar a la derecha (`gamma > 25°`, cooldown 1.5s) → siguiente laboratorio.
  - ✅ Inclinar a la izquierda (`gamma < -25°`, cooldown 1.5s) → laboratorio anterior.
  - ✅ Agitar el teléfono (Shake fuerte) detiene/inicia la lectura por voz — `detectShake` + `onShake` → `toggleSpeaking`.
- ✅ **RF2.2 Comandos de Voz y Síntesis (Web Speech API):** ✅ Implementado en `useMultimodalVoice.js`.
  - ✅ Síntesis de voz (`speechSynthesis` en `es-ES`) para leer la tarjeta activa — `speak()`.
  - ✅ Reconocimiento de comandos: *"siguiente"*, *"anterior"*, *"leer"*, *"cámara"* — `processCommand()` (y extra *"parar"*/*"detener"*).
- ✅ **RF2.3 Retroalimentación Háptica (`navigator.vibrate`):** ✅ Implementado en `useHaptics.js`.
  - ✅ Vibración corta (`80ms`) al cambiar de tarjeta por inclinación — `vibrateCardChange()`.
  - ✅ Vibración doble (`[100, 50, 100]`) al detectar Shake o comando de voz — `vibrateDouble()`.
  - ✅ Pulso suave (`40ms`) al fijar un laboratorio en modo AR — `vibratePulse()`.

### Módulo 3: Nodos Físicos e IoT Contextual (Unidad 2.1)
- ⚠️ **RF3.1 Simulación de Proximidad / Telemetría IoT:** ⚠️ Parcial. `AdaptiveCardView.jsx` muestra telemetría que fluctúa cada 3 s (temperatura °C, ocupación de equipos, señal dBm). **Pendiente:** la telemetría solo aparece en la tarjeta normal, **no en la Tarjeta Flotante AR**; y la proximidad no se representa como indicador de "acercarse" más allá de la brújula.

### Módulo 4: Entorno Extendido de Realidad Aumentada (Unidad 2.3 - AR HUD)
- ✅ **RF4.1 Vista de Cámara AR:** ✅ Implementado. `ARCameraView.jsx` activa la cámara trasera (`facingMode: "environment"`) a pantalla completa como fondo, con estados loading/active/error.
- ✅ **RF4.2 HUD Espacial con Brújula/Giroscopio:** ✅ Implementado en `ARCameraView.jsx`.
  - ✅ Cinta de brújula superior con los grados actuales (`alpha`: 0°-360°) y marcas cada 15°.
  - ✅ Tarjeta Flotante AR translúcida (`backdrop-blur-md`) al coincidir `alpha` con el rango (`anguloMin`-`anguloMax`) de un laboratorio.
  - ✅ Flechas direccionales en el HUD indicando hacia qué lado girar (izquierda/derecha/dar la vuelta) hacia el punto más cercano — `getDirectionToNearestPOI`.

---

## Resumen

| Requerimiento | Estado |
| ------------- | ------ |
| RI.1 Contenedor dev + hot-reload | ✅ |
| RI.2 HTTPS en red local | ✅ |
| Datos `poiData.js` (4 POIs + campos) | ✅ |
| RF1.1 Detección de marcha + carga cognitiva | ✅ |
| RF1.2 Adaptación visual por iluminación | ⚠️ (temas OK, falta sensor real de luz) |
| RF1.3 Thumb Zone | ✅ |
| RF2.1 Gestos (gamma + shake) | ✅ |
| RF2.2 Voz (TTS + comandos) | ✅ |
| RF2.3 Háptica | ✅ |
| RF3.1 Telemetría IoT | ⚠️ (falta en tarjeta AR) |
| RF4.1 Cámara AR | ✅ |
| RF4.2 HUD brújula + tarjeta + flechas | ✅ |

**Pendientes por cerrar:** sensor real de luz ambiental para RF1.2 y telemetría IoT dentro de la tarjeta flotante AR para RF3.1.
