import { useState, useEffect, useCallback, useRef } from 'react';

// Parámetros de detección de marcha (caminata)
const WALKING_ON_THRESHOLD = 11;
const WALKING_OFF_THRESHOLD = 9;
const SAMPLES_TO_START = 4;
const SAMPLES_TO_STOP = 30;

// Parámetros del gesto shake
const SHAKE_THRESHOLD = 25;
const SHAKE_COOLDOWN_MS = 1000;

// Navegación por inclinación lateral (gamma) con cooldown anti-rebote
const GAMMA_TILT_DEG = 25;
const GAMMA_COOLDOWN_MS = 1500;

/**
 * useMotionSensors - Sensores de movimiento del dispositivo
 * - DeviceOrientationEvent: brújula (alpha) e inclinación (beta/gamma)
 * - DeviceMotionEvent: aceleración para detectar caminata y gesto shake
 * - Permisos explícitos para iOS 13+ (requestPermission en gesto de usuario)
 * - Sobreescritura total desde el simulador de sensores (modo PC / pruebas)
 */
export const useMotionSensors = (simulatorState = null) => {
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [isWalking, setIsWalking] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const lastGammaChangeRef = useRef(0);
  const lastShakeRef = useRef(0);
  const walkingSampleCountRef = useRef(0);
  const idleSampleCountRef = useRef(0);
  const overrideRef = useRef(false);
  const orientationCallbackRef = useRef(null);
  const shakeCallbackRef = useRef(null);

  // Solicitar permisos de sensores (obligatorio en iOS 13+ vía gesto de usuario)
  const requestPermission = useCallback(async () => {
    let denied = false;

    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') denied = true;
      }

      if (
        !denied &&
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function'
      ) {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') denied = true;
      }
    } catch (error) {
      console.error('Error al solicitar permisos de sensores:', error);
      denied = true;
    }

    setHasPermission(!denied);
    return !denied;
  }, []);

  // Detectar marcha por magnitud de aceleración con debounce
  // (muestras consecutivas para activar; tramo de calma para desactivar)
  const detectWalking = useCallback((acceleration) => {
    if (!acceleration) return undefined;

    const x = acceleration.x || 0;
    const y = acceleration.y || 0;
    const z = acceleration.z || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude > WALKING_ON_THRESHOLD) {
      walkingSampleCountRef.current += 1;
      idleSampleCountRef.current = 0;
    } else if (magnitude < WALKING_OFF_THRESHOLD) {
      idleSampleCountRef.current += 1;
      walkingSampleCountRef.current = 0;
    }

    if (walkingSampleCountRef.current >= SAMPLES_TO_START) return true;
    if (idleSampleCountRef.current >= SAMPLES_TO_STOP) return false;
    return undefined; // mantener estado anterior
  }, []);

  // Detectar gesto shake (impulso fuerte con cooldown)
  const detectShake = useCallback((acceleration) => {
    if (!acceleration) return false;

    const x = acceleration.x || 0;
    const y = acceleration.y || 0;
    const z = acceleration.z || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    if (magnitude > SHAKE_THRESHOLD && now - lastShakeRef.current > SHAKE_COOLDOWN_MS) {
      lastShakeRef.current = now;
      return true;
    }
    return false;
  }, []);

  // Evaluar inclinación gamma: derecha (>25°) = siguiente, izquierda (<-25°) = anterior
  const processGammaChange = useCallback((gamma) => {
    const now = Date.now();
    if (now - lastGammaChangeRef.current < GAMMA_COOLDOWN_MS) return null;

    if (gamma > GAMMA_TILT_DEG) {
      lastGammaChangeRef.current = now;
      return 'next';
    }
    if (gamma < -GAMMA_TILT_DEG) {
      lastGammaChangeRef.current = now;
      return 'previous';
    }
    return null;
  }, []);

  // Disparar shake interno (compartido entre sensor real y simulador)
  const triggerShake = useCallback(() => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  }, []);

  const handleOrientation = useCallback(
    (event) => {
      if (overrideRef.current) return;

      // En iOS el rumbo absoluto viene en webkitCompassHeading (0° = Norte)
      const alpha =
        typeof event.webkitCompassHeading === 'number' ? event.webkitCompassHeading : event.alpha || 0;

      setOrientation({ alpha, beta: event.beta || 0, gamma: event.gamma || 0 });

      const cardChange = processGammaChange(event.gamma || 0);
      if (cardChange && orientationCallbackRef.current) {
        orientationCallbackRef.current(cardChange);
      }
    },
    [processGammaChange]
  );

  const handleMotion = useCallback(
    (event) => {
      if (overrideRef.current) return;

      // Aceleración lineal sin gravedad; fallback a la que incluye gravedad
      const acceleration = event.acceleration || event.accelerationIncludingGravity;

      const walking = detectWalking(acceleration);
      if (walking !== undefined) setIsWalking(walking);

      if (detectShake(acceleration)) triggerShake();
    },
    [detectWalking, detectShake, triggerShake]
  );

  // Iniciar/detener sensores (solo tras permiso del usuario)
  const startSensors = useCallback(() => {
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);
  }, [handleOrientation, handleMotion]);

  const stopSensors = useCallback(() => {
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('devicemotion', handleMotion);
  }, [handleOrientation, handleMotion]);

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [handleOrientation, handleMotion]);

  // Sobreescritura manual desde el simulador: reemplaza los datos reales
  useEffect(() => {
    if (!simulatorState) return;

    overrideRef.current = true;

    setOrientation({
      alpha: simulatorState.alpha || 0,
      beta: 0,
      gamma: simulatorState.gamma || 0
    });
    setIsWalking(!!simulatorState.isWalking);

    const cardChange = processGammaChange(simulatorState.gamma || 0);
    if (cardChange && orientationCallbackRef.current) {
      orientationCallbackRef.current(cardChange);
    }

    if (simulatorState.isShake) triggerShake();
  }, [simulatorState, processGammaChange, triggerShake]);

  // Callback de navegación por inclinación (next/previous)
  const onOrientationChange = useCallback((callback) => {
    orientationCallbackRef.current = callback;
  }, []);

  // Notificar detección de shake al exterior
  useEffect(() => {
    if (isShake && shakeCallbackRef.current) {
      shakeCallbackRef.current();
    }
  }, [isShake]);

  const onShake = useCallback((callback) => {
    shakeCallbackRef.current = callback;
  }, []);

  return {
    orientation,
    isWalking,
    isShake,
    hasPermission,
    requestPermission,
    startSensors,
    stopSensors,
    onOrientationChange,
    onShake
  };
};
