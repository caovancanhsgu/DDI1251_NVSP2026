import React from 'react';
import { Sun, X } from 'lucide-react';
import { MILESTONES, SAMPLE_LATITUDES } from '../../data/geographyData';
import type { MilestoneId } from '../../types/geography';
import {
  dayOfYearToDate,
  formatHoursToHm,
  formatLatitude,
  getDayLengthHours,
  getSolarDeclination,
  getSolarNoonAltitude,
} from '../../utils/astronomy';
import { soundManager } from '../../utils/audio';

interface SeasonInfoCardProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneId: MilestoneId;
  dayOfYear: number;
  observerLatitude: number;
  onChangeLatitude: (lat: number) => void;
  showSunRays: boolean;
  onToggleSunRays: () => void;
}

const CHART_LATITUDES = [
  { label: '0°', lat: 0 },
  { label: "23°27'B", lat: 23.44 },
  { label: '40°B', lat: 40 },
  { label: "66°33'B", lat: 66.56 },
];

export const SeasonInfoCard: React.FC<SeasonInfoCardProps> = ({
  isOpen,
  onClose,
  milestoneId,
  dayOfYear,
  observerLatitude,
  onChangeLatitude,
  showSunRays,
  onToggleSunRays,
}) => {
  if (!isOpen) return null;

  const info = MILESTONES[milestoneId];
  const dateInfo = dayOfYearToDate(dayOfYear);
  const decl = getSolarDeclination(dayOfYear);
  const noonAlt = getSolarNoonAltitude(observerLatitude, decl);
  const dayLen = getDayLengthHours(observerLatitude, decl);

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100vh-145px)] w-[320px] sm:w-[355px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b142b]/95 text-slate-100 shadow-2xl transition-transform duration-300">
      {/* Đầu thẻ */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: info.color }}>
            {info.name} ({info.dateLabel})
          </h2>
          <p className="text-[11px] text-slate-400">
            Vị trí đang xem: Ngày <span className="font-mono-num text-slate-200">{dateInfo.formatted}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          title="Đóng thẻ thông tin"
          className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nội dung cuộn mượt */}
      <div className="flex flex-col gap-3 overflow-y-auto p-4 text-xs">
        {/* Điểm chiếu thẳng góc & nút tia sáng */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-950/35 p-2.5">
          <div>
            <div className="text-[11px] text-amber-200/80">Tia sáng chiếu thẳng góc (12h trưa)</div>
            <div className="mt-0.5 font-mono-num text-sm font-bold text-amber-300">
              {formatLatitude(decl)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onToggleSunRays();
            }}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
              showSunRays
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>{showSunRays ? 'Đang bật tia' : 'Bật tia sáng'}</span>
          </button>
        </div>

        {/* Đặc điểm Bắc bán cầu & Nam bán cầu */}
        <div className="grid grid-cols-1 gap-2">
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-2.5">
            <div className="font-bold text-sky-300">Bán cầu Bắc: {info.northSeason}</div>
            <p className="mt-1 leading-relaxed text-slate-300">{info.northDetails}</p>
          </div>
          <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-2.5">
            <div className="font-bold text-emerald-300">Bán cầu Nam: {info.southSeason}</div>
            <p className="mt-1 leading-relaxed text-slate-300">{info.southDetails}</p>
          </div>
        </div>

        {/* Giải thích Địa lí 10 */}
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-2.5 leading-relaxed text-slate-200">
          <span className="font-bold text-white">Giải thích nguyên nhân: </span>
          {info.explanation}
        </div>

        {/* Biểu đồ cột nhỏ so sánh độ dài ngày tại 4 vĩ độ */}
        <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-white">Độ dài ban ngày tại các vĩ độ</span>
            <span className="text-[10px] text-slate-400">Tối đa 24h</span>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {CHART_LATITUDES.map((item) => {
              const dl = getDayLengthHours(item.lat, decl);
              const pct = Math.max(4, (dl.dayHours / 24) * 100);
              return (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <span className="font-mono-num text-[10px] font-semibold text-amber-300">
                    {dl.dayHours.toFixed(1)}h
                  </span>
                  <div className="flex h-16 w-6 items-end overflow-hidden rounded bg-slate-800">
                    <div
                      className="w-full rounded-t bg-amber-400 transition-all duration-300"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-300">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mini-slider "Chọn vĩ độ" tính trực tiếp độ cao Mặt Trời và độ dài ngày */}
        <div className="rounded-xl border border-blue-500/35 bg-blue-950/30 p-3">
          <div className="flex items-center justify-between">
            <label htmlFor="lat-mini-slider" className="font-bold text-white">
              Thử nghiệm chọn vĩ độ (φ)
            </label>
            <span className="font-mono-num font-bold text-emerald-300">
              {formatLatitude(observerLatitude)}
            </span>
          </div>

          <input
            id="lat-mini-slider"
            type="range"
            min={-90}
            max={90}
            step={0.5}
            value={observerLatitude}
            onChange={(e) => onChangeLatitude(Number(e.target.value))}
            className="edu-slider mt-2 w-full"
          />

          <div className="mt-2 flex flex-wrap gap-1">
            {SAMPLE_LATITUDES.slice(0, 4).map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onChangeLatitude(sample.lat);
                }}
                className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-blue-600"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
            <div>
              <div className="text-[10px] text-slate-400">Độ cao Mặt Trời (12h)</div>
              <div className="font-mono-num text-xs font-bold text-amber-300">
                {noonAlt.isPolarNight ? '0° (Đêm cực)' : `${noonAlt.altitude.toFixed(1)}°`}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Độ dài ngày / đêm</div>
              <div className="font-mono-num text-xs font-bold text-emerald-300">
                {formatHoursToHm(dayLen.dayHours)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
