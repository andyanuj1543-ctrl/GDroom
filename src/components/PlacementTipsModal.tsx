import React from 'react';
import { X, Award, Lightbulb, CheckCircle2, AlertOctagon } from 'lucide-react';

interface PlacementTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlacementTipsModal: React.FC<PlacementTipsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5 text-blue-400">
            <Award className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-100">
              Campus Placement GD Masterclass & Scoring Rubrics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              What Placement Panels Actually Look For
            </h4>
            <p className="text-slate-400 leading-relaxed">
              In campus recruitment drives (Consulting, Banking, FMCG, Product, Tech), Group Discussions are not debates. The goal is NOT to win an argument, but to demonstrate collaborative problem-solving, structured thought, and emotional poise.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 block text-xs">
                1. Initiation vs First-Mover Risk
              </span>
              <p className="text-slate-400 leading-relaxed">
                Opening the GD gives high marks ONLY if you define the scope or provide a structured framework (e.g. "Let's divide this into Short-term vs Long-term impacts"). Initiating with a shallow cliché hurts your score.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 block text-xs">
                2. Piggybacking & Synthesis
              </span>
              <p className="text-slate-400 leading-relaxed">
                Always acknowledge peers by name: "Building on what Ananya mentioned regarding unit economics...". Evaluators penalize candidates who speak in isolation without acknowledging previous speakers.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 block text-xs">
                3. Floor Control & Dominators
              </span>
              <p className="text-slate-400 leading-relaxed">
                If a candidate like Rohan is hogging the floor, don't shout over them. Wait for a natural breathing pause and assert: "If I may bring in a crucial supply-chain perspective here...".
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 block text-xs">
                4. The Summary Golden Rule
              </span>
              <p className="text-slate-400 leading-relaxed">
                In the closing round, NEVER state your own personal opinion. Summarize the room's divergence: "The group agreed on technical viability, but remained split on regulatory oversight."
              </p>
            </div>
          </div>

          {/* Quick Phrasing Cheat Sheet */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
            <span className="font-bold text-blue-300 text-xs block">
              High-Impact Placement Phrases (Use in Discussion):
            </span>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
              <li>"Let us look at this through the lens of two distinct stakeholders..."</li>
              <li>"While that holds true in mature markets, ground realities in emerging economies differ because..."</li>
              <li>"To reconcile the two divergent viewpoints shared by Rohan and Priya..."</li>
              <li>"We have discussed the commercial aspects, but haven't touched upon ethical compliance..."</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
          >
            Got It, Back to Practice
          </button>
        </div>
      </div>
    </div>
  );
};
