import React from 'react';
import { BookOpen, HelpCircle, NotebookPen, RotateCcw, Settings, X } from 'lucide-react';
import { TOUR_STEPS } from '../../data/geographyData';
import type { AppSettings, SceneLayers } from '../../types/geography';
import { soundManager } from '../../utils/audio';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export const KnowledgeInfoModal: React.FC<InfoModalProps> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 bg-[#1f4e8c] px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-300" />
            <h2 className="text-base font-bold">Kiến thức cần nhớ – Địa lí lớp 10</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex max-h-[75vh] flex-col gap-3 overflow-y-auto p-5 text-xs leading-relaxed">
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-3.5">
            <h3 className="text-sm font-bold text-sky-300">1. Nguyên nhân sinh ra các mùa</h3>
            <p className="mt-1 text-slate-200">
              Trong suốt quá trình chuyển động quanh Mặt Trời (chu kì <strong>365 ngày 6 giờ</strong> theo quỹ đạo hình elip gần tròn, ngược chiều kim đồng hồ), trục Trái Đất luôn <strong>nghiêng 23°27'</strong> so với pháp tuyến mặt phẳng quỹ đạo và <strong>không đổi phương</strong> trong không gian. Nhờ đó, bán cầu Bắc và bán cầu Nam lần lượt ngả về phía Mặt Trời, sinh ra 4 mùa đối ngược nhau.
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3.5">
            <h3 className="text-sm font-bold text-amber-300">2. Bốn ngày đặc biệt trong năm</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-200">
              <li>
                <strong>Xuân phân (21/3) & Thu phân (23/9):</strong> Mặt Trời chiếu thẳng góc tại Xích đạo (0°). Mọi địa điểm trên Trái Đất đều có ngày dài bằng đêm (12 giờ).
              </li>
              <li>
                <strong>Hạ chí (21–22/6):</strong> Mặt Trời chiếu thẳng góc tại Chí tuyến Bắc (23°27'B). Bán cầu Bắc ngày dài nhất, đêm ngắn nhất; từ vòng cực Bắc (66°33'B) đến cực Bắc có ngày dài suốt 24 giờ.
              </li>
              <li>
                <strong>Đông chí (22/12):</strong> Mặt Trời chiếu thẳng góc tại Chí tuyến Nam (23°27'N). Bán cầu Bắc ngày ngắn nhất, đêm dài nhất; từ vòng cực Bắc đến cực Bắc có đêm dài suốt 24 giờ.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3.5">
            <h3 className="text-sm font-bold text-emerald-300">3. Công thức tính nhanh</h3>
            <p className="mt-1 font-mono-num text-slate-200">
              • Xích vĩ Mặt Trời: δ = 23,44° × sin(360°/365 × (N − 81))<br />
              • Độ cao Mặt Trời lúc 12h trưa: h = 90° − |φ − δ|<br />
              • Phím tắt trình chiếu: <strong>Space</strong> (Chạy/Dừng), <strong>← / →</strong> (Chuyển mốc mùa), <strong>F</strong> (Toàn màn hình).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  layers: SceneLayers;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onToggleLayer: (key: keyof SceneLayers) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  settings,
  layers,
  onUpdateSettings,
  onToggleLayer,
  onResetDefaults,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 bg-[#1f4e8c] px-5 py-3 text-white">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-bold">Cài đặt mô phỏng</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5 text-xs">
          {/* Tốc độ công chuyển */}
          <div className="flex items-center justify-between">
            <span className="font-semibold">Tốc độ công chuyển ({settings.speedMultiplier}x)</span>
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={settings.speedMultiplier}
              onChange={(e) => onUpdateSettings({ speedMultiplier: Number(e.target.value) })}
              className="edu-slider w-36"
            />
          </div>

          {/* Quỹ đạo elip vs tròn */}
          <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
            <span>Quỹ đạo elip phóng đại (e = 0,2)</span>
            <input
              type="checkbox"
              checked={settings.isEllipticalOrbit}
              onChange={(e) => onUpdateSettings({ isEllipticalOrbit: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>

          {/* Tự quay quanh trục */}
          <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
            <span>Trái Đất tự quay quanh trục</span>
            <input
              type="checkbox"
              checked={settings.earthSelfRotate}
              onChange={(e) => onUpdateSettings({ earthSelfRotate: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>

          {/* Hiện/ẩn lưới */}
          <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
            <span>Hiển thị lưới toạ độ vũ trụ</span>
            <input
              type="checkbox"
              checked={layers.grid}
              onChange={() => onToggleLayer('grid')}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>

          {/* Chế độ tối */}
          <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
            <span>Chế độ không gian tối sâu</span>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => onUpdateSettings({ darkMode: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
          </label>

          {/* Chất lượng đồ hoạ */}
          <div className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
            <span>Chất lượng đồ hoạ 3D</span>
            <div className="flex gap-1">
              {(['high', 'standard'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onUpdateSettings({ graphicsQuality: q });
                  }}
                  className={`rounded px-2.5 py-1 font-semibold ${
                    settings.graphicsQuality === q ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {q === 'high' ? 'Cao' : 'Tiêu chuẩn'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex justify-between border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onResetDefaults();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 font-semibold text-slate-200 hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Khôi phục mặc định</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NotesModalProps {
  open: boolean;
  onClose: () => void;
  notes: string;
  onChangeNotes: (val: string) => void;
}

export const NotesModal: React.FC<NotesModalProps> = ({
  open,
  onClose,
  notes,
  onChangeNotes,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 bg-[#1f4e8c] px-5 py-3 text-white">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-bold">Ghi chú bài học (tự động lưu)</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-white/15">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            rows={7}
            placeholder="Ghi lại nhận xét về góc chiếu tia Mặt Trời, sự thay đổi ngày đêm theo mùa, hoặc câu hỏi thảo luận trên lớp..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-relaxed text-slate-100 focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Nội dung được lưu cục bộ trên trình duyệt của bạn.</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-500"
            >
              Xong
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TourOverlayProps {
  stepIndex: number | null;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  stepIndex,
  onNext,
  onPrev,
  onClose,
}) => {
  if (stepIndex === null) return null;
  const step = TOUR_STEPS[stepIndex];

  const posClasses: Record<string, string> = {
    'top-right': 'top-16 right-4',
    'top-left': 'top-20 left-4 sm:left-80',
    'top-center': 'top-36 left-1/2 -translate-x-1/2',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    bottom: 'bottom-20 left-1/2 -translate-x-1/2',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div
        className={`absolute ${posClasses[step.targetHint]} w-[330px] max-w-[92vw] rounded-2xl border-2 border-amber-400 bg-slate-900 p-4 text-slate-100 shadow-2xl`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-300">
            <HelpCircle className="h-4 w-4" />
            <span className="text-xs font-bold">
              Hướng dẫn ({stepIndex + 1}/{TOUR_STEPS.length})
            </span>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-2 text-sm font-bold text-white">{step.title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{step.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={onPrev}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
          >
            ← Trước
          </button>
          {stepIndex < TOUR_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
            >
              Tiếp theo →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
