/**
 * Custom Passage & Code Snippets Modal for TypeFlow
 * Allows typists to input custom practice text or choose curated programming languages.
 */

import React, { useState } from 'react';
import { X, Code, FileText, Play, Check } from 'lucide-react';
import { Passage } from '../../shared/types.ts';
import { CODE_SNIPPETS } from '../../data/texts.ts';

interface CustomPassageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassage: (passage: Passage) => void;
}

export const CustomPassageModal: React.FC<CustomPassageModalProps> = ({
  isOpen,
  onClose,
  onSelectPassage,
}) => {
  const [activeTab, setActiveTab] = useState<'custom' | 'code'>('custom');
  const [customTitle, setCustomTitle] = useState<string>('My Custom Drill');
  const [customText, setCustomText] = useState<string>('');

  if (!isOpen) return null;

  const handleStartCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;

    const passage: Passage = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim() || 'Custom Drill',
      author: 'Custom Text',
      difficulty: 'medium',
      category: 'custom',
      content: trimmed,
    };

    onSelectPassage(passage);
    onClose();
  };

  const handleSelectCode = (snippet: Passage) => {
    onSelectPassage(snippet);
    onClose();
  };

  const wordCount = customText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = customText.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl border border-tf-border/50 bg-tf-elevated rounded-2xl p-6 flex flex-col gap-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-tf-border/30">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-tf-accent" />
            <h2 className="text-base font-bold text-slate-100">Custom Text & Code Drills</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-tf-border/30 pb-2">
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'custom'
                ? 'bg-tf-accent text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Custom Text Input</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'code'
                ? 'bg-tf-accent text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Programming Code Presets</span>
          </button>
        </div>

        {/* Body */}
        {activeTab === 'custom' ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400">Drill Title</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. JavaScript Async Interview Drill"
                className="w-full bg-tf-bg border border-tf-border/40 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-tf-accent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-400">Paste Text Content</label>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {charCount} characters · {wordCount} words
                </span>
              </div>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste any article paragraph, medical dictionary, legal text, or custom phrase here..."
                rows={7}
                className="w-full bg-tf-bg border border-tf-border/40 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-tf-accent resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleStartCustom}
                disabled={!customText.trim()}
                className="px-5 py-2.5 rounded-lg bg-tf-accent hover:bg-tf-accent-hover text-slate-950 font-bold text-xs flex items-center gap-2 shadow-[0_0_14px_color-mix(in_srgb,var(--tf-accent)_35%,transparent)] disabled:opacity-40 disabled:pointer-events-none transition-transform hover:scale-[1.02]"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Load & Start Custom Drill</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
            <span className="text-xs text-slate-400">
              Select a programming language code snippet to practice typing syntax symbols:
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {CODE_SNIPPETS.map((snippet) => (
                <div
                  key={snippet.id}
                  onClick={() => handleSelectCode(snippet)}
                  className="p-3 rounded-xl border border-tf-border/30 bg-tf-bg/70 hover:bg-tf-accent/5 hover:border-tf-accent/40 cursor-pointer transition-all flex flex-col gap-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-tf-accent transition-colors">
                      {snippet.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-tf-elevated text-tf-accent border border-tf-border/40 capitalize">
                      {snippet.difficulty}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 line-clamp-2 leading-relaxed">
                    {snippet.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
