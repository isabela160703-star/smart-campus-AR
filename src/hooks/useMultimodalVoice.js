import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * useMultimodalVoice - Interfaz multimodal de voz (Web Speech API)
 * - Síntesis de voz (TTS) en español (es-ES)
 * - Reconocimiento de comandos: "siguiente", "anterior", "leer", "cámara"
 *   (más "parar"/"detener" para cortar la lectura)
 */
export const useMultimodalVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

  const isSupported =
    typeof window !== 'undefined' &&
    !!((window.SpeechRecognition || window.webkitSpeechRecognition) && window.speechSynthesis);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase().trim();

        // Evitar eco: ignorar lo que el micrófono capte de la propia síntesis
        // de voz, salvo los comandos de parada
        const isStopCommand = command.includes('parar') || command.includes('detener');
        if (window.speechSynthesis?.speaking && !isStopCommand) return;

        // Marca de tiempo para que repetir el mismo comando sí dispare la acción
        setLastCommand({ text: command, at: Date.now() });
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Error de reconocimiento de voz:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    synthesisRef.current = window.speechSynthesis;

    return () => {
      recognitionRef.current?.abort();
      synthesisRef.current?.cancel();
    };
  }, []);

  // Mapear texto libre a una acción semántica
  const processCommand = useCallback((command) => {
    const commands = [
      ['siguiente', 'next'],
      ['anterior', 'previous'],
      ['leer', 'read'],
      ['cámara', 'camera'],
      ['camara', 'camera'],
      ['parar', 'stop'],
      ['detener', 'stop']
    ];

    for (const [key, action] of commands) {
      if (command.includes(key)) return action;
    }
    return null;
  }, []);

  // Síntesis de voz (TTS) en español
  const speak = useCallback((text, lang = 'es-ES') => {
    if (!synthesisRef.current) return;

    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current.speak(utterance);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error al iniciar reconocimiento de voz:', error);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, [isListening]);

  const stopSpeaking = useCallback(() => {
    synthesisRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    isSupported,
    isListening,
    isSpeaking,
    lastCommand,
    speak,
    startListening,
    stopListening,
    stopSpeaking,
    processCommand
  };
};
