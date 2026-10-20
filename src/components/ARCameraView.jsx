import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, Camera, CameraOff } from 'lucide-react';
import { getDirectionToNearestPOI, normalizeAngle } from '../data/poiData';

// Ancho visible de la cinta de brújula en grados
const RIBBON_WINDOW = 120;

const CARDINALS = [
  { angle: 0, label: 'N' },
  { angle: 90, label: 'E' },
  { angle: 180, label: 'S' },
  { angle: 270, label: 'O' }
];

// Centro y ancho en grados del rango de un POI
const getPoiRange = (poi) => {
  const width =
    poi.anguloMin > poi.anguloMax
      ? poi.anguloMax + 360 - poi.anguloMin
      : poi.anguloMax - poi.anguloMin;
  const center =
    poi.anguloMin > poi.anguloMax
      ? normalizeAngle(poi.anguloMin + width / 2)
      : (poi.anguloMin + poi.anguloMax) / 2;
  return { center, width };
};

// Distancia angular relativa (-180..180) desde el rumbo actual hacia un ángulo
const relativeDeg = (angle, alpha) => ((angle - alpha + 540) % 360) - 180;

/**
 * ARCameraView - Entorno de Realidad Aumentada (RF4.1 y RF4.2)
 * - Cámara trasera en vivo a pantalla completa como fondo
 * - Cinta de brújula superior con rangos de cada laboratorio
 * - Flechas guía hacia el laboratorio más cercano
 * - Tarjeta flotante translúcida (backdrop-blur-md) al coincidir alpha con un POI
 */
