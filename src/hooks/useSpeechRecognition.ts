import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onSpeechStart?: () => void;
  onSpeechResult?: (transcript: string, isFinal: boolean) => void;
  onSpeechEnd?: (finalTranscript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

export function useSpeechRecognition({
  onSpeechStart,
  onSpeechResult,
  onSpeechEnd,
  onError,
  language = 'en-US',
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 volume level

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const accumulatedTranscriptRef = useRef('');
  const isSpeechDetectedRef = useRef(false);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (onError) onError('Web Speech API is not supported in this browser. You can still use the text box below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setMicPermissionDenied(false);
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalChunk += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (!isSpeechDetectedRef.current && (interim.trim() || finalChunk.trim())) {
        isSpeechDetectedRef.current = true;
        if (onSpeechStart) onSpeechStart();
      }

      setInterimTranscript(interim);

      if (finalChunk) {
        accumulatedTranscriptRef.current += finalChunk;
        setTranscript(accumulatedTranscriptRef.current);
        if (onSpeechResult) onSpeechResult(accumulatedTranscriptRef.current, true);
      } else if (interim) {
        if (onSpeechResult) onSpeechResult(accumulatedTranscriptRef.current + interim, false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setMicPermissionDenied(true);
        setIsListening(false);
        if (onError) onError('Microphone access was denied. Please allow microphone in browser settings.');
      } else if (event.error === 'no-speech') {
        // Normal silence timeout
      } else {
        console.warn('Speech recognition event warning:', event.error);
      }
    };

    recognition.onend = () => {
      // If we still intend to listen, we can restart unless user stopped
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [language]);

  // Audio level analyzer using Web Audio API
  const startVolumeAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setAudioLevel(normalized);

        // Voice activity threshold triggers onSpeechStart early
        if (normalized > 18 && !isSpeechDetectedRef.current) {
          isSpeechDetectedRef.current = true;
          if (onSpeechStart) onSpeechStart();
        }

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err: any) {
      console.warn('Microphone stream access warning:', err);
      if (err.name === 'NotAllowedError') {
        setMicPermissionDenied(true);
      }
    }
  }, [onSpeechStart]);

  const stopVolumeAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startListening = useCallback(async () => {
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    isSpeechDetectedRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        // May already be running
      }
    }

    await startVolumeAnalysis();
  }, [startVolumeAnalysis]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    stopVolumeAnalysis();

    const finalSpoken = (accumulatedTranscriptRef.current + ' ' + interimTranscript).trim();
    if (onSpeechEnd && finalSpoken) {
      onSpeechEnd(finalSpoken);
    }
    isSpeechDetectedRef.current = false;
  }, [interimTranscript, onSpeechEnd, stopVolumeAnalysis]);

  const clearTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullCurrentText: (transcript + ' ' + interimTranscript).trim(),
    audioLevel,
    micPermissionDenied,
    startListening,
    stopListening,
    clearTranscript,
  };
}
