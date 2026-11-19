import React, { useState } from 'react';
import {
  ArrowLeft,
  Grid2x2,
  HelpCircle,
  Info,
  Link2,
  Maximize2,
  Minimize2,
  Music,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { AppSettings, CameraPreset, SceneLayers } from '../../types/geography';
import { soundManager } from '../../utils/audio';

interface TopHeaderBarProps {
  title: string;
  settings: AppSettings;
  layers: SceneLayers;
  isFullscreen: boolean;
  onResetView: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onToggleConnectionLines: () => void;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  onOpenInfo: () => void;
  onOpenSettings: () => void;
  onStartTour: () => void;
  onToggleFullscreen: () => void;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  title,
  settings,
  layers,
  isFullscreen,
  onResetView,
  onUpdateSettings,
  onToggleConnectionLines,
  onSelectCameraPreset,
  onOpenInfo,
  onOpenSettings,
  onStartTour,
  onToggleFullscreen,
}) => {
  const [showLayouts, setShowLayouts] = useState(false);

  const cycleLabelScale = () => {
    soundManager.playClick();
    const order: AppSettings['labelScale'][] = ['small', 'normal', 'large'];
    const next = order[(order.indexOf(settings.labelScale) + 1) % order.length];
    onUpdateSettings({ labelScale: next });
  };

  return (
    <header className="relative z-40 flex h-[56px] w-full items-center justify-between border-b-2 border-sky-400/70 bg-[#1f4e8c] px-3 text-white shadow-md md:px-4">
      {/* Bên trái: Nút quay lại/đặt lại góc nhìn + Tiêu đề động */}
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onResetView();
          }}
          title="Đặt lại góc nhìn mặc định"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition-transform hover:scale-105 hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-sm font-bold tracking-tight text-white md:text-base">
          {title}
        </h1>
      </div>

      {/* Bên phải: Hàng công cụ mozaik3D */}
      <div className="flex shrink-0 items-center gap-1.5 md:gap-2.5">
        {/* Loa + thanh trượt âm lượng xanh lá */}
        <div className="hidden items-center gap-1.5 rounded-lg bg-slate-950/25 px-2 py-1 sm:flex">
          <button
            type="button"
            onClick={() => {
              const nextSound = !settings.soundEnabled;
              onUpdateSettings({ soundEnabled: nextSound });
              soundManager.setSoundEnabled(nextSound);
            }}
            title={settings.soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
            className="text-white hover:text-emerald-300"
          >
            {settings.soundEnabled && settings.volume > 0 ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-300" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.soundEnabled ? settings.volume : 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              onUpdateSettings({ volume: v, soundEnabled: v > 0 });
              soundManager.setVolume(v);
              soundManager.setSoundEnabled(v > 0);
            }}
            title="Âm lượng"
            className="edu-slider w-16"
          />
        </div>

        {/* Nhạc nền nhẹ */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            const next = !settings.musicEnabled;
            onUpdateSettings({ musicEnabled: next });
            soundManager.toggleMusic(next);
          }}
          title={settings.musicEnabled ? 'Tắt nhạc nền' : 'Bật nhạc nền không gian nhẹ'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-105 ${
            settings.musicEnabled ? 'bg-emerald-500/25 text-emerald-300' : 'text-white hover:bg-white/15'
          }`}
        >
          <Music className="h-4 w-4" />
        </button>

        {/* Chữ "a" nghiêng xanh lá: đổi cỡ chữ nhãn */}
        <button
          type="button"
          onClick={cycleLabelScale}
          title={`Đổi cỡ chữ nhãn (hiện tại: ${
            settings.labelScale === 'small' ? 'Nhỏ' : settings.labelScale === 'normal' ? 'Vừa' : 'Lớn'
          })`}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold italic text-emerald-400 transition-transform hover:scale-110 hover:bg-white/15"
        >
          a
        </button>

        {/* Icon "i": Kiến thức cần nhớ */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onOpenInfo();
          }}
          title="Kiến thức cần nhớ (Địa lí 10)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-transform hover:scale-105 hover:bg-white/15"
        >
          <Info className="h-4 w-4" />
        </button>

        {/* Icon liên kết/chuỗi: bật/tắt đường nối & tia Mặt Trời */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onToggleConnectionLines();
          }}
          title="Bật/tắt đường nối tham chiếu & tia sáng"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-105 ${
            layers.connectionLines ? 'bg-sky-400/25 text-sky-200' : 'text-white hover:bg-white/15'
          }`}
        >
          <Link2 className="h-4 w-4" />
        </button>

        {/* Icon lưới 4 ô: chọn nhanh góc nhìn / bố cục */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowLayouts((v) => !v);
            }}
            title="Chọn nhanh góc nhìn 3D"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform hover:scale-105 ${
              showLayouts ? 'bg-white/25' : 'hover:bg-white/15'
            }`}
          >
            <Grid2x2 className="h-4 w-4" />
          </button>

          {showLayouts && (
            <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-slate-600 bg-slate-900/95 p-1.5 shadow-xl">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400">
                Chọn góc nhìn nhanh
              </div>
              {(
                [
                  { id: 'default' as const, label: 'Toàn cảnh nghiêng 30°' },
                  { id: 'top' as const, label: 'Nhìn thẳng từ cực Bắc' },
                  { id: 'earth_close' as const, label: 'Cận cảnh Trái Đất & trục' },
                  { id: 'equator' as const, label: 'Ngang mặt phẳng hoàng đạo' },
                ]
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onSelectCameraPreset(preset.id);
                    setShowLayouts(false);
                  }}
                  className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-100 hover:bg-blue-600"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Icon "?": Hướng dẫn từng bước */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onStartTour();
          }}
          title="Hướng dẫn sử dụng tương tác"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-transform hover:scale-105 hover:bg-white/15"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Icon bánh răng: Cài đặt */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onOpenSettings();
          }}
          title="Cài đặt mô phỏng"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-transform hover:scale-105 hover:bg-white/15"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Toàn màn hình (phím F) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onToggleFullscreen();
          }}
          title="Chế độ trình chiếu toàn màn hình (phím F)"
          className="hidden h-8 w-8 items-center justify-center rounded-lg text-white transition-transform hover:scale-105 hover:bg-white/15 sm:flex"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
};
