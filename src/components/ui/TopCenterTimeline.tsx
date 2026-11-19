import React from 'react';
import { Link2, Pause, Play } from 'lucide-react';
import type { Hemisphere } from '../../types/geography';
import {
  dayOfYearToDate,
  formatLatitude,
  getSeasonInfoForDay,
  getSolarDeclination,
} from '../../utils/astronomy';
import { soundManager } from '../../utils/audio';

interface TopCenterTimelineProps {
  dayOfYear: number;
  onDayChange: (day: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speedMultiplier: number;
  onChangeSpeed: (speed: number) => void;
  hemisphere: Hemisphere;
}

export const TopCenterTimeline: React.FC<TopCenterTimelineProps> = ({
  dayOfYear,
  onDayChange,
  isPlaying,
  onTogglePlay,
  speedMultiplier,
  onChangeSpeed,
  hemisphere,
}) => {
  const dateInfo = dayOfYearToDate(dayOfYear);
  const season = getSeasonInfoForDay(dayOfYear, hemisphere);
  const decl = getSolarDeclination(dayOfYear);

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-1.5">
      {/* Hàng nút "thay đổi mùa" + tốc độ */}
      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/80 px-3 py-1.5 shadow-xl">
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onTogglePlay();
          }}
          title="Bật/tắt chuyển động Trái Đất quanh Mặt Trời (Phím Space)"
          className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-white transition-transform hover:scale-105 ${
            isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-[#1f4e8c] hover:bg-blue-600'
          }`}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>thay đổi mùa</span>
          <Link2 className="h-3.5 w-3.5 text-sky-300" />
        </button>

        {/* Thanh trượt tốc độ 0.25x - 4x */}
        <div className="hidden items-center gap-1.5 pl-1 sm:flex">
          <span className="text-[11px] font-medium text-slate-300">Tốc độ</span>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={speedMultiplier}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
            className="edu-slider w-16"
          />
          <span className="w-9 font-mono-num text-[11px] font-bold text-emerald-400">
            {speedMultiplier}x
          </span>
        </div>
      </div>

      {/* Thanh thời gian mỏng (1/1 -> 31/12) kéo tua ngày tháng */}
      <div className="flex w-[300px] sm:w-[390px] flex-col gap-1 rounded-xl border border-white/15 bg-slate-950/80 px-3 py-1.5 shadow-lg">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono-num font-bold text-white">
            Ngày {dateInfo.formatted}
          </span>
          <span className="font-bold" style={{ color: season.color }}>
            {season.displayName}
          </span>
          <span className="font-mono-num text-amber-300">
            δ = {formatLatitude(decl)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono-num text-[10px] text-slate-400">1/1</span>
          <input
            type="range"
            min={1}
            max={365}
            step={1}
            value={Math.round(dayOfYear)}
            onChange={(e) => onDayChange(Number(e.target.value))}
            aria-label="Thanh thời gian trong năm"
            className="edu-slider w-full"
          />
          <span className="font-mono-num text-[10px] text-slate-400">31/12</span>
        </div>
      </div>
    </div>
  );
};
