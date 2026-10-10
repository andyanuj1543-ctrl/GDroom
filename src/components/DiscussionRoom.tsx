import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Clock,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  Sparkles,
  Users,
  Bell,
  MessageSquare,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  RoomConfig,
  TranscriptTurn,
  Participant,
  GDStage,
  SpeakingMetrics,
} from '../types/gd';
import { CANDIDATE_ROSTER, MODERATOR } from '../data/participants';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import {
  playWavBase64,
  playBrowserTTS,
  stopCurrentAudio,
  playModeratorBell,
  playTurnChime,
} from '../utils/audioEngine';

interface DiscussionRoomProps {
  config: RoomConfig;
  onFinishDiscussion: (transcript: TranscriptTurn[], metrics: SpeakingMetrics) => void;
  onExit: () => void;
  soundEnabled: boolean;
}

export const DiscussionRoom: React.FC<DiscussionRoomProps> = ({
  config,
  onFinishDiscussion,
  onExit,
  soundEnabled,
}) => {
  // Room Stages
  const [stage, setStage] = useState<GDStage>('intro');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(config.durationMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);

  // Participants in this room
  const activeParticipants = [
    MODERATOR,
    ...CANDIDATE_ROSTER.slice(0, config.panelSize),
  ];

  // Active Speaker & State
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [speakerEmotion, setSpeakerEmotion] = useState<string>('');
  const [isAiGeneratingTurn, setIsAiGeneratingTurn] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [bargeInAlert, setBargeInAlert] = useState<string | null>(null);

  // Silent Coach & Nudges
  const [coachNudge, setCoachNudge] = useState<string>(
    'Prepare to state your framework early. Citing 2 clear criteria establishes executive presence.'
  );
  const [showCoach, setShowCoach] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);

  // User input & Speaking Metrics
  const [typedMessage, setTypedMessage] = useState('');
  const [userSpokenSeconds, setUserSpokenSeconds] = useState(0);
  const [userTurnsCount, setUserTurnsCount] = useState(0);
  const [interruptionsCount, setInterruptionsCount] = useState(0);
  const [lastUserSpokeTimestamp, setLastUserSpokeTimestamp] = useState(Date.now());
  const [speakerDurations, setSpeakerDurations] = useState<Record<string, number>>({});

  // Fishbowl state
  const [isFishbowlActive, setIsFishbowlActive] = useState(
    config.format === 'fishbowl' && config.fishbowlInitialState === 'spectator'
  );

  // Turn orchestration timer ref
  const turnTimeoutRef = useRef<any>(null);
  const userSpeakingTimerRef = useRef<any>(null);
  const isUserSpeakingRef = useRef<boolean>(false);
  const isComponentMountedRef = useRef<boolean>(true);

  // Speech Recognition Hook
  const {
    isListening,
    transcript: liveUserSpeech,
    interimTranscript,
    fullCurrentText,
    audioLevel,
    micPermissionDenied,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition({
    language: config.languageMode === 'hinglish' ? 'en-IN' : 'en-US',
    onSpeechStart: () => {
      handleUserBargeIn();
    },
    onSpeechEnd: (finalText) => {
      if (finalText && finalText.trim().length > 3) {
        commitUserTurn(finalText.trim());
      }
    },
  });

  // Track component mount status
  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
      stopCurrentAudio();
      if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
      if (userSpeakingTimerRef.current) clearInterval(userSpeakingTimerRef.current);
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Main countdown clock
  useEffect(() => {
    if (isPaused || stage === 'completed') return;

    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleStageTransitionToSummaryOrEnd();
          return 0;
        }
        // When 60 seconds left, switch to summary round
        if (prev === 60 && stage === 'discussion') {
          triggerSummaryRound();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, stage]);

  // Track speaker durations per second
  useEffect(() => {
    if (isPaused || !activeSpeakerId) return;

    const tracker = setInterval(() => {
      setSpeakerDurations((prev) => ({
        ...prev,
        [activeSpeakerId]: (prev[activeSpeakerId] || 0) + 1,
      }));
    }, 1000);

    return () => clearInterval(tracker);
  }, [activeSpeakerId, isPaused]);

  // Track user speech duration when user is actively speaking
  useEffect(() => {
    if (activeSpeakerId === 'user') {
      isUserSpeakingRef.current = true;
      userSpeakingTimerRef.current = setInterval(() => {
        setUserSpokenSeconds((prev) => prev + 1);
        setLastUserSpokeTimestamp(Date.now());
      }, 1000);
    } else {
      isUserSpeakingRef.current = false;
      if (userSpeakingTimerRef.current) clearInterval(userSpeakingTimerRef.current);
    }

    return () => {
      if (userSpeakingTimerRef.current) clearInterval(userSpeakingTimerRef.current);
    };
  }, [activeSpeakerId]);

  // Calculate current airtime share
  const totalElapsed = (config.durationMinutes * 60) - timeLeftSeconds;
  const userAirtimePercentage =
    totalElapsed > 5
      ? Math.min(100, Math.round((userSpokenSeconds / Math.max(1, totalElapsed)) * 100))
      : 0;

  // Periodic Silent Coach Nudge Update (every 25 seconds)
  useEffect(() => {
    if (stage === 'intro' || stage === 'completed') return;

    const coachInterval = setInterval(async () => {
      const secondsSinceUserSpoke = Math.floor((Date.now() - lastUserSpokeTimestamp) / 1000);

      // Rule-based instant nudges for high reliability:
      if (secondsSinceUserSpoke > 65) {
        setCoachNudge(
          `You've been quiet for over a minute! Jump in now to validate or counter the current point.`
        );
      } else if (userAirtimePercentage > 35) {
        setCoachNudge(
          `Airtime high (${userAirtimePercentage}%). Invite a quiet peer: "Priya, what's your view on this?"`
        );
      } else {
        // Query backend for context-aware dynamic nudge
        try {
          const res = await fetch('/api/gd/nudge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript,
              lastUserSpokeAgoSeconds: secondsSinceUserSpoke,
              topic: config.topic,
              userAirtimePercentage,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.nudge) setCoachNudge(data.nudge);
          }
        } catch (e) {
          // Keep previous nudge
        }
      }
    }, 24000);

    return () => clearInterval(coachInterval);
  }, [stage, lastUserSpokeTimestamp, transcript, userAirtimePercentage, config.topic]);

  // Auto-start Intro Stage on Mount
  useEffect(() => {
    // Start listening on mic by default for frictionless voice experience
    startListening().catch(() => {});

    // Trigger Moderator Intro
    const timer = setTimeout(() => {
      executeModeratorIntro();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Moderator Intro Turn
  const executeModeratorIntro = async () => {
    if (soundEnabled) playModeratorBell();
    setActiveSpeakerId('mod-shweta');
    setSpeakerEmotion('moderating');

    const introText = `Welcome candidates. Today's group discussion topic is: "${config.topic.title}". You have ${config.durationMinutes} minutes. Please maintain structured logic, listen actively, and respect the floor. You may now commence the discussion.`;

    const turn: TranscriptTurn = {
      id: `turn-${Date.now()}`,
      speakerId: 'mod-shweta',
      speakerName: MODERATOR.name,
      role: 'moderator',
      text: introText,
      timestamp: formatTime((config.durationMinutes * 60) - timeLeftSeconds),
      timeSeconds: (config.durationMinutes * 60) - timeLeftSeconds,
      isUser: false,
      emotion: 'moderating',
    };

    setTranscript((prev) => [...prev, turn]);

    // Speak intro
    await playSpeakerVoice(introText, MODERATOR);

    if (!isComponentMountedRef.current) return;

    setActiveSpeakerId(null);
    setStage('discussion');

    // Give 3.5 seconds pause for user to seize the opening initiation, or let AI start!
    scheduleNextAITurn(3500);
  };

  // Schedule Next AI Turn with Natural Delay
  const scheduleNextAITurn = useCallback(
    (delayMs = config.patienceDelaySeconds * 1000) => {
      if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
      if (stage === 'completed' || isUserSpeakingRef.current) return;

      turnTimeoutRef.current = setTimeout(() => {
        if (!isUserSpeakingRef.current && isComponentMountedRef.current) {
          generateNextAITurn();
        }
      }, delayMs);
    },
    [config.patienceDelaySeconds, stage]
  );

  // Generate Next AI Turn via Gemini backend
  const generateNextAITurn = async (targetSpeakerId?: string) => {
    if (isAiGeneratingTurn || isUserSpeakingRef.current || stage === 'completed') return;

    setIsAiGeneratingTurn(true);
    const secondsSinceUserSpoke = Math.floor((Date.now() - lastUserSpokeTimestamp) / 1000);

    try {
      const res = await fetch('/api/gd/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: config.topic,
          format: config.format,
          languageMode: config.languageMode,
          participants: activeParticipants,
          stage: stage,
          transcript,
          userName: config.userName,
          lastUserSpokeAgoSeconds: secondsSinceUserSpoke,
          targetSpeakerId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate turn from server');
      }

      const turnData = await res.json();
      if (!isComponentMountedRef.current || isUserSpeakingRef.current) {
        setIsAiGeneratingTurn(false);
        return;
      }

      const chosenParticipant =
        activeParticipants.find((p) => p.id === turnData.speakerId) || activeParticipants[1];

      setActiveSpeakerId(chosenParticipant.id);
      setSpeakerEmotion(turnData.emotion || 'analytical');

      const turn: TranscriptTurn = {
        id: `turn-${Date.now()}`,
        speakerId: chosenParticipant.id,
        speakerName: chosenParticipant.name,
        role: chosenParticipant.role,
        text: turnData.text,
        timestamp: formatTime((config.durationMinutes * 60) - timeLeftSeconds),
        timeSeconds: (config.durationMinutes * 60) - timeLeftSeconds,
        isUser: false,
        emotion: turnData.emotion,
        directReplyTo: turnData.directReplyTo,
        thoughtProcess: turnData.thoughtProcess,
      };

      setTranscript((prev) => [...prev, turn]);
      setIsAiGeneratingTurn(false);

      if (soundEnabled && chosenParticipant.role !== 'moderator') {
        playTurnChime();
      }

      // Play audio for this participant
      await playSpeakerVoice(turnData.text, chosenParticipant);

      if (!isComponentMountedRef.current) return;

      setActiveSpeakerId(null);

      // If user hasn't spoken in a while and participant addressed user
      if (turnData.involvesUser) {
        setCoachNudge(`${chosenParticipant.name} just invited you to speak! Unmute or speak up now.`);
      }

      // Next AI turn after natural pause
      scheduleNextAITurn();
    } catch (err) {
      console.error('Error generating AI turn:', err);
      setIsAiGeneratingTurn(false);
      // Retry in 4 seconds if failed
      scheduleNextAITurn(4000);
    }
  };

  // Play Speaker Voice with Gemini TTS + Client SpeechSynthesis Fallback
  const playSpeakerVoice = async (text: string, participant: Participant): Promise<void> => {
    try {
      // First try Gemini-3.8-flash-lite-tts on server
      const ttsRes = await fetch('/api/gd/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: participant.voice,
          speakerRole: participant.role,
        }),
      });

      if (ttsRes.ok) {
        const data = await ttsRes.json();
        if (data.audioBase64) {
          await playWavBase64(data.audioBase64);
          return;
        }
      }
    } catch (err) {
      console.warn('Server TTS unavailable, falling back to browser speech synthesis');
    }

    // Seamless Client-side fallback
    const speakingRate =
      participant.id === 'rohan-dominator'
        ? 1.12
        : participant.id === 'mod-shweta'
        ? 0.95
        : 1.02;

    await playBrowserTTS(text, {
      gender: participant.gender,
      rate: speakingRate,
      pitch: participant.gender === 'female' ? 1.05 : 0.95,
    });
  };

  // Handle Barge-in: user interrupts active AI speaker!
  const handleUserBargeIn = () => {
    if (activeSpeakerId && activeSpeakerId !== 'user') {
      const interruptedParticipant = activeParticipants.find((p) => p.id === activeSpeakerId);
      stopCurrentAudio();
      setActiveSpeakerId('user');
      setInterruptionsCount((prev) => prev + 1);

      if (interruptedParticipant) {
        setBargeInAlert(`Barge-in: ${interruptedParticipant.name} yielded the floor to you!`);
        setTimeout(() => setBargeInAlert(null), 3500);
      }
    } else {
      setActiveSpeakerId('user');
    }

    if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
  };

  // Commit a user turn into the transcript
  const commitUserTurn = (text: string) => {
    if (!text || text.trim().length === 0) return;

    const turn: TranscriptTurn = {
      id: `turn-${Date.now()}`,
      speakerId: 'user',
      speakerName: config.userName,
      role: 'user',
      text: text.trim(),
      timestamp: formatTime((config.durationMinutes * 60) - timeLeftSeconds),
      timeSeconds: (config.durationMinutes * 60) - timeLeftSeconds,
      isUser: true,
      emotion: 'assertive',
    };

    setTranscript((prev) => [...prev, turn]);
    setUserTurnsCount((prev) => prev + 1);
    setLastUserSpokeTimestamp(Date.now());
    clearTranscript();
    setActiveSpeakerId(null);

    // AI participants will now respond to the user's point!
    scheduleNextAITurn(config.patienceDelaySeconds * 1000);
  };

  // Submit manual typed message (if mic is muted or environment noisy)
  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    handleUserBargeIn();
    commitUserTurn(typedMessage.trim());
    setTypedMessage('');
  };

  // Transition to Summary Round
  const triggerSummaryRound = async () => {
    setStage('summary');
    if (soundEnabled) playModeratorBell();
    setCoachNudge(
      'Summary Round! Summarize group consensus and trade-offs. Do NOT bring new points.'
    );
    // Have Moderator prompt closing round
    await generateNextAITurn('mod-shweta');
  };

  // Stage transition to summary or completed
  const handleStageTransitionToSummaryOrEnd = () => {
    if (stage === 'intro' || stage === 'discussion') {
      triggerSummaryRound();
    } else {
      handleFinishDiscussion();
    }
  };

  // End discussion and generate report
  const handleFinishDiscussion = () => {
    stopCurrentAudio();
    stopListening();
    setStage('completed');

    const totalSeconds = (config.durationMinutes * 60) - timeLeftSeconds;
    const metrics: SpeakingMetrics = {
      userTurnsCount,
      userSpokenDuration: userSpokenSeconds,
      interruptionsCount,
      userAirtimePercentage: totalSeconds > 0 ? Math.round((userSpokenSeconds / totalSeconds) * 100) : 0,
      totalDiscussionDuration: Math.max(1, totalSeconds),
      speakerDurations,
    };

    onFinishDiscussion(transcript, metrics);
  };

  // Moderator manual bell trigger
  const handleModeratorBellClick = () => {
    if (soundEnabled) playModeratorBell();
    setBargeInAlert('Moderator Bell rung: Room order restored.');
    setTimeout(() => setBargeInAlert(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4 animate-in fade-in">
      {/* Top Room Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Topic & Stage info */}
        <div className="flex items-center gap-3 min-w-[260px]">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {config.format.toUpperCase()}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  stage === 'intro'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : stage === 'summary'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {stage === 'intro' ? 'Stage 1: Briefing' : stage === 'summary' ? 'Stage 3: Closing Round' : 'Stage 2: Open Debate'}
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-100 truncate max-w-md sm:max-w-xl" title={config.topic.title}>
              {config.topic.title}
            </h2>
          </div>
        </div>

        {/* Center: Live Timer & Airtime Gauge */}
        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Clock
              className={`w-4 h-4 ${
                timeLeftSeconds < 60 ? 'text-rose-400 animate-pulse' : 'text-blue-400'
              }`}
            />
            <span
              className={`font-mono text-base font-bold ${
                timeLeftSeconds < 60 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {formatTime(timeLeftSeconds)}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* User Airtime Share */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <div className="text-xs">
              <span className="text-slate-400">Your Airtime: </span>
              <span
                className={`font-semibold ${
                  userAirtimePercentage >= 15 && userAirtimePercentage <= 30
                    ? 'text-emerald-400'
                    : userAirtimePercentage < 15
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {userAirtimePercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleModeratorBellClick}
            title="Ring Moderator Bell to quiet the room"
            className="p-2 text-slate-400 hover:text-amber-400 bg-slate-950 hover:bg-amber-950/40 border border-slate-800 rounded-xl transition"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={handleFinishDiscussion}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md transition"
          >
            Conclude & View Report
          </button>
        </div>
      </div>

      {/* Barge-in or Notification Alert Banner */}
      {bargeInAlert && (
        <div className="bg-blue-950/80 border border-blue-500/50 rounded-xl px-4 py-2 text-xs font-medium text-blue-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span>{bargeInAlert}</span>
          </div>
        </div>
      )}

      {/* Mic Permission Denied Banner */}
      {micPermissionDenied && (
        <div className="bg-amber-950/80 border border-amber-500/50 rounded-xl px-4 py-2.5 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Microphone access is blocked in your browser. You can still participate in the discussion by typing in the chatbox below!
          </span>
        </div>
      )}

      {/* Fishbowl Spectator Mode Banner */}
      {isFishbowlActive && (
        <div className="bg-indigo-950/80 border border-indigo-500/50 rounded-xl p-3 text-xs text-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>
              <strong>Fishbowl Mode:</strong> You are currently observing in the outer circle. Listen to the opening arguments, then step into the hot seat!
            </span>
          </div>
          <button
            onClick={() => {
              setIsFishbowlActive(false);
              handleUserBargeIn();
            }}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow transition"
          >
            Step into Hot Seat
          </button>
        </div>
      )}

      {/* Video Tile Boardroom Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Moderator Tile */}
        <div
          className={`relative rounded-2xl p-4 transition-all duration-300 border flex flex-col justify-between min-h-[170px] ${
            activeSpeakerId === MODERATOR.id
              ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/40 speaking-ring shadow-xl shadow-amber-500/10'
              : 'bg-slate-950/80 border-slate-800/80'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-gradient-to-tr ${MODERATOR.avatarColor} text-white shadow-md`}
              >
                {MODERATOR.avatarInitial}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100">{MODERATOR.name}</h3>
                <span className="text-[10px] text-amber-400 font-medium">{MODERATOR.archetype}</span>
              </div>
            </div>

            {/* Speaking visualizer / Badge */}
            {activeSpeakerId === MODERATOR.id && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 animate-pulse">
                Speaking
              </span>
            )}
          </div>

          {/* Subtitle / Active Quote snippet */}
          <div className="my-2 bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/50 min-h-[50px] flex items-center">
            {activeSpeakerId === MODERATOR.id ? (
              <p className="text-xs text-amber-200/90 leading-relaxed italic line-clamp-2">
                "{transcript[transcript.length - 1]?.text || 'Setting discussion protocol...'}"
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                Overseeing debate structure and fairness...
              </p>
            )}
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
            <span>Airtime: {speakerDurations[MODERATOR.id] || 0}s</span>
            <span className="text-slate-400">Role: Moderator</span>
          </div>
        </div>

        {/* AI Candidates Tiles */}
        {activeParticipants.slice(1).map((candidate) => {
          const isSpeaking = activeSpeakerId === candidate.id;
          const isReferenced =
            activeSpeakerId &&
            transcript[transcript.length - 1]?.directReplyTo?.includes(candidate.name);

          return (
            <div
              key={candidate.id}
              className={`relative rounded-2xl p-4 transition-all duration-300 border flex flex-col justify-between min-h-[170px] ${
                isSpeaking
                  ? 'bg-slate-900 border-blue-500 ring-2 ring-blue-500/40 speaking-ring shadow-xl shadow-blue-500/10'
                  : isReferenced
                  ? 'bg-slate-950 border-indigo-500/60'
                  : 'bg-slate-950/80 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-gradient-to-tr ${candidate.avatarColor} text-white shadow-md`}
                  >
                    {candidate.avatarInitial}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100">{candidate.name}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {candidate.archetype}
                    </span>
                  </div>
                </div>

                {isSpeaking && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-[10px] font-semibold text-blue-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                    <span>{speakerEmotion || 'Speaking'}</span>
                  </div>
                )}
              </div>

              {/* Active Spoken Speech Bubble or Persona Preview */}
              <div className="my-2 bg-slate-900/60 rounded-xl p-2.5 border border-slate-800/50 min-h-[50px] flex items-center">
                {isSpeaking ? (
                  <p className="text-xs text-blue-200/95 leading-relaxed italic line-clamp-2">
                    "{transcript[transcript.length - 1]?.text || 'Speaking...'}"
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {candidate.speakingStyle}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                <span>Airtime: {speakerDurations[candidate.id] || 0}s</span>
                <span className="text-slate-400">Voice: {candidate.voice}</span>
              </div>
            </div>
          );
        })}

        {/* YOU (The Candidate Tile) */}
        <div
          className={`relative rounded-2xl p-4 transition-all duration-300 border flex flex-col justify-between min-h-[170px] ${
            activeSpeakerId === 'user' || isListening
              ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-500/10'
              : 'bg-slate-950/80 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-gradient-to-tr from-emerald-600 to-teal-800 text-white shadow-md">
                YOU
              </div>
              <div>
                <h3 className="text-xs font-bold text-emerald-300">{config.userName}</h3>
                <span className="text-[10px] text-slate-400 font-medium">Candidate (You)</span>
              </div>
            </div>

            {/* Speaking / Mic indicator */}
            <div className="flex items-center gap-1.5">
              {activeSpeakerId === 'user' ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 animate-pulse">
                  You Have Floor
                </span>
              ) : isListening ? (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-medium text-slate-300 flex items-center gap-1">
                  <Mic className="w-3 h-3 text-emerald-400" />
                  Mic Live
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-500">
                  Muted
                </span>
              )}
            </div>
          </div>

          {/* User's live transcription box */}
          <div className="my-2 bg-slate-900/80 rounded-xl p-2.5 border border-emerald-950 min-h-[50px] flex items-center">
            {fullCurrentText ? (
              <p className="text-xs text-emerald-200 font-medium leading-relaxed italic line-clamp-2">
                "{fullCurrentText}"
              </p>
            ) : activeSpeakerId === 'user' ? (
              <p className="text-xs text-emerald-400/80 animate-pulse">
                Listening to your voice... Speak clearly.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                Floor open. Speak into your microphone to claim turn.
              </p>
            )}
          </div>

          {/* Audio volume visualizer meter */}
          <div className="pt-1 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              <span>Mic:</span>
              <div className="w-20 bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-1.5 transition-all duration-75"
                  style={{ width: `${Math.min(100, audioLevel * 1.5)}%` }}
                />
              </div>
            </div>
            <span>Turns: {userTurnsCount}</span>
          </div>
        </div>
      </div>

      {/* Real-time Silent Placement Coach Banner */}
      {showCoach && (
        <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/70 to-slate-900 border border-blue-500/30 rounded-2xl p-3.5 shadow-lg flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                Placement Coach Nudge (Silent Feedback)
              </span>
              <button
                onClick={() => setShowCoach(false)}
                className="text-slate-500 hover:text-slate-300 text-xs"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-snug">{coachNudge}</p>
          </div>
        </div>
      )}

      {/* Closed Captions Live Banner (if active) */}
      {showCaptions && transcript.length > 0 && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-bold text-slate-100">
              {transcript[transcript.length - 1].speakerName}:
            </span>{' '}
            <span>{transcript[transcript.length - 1].text}</span>
          </div>
        </div>
      )}

      {/* Bottom Sticky Control Dock */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Mic toggle & Voice status */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md ${
              isListening
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/50 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span>{isListening ? 'Mic Active (Speaking)' : 'Mic Muted (Click to Talk)'}</span>
          </button>

          {fullCurrentText && (
            <button
              onClick={() => commitUserTurn(fullCurrentText)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              Commit Spoken Turn
            </button>
          )}
        </div>

        {/* Center: Typed Message Input (Hybrid text/speech fallback) */}
        <form onSubmit={handleSendTyped} className="flex items-center gap-2 w-full sm:max-w-md">
          <input
            type="text"
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            placeholder="Type your point (or simply speak into your mic)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!typedMessage.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Right: Quick toggles */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              showCaptions
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            CC
          </button>

          <button
            onClick={() => setShowCoach(!showCoach)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              showCoach
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            Coach HUD
          </button>
        </div>
      </div>
    </div>
  );
};
