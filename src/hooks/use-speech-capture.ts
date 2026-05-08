"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createSpeechProvider, type SpeechProvider } from "@/lib/speech";

export function useSpeechCapture(onTranscript: (text: string) => void) {
  const providerRef = useRef<SpeechProvider | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const provider = createSpeechProvider();
    providerRef.current = provider;
    setIsSupported(Boolean(provider));

    if (!provider) {
      return undefined;
    }

    provider.onTranscript(onTranscript);
    provider.onError((error) => {
      setErrorMessage(error.message);
      setIsListening(false);
    });

    return () => {
      provider.stop().catch(() => undefined);
    };
  }, [onTranscript]);

  const start = useCallback(async () => {
    if (!providerRef.current) {
      setErrorMessage("Speech capture is unavailable. You can still type your entry manually.");
      return;
    }

    setErrorMessage(null);
    await providerRef.current.start();
    setIsListening(true);
  }, []);

  const stop = useCallback(async () => {
    if (!providerRef.current) {
      return;
    }

    await providerRef.current.stop();
    setIsListening(false);
  }, []);

  return {
    isSupported,
    isListening,
    errorMessage,
    start,
    stop,
    clearError: () => setErrorMessage(null),
  };
}