const ARCameraView = ({ alpha, activePOI, poiData, onCardFixed, isWalking, lightMode }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState('loading'); // loading | active | error

  // Adquirir y liberar siempre la cámara trasera (facingMode: "environment")
  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraState('active');
      } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        if (!cancelled) setCameraState('error');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // Notificar cuando se fija un laboratorio en el HUD
  useEffect(() => {
    if (activePOI && onCardFixed) onCardFixed(activePOI);
  }, [activePOI, onCardFixed]);

  const { direction } = getDirectionToNearestPOI(alpha);
  const normAlpha = normalizeAngle(alpha);

  // Convertir ángulo relativo a posición porcentual dentro de la ventana
  const toPercent = (rel) => ((rel + RIBBON_WINDOW / 2) / RIBBON_WINDOW) * 100;

  // Estilos adaptados al modo de iluminación
  const cardStyles = {
    solar: 'bg-black/90 border-4 border-yellow-400 text-yellow-400',
    dark: 'bg-gray-900/90 border-2 border-cyan-400 text-white',
    normal: 'bg-white/90 border-2 border-gray-300 text-gray-900'
  }[lightMode];

  const arrowStyles = {
    solar: 'text-yellow-400',
    dark: 'text-cyan-300',
    normal: 'text-white'
  }[lightMode];

  return (
    <div className="relative w-full h-[calc(100dvh-11rem)] bg-black rounded-2xl overflow-hidden">
      {/* Fondo: video de la cámara trasera (RF4.1) */}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

      {/* Cinta de brújula HUD (RF4.2) */}
      <div className="absolute top-2 left-2 right-2">
        <div className="relative h-14 bg-black/60 backdrop-blur-sm rounded-xl overflow-hidden border border-white/20">
          {/* Segmentos de laboratorios en la cinta */}
          {poiData.map((poi) => {
            const { center, width } = getPoiRange(poi);
            const rel = relativeDeg(center, normAlpha);
            const half = width / 2;
            if (rel + half < -RIBBON_WINDOW / 2 || rel - half > RIBBON_WINDOW / 2) return null;

            const left = toPercent(rel - half);
            const right = toPercent(rel + half);
            const isActive = activePOI?.id === poi.id;

            return (
              <div
                key={poi.id}
                title={poi.nombre}
                className={`absolute top-0 h-full rounded-md transition-colors ${
                  isActive
                    ? 'bg-cyan-500/70 border-x-2 border-cyan-300'
                    : 'bg-cyan-500/25 border-x border-cyan-400/40'
                }`}
                style={{ left: `${left}%`, width: `${Math.max(right - left, 2)}%` }}
              />
            );
          })}

          {/* Cardinalidades N/E/S/O */}
          {CARDINALS.map(({ angle, label }) => {
            const rel = relativeDeg(angle, normAlpha);
            if (Math.abs(rel) > RIBBON_WINDOW / 2) return null;
            return (
              <div
                key={label}
                className="absolute top-1 -translate-x-1/2 text-white/90 font-bold text-sm drop-shadow"
                style={{ left: `${toPercent(rel)}%` }}
              >
                {label}
              </div>
            );
          })}

          {/* Marcas de grado cada 15° */}
          {Array.from({ length: Math.ceil(RIBBON_WINDOW / 15) + 1 }, (_, i) => {
            const rel = -RIBBON_WINDOW / 2 + i * 15;
            const angle = normalizeAngle(normAlpha + rel);
            return (
              <div
                key={i}
                className="absolute top-7 -translate-x-1/2 text-[10px] font-mono text-white/70"
                style={{ left: `${toPercent(rel)}%` }}
              >
                {Math.round(angle)}°
              </div>
            );
          })}

          {/* Puntero central fijo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-yellow-400 shadow-[0_0_8px_2px_rgba(250,204,21,0.7)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-[6px] border-l-transparent border-r-transparent border-t-yellow-400" />
        </div>
      </div>

      {/* Flechas guía hacia el laboratorio más cercano (RF4.2) */}
      <div className="absolute top-1/3 left-0 right-0 flex justify-between px-4 pointer-events-none">
        {direction === 'left' && (
          <div className={`flex flex-col items-center ${arrowStyles} drop-shadow-lg`}>
            <ChevronLeft className="w-12 h-12 animate-pulse" />
            <span className="text-sm font-bold">Gira a la izquierda</span>
          </div>
        )}
        {direction === 'right' && (
          <div className={`flex flex-col items-center ${arrowStyles} drop-shadow-lg`}>
            <ChevronRight className="w-12 h-12 animate-pulse" />
            <span className="text-sm font-bold">Gira a la derecha</span>
          </div>
        )}
        {direction === 'back' && (
          <div className={`flex flex-col items-center ${arrowStyles} drop-shadow-lg`}>
            <ArrowUp className="w-12 h-12 animate-pulse rotate-180" />
            <span className="text-sm font-bold">Dale la vuelta</span>
          </div>
        )}
      </div>

      {/* Tarjeta flotante AR anclada cuando alpha coincide con un laboratorio */}
      {activePOI && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-md">
          <div className={`${cardStyles} backdrop-blur-md rounded-2xl p-4 shadow-2xl`}>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 shrink-0" />
              <h3 className={`font-extrabold ${lightMode === 'solar' ? 'text-2xl' : 'text-xl'}`}>
                {activePOI.nombre}
              </h3>
            </div>
            <p
              className={`${
                isWalking
                  ? lightMode === 'solar'
                    ? 'text-xl font-extrabold'
                    : 'text-2xl font-bold'
                  : lightMode === 'solar'
                    ? 'text-lg font-bold'
                    : 'text-sm'
              }`}
            >
              {isWalking ? activePOI.resumenCorto : activePOI.descripcionCompleta}
            </p>
            <div className="mt-3 flex justify-between text-xs font-medium">
              <span>{activePOI.estado}</span>
              <span>
                {activePOI.capacidadActual}/{activePOI.capacidadTotal} personas
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Estado de la cámara */}
      {cameraState !== 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950">
          {cameraState === 'error' ? (
            <>
              <CameraOff className="w-10 h-10 text-red-400" />
              <p className="text-white text-center px-6">
                No se pudo acceder a la cámara. Verifica el permiso del navegador.
              </p>
            </>
          ) : (
            <>
              <Camera className="w-10 h-10 text-white animate-pulse" />
              <p className="text-white">Iniciando cámara...</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ARCameraView;
