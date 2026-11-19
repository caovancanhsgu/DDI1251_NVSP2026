import React, { useState } from 'react';
import { CheckSquare, Layers, NotebookPen, Square } from 'lucide-react';
import { TAB_METADATA } from '../../data/geographyData';
import type { SceneLayers, TabId } from '../../types/geography';
import { soundManager } from '../../utils/audio';

interface BottomTabBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  layers: SceneLayers;
  onToggleLayer: (key: keyof SceneLayers) => void;
  onOpenNotes: () => void;
}

const TAB_ORDER: TabId[] = ['sun_rays'];

const LAYER_LABELS: { key: keyof SceneLayers; label: string }[] = [
  { key: 'orbit', label: 'Quỹ đạo & 4 cung mùa' },
  { key: 'seasonLabels', label: 'Nhãn mùa & 4 mốc' },
  { key: 'axis', label: 'Trục nghiêng 23°27\' & Cực' },
  { key: 'parallels', label: 'Các vĩ tuyến chính' },
  { key: 'terminator', label: 'Đường phân chia sáng – tối' },
  { key: 'eclipticPlane', label: 'Mặt phẳng hoàng đạo' },
  { key: 'sunRays', label: 'Tia sáng Mặt Trời chiếu xuống' },
  { key: 'trail', label: 'Vệt quỹ đạo phía sau' },
  { key: 'grid', label: 'Lưới toạ độ không gian' },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  layers,
  onToggleLayer,
  onOpenNotes,
}) => {
  const [showLayers, setShowLayers] = useState(false);

  return (
    <footer className="relative z-40 flex h-[64px] w-full items-stretch border-t border-sky-400/50 bg-[#1f4e8c] text-white shadow-2xl">
      {/* Tab học tập chính */}
      <nav className="flex flex-1 items-stretch overflow-x-auto">
        {TAB_ORDER.map((tabId) => {
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              type="button"
              onClick={() => {
                soundManager.playClick();
                onSelectTab(tabId);
              }}
              className={`relative flex min-w-[180px] max-w-[280px] items-center justify-center border-r border-white/20 px-4 text-center text-xs font-semibold leading-tight transition-colors ${
                isActive
                  ? 'bg-[#2f6ec4] text-white font-bold shadow-inner'
                  : 'text-sky-100/90 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isActive && (
                <span className="absolute inset-x-0 top-0 h-[3px] bg-amber-300" />
              )}
              <span>{TAB_METADATA[tabId].shortTitle}</span>
            </button>
          );
        })}
      </nav>

      {/* Cụm bên phải: Lớp (Layers), Ghi chú & Logo "ĐỊA LÍ 3D" */}
      <div className="relative flex shrink-0 items-center gap-1 bg-[#173d70] px-2.5 md:gap-2 md:px-3.5">
        {/* Nút Lớp (Layers) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setShowLayers((v) => !v);
            }}
            title="Bật / tắt các lớp hiển thị 3D"
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              showLayers ? 'bg-blue-500 text-white' : 'text-sky-100 hover:bg-white/15'
            }`}
          >
            <Layers className="h-5 w-5" />
          </button>

          {showLayers && (
            <div className="absolute bottom-14 right-0 z-50 w-64 rounded-xl border border-slate-600 bg-slate-900/95 p-2 shadow-2xl">
              <div className="border-b border-slate-700 px-2 pb-1.5 text-xs font-bold text-amber-300">
                Các lớp hiển thị 3D
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {LAYER_LABELS.map((item) => {
                  const checked = layers[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        onToggleLayer(item.key);
                      }}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-100 hover:bg-slate-800"
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0 text-slate-500" />
                      )}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Nút Ghi chú / Bài tập */}
        <button
          type="button"
          onClick={() => {
            soundManager.playClick();
            onOpenNotes();
          }}
          title="Ghi chú bài học"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-sky-100 hover:bg-white/15"
        >
          <NotebookPen className="h-5 w-5" />
        </button>

        {/* Logo thương hiệu tiếng Việt */}
        <div className="hidden select-none flex-col items-end pl-1 leading-none sm:flex">
          <span className="text-sm font-extrabold tracking-wide text-white">
            ĐỊA LÍ <span className="text-amber-300">3D</span>
          </span>
          <span className="text-[9px] font-medium text-sky-200/80">THPT Lớp 10</span>
        </div>
      </div>
    </footer>
  );
};
