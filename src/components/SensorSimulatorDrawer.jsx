import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Move,
  Sun,
  Moon,
  Sunrise,
  Compass,
  RotateCcw,
  Footprints
} from 'lucide-react';

/**
 * SensorSimulatorDrawer - Panel "DevTools HCI" para pruebas en PC (regla 4.2)
 * Permite simular en vivo, sin teléfono:
 * - Movimiento: Quieto vs. Caminando y botón Shake
 * - Nivel de luz ambiental: Normal / Oscuro / Sol directo (alto contraste)
 * - Brújula (alpha): slider de 0° a 360° para rotar la vista AR
 * - Inclinación lateral (gamma): probar la navegación por inclinación
 * - Podómetro: sumar pasos y reiniciar la sesión
 */
const SensorSimulatorDrawer = ({
  isOpen,
  onClose,
  onSimulatorChange,
  stepCount = 0,
  cadence = 0,
  distanceMeters = 0,
  onAddSteps,
  onResetSteps
}) => {
  const [isWalking, setIsWalking] = useState(false);
  const [isShake, setIsShake] = useState(false);
  const [lightMode, setLightMode] = useState('normal');
  const [alpha, setAlpha] = useState(0);
  const [gamma, setGamma] = useState(0);

  const emit = (overrides = {}) => {
    const state = { isWalking, isShake, lightMode, alpha, gamma, ...overrides };
    onSimulatorChange(state);
    return state;
  };

  const handleToggleWalking = () => {
    emit({ isWalking: !isWalking });
    setIsWalking(!isWalking);
  };

  const handleShake = () => {
    emit({ isShake: true });
    setIsShake(true);
    setTimeout(() => {
      emit({ isShake: false });
      setIsShake(false);
    }, 500);
  };

  const handleLightModeChange = (mode) => {
    emit({ lightMode: mode });
    setLightMode(mode);
  };

  const handleAlphaChange = (event) => {
    const value = parseInt(event.target.value, 10);
    emit({ alpha: value });
    setAlpha(value);
  };

  const handleGammaChange = (event) => {
    const value = parseInt(event.target.value, 10);
    emit({ gamma: value });
    setGamma(value);
  };

  const handleReset = () => {
    const defaults = { isWalking: false, isShake: false, lightMode: 'normal', alpha: 0, gamma: 0 };
    onSimulatorChange(defaults);
    setIsWalking(false);
    setIsShake(false);
    setLightMode('normal');
    setAlpha(0);
    setGamma(0);
  };

  if (!isOpen) return null;

  const sectionTitle = 'text-lg font-bold text-gray-900 mb-3 flex items-center gap-2';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Simulador de sensores"
    >
      <div className="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl p-6 max-h-[85dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-gray-900">Simulador de Sensores</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Cerrar simulador"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Movimiento */}
        <div className="mb-6">
          <h3 className={sectionTitle}>
            <Smartphone className="w-5 h-5" /> Movimiento
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleToggleWalking}
              className={`w-full min-h-[56px] p-4 rounded-xl font-bold transition-all ${
                isWalking ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
              aria-pressed={isWalking}
            >
              {isWalking ? 'Caminando' : 'Quieto'}
            </button>
            <button
              onClick={handleShake}
              className={`w-full min-h-[56px] p-4 rounded-xl font-bold transition-all ${
                isShake ? 'bg-orange-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Move className="w-5 h-5" /> Agitar (Shake)
              </span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Al caminar se oculta la descripción larga y se activa la lectura por voz.
          </p>
        </div>

        {/* Nivel de luz ambiental */}
        <div className="mb-6">
          <h3 className={sectionTitle}>
            <Sun className="w-5 h-5" /> Nivel de Luz
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleLightModeChange('normal')}
              className={`min-h-[56px] p-3 rounded-xl font-bold transition-all ${
                lightMode === 'normal' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
              aria-pressed={lightMode === 'normal'}
            >
              Normal
            </button>
            <button
              onClick={() => handleLightModeChange('dark')}
              className={`min-h-[56px] p-3 rounded-xl font-bold transition-all ${
                lightMode === 'dark' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700'
              }`}
              aria-pressed={lightMode === 'dark'}
            >
              <span className="flex items-center justify-center gap-1">
                <Moon className="w-4 h-4" /> Oscuro
              </span>
            </button>
            <button
              onClick={() => handleLightModeChange('solar')}
              className={`min-h-[56px] p-3 rounded-xl font-bold transition-all ${
                lightMode === 'solar' ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-700'
              }`}
              aria-pressed={lightMode === 'solar'}
            >
              <span className="flex items-center justify-center gap-1">
                <Sunrise className="w-4 h-4" /> Sol
              </span>
            </button>
          </div>
        </div>

        {/* Brújula (alpha) */}
        <div className="mb-6">
          <h3 className={sectionTitle}>
            <Compass className="w-5 h-5" /> Brújula (Alpha): {alpha}°
          </h3>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={alpha}
            onChange={handleAlphaChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            aria-label="Ángulo de brújula de 0 a 360 grados"
          />
          <p className="text-xs text-gray-500 mt-2">
            Rota la vista AR: Norte 340°-20°, Este 70°-110°, Sur 160°-200°, Oeste 250°-290°.
          </p>
        </div>

        {/* Inclinación lateral (gamma) */}
        <div className="mb-6">
          <h3 className={sectionTitle}>
            <RotateCcw className="w-5 h-5" /> Inclinación (Gamma): {gamma}°
          </h3>
          <input
            type="range"
            min="-90"
            max="90"
            step="1"
            value={gamma}
            onChange={handleGammaChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            aria-label="Ángulo de inclinación lateral de -90 a 90 grados"
          />
          <p className="text-xs text-gray-500 mt-2">
            Supera ±25° para cambiar de laboratorio (cooldown de 1.5s).
          </p>
        </div>

        {/* Podómetro (RF1.1): métricas en vivo y pasos manuales */}
        <div className="mb-6">
          <h3 className={sectionTitle}>
            <Footprints className="w-5 h-5" /> Podómetro (sesión)
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-gray-100 rounded-xl p-3">
              <p className="text-2xl font-extrabold text-gray-900 font-mono">{stepCount}</p>
              <p className="text-xs font-bold text-gray-500">Pasos</p>
            </div>
            <div className="bg-gray-100 rounded-xl p-3">
              <p className="text-2xl font-extrabold text-gray-900 font-mono">
                {distanceMeters.toFixed(1)}
              </p>
              <p className="text-xs font-bold text-gray-500">Metros</p>
            </div>
            <div className="bg-gray-100 rounded-xl p-3">
              <p className="text-2xl font-extrabold text-gray-900 font-mono">{cadence}</p>
              <p className="text-xs font-bold text-gray-500">ppm</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onAddSteps && onAddSteps(1)}
              className="min-h-[56px] p-3 rounded-xl font-bold bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
            >
              +1 paso
            </button>
            <button
              onClick={() => onAddSteps && onAddSteps(10)}
              className="min-h-[56px] p-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors"
            >
              +10 pasos
            </button>
          </div>
          <button
            onClick={onResetSteps}
            className="w-full min-h-[48px] mt-2 p-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Reiniciar podómetro
          </button>
          <p className="text-xs text-gray-500 mt-2">
            En el celular, los pasos se cuentan solos con el acelerómetro al caminar.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 min-h-[56px] p-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Reiniciar
          </button>
          <button
            onClick={onClose}
            className="flex-1 min-h-[56px] p-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SensorSimulatorDrawer;
