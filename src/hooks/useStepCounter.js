import { useState, useEffect, useRef, useCallback } from 'react';

// Distancia media de un paso humano en metros (para estimar recorrido)
const METROS_POR_PASO = 0.75;

// Filtro de picos: zona muerta de magnitud y tiempo mínimo entre pasos
// (se trabaja con la magnitud que INCLUYE gravedad, siempre cercana a 9.8 m/s²)
const DEAD_ZONE = 12;
const STEP_MIN_INTERVAL_MS = 250;

// Ventana para calcular la cadencia (pasos por minuto)
const CADENCE_WINDOW_MS = 5000;

/**
 * useStepCounter - Podómetro real basado en acelerómetro (DeviceMotionEvent)
 * - Detección de pasos por picos de magnitud (con gravedad) mediante filtro de
 *   paso-bajo + zona muerta + cooldown anti-rebote.
 * - Estima cadencia (pasos/min) y distancia recorrida (m).
 * - Acepta simulación manual (modo PC) y refuerza RF1.1 (detección de marcha).
 * - Solo escucha devicemotion cuando hay permiso concedido (iOS/Android).
 */
export const useStepCounter = ({ simulatorState = null, enabled = false } = {}) => {
  const [stepCount, setStepCount] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);

  const lastStepTimeRef = useRef(0);
  const filteredMagnitudeRef = useRef(9.8);
  const peakZoneRef = useRef(false);
  const stepTimesRef = useRef([]);
  const sensorEnabledRef = useRef(enabled);

  useEffect(() => {
    sensorEnabledRef.current = enabled;
  }, [enabled]);

  // Registrar un paso y actualizar métricas derivadas
  const registerStep = useCallback(() => {
    const now = Date.now();
    setStepCount((c) => c + 1);
    setDistanceMeters((d) => Math.round((d + METROS_POR_PASO) * 100) / 100);

    const times = stepTimesRef.current;
    times.push(now);
    while (times.length && now - times[0] > CADENCE_WINDOW_MS) times.shift();

    if (times.length > 1) {
      const span = now - times[0];
      const ppm = span > 0 ? ((times.length - 1) / span) * 60000 : 0;
      setCadence(Math.min(220, Math.round(ppm)));
    }
  }, []);

  // Procesar una muestra de aceleración
  const processAcceleration = useCallback(
    (acceleration) => {
      if (!acceleration) return;

      const x = acceleration.x || 0;
      const y = acceleration.y || 0;
      const z = acceleration.z || 0;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Filtro de paso-bajo para suavizar la señal del acelerómetro
      const filtered = filteredMagnitudeRef.current * 0.85 + magnitude * 0.15;
      filteredMagnitudeRef.current = filtered;

      const now = Date.now();
      const crossedUp = filtered > DEAD_ZONE;
      const crossedDown = filtered < DEAD_ZONE - 3;

      // Contar un paso en el flanco descendente del pico (cruce hacia abajo)
      if (crossedDown && peakZoneRef.current && now - lastStepTimeRef.current > STEP_MIN_INTERVAL_MS) {
        lastStepTimeRef.current = now;
        peakZoneRef.current = false;
        registerStep();
      }

      if (crossedUp) peakZoneRef.current = true;
    },
    [registerStep]
  );

  // Sensores reales: escuchar devicemotion solo si hay permiso (enabled)
  useEffect(() => {
    const handler = (event) => {
      if (!sensorEnabledRef.current) return;
      // Priorizar la lectura que incluye gravedad: señal más estable
      processAcceleration(event.accelerationIncludingGravity || event.acceleration);
    };

    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [processAcceleration]);

  // Reiniciar todas las métricas de la sesión
  const resetSteps = useCallback(() => {
    setStepCount(0);
    setCadence(0);
    setDistanceMeters(0);
    lastStepTimeRef.current = 0;
    filteredMagnitudeRef.current = 9.8;
    peakZoneRef.current = false;
    stepTimesRef.current = [];
  }, []);

  // Sumar pasos manualmente (simulador / botones del panel)
  const addSteps = useCallback((n = 1) => {
    const added = Math.max(0, Math.floor(n));
    if (added === 0) return;
    const base = Date.now();
    for (let i = 0; i < added; i += 1) {
      setStepCount((c) => c + 1);
      setDistanceMeters((d) => Math.round((d + METROS_POR_PASO) * 100) / 100);
      stepTimesRef.current.push(base + i * 600);
    }
    const times = stepTimesRef.current;
    const now = Date.now();
    while (times.length && now - times[0] > CADENCE_WINDOW_MS) times.shift();
    if (times.length > 1) {
      const span = now - times[0];
      setCadence(Math.min(220, Math.round(((times.length - 1) / span) * 60000)));
    }
  }, []);

  return { stepCount, cadence, distanceMeters, addSteps, resetSteps };
};
