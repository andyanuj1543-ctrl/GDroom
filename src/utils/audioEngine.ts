// Audio engine for playing Gemini TTS and browser speech synthesis fallback

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

export function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function playWavBase64(base64Wav: string): Promise<void> {
  stopCurrentAudio();
  return new Promise((resolve, reject) => {
    try {
      const audioUrl = `data:audio/wav;base64,${base64Wav}`;
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      audio.onended = () => {
        currentAudio = null;
        resolve();
      };

      audio.onerror = (e) => {
        currentAudio = null;
        reject(e);
      };

      audio.play().catch((err) => {
        currentAudio = null;
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function playBrowserTTS(
  text: string,
  options: {
    gender?: 'male' | 'female';
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
  } = {}
): Promise<void> {
  stopCurrentAudio();

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTimeout(resolve, 1000);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (options.gender === 'female') {
        const femaleVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Female') ||
              v.name.includes('Zira') ||
              v.name.includes('Samantha') ||
              v.name.includes('Google UK English Female') ||
              v.name.includes('Natural'))
        );
        if (femaleVoice) utterance.voice = femaleVoice;
      } else {
        const maleVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Male') ||
              v.name.includes('David') ||
              v.name.includes('Alex') ||
              v.name.includes('Google US English') ||
              v.name.includes('Natural'))
        );
        if (maleVoice) utterance.voice = maleVoice;
      }
    }

    utterance.onend = () => {
      if (options.onEnd) options.onEnd();
      resolve();
    };

    utterance.onerror = () => {
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

// Synthesize pleasant sound effect chimes using standard Web Audio API
export function playModeratorBell() {
  try {
    const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContext = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {
    // Audio context may require user gesture
  }
}

export function playTurnChime() {
  try {
    const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContext = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Ignore
  }
}
