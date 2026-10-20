import React from 'react';
import { Camera, CameraOff, Mic, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

/**
 * ThumbZoneControls - Barra de control fija en la zona del pulgar (RF1.3)
 * Todos los botones interactivos principales viven en el tercio inferior
 * con targets táctiles grandes (min-h-[64px]) para operar con una sola mano,
 * incluso caminando (reducción de carga cognitiva).
 */
const ThumbZoneControls = ({
  isARView,
  onToggleAR,
  isListening,
  onToggleVoice,
  onPrevious,
  onNext,
  onOpenSimulator,
  lightMode
}) => {
  const containerStyles = {
    solar: 'bg-black border-t-4 border-yellow-400',
    dark: 'bg-gray-950 border-t-2 border-cyan-400',
    normal: 'bg-white border-t-2 border-gray-200'
  }[lightMode];

  const getButtonStyles = (isActive = false) => {
    const base =
      'flex flex-1 flex-col items-center justify-center min-h-[64px] rounded-xl transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2';

    if (isActive) {
      return {
        solar: `${base} bg-yellow-400 text-black focus:ring-yellow-300`,
        dark: `${base} bg-cyan-500 text-black focus:ring-cyan-400`,
        normal: `${base} bg-cyan-600 text-white focus:ring-cyan-500`
      }[lightMode];
    }

    return {
      solar: `${base} bg-gray-900 text-yellow-400 border-2 border-yellow-400 focus:ring-yellow-400`,
      dark: `${base} bg-gray-900 text-cyan-400 border-2 border-cyan-400 focus:ring-cyan-400`,
      normal: `${base} bg-gray-100 text-gray-700 border-2 border-gray-300 focus:ring-cyan-500`
    }[lightMode];
  };

  const labelSize = lightMode === 'solar' ? 'text-xs font-extrabold' : 'text-[11px] font-bold';

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 ${containerStyles} shadow-[0_-4px_16px_rgba(0,0,0,0.25)]`}
      aria-label="Controles principales"
    >
      <div className="max-w-lg mx-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-stretch justify-between gap-2">
          {/* Anterior */}
          <button onClick={onPrevious} className={getButtonStyles()} aria-label="Laboratorio anterior">
            <ChevronLeft className="w-7 h-7" />
            <span className={`${labelSize} mt-1`}>Anterior</span>
          </button>

          {/* Alternar vista AR */}
          <button
            onClick={onToggleAR}
            className={getButtonStyles(isARView)}
            aria-label="Alternar vista de realidad aumentada"
          >
            {isARView ? <CameraOff className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
            <span className={`${labelSize} mt-1`}>AR</span>
          </button>

          {/* Activar comandos de voz */}
          <button
            onClick={onToggleVoice}
            className={getButtonStyles(isListening)}
            aria-label="Activar comandos de voz"
          >
            <Mic className="w-7 h-7" />
            <span className={`${labelSize} mt-1`}>Voz</span>
          </button>

          {/* Siguiente */}
          <button onClick={onNext} className={getButtonStyles()} aria-label="Laboratorio siguiente">
            <ChevronRight className="w-7 h-7" />
            <span className={`${labelSize} mt-1`}>Siguiente</span>
          </button>

          {/* Simulador de sensores (DevTools HCI) */}
          <button
            onClick={onOpenSimulator}
            className={getButtonStyles()}
            aria-label="Abrir simulador de sensores"
          >
            <SlidersHorizontal className="w-7 h-7" />
            <span className={`${labelSize} mt-1`}>Sim</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default ThumbZoneControls;
