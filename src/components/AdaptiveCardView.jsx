import React, { useState, useEffect } from 'react';
import { MapPin, Thermometer, Cpu, Wifi, Users, CircleDot, Footprints } from 'lucide-react';

/**
 * AdaptiveCardView - Tarjeta principal de información (RF1.1, RF1.2, RF3.1)
 * Mutua dinámicamente su diseño y tipografía según:
 * - Carga cognitiva: caminando = texto corto en fuente enorme (text-2xl font-bold)
 * - Modo lumínico: normal / dark / solar (alto contraste: fondo negro puro,
 *   bordes amarillos de 4px y tipografía extra bold para leer bajo el sol)
 * Muestra además telemetría IoT simulada en tiempo real y podómetro de sesión.
 */
const AdaptiveCardView = ({
  poi,
  isWalking,
  lightMode,
  stepCount = 0,
  cadence = 0,
  distanceMeters = 0
}) => {
  const [telemetry, setTelemetry] = useState(poi ? poi.telemetria : null);

  // RF3.1: telemetría IoT simulada que fluctúa en tiempo real
  useEffect(() => {
    if (!poi) return;
    setTelemetry(poi.telemetria);

    const interval = setInterval(() => {
      setTelemetry({
        temperatura: Math.round((poi.telemetria.temperatura + (Math.random() - 0.5)) * 10) / 10,
        ocupacionEquipos: Math.max(
          0,
          Math.min(
            poi.capacidadTotal,
            poi.telemetria.ocupacionEquipos + Math.round((Math.random() - 0.5) * 2)
          )
        ),
        nivelSenal: Math.round(poi.telemetria.nivelSenal + (Math.random() - 0.5) * 8)
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [poi]);

  // Estilos por modo lumínico (RF1.2)
  const containerStyles = {
    solar: 'bg-black border-4 border-yellow-400',
    dark: 'bg-gray-900 border-2 border-cyan-400',
    normal: 'bg-white border-2 border-gray-200'
  }[lightMode];

  const textStyles = {
    solar: 'text-yellow-400',
    dark: 'text-white',
    normal: 'text-gray-900'
  }[lightMode];

  const secondaryTextStyles = {
    solar: 'text-yellow-300',
    dark: 'text-gray-300',
    normal: 'text-gray-600'
  }[lightMode];

  const dividerStyles = {
    solar: 'border-yellow-400',
    dark: 'border-cyan-400',
    normal: 'border-gray-200'
  }[lightMode];

  const metricIconStyles = {
    solar: 'text-yellow-400',
    dark: 'text-cyan-400',
    normal: 'text-cyan-600'
  }[lightMode];

  // Reducción de carga cognitiva al caminar (RF1.1)
  const titleSize = lightMode === 'solar' ? 'text-3xl' : isWalking ? 'text-3xl' : 'text-2xl';
  const bodySize = lightMode === 'solar' ? 'text-lg font-bold' : isWalking ? 'text-2xl font-bold' : 'text-base';
  const metricSize = lightMode === 'solar' ? 'text-lg font-extrabold' : isWalking ? 'text-lg font-bold' : 'text-sm';

  if (!poi || !telemetry) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No hay laboratorio seleccionado</p>
      </div>
    );
  }

  return (
    <article
      className={`${containerStyles} ${textStyles} rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-300`}
      aria-label={poi.nombre}
    >
      {/* Nombre del laboratorio */}
      <h2 className={`${titleSize} font-extrabold mb-2 leading-tight`}>{poi.nombre}</h2>

      {/* Ubicación */}
      <p className={`${secondaryTextStyles} ${bodySize} mb-4 flex items-start gap-1.5`}>
        <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
        <span>{poi.ubicacion}</span>
      </p>

      {/* Texto adaptativo: resumen al caminar, descripción completa en quieto */}
      <div className={`${secondaryTextStyles} ${bodySize} mb-6 leading-snug`}>
        {isWalking ? <p className="font-bold">{poi.resumenCorto}</p> : <p>{poi.descripcionCompleta}</p>}
      </div>

      {/* Telemetría IoT simulada (RF3.1) */}
      <div
        className={`grid grid-cols-3 gap-3 pt-4 border-t-2 ${dividerStyles}`}
        aria-label="Telemetría del laboratorio"
      >
        <div className="flex flex-col items-center">
          <Thermometer className={`w-6 h-6 mb-1 ${metricIconStyles}`} />
          <span className={`${metricSize} font-mono`}>{telemetry.temperatura.toFixed(1)}°C</span>
          <span className={`${metricSize} ${secondaryTextStyles}`}>Temp.</span>
        </div>
        <div className="flex flex-col items-center">
          <Cpu className={`w-6 h-6 mb-1 ${metricIconStyles}`} />
          <span className={`${metricSize} font-mono`}>{telemetry.ocupacionEquipos}</span>
          <span className={`${metricSize} ${secondaryTextStyles}`}>Equipos</span>
        </div>
        <div className="flex flex-col items-center">
          <Wifi className={`w-6 h-6 mb-1 ${metricIconStyles}`} />
          <span className={`${metricSize} font-mono`}>{telemetry.nivelSenal} dBm</span>
          <span className={`${metricSize} ${secondaryTextStyles}`}>Señal</span>
        </div>
      </div>

      {/* Estado del nodo y ocupación de personas */}
      <div className="mt-4 flex justify-between items-center text-sm font-bold">
        <span className="flex items-center gap-1.5">
          <CircleDot
            className={`w-4 h-4 ${poi.estado === 'Abierto' ? 'text-green-500' : 'text-orange-500'}`}
          />
          {poi.estado}
        </span>
        <span className={`flex items-center gap-1.5 ${secondaryTextStyles}`}>
          <Users className="w-4 h-4" />
          {poi.capacidadActual}/{poi.capacidadTotal} personas
        </span>
      </div>

      {/* Podómetro de la sesión (RF1.1): pasos, distancia y cadencia */}
      <div className={`mt-3 flex items-center justify-around pt-3 border-t-2 ${dividerStyles}`}>
        <span className="flex items-center gap-1.5">
          <Footprints
            className={`w-5 h-5 ${isWalking ? 'text-yellow-400 animate-pulse' : metricIconStyles}`}
          />
          <span className={`${metricSize} font-mono`}>{stepCount}</span>
          <span className={`${metricSize} ${secondaryTextStyles}`}>pasos</span>
        </span>
        <span className={`${metricSize} font-mono`}>{distanceMeters.toFixed(1)} m</span>
        {isWalking && cadence > 0 && (
          <span className={`${metricSize} font-mono ${secondaryTextStyles}`}>{cadence} ppm</span>
        )}
      </div>
    </article>
  );
};

export default AdaptiveCardView;
