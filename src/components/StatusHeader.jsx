import React from 'react';
import { Activity, Sun, Moon, Sunrise, Compass, Mic, Volume2, Footprints } from 'lucide-react';
import { normalizeAngle } from '../data/poiData';

/**
 * StatusHeader - Cabecera fija con estado en vivo de sensores
 * Muestra: estado de movimiento (Quieto/Caminando), pasos y distancia de la
 * sesión (podómetro), tema lumínico activo, grados de la brújula (alpha) y
 * estado del micrófono/lectura por voz.
 */
const StatusHeader = ({
  isWalking,
  lightMode,
  alpha,
  isListening,
  isSpeaking,
  stepCount = 0,
  distanceMeters = 0
}) => {
  const degrees = Math.round(normalizeAngle(alpha));

  const lightConfig = {
    normal: { icon: Sun, label: 'Normal', color: 'text-orange-400' },
    dark: { icon: Moon, label: 'Oscuro', color: 'text-blue-400' },
    solar: { icon: Sunrise, label: 'Sol', color: 'text-yellow-400' }
  }[lightMode] || { icon: Sun, label: 'Normal', color: 'text-orange-400' };

  const LightIcon = lightConfig.icon;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md text-white pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 max-w-lg mx-auto">
        {/* Estado de movimiento (RF1.1) */}
        <div className="flex items-center gap-1.5" aria-label={isWalking ? 'Caminando' : 'Quieto'}>
          <Activity
            className={`w-5 h-5 ${isWalking ? 'text-green-400 animate-pulse' : 'text-gray-400'}`}
          />
          <span className="text-xs sm:text-sm font-medium">
            {isWalking ? 'Caminando' : 'Quieto'}
          </span>
        </div>

        {/* Tema lumínico activo (RF1.2) */}
        <div className="flex items-center gap-1.5" aria-label={`Luz: ${lightConfig.label}`}>
          <LightIcon className={`w-5 h-5 ${lightConfig.color}`} />
          <span className="text-xs sm:text-sm font-medium">{lightConfig.label}</span>
        </div>

        {/* Podómetro: pasos y distancia (RF1.1) */}
        <div
          className="flex items-center gap-1.5"
          aria-label={`${stepCount} pasos, ${distanceMeters.toFixed(1)} metros`}
        >
          <Footprints
            className={`w-5 h-5 ${isWalking ? 'text-yellow-400' : 'text-gray-400'}`}
          />
          <span className="text-xs sm:text-sm font-medium font-mono">
            {stepCount}
            <span className="text-gray-400"> · {distanceMeters.toFixed(1)}m</span>
          </span>
        </div>

        {/* Grados de brújula (RF4.2) */}
        <div className="flex items-center gap-1.5" aria-label={`Brújula: ${degrees} grados`}>
          <Compass className="w-5 h-5 text-cyan-400" />
          <span className="text-xs sm:text-sm font-medium font-mono">{degrees}°</span>
        </div>

        {/* Micrófono y lectura por voz (RF2.2) */}
        <div
          className="flex items-center gap-1.5"
          aria-label={isListening ? 'Escuchando' : 'Micrófono inactivo'}
        >
          {isSpeaking && <Volume2 className="w-5 h-5 text-blue-400 animate-pulse" />}
          <Mic
            className={`w-5 h-5 ${isListening ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}
          />
        </div>
      </div>
    </header>
  );
};

export default StatusHeader;
