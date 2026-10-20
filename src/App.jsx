import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Compass,
  Camera,
  Volume2,
  Smartphone,
  Vibrate,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { poiData, getActivePOI } from './data/poiData';
import { useHaptics } from './hooks/useHaptics';
import { useMultimodalVoice } from './hooks/useMultimodalVoice';
import { useMotionSensors } from './hooks/useMotionSensors';
import { useStepCounter } from './hooks/useStepCounter';
import StatusHeader from './components/StatusHeader';
import ARCameraView from './components/ARCameraView';
import AdaptiveCardView from './components/AdaptiveCardView';
import ThumbZoneControls from './components/ThumbZoneControls';
import SensorSimulatorDrawer from './components/SensorSimulatorDrawer';

/**
 * SmartCampus AR - Aplicación principal
 * - Pantalla de bienvenida que solicita permisos de sensores y cámara en un
 *   gesto de usuario (requisito iOS 13+ y navegadores en contexto seguro)
 * - Integra interfaz adaptativa, interacción multimodal zero-touch y vista AR
 */
function App() {
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isARView, setIsARView] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorState, setSimulatorState] = useState(null);
  const [lightMode, setLightMode] = useState('normal');

  const { vibrateCardChange, vibrateDouble, vibratePulse } = useHaptics();

  const {
    orientation,
    isWalking,
    hasPermission,
    requestPermission,
    startSensors,
    onOrientationChange,
    onShake
  } = useMotionSensors(simulatorState);

  const {
    isListening,
    isSpeaking,
    lastCommand,
    speak,
    startListening,
    stopListening,
    stopSpeaking,
    processCommand
  } = useMultimodalVoice();

  // Podómetro real basado en acelerómetro (RF1.1); acepta simulación en PC.
  // Solo cuenta con sensores reales si hay permiso concedido.
  const { stepCount, cadence, distanceMeters, addSteps, resetSteps } = useStepCounter({
    simulatorState,
    enabled: hasPermission
  });

  // Referencias estables para callbacks que se registran una sola vez
  const currentIndexRef = useRef(0);
  const isWalkingRef = useRef(false);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    isWalkingRef.current = isWalking;
  }, [isWalking]);

  // Leer la tarjeta activa por voz (TTS en español)
  const readCurrentCard = useCallback(() => {
    const poi = poiData[currentIndexRef.current];
    if (poi) {
      const text = isWalkingRef.current ? poi.resumenCorto : poi.descripcionCompleta;
      speak(`${poi.nombre}. ${text}`);
    }
  }, [speak]);

  const toggleSpeaking = useCallback(() => {
    const speaking = isSpeaking || window.speechSynthesis?.speaking;
    if (speaking) {
      stopSpeaking();
    } else {
      readCurrentCard();
    }
  }, [isSpeaking, stopSpeaking, readCurrentCard]);

  // Navegación entre laboratorios
  const handleNext = useCallback(() => {
    vibrateCardChange();
    setCurrentIndex((prev) => (prev + 1) % poiData.length);
  }, [vibrateCardChange]);

  const handlePrevious = useCallback(() => {
    vibrateCardChange();
    setCurrentIndex((prev) => (prev - 1 + poiData.length) % poiData.length);
  }, [vibrateCardChange]);

  const toggleAR = useCallback(() => setIsARView((prev) => !prev), []);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Pantalla de bienvenida: permisos de sensores + cámara en gesto de usuario
  const handleStart = async () => {
    let denied = false;

    try {
      const granted = await requestPermission();
      if (!granted) denied = true;
    } catch {
      denied = true;
    }

    // Solicitar también el permiso de cámara (se libera el stream de inmediato;
    // la vista AR lo re-adquiere al activarse)
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (error) {
      console.warn('Permiso de cámara no concedido:', error);
    }

    setPermissionDenied(denied);
    startSensors();
    setIsWelcomeScreen(false);

    // Si los sensores fueron denegados, dejar el simulador listo como fallback
    if (denied) setIsSimulatorOpen(true);
  };

  // RF2.1: inclinación lateral (gamma) navega entre laboratorios
  useEffect(() => {
    onOrientationChange((direction) => {
      if (direction === 'next') handleNext();
      else if (direction === 'previous') handlePrevious();
    });
  }, [onOrientationChange, handleNext, handlePrevious]);

  // RF2.1: shake detiene o inicia la lectura por voz
  useEffect(() => {
    onShake(() => {
      vibrateDouble();
      toggleSpeaking();
    });
  }, [onShake, vibrateDouble, toggleSpeaking]);

  // RF2.2: procesar comandos de voz exactamente una vez por comando nuevo
  const lastProcessedCommandRef = useRef(null);
  useEffect(() => {
    if (!lastCommand?.text) return;
    if (lastProcessedCommandRef.current === lastCommand.at) return;
    lastProcessedCommandRef.current = lastCommand.at;

    const action = processCommand(lastCommand.text);
    if (!action) return;

    vibrateDouble();
    switch (action) {
      case 'next':
        handleNext();
        break;
      case 'previous':
        handlePrevious();
        break;
      case 'read':
        readCurrentCard();
        break;
      case 'camera':
        toggleAR();
        break;
      case 'stop':
        stopSpeaking();
        break;
      default:
        break;
    }
  }, [
    lastCommand,
    processCommand,
    vibrateDouble,
    handleNext,
    handlePrevious,
    readCurrentCard,
    toggleAR,
    stopSpeaking
  ]);

  // RF1.1: lectura automática al empezar a caminar o al cambiar de tarjeta caminando
  const lastReadRef = useRef(null);
  useEffect(() => {
    if (isWelcomeScreen || !isWalking) {
      lastReadRef.current = null;
      return;
    }
    const key = `walking-${currentIndex}`;
    if (lastReadRef.current === key) return;
    lastReadRef.current = key;
    readCurrentCard();
  }, [isWalking, currentIndex, isWelcomeScreen, readCurrentCard]);

  // POI anclado según el rumbo de la brújula (modo AR)
  const activePOI = getActivePOI(orientation.alpha);

  // RF2.3: pulso háptico la primera vez que se fija cada laboratorio en AR
  const lastFixedPoiRef = useRef(null);
  const handleCardFixed = useCallback(
    (poi) => {
      if (lastFixedPoiRef.current !== poi.id) {
        lastFixedPoiRef.current = poi.id;
        vibratePulse();
      }
      const index = poiData.findIndex((p) => p.id === poi.id);
      if (index !== -1) setCurrentIndex(index);
    },
    [vibratePulse]
  );

  // Salir del modo AR libera el audio y mantiene el estado coherente
  useEffect(() => {
    if (!isARView) return undefined;
    return () => {
      stopListening();
    };
  }, [isARView, stopListening]);

  // El simulador (DevTools HCI) sobreescribe sensores y controla el tema lumínico
  const handleSimulatorChange = useCallback((state) => {
    setSimulatorState(state);
    setLightMode(state.lightMode);
  }, []);

  const currentPOI = poiData[currentIndex];

  // ---------------------------------------------------------------------
  // Pantalla de bienvenida con solicitud de permisos
  // ---------------------------------------------------------------------
  if (isWelcomeScreen) {
    const steps = [
      {
        icon: Camera,
        text: 'Usa la cámara trasera para ver la realidad aumentada y fijar laboratorios con la brújula.'
      },
      {
        icon: Compass,
        text: 'Inclina el teléfono a la derecha o izquierda para cambiar de laboratorio.'
      },
      {
        icon: Volume2,
        text: 'Da comandos de voz: "siguiente", "anterior", "leer" o "cámara".'
      },
      {
        icon: Vibrate,
        text: 'Agita el teléfono para iniciar o detener la lectura por voz.'
      },
      {
        icon: Smartphone,
        text: 'Camina para que la app simplifique la tarjeta y te lea el resumen en voz alta.'
      }
    ];

    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-cyan-600 via-blue-700 to-slate-900 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center my-6">
          <Compass className="w-14 h-14 text-cyan-600 mx-auto mb-3" />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-1">
            SmartCampus AR
          </h1>
          <p className="text-gray-600 mb-6">Guía multimodal de laboratorios</p>

          <ul className="space-y-3 mb-8 text-left">
            {steps.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-cyan-100 rounded-full flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-cyan-700" />
                </div>
                <p className="text-sm text-gray-700 pt-1.5">{text}</p>
              </li>
            ))}
          </ul>

          <button
            onClick={handleStart}
            className="w-full min-h-[64px] py-4 bg-cyan-600 text-white rounded-2xl font-extrabold text-lg hover:bg-cyan-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-6 h-6" />
            Activar Sensores y Cámara
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Se solicitarán permisos de cámara, micrófono y sensores. Usa el simulador desde la
            app si tu dispositivo no los soporta.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Aplicación principal
  // ---------------------------------------------------------------------
  return (
    <div
      className={`min-h-[100dvh] transition-colors duration-300 ${
        lightMode === 'solar' ? 'bg-black' : lightMode === 'dark' ? 'bg-gray-950' : 'bg-gray-100'
      }`}
    >
      <StatusHeader
        isWalking={isWalking}
        lightMode={lightMode}
        alpha={orientation.alpha}
        isListening={isListening}
        isSpeaking={isSpeaking}
        stepCount={stepCount}
        distanceMeters={distanceMeters}
      />

      <main className="pt-20 pb-36 px-4 max-w-lg mx-auto">
        {permissionDenied && (
          <div
            className={`mb-3 flex items-start gap-2 p-3 rounded-xl text-sm font-bold ${
              lightMode === 'solar'
                ? 'bg-black border-2 border-yellow-400 text-yellow-400'
                : 'bg-orange-100 text-orange-800'
            }`}
            role="alert"
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>
              Sensores denegados: usa el simulador (botón Sim) para probar la experiencia completa.
            </span>
          </div>
        )}

        {isARView ? (
          <ARCameraView
            alpha={orientation.alpha}
            activePOI={activePOI}
            poiData={poiData}
            onCardFixed={handleCardFixed}
            isWalking={isWalking}
            lightMode={lightMode}
          />
        ) : (
          <AdaptiveCardView
            poi={currentPOI}
            isWalking={isWalking}
            lightMode={lightMode}
            stepCount={stepCount}
            cadence={cadence}
            distanceMeters={distanceMeters}
          />
        )}
      </main>

      <ThumbZoneControls
        isARView={isARView}
        onToggleAR={toggleAR}
        isListening={isListening}
        onToggleVoice={toggleVoice}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        lightMode={lightMode}
      />

      <SensorSimulatorDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSimulatorChange={handleSimulatorChange}
        stepCount={stepCount}
        cadence={cadence}
        distanceMeters={distanceMeters}
        onAddSteps={addSteps}
        onResetSteps={resetSteps}
      />

      {isSpeaking && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 bg-cyan-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Leyendo en voz alta...
        </div>
      )}
    </div>
  );
}

export default App;
