import React from 'react';
import { Calendar, Eye, EyeOff, Globe2, X } from 'lucide-react';
import { MILESTONE_ORDER, MILESTONES } from '../../data/geographyData';
import type { Hemisphere, MilestoneId } from '../../types/geography';
import { soundManager } from '../../utils/audio';

interface SeasonsPanelProps {
  isOpen: boolean;
  onToggleOpen: (open: boolean) => void;
  hemisphere: Hemisphere;
  onChangeHemisphere: (h: Hemisphere) => void;
  selectedMilestone: MilestoneId | null;
  onSelectMilestone: (id: MilestoneId) => void;
  labelsVisible: boolean;
  onToggleLabels: () => void;
}

export const SeasonsPanel: React.FC<SeasonsPanelProps> = ({
  isOpen,
  onToggleOpen,
  hemisphere,
  onChangeHemisphere,
  selectedMilestone,
  onSelectMilestone,
  labelsVisible,
  onToggleLabels,
}) => {
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          soundManager.playClick();
          onToggleOpen(true);
        }}
        className="pointer-events-auto flex items-center gap-2 rounded-lg border border-sky-400/50 bg-[#1f4e8c] px-3 py-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
      >
        <Calendar className="h-4 w-4 text-amber-300" />
        <span>Mở bảng Các mùa</span>
      </button>
    );
  }

  return (
    <aside className="pointer-events-auto w-[285px] sm:w-[315px] overflow-hidden rounded-xl border border-slate-500/40 shadow-2xl">
      {/* Đầu bảng nền xanh dương */}
      <div className="flex items-center justify-between bg-[#1f4e8c] px-3 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onToggleLabels();
            }}
            title={labelsVisible ? 'Ẩn nhãn các mùa trên 3D' : 'Hiện nhãn các mùa trên 3D'}
            className="rounded p-1 hover:bg-white/15"
          >
            {labelsVisible ? (
              <Eye className="h-4 w-4 text-emerald-300" />
            ) : (
              <EyeOff className="h-4 w-4 text-slate-300" />
            )}
          </button>
          <span className="text-sm font-bold whitespace-nowrap">
            Các mùa ({hemisphere === 'north' ? 'Bắc bán cầu' : 'Nam bán cầu'})
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onToggleOpen(false);
          }}
          title="Thu gọn bảng"
          className="rounded p-1 hover:bg-white/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Thân bảng nền xám nhạt (chuyển theo dark/light hoặc giữ sáng rõ chuẩn mozaik3D) */}
      <div className="bg-slate-100 p-2.5 text-slate-900 dark:bg-slate-800/95 dark:text-slate-100">
        {/* Công tắc Bán cầu Bắc / Bán cầu Nam */}
        <div className="mb-2.5 flex items-center justify-between rounded-lg bg-slate-200/80 p-1 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onChangeHemisphere('north');
            }}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
              hemisphere === 'north'
                ? 'bg-[#1f4e8c] text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>Bán cầu Bắc</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onChangeHemisphere('south');
            }}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-bold transition-colors ${
              hemisphere === 'south'
                ? 'bg-[#1f4e8c] text-white shadow'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>Bán cầu Nam</span>
          </button>
        </div>

        {/* 4 nút mốc mùa */}
        <div className="flex flex-col gap-1.5">
          {MILESTONE_ORDER.map((id) => {
            const m = MILESTONES[id];
            const isSelected = selectedMilestone === id;
            const seasonLabel = hemisphere === 'north' ? m.northSeason : m.southSeason;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectMilestone(id)}
                style={
                  isSelected
                    ? { backgroundColor: m.color, borderColor: '#ffffff', color: '#ffffff' }
                    : undefined
                }
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-all hover:scale-[1.01] ${
                  isSelected
                    ? 'shadow-md'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: isSelected ? '#ffffff' : m.color }}
                    />
                    <span className="text-sm font-bold">{m.name}</span>
                  </div>
                  <div
                    className={`mt-0.5 pl-4.5 text-[11px] font-medium ${
                      isSelected ? 'text-white/95' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {seasonLabel}
                  </div>
                </div>
                <span
                  className={`font-mono-num text-xs font-bold ${
                    isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {m.dateLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
