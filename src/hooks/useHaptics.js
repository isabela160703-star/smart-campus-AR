import { useCallback } from 'react';

/**
 * useHaptics - Retroalimentación háptica semántica (navigator.vibrate)
 * Patrones diferenciados por tipo de interacción, con fallback seguro
 * en navegadores/dispositivos sin soporte de vibración (ej: iOS Safari, PC).
 */
export const useHaptics = () => {
  const supportsVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  // Vibración corta (80ms) al cambiar de tarjeta por inclinación o botones
  const vibrateCardChange = useCallback(() => {
    if (supportsVibration) navigator.vibrate(80);
  }, [supportsVibration]);

  // Vibración doble ([100, 50, 100]) al detectar un Shake o un comando de voz
  const vibrateDouble = useCallback(() => {
    if (supportsVibration) navigator.vibrate([100, 50, 100]);
  }, [supportsVibration]);

  // Pulso suave (40ms) cuando el usuario fija un laboratorio en modo AR
  const vibratePulse = useCallback(() => {
    if (supportsVibration) navigator.vibrate(40);
  }, [supportsVibration]);

  return {
    supportsVibration,
    vibrateCardChange,
    vibrateDouble,
    vibratePulse
  };
};
