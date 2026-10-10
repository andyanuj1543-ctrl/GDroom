import React, { useState } from 'react';
import { X, Sparkles, PlusCircle } from 'lucide-react';
import { GDTopic, GDFormat } from '../types/gd';

interface CustomTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopicCreated: (topic: GDTopic) => void;
}

export const CustomTopicModal: React.FC<CustomTopicModalProps> = ({
  isOpen,
  onClose,
  onTopicCreated,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GDTopic['category']>('Tech & AI');
  const [description, setDescription] = useState('');
  const [backgroundBrief, setBackgroundBrief] = useState('');
  const [format, setFormat] = useState<GDFormat>('standard');
  const [difficulty, setDifficulty] = useState<GDTopic['difficulty']>('Campus Standard');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTopic: GDTopic = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      category,
      description: description.trim() || 'A critical campus placement discussion topic.',
      backgroundBrief: backgroundBrief.trim() || 'Examine multiple stakeholder perspectives and economic realities.',
      keyDebateAxes: ['Feasibility vs Hype', 'Short-term disruptions vs Long-term value', 'Policy and regulatory hurdles'],
      suggestedFrameworks: ['PESTLE', 'Stakeholder Analysis', 'Cost-Benefit Matrix'],
      difficulty,
      defaultFormat: format,
    };

    onTopicCreated(newTopic);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-semibold text-lg text-slate-100">Create Custom GD Topic</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Topic Title / Statement *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Should India mandate 4-day work weeks for corporate employees?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Tech & AI">Tech & AI</option>
                <option value="Business & Economy">Business & Economy</option>
                <option value="Case Study">Case Study</option>
                <option value="Abstract">Abstract</option>
                <option value="Ethics & Society">Ethics & Society</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="standard">Standard Campus GD</option>
                <option value="case_study">Case-Study Scenario</option>
                <option value="abstract">Abstract / Metaphorical</option>
                <option value="controversial">Controversial / Polarized</option>
                <option value="fishbowl">Fishbowl Format</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Context & Problem Statement
            </label>
            <textarea
              rows={3}
              placeholder="Provide background context or dilemma for the panel to debate..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Difficulty Tier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Campus Standard', 'IIM / Tier-1 MBA', 'High Intensity'] as const).map((tier) => (
                <button
                  type="button"
                  key={tier}
                  onClick={() => setDifficulty(tier)}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
                    difficulty === tier
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <PlusCircle className="w-4 h-4" />
              Add Topic & Select
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
