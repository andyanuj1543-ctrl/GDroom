import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Share2,
  Search,
  Quote,
  TrendingUp,
  Volume2,
  Clock,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  User,
  PieChart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  GDReport,
  TranscriptTurn,
  SpeakingMetrics,
  GDTopic,
} from '../types/gd';
import { playBrowserTTS } from '../utils/audioEngine';

interface FeedbackReportProps {
  report: GDReport;
  transcript: TranscriptTurn[];
  topic: GDTopic;
  onRestart: () => void;
  onSelectNewTopic: () => void;
}

export const FeedbackReport: React.FC<FeedbackReportProps> = ({
  report,
  transcript,
  topic,
  onRestart,
  onSelectNewTopic,
}) => {
  const [activeTab, setActiveTab] = useState<'rubric' | 'replay' | 'transcript' | 'analytics'>('rubric');
  const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState<string>('all');
  const [isPlayingReplayAudio, setIsPlayingReplayAudio] = useState<number | null>(null);

  // Trigger celebration confetti if score is high
  useEffect(() => {
    if (report.overallScore >= 75) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }
  }, [report.overallScore]);

  // Play audio for suggested missed opportunity dialogue
  const handlePlaySuggestedDialogue = async (text: string, index: number) => {
    if (isPlayingReplayAudio === index) return;
    setIsPlayingReplayAudio(index);
    await playBrowserTTS(text, {
      rate: 1.0,
      pitch: 1.0,
      onEnd: () => setIsPlayingReplayAudio(null),
    });
    setIsPlayingReplayAudio(null);
  };

  // Jump to and highlight quote in transcript
  const handleQuoteClick = (quote: string) => {
    setHighlightedQuote(quote);
    setActiveTab('transcript');
  };

  // Filter transcript
  const filteredTranscript = transcript.filter((t) => {
    const matchesSpeaker =
      selectedSpeakerFilter === 'all' ||
      (selectedSpeakerFilter === 'user' && t.isUser) ||
      t.speakerName.toLowerCase().includes(selectedSpeakerFilter.toLowerCase());
    const matchesSearch =
      t.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      t.speakerName.toLowerCase().includes(transcriptSearch.toLowerCase());
    return matchesSpeaker && matchesSearch;
  });

  const getVerdictStyle = () => {
    if (report.verdict.toLowerCase().includes('selected')) {
      return {
        bg: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
        badge: 'bg-emerald-500 text-slate-950',
      };
    }
    if (report.verdict.toLowerCase().includes('borderline') || report.verdict.toLowerCase().includes('waitlist')) {
      return {
        bg: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
        badge: 'bg-amber-500 text-slate-950',
      };
    }
    return {
      bg: 'bg-rose-950/70 border-rose-500/50 text-rose-300',
      badge: 'bg-rose-500 text-white',
    };
  };

  const verdictStyle = getVerdictStyle();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Placement Evaluation Dossier
              </span>
              <span className="text-xs text-slate-400">
                {new Date(report.generatedAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {topic.title}
            </h1>
            <p className="text-sm text-slate-400">
              Campus Placement GD Round • Assessed across 6 recruitment dimensions
            </p>
          </div>

          {/* Verdict and Score Stamp */}
          <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 shrink-0">
            <div className="text-center px-2">
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {report.overallScore}
                <span className="text-sm text-slate-500 font-normal">/100</span>
              </div>
              <div className="text-[11px] font-semibold text-blue-400">
                {report.percentile}th Percentile
              </div>
            </div>

            <div className="h-10 w-px bg-slate-800" />

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Placement Verdict
              </span>
              <div className={`px-3 py-1 rounded-xl text-xs font-bold border ${verdictStyle.bg}`}>
                {report.verdict}
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
            <Award className="w-4 h-4 text-blue-400" />
            <span>Panel Evaluation Summary</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {report.summaryAssessment}
          </p>
          {report.interviewerNote && (
            <div className="mt-3 pt-3 border-t border-slate-900 text-xs text-slate-400 italic">
              <strong>Interviewer Private Note:</strong> "{report.interviewerNote}"
            </div>
          )}
        </div>

        {/* Quick Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2 text-xs font-semibold">
          {[
            { id: 'rubric', label: '6-Factor Placement Rubric' },
            { id: 'replay', label: '"What You Could Have Said" Replay (3 Openings)' },
            { id: 'transcript', label: 'Full Quoted Transcript' },
            { id: 'analytics', label: 'Airtime & Speaking Metrics' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: 6-Factor Placement Rubric */}
      {activeTab === 'rubric' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'initiation',
                title: '1. Initiation & Early Presence',
                data: report.criteriaScores.initiation,
                desc: 'Seizing early openings and establishing structured scope.',
              },
              {
                id: 'contentDepth',
                title: '2. Content Depth & Frameworks',
                data: report.criteriaScores.contentDepth,
                desc: 'Applying MECE, PESTLE, or unit economics rather than shallow opinions.',
              },
              {
                id: 'activeListening',
                title: '3. Active Listening & Peer Synthesis',
                data: report.criteriaScores.activeListening,
                desc: 'Bridging conflicting arguments and building on others by name.',
              },
              {
                id: 'assertiveness',
                title: '4. Assertiveness & Floor Control',
                data: report.criteriaScores.assertiveness,
                desc: 'Interruption handling and defending points politely without aggression.',
              },
              {
                id: 'articulation',
                title: '5. Articulation & Delivery',
                data: report.criteriaScores.articulation,
                desc: 'Vocal clarity, concise sentences, and low filler word rate.',
              },
              {
                id: 'synthesisAndConclusion',
                title: '6. Synthesis & Concluding Remarks',
                data: report.criteriaScores.synthesisAndConclusion,
                desc: 'Summarizing team consensus rather than repeating your own arguments.',
              },
            ].map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>
                    <div className="px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold">
                      {item.data?.score || 70}/100
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">{item.desc}</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.data?.feedback}
                  </p>
                </div>

                {/* Quoted Transcript Evidence */}
                {item.data?.quotedEvidence && (
                  <div
                    onClick={() => handleQuoteClick(item.data.quotedEvidence!)}
                    className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-blue-500/60 transition group"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
                      <Quote className="w-3 h-3" />
                      <span>Quoted Transcript Evidence (Click to inspect)</span>
                    </div>
                    <p className="text-xs text-slate-300 italic group-hover:text-blue-200 transition">
                      "{item.data.quotedEvidence}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Key Strengths & Improvements Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Key Strengths */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Demonstrated Strengths</span>
              </div>
              <div className="space-y-3">
                {report.keyStrengths?.map((str, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-200">{str.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{str.analysis}</p>
                    {str.quote && (
                      <div
                        onClick={() => handleQuoteClick(str.quote)}
                        className="text-[11px] text-emerald-300/90 italic cursor-pointer hover:underline pt-1"
                      >
                        Evidence: "{str.quote}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Improvements */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 text-sm font-bold">
                <AlertTriangle className="w-5 h-5" />
                <span>Areas for Immediate Correction</span>
              </div>
              <div className="space-y-3">
                {report.criticalImprovements?.map((imp, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-200">{imp.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{imp.critique}</p>
                    {imp.quote && (
                      <div
                        onClick={() => handleQuoteClick(imp.quote)}
                        className="text-[11px] text-rose-300/90 italic cursor-pointer hover:underline pt-1"
                      >
                        Identified moment: "{imp.quote}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: "What You Could Have Said" Interactive Replay */}
      {activeTab === 'replay' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-5 h-5" />
              <h2 className="text-lg font-bold text-slate-100">
                Missed Openings & Golden Intervention Replay
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              In campus GDs, passing up pivotal moments hurts more than making small errors. Here are 3 exact moments where the room was ripe for you to take command, along with verbatim phrases you could have deployed.
            </p>
          </div>

          <div className="space-y-5">
            {report.missedOpportunitiesReplay?.map((opp, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Timestamp: {opp.timestamp || `Round ${idx + 1}`}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlaySuggestedDialogue(opp.suggestedIntervention, idx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPlayingReplayAudio === idx ? 'Playing Audio...' : 'Listen to Phrasing'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      What Co-Participants Were Debating:
                    </span>
                    <p className="text-xs text-slate-300 italic">"{opp.roomContext}"</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      The Missed Strategic Opportunity:
                    </span>
                    <p className="text-xs text-slate-300">{opp.missedOpening}</p>
                  </div>
                </div>

                {/* Suggested Model Dialogue */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/40 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span>What You Could Have Said:</span>
                  </span>
                  <p className="text-sm text-blue-100 font-medium leading-relaxed">
                    "{opp.suggestedIntervention}"
                  </p>
                </div>

                <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                  <strong>Why Assessors Reward This:</strong> {opp.strategicRationale}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Full Quoted Transcript */}
      {activeTab === 'transcript' && (
        <div className="space-y-4">
          {/* Transcript Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-slate-100">Complete Session Transcript</h3>
              <span className="text-xs text-slate-400">({transcript.length} total turns)</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Speaker filter */}
              <select
                value={selectedSpeakerFilter}
                onChange={(e) => setSelectedSpeakerFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Speakers</option>
                <option value="user">Only You</option>
                <option value="Rohan">Rohan (Dominator)</option>
                <option value="Ananya">Ananya (Analyst)</option>
                <option value="Priya">Priya (Synthesizer)</option>
                <option value="Kabir">Kabir (Lateral)</option>
                <option value="Vikram">Vikram (Skeptic)</option>
                <option value="Shweta">Dr. Shweta (Moderator)</option>
              </select>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search transcript..."
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Transcript List */}
          <div className="space-y-3">
            {filteredTranscript.map((turn, idx) => {
              const isMatch = highlightedQuote && turn.text.toLowerCase().includes(highlightedQuote.toLowerCase());
              return (
                <div
                  key={turn.id || idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    turn.isUser
                      ? 'bg-blue-950/20 border-blue-500/40'
                      : turn.role === 'moderator'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-900 border-slate-800'
                  } ${isMatch ? 'ring-2 ring-blue-400 bg-blue-950/50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          turn.isUser
                            ? 'text-blue-300'
                            : turn.role === 'moderator'
                            ? 'text-amber-300'
                            : 'text-slate-200'
                        }`}
                      >
                        {turn.speakerName} {turn.isUser && '(You)'}
                      </span>
                      {turn.emotion && (
                        <span className="text-[10px] uppercase font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">
                          {turn.emotion}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {turn.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {turn.text}
                  </p>

                  {turn.directReplyTo && (
                    <div className="text-[10px] text-slate-500 mt-2">
                      Addressing: <span className="text-slate-400 font-medium">{turn.directReplyTo}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Airtime & Speaking Metrics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Your Airtime Share
              </span>
              <div className="text-2xl font-bold text-white">
                {report.speakingMetrics?.userAirtimePercentage || 0}%
              </div>
              <span className="text-[11px] text-slate-500">
                Recommended target: 18% to 25%
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Turns Taken
              </span>
              <div className="text-2xl font-bold text-white">
                {report.speakingMetrics?.userTurnsCount || 0}
              </div>
              <span className="text-[11px] text-slate-500">
                Discrete interventions
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Interruptions Initiated
              </span>
              <div className="text-2xl font-bold text-white">
                {report.speakingMetrics?.interruptionsCount || 0}
              </div>
              <span className="text-[11px] text-slate-500">
                Barge-ins / floor seizures
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Spoken Duration
              </span>
              <div className="text-2xl font-bold text-white">
                {report.speakingMetrics?.userSpokenDuration || 0}s
              </div>
              <span className="text-[11px] text-slate-500">
                Total active mic speech
              </span>
            </div>
          </div>

          {/* Breakdown per speaker */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">
              Panel Participation Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(report.speakingMetrics?.speakerDurations || {}).map(([spkId, secs]) => (
                <div key={spkId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{spkId}</span>
                    <span className="text-slate-400">{secs} seconds</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (secs / (report.speakingMetrics?.totalDiscussionDuration || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition"
        >
          <RotateCcw className="w-4 h-4 text-blue-400" />
          <span>Re-try Same Topic</span>
        </button>

        <button
          onClick={onSelectNewTopic}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition"
        >
          <span>Select New Topic & Room</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
