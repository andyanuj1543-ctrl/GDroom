import React from 'react';
import { X, History, Trash2, Award, Calendar, ArrowRight, TrendingUp } from 'lucide-react';
import { SessionHistoryItem } from '../types/gd';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionHistoryItem[];
  onSelectSession: (item: SessionHistoryItem) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2 text-blue-400">
            <History className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-100">Practice History & Progression</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {sessions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
              <History className="w-10 h-10 text-slate-600 stroke-[1.5]" />
              <div className="text-sm font-semibold text-slate-400">No Past Sessions Yet</div>
              <p className="text-xs text-slate-500 max-w-xs">
                Complete your first group discussion to track your score progression and placement readiness.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectSession(item);
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-blue-500/60 cursor-pointer transition space-y-2.5 group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-slate-400">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.date}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition line-clamp-2">
                    {item.topicTitle}
                  </h4>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-extrabold text-white">{item.overallScore}/100</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 group-hover:translate-x-0.5 transition">
                      <span>View Dossier</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {sessions.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
            <span className="text-xs text-slate-400">{sessions.length} sessions recorded</span>
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-xs transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
