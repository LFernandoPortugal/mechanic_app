import { useState, useRef, useCallback } from "react";

interface SpeechRecognitionHook {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Wraps the Web Speech API (SpeechRecognition) for real-time voice-to-text.
 * Configured for Spanish (es-ES) for mechanic symptom capture.
 *
 * Gracefully degrades: `isSupported` is false on browsers without the API.
 */
export function useSpeechRecognition(lang = "es-ES"): SpeechRecognitionHook {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition)
      : undefined;

  const isSupported = !!SpeechRecognitionAPI;

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError("Tu navegador no soporta el reconocimiento de voz. Usa Chrome o Edge.");
      return;
    }

    setError(null);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.continuous = true;       // keep listening until stop() called
    recognition.interimResults = true;   // show partial results while speaking

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        setError("No se detectó voz. Intenta de nuevo.");
      } else if (event.error === "not-allowed") {
        setError("Permiso de micrófono denegado. Habilítalo en la configuración del navegador.");
      } else {
        setError(`Error de voz: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [SpeechRecognitionAPI, lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.stop();
    setTranscript("");
    setIsListening(false);
    setError(null);
  }, []);

  return { transcript, isListening, isSupported, error, start, stop, reset };
}
