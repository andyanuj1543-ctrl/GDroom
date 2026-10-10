import React, { useState } from 'react';
import {
  Mic,
  Users,
  Clock,
  Sparkles,
  Sliders,
  Play,
  Volume2,
  CheckCircle2,
  BookOpen,
  Globe,
  Briefcase,
  AlertCircle,
  PlusCircle,
  Eye,
  Zap,
} from 'lucide-react';
import { GDTopic, RoomConfig, GDFormat, LanguageMode } from '../types/gd';
import { CURATED_TOPICS } from '../data/topics';
import { CANDIDATE_ROSTER, MODERATOR } from '../data/participants';
import { CustomTopicModal } from './CustomTopicModal';
import { playTurnChime } from '../utils/audioEngine';

interface LobbyProps {
  onStartRoom: (config: RoomConfig) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onStartRoom }) => {
  const [topics, setTopics] = useState<GDTopic[]>(CURATED_TOPICS);
  const [selectedTopic, setSelectedTopic] = useState<GDTopic>(CURATED_TOPICS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [panelSize, setPanelSize] = useState<number>(4);
  const [format, setFormat] = useState<GDFormat>('standard');
  const [durationMinutes, setDurationMinutes] = useState<number>(5);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('english');
  const [patienceDelay, setPatienceDelay] = useState<number>(2.5);
  const [userName, setUserName] = useState<string>('Aditya Sharma');
  const [targetRole, setTargetRole] = useState<string>('Management Trainee / Product Analyst');

  // Mic preflight test state
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micStatus, setMicStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  // Custom topic modal
  const [showCustomModal, setShowCustomModal] = useState(false);

  const categories = ['All', 'Tech & AI', 'Business & Economy', 'Case Study', 'Abstract', 'Ethics & Society'];

  const filteredTopics = topics.filter((t) => {
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeParticipants = CANDIDATE_ROSTER.slice(0, panelSize);

  // Test microphone pre-flight
  const handleTestMic = async () => {
    if (isMicTesting) {
      setIsMicTesting(false);
      setMicStatus('idle');
      return;
    }

    try {
      setIsMicTesting(true);
      setMicStatus('testing');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let frames = 0;

      const check = () => {
        if (frames > 150) {
          // Finished 5-sec test
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
          setIsMicTesting(false);
          setMicStatus('success');
          setMicLevel(0);
          return;
        }
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i];
        const avg = Math.min(100, Math.round((sum / buffer.length / 128) * 100));
        setMicLevel(avg);
        frames++;
        requestAnimationFrame(check);
      };
      check();
    } catch (e) {
      setIsMicTesting(false);
      setMicStatus('failed');
    }
  };

  const handleLaunch = () => {
    const config: RoomConfig = {
      topic: selectedTopic,
      format,
      panelSize,
      durationMinutes,
      languageMode,
      patienceDelaySeconds: patienceDelay,
      userName: userName.trim() || 'Candidate',
      targetRole: targetRole.trim() || 'Campus Hire',
      fishbowlInitialState: format === 'fishbowl' ? 'spectator' : 'active',
    };
    onStartRoom(config);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Campus Placement GD Simulator</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Practice Real Group Discussions Before Your Placement Drive.
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Sit in a live voice room with distinct AI personalities (the Dominator, the Analyst, the Diplomat, and the Skeptic). They debate each other, react to your voice, and yield when you interrupt. Get radical, quoted feedback afterwards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Topic Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-slate-100">1. Select Discussion Topic</h2>
              </div>
              <button
                onClick={() => setShowCustomModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Custom Topic
              </button>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Topic List */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredTopics.map((topic) => {
                const isSelected = selectedTopic.id === topic.id;
                return (
                  <div
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopic(topic);
                      if (topic.defaultFormat) setFormat(topic.defaultFormat);
                    }}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {topic.category}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {topic.difficulty}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100 mb-1 leading-snug">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {topic.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Selected Topic Blueprint Inspector */}
            {selectedTopic && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    Topic Dossier & Debating Axes
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Recommended Frameworks: {selectedTopic.suggestedFrameworks.join(', ')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedTopic.backgroundBrief}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTopic.keyDebateAxes.map((axis, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      • {axis}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Candidate Profile Setup */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">2. Candidate Profile & Target</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Aditya Sharma"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Company / Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. McKinsey / Unilever / Google PM"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Room Settings & Roster (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-slate-100">3. Room Dynamics & Format</h2>
            </div>

            {/* Format Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                GD Format
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'standard', name: 'Standard GD', desc: 'Open-floor corporate placement debate' },
                  { id: 'case_study', name: 'Case-Study', desc: 'Dilemma with structured tradeoffs' },
                  { id: 'abstract', name: 'Abstract Prompt', desc: 'Metaphorical & lateral reasoning' },
                  { id: 'fishbowl', name: 'Fishbowl Mode', desc: 'Watch first, enter the circle!' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setFormat(fmt.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      format === fmt.id
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">{fmt.name}</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Duration (Timer)
                </label>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {[3, 5, 8].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-2 rounded-lg font-semibold border transition ${
                        durationMinutes === mins
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Language & Tone
                </label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { id: 'english', label: 'English' },
                    { id: 'hinglish', label: 'Hinglish' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setLanguageMode(lang.id as any)}
                      className={`py-2 rounded-lg font-semibold border transition ${
                        languageMode === lang.id
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel Size Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Panel Size: {panelSize} AI Peers + 1 Moderator
                </label>
                <span className="text-xs text-blue-400 font-semibold">{panelSize + 2} Total Seats</span>
              </div>
              <input
                type="range"
                min={3}
                max={5}
                step={1}
                value={panelSize}
                onChange={(e) => setPanelSize(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>3 Peers (Fast pace)</span>
                <span>4 Peers (Standard)</span>
                <span>5 Peers (High competition)</span>
              </div>
            </div>

            {/* AI Patience (Turn taking pause tolerance) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  AI Interruption / Pause Patience
                </label>
                <span className="text-xs text-slate-400">{patienceDelay}s pause</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={4.0}
                step={0.5}
                value={patienceDelay}
                onChange={(e) => setPatienceDelay(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Aggressive (1.5s)</span>
                <span>Realistic (2.5s)</span>
                <span>Patient (4.0s)</span>
              </div>
            </div>

            {/* Candidate Roster Preview */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Participants in this Room:
              </span>
              <div className="space-y-1.5">
                {/* Moderator */}
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="w-6 h-6 rounded-md bg-amber-600/30 text-amber-300 font-bold flex items-center justify-center text-[10px]">
                    MOD
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-slate-200">{MODERATOR.name}</span>
                    <span className="text-slate-400 text-[11px] ml-1.5">({MODERATOR.archetype})</span>
                  </div>
                </div>

                {/* AI Candidates */}
                {activeParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                      {p.avatarInitial}
                    </div>
                    <div className="flex-1 truncate">
                      <span className="font-semibold text-slate-200">{p.name}</span>
                      <span className="text-slate-400 text-[11px] ml-1.5">({p.archetype})</span>
                    </div>
                  </div>
                ))}

                {/* You */}
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs">
                  <div className="w-6 h-6 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                    YOU
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-blue-200">{userName || 'Candidate'}</span>
                    <span className="text-blue-400 text-[11px] ml-1.5">(Target: {targetRole})</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-flight Audio & Mic Check */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Audio Pre-Flight Check
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleTestMic}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
                  isMicTesting
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse'
                    : micStatus === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : micStatus === 'failed'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                {isMicTesting ? 'Speaking...' : micStatus === 'success' ? 'Mic Ready ✓' : micStatus === 'failed' ? 'Mic Denied' : 'Test Microphone'}
              </button>

              <button
                type="button"
                onClick={playTurnChime}
                className="py-2 px-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition"
              >
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                Test Chime Sound
              </button>
            </div>

            {isMicTesting && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Speak into your mic:</span>
                  <span>{micLevel}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 transition-all duration-75"
                    style={{ width: `${micLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Enter Room Button */}
          <button
            onClick={handleLaunch}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 transition-all transform active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Enter Live GD Room (Spoken Discussion)</span>
          </button>
        </div>
      </div>

      <CustomTopicModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onTopicCreated={(newTopic) => {
          setTopics([newTopic, ...topics]);
          setSelectedTopic(newTopic);
        }}
      />
    </div>
  );
};
