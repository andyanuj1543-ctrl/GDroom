import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { DiscussionRoom } from './components/DiscussionRoom';
import { FeedbackReport } from './components/FeedbackReport';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PlacementTipsModal } from './components/PlacementTipsModal';
import {
  RoomConfig,
  TranscriptTurn,
  SpeakingMetrics,
  GDReport,
  SessionHistoryItem,
} from './types/gd';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'lobby' | 'discussion' | 'report'>('lobby');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [activeTranscript, setActiveTranscript] = useState<TranscriptTurn[]>([]);
  const [speakingMetrics, setSpeakingMetrics] = useState<SpeakingMetrics | null>(null);
  const [currentReport, setCurrentReport] = useState<GDReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Settings & Drawers
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);

  // Load history & preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('gdprep_history');
      if (savedHistory) {
        setSessionHistory(JSON.parse(savedHistory));
      }
      const savedSound = localStorage.getItem('gdprep_sound');
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
    } catch (e) {
      console.warn('Could not load preferences from localStorage');
    }
  }, []);

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gdprep_sound', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Start GD Room
  const handleStartRoom = (config: RoomConfig) => {
    setRoomConfig(config);
    setActiveTranscript([]);
    setSpeakingMetrics(null);
    setCurrentReport(null);
    setReportError(null);
    setView('discussion');
  };

  // Discussion finishes -> Generate evaluation report via Gemini
  const handleFinishDiscussion = async (
    transcript: TranscriptTurn[],
    metrics: SpeakingMetrics
  ) => {
    setActiveTranscript(transcript);
    setSpeakingMetrics(metrics);
    setIsGeneratingReport(true);
    setReportError(null);

    try {
      const res = await fetch('/api/gd/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: roomConfig?.topic,
          userName: roomConfig?.userName || 'Candidate',
          durationSeconds: metrics.totalDiscussionDuration,
          transcript,
          speakingMetrics: metrics,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate assessment report');
      }

      const reportData: GDReport = await res.json();
      reportData.generatedAt = new Date().toISOString();
      reportData.speakingMetrics = metrics;

      setCurrentReport(reportData);

      // Save to localStorage history
      const historyItem: SessionHistoryItem = {
        id: `sess-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        topicTitle: roomConfig?.topic.title || 'Group Discussion',
        category: roomConfig?.topic.category || 'General',
        overallScore: reportData.overallScore,
        verdict: reportData.verdict,
        userAirtimePercentage: metrics.userAirtimePercentage,
        report: reportData,
      };

      const updatedHistory = [historyItem, ...sessionHistory];
      setSessionHistory(updatedHistory);
      try {
        localStorage.setItem('gdprep_history', JSON.stringify(updatedHistory));
      } catch (e) {}

      setView('report');
    } catch (err: any) {
      console.error('Error generating report:', err);
      setReportError(err.message || 'Unable to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Retry same topic
  const handleRestart = () => {
    if (roomConfig) {
      handleStartRoom(roomConfig);
    } else {
      setView('lobby');
    }
  };

  // Select new topic
  const handleSelectNewTopic = () => {
    setView('lobby');
  };

  // Select historical session to view
  const handleSelectHistoricalSession = (item: SessionHistoryItem) => {
    setCurrentReport(item.report);
    if (roomConfig) {
      setRoomConfig({
        ...roomConfig,
        topic: {
          id: 'hist',
          title: item.topicTitle,
          category: item.category as any,
          description: '',
          backgroundBrief: '',
          keyDebateAxes: [],
          suggestedFrameworks: [],
          difficulty: 'Campus Standard',
          defaultFormat: 'standard',
        },
      });
    }
    setView('report');
  };

  const handleClearHistory = () => {
    setSessionHistory([]);
    try {
      localStorage.removeItem('gdprep_history');
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenHistory={() => setShowHistory(true)}
        onOpenTips={() => setShowTips(true)}
        activeSession={view === 'discussion'}
        onExitSession={() => setView('lobby')}
      />

      {/* Main Viewport */}
      <main className="flex-1 pb-12">
        {/* Loading Overlay while Gemini generates comprehensive feedback */}
        {isGeneratingReport && (
          <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6 animate-in fade-in">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Evaluating Placement Performance...
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Gemini 3.8 is analyzing transcript turns across 6 placement dimensions, extracting verbatim quote evidence, calculating airtime dynamics, and formulating your tactical replay.
              </p>
            </div>
          </div>
        )}

        {/* Error State if report generation had an issue */}
        {reportError && (
          <div className="max-w-md mx-auto mt-12 p-6 bg-slate-900 border border-rose-500/40 rounded-2xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-100">Assessment Evaluation Error</h3>
            <p className="text-xs text-slate-400">{reportError}</p>
            <button
              onClick={() => {
                if (speakingMetrics) {
                  handleFinishDiscussion(activeTranscript, speakingMetrics);
                } else {
                  setView('lobby');
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition"
            >
              Retry Analysis
            </button>
          </div>
        )}

        {/* Active Views */}
        {!isGeneratingReport && !reportError && (
          <>
            {view === 'lobby' && <Lobby onStartRoom={handleStartRoom} />}

            {view === 'discussion' && roomConfig && (
              <DiscussionRoom
                config={roomConfig}
                onFinishDiscussion={handleFinishDiscussion}
                onExit={() => setView('lobby')}
                soundEnabled={soundEnabled}
              />
            )}

            {view === 'report' && currentReport && roomConfig && (
              <FeedbackReport
                report={currentReport}
                transcript={activeTranscript}
                topic={roomConfig.topic}
                onRestart={handleRestart}
                onSelectNewTopic={handleSelectNewTopic}
              />
            )}
          </>
        )}
      </main>

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sessions={sessionHistory}
        onSelectSession={handleSelectHistoricalSession}
        onClearHistory={handleClearHistory}
      />

      {/* Placement Scoring Rubrics Tips Modal */}
      <PlacementTipsModal
        isOpen={showTips}
        onClose={() => setShowTips(false)}
      />
    </div>
  );
}
