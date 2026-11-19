import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Sun } from 'lucide-react';
import { EarthIncidenceScene } from './components/three/EarthIncidenceScene';
import { SeasonsOrbitScene } from './components/three/SeasonsOrbitScene';
import { BottomTabBar } from './components/ui/BottomTabBar';
import {
  KnowledgeInfoModal,
  NotesModal,
  SettingsModal,
  TourOverlay,
} from './components/ui/ModalsAndTour';
import { SeasonInfoCard } from './components/ui/SeasonInfoCard';
import { SeasonsPanel } from './components/ui/SeasonsPanel';
import { TopCenterTimeline } from './components/ui/TopCenterTimeline';
import { TopHeaderBar } from './components/ui/TopHeaderBar';
import { MILESTONE_ORDER, MILESTONES, TAB_METADATA } from './data/geographyData';
import type {
  AppSettings,
  CameraPreset,
  MilestoneId,
  SceneLayers,
  TabId,
} from './types/geography';
import {
  ASTRONOMY_CONFIG,
  formatLatitude,
  getSolarDeclination,
  getSolarNoonAltitude,
} from './utils/astronomy';
import { soundManager } from './utils/audio';

const SETTINGS_STORAGE_KEY = 'dialy3d_seasons_settings_v1';
const NOTES_STORAGE_KEY = 'dialy3d_seasons_notes_v1';

const DEFAULT_SETTINGS: AppSettings = {
  speedMultiplier: 1,
  isPlaying: false,
  earthSelfRotate: true,
  isEllipticalOrbit: true,
  hemisphere: 'north',
  labelScale: 'normal',
  graphicsQuality: 'high',
  darkMode: true,
  volume: 0.6,
  soundEnabled: true,
  musicEnabled: false,
  observerLatitude: 21, // Mặc định Hà Nội 21°B
  observerLongitude: 105.8,
};

const DEFAULT_LAYERS: SceneLayers = {
  orbit: true,
  seasonLabels: true,
  axis: true,
  parallels: true,
  terminator: true,
  eclipticPlane: true,
  sunRays: true,
  trail: true,
  connectionLines: true,
  grid: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('sun_rays');
  const [viewMode, setViewMode] = useState<'orbit' | 'closeup'>('orbit');
  const [dayOfYear, setDayOfYear] = useState<number>(ASTRONOMY_CONFIG.MILESTONE_DAYS.ha_chi);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneId | null>('ha_chi');
  const [seasonsPanelOpen, setSeasonsPanelOpen] = useState(true);
  const [infoCardOpen, setInfoCardOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved), isPlaying: false, musicEnabled: false };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const [layers, setLayers] = useState<SceneLayers>(DEFAULT_LAYERS);
  const [notes, setNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(NOTES_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // Trạng thái camera & hiệu ứng bay
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('default');
  const [presetVersion, setPresetVersion] = useState(0);
  const [flyRequest, setFlyRequest] = useState<{
    day: number;
    milestoneId?: MilestoneId;
    version: number;
  } | null>(null);

  // Hộp thoại & hướng dẫn
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Đồng bộ darkMode vào thẻ <html> & lưu cài đặt vào localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
    soundManager.setVolume(settings.volume);
    soundManager.setSoundEnabled(settings.soundEnabled);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, notes);
    } catch {
      // ignore
    }
  }, [notes]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleLayer = useCallback((key: keyof SceneLayers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Chuyển sang góc nhìn cận cảnh góc chiếu tia Mặt Trời khi bấm vào từng mùa
  const handleSelectMilestone = useCallback((id: MilestoneId) => {
    soundManager.playClick();
    setSelectedMilestone(id);
    setDayOfYear(MILESTONES[id].dayOfYear);
    setViewMode('closeup');
    setInfoCardOpen(false); // Giữ cạnh phải thoáng để nhìn rõ các chùm tia Mặt Trời song song
    setSettings((prev) => ({ ...prev, isPlaying: false }));
    setFlyRequest((prev) => ({
      day: MILESTONES[id].dayOfYear,
      milestoneId: id,
      version: (prev?.version ?? 0) + 1,
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setActiveTab('sun_rays');
    setViewMode('orbit');
    setCameraPreset('default');
    setPresetVersion((v) => v + 1);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Phím tắt: Space (chạy/dừng), F (toàn màn hình), Mũi tên trái/phải (chuyển mốc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setSettings((prev) => {
          const next = !prev.isPlaying;
          if (next) setViewMode('orbit');
          return { ...prev, isPlaying: next };
        });
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const curIdx = selectedMilestone ? MILESTONE_ORDER.indexOf(selectedMilestone) : 0;
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        const nextIdx = (curIdx + delta + MILESTONE_ORDER.length) % MILESTONE_ORDER.length;
        handleSelectMilestone(MILESTONE_ORDER[nextIdx]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelectMilestone, selectedMilestone, toggleFullscreen]);

  const decl = getSolarDeclination(dayOfYear);
  const noonAlt = getSolarNoonAltitude(settings.observerLatitude, decl);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#040714]">
      {/* THANH TIÊU ĐỀ TRÊN CÙNG */}
      <TopHeaderBar
        title={TAB_METADATA[activeTab].headerTitle}
        settings={settings}
        layers={layers}
        isFullscreen={isFullscreen}
        onResetView={handleResetView}
        onUpdateSettings={updateSettings}
        onToggleConnectionLines={() => toggleLayer('connectionLines')}
        onSelectCameraPreset={(preset) => {
          setCameraPreset(preset);
          setPresetVersion((v) => v + 1);
        }}
        onOpenInfo={() => setInfoModalOpen(true)}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onStartTour={() => setTourStep(0)}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* KHU VỰC NỘI DUNG CHÍNH */}
      <main className="relative flex-1 overflow-hidden">
        {/* TAB MẶC ĐỊNH: GÓC CỦA TIA MẶT TRỜI – QUỸ ĐẠO & CẬN CẢNH TỪNG MÙA */}
        {activeTab === 'sun_rays' && (
          <>
            {viewMode === 'orbit' ? (
              <SeasonsOrbitScene
                dayOfYear={dayOfYear}
                onDayChange={setDayOfYear}
                isPlaying={settings.isPlaying}
                speedMultiplier={settings.speedMultiplier}
                earthSelfRotate={settings.earthSelfRotate}
                isEllipticalOrbit={settings.isEllipticalOrbit}
                hemisphere={settings.hemisphere}
                layers={layers}
                labelScale={settings.labelScale}
                graphicsQuality={settings.graphicsQuality}
                darkMode={settings.darkMode}
                cameraPreset={cameraPreset}
                presetVersion={presetVersion}
                flyRequest={flyRequest}
                onMilestoneClick={handleSelectMilestone}
              />
            ) : (
              <EarthIncidenceScene
                dayOfYear={dayOfYear}
                selectedMilestone={selectedMilestone}
                earthSelfRotate={settings.earthSelfRotate}
                layers={layers}
                labelScale={settings.labelScale}
                graphicsQuality={settings.graphicsQuality}
                darkMode={settings.darkMode}
              />
            )}

            {/* Lớp giao diện HUD nổi không che tâm 3D */}
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 md:p-4">
              <div className="flex items-start justify-between gap-3">
                {/* Góc trên bên trái: Bảng Các mùa */}
                <div className="flex flex-col gap-2">
                  {viewMode === 'closeup' && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setViewMode('orbit');
                      }}
                      className="pointer-events-auto flex w-fit items-center gap-1.5 rounded-lg border border-sky-400/50 bg-[#1f4e8c] px-3 py-1.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Quay lại toàn cảnh quỹ đạo</span>
                    </button>
                  )}
                  <SeasonsPanel
                    isOpen={seasonsPanelOpen}
                    onToggleOpen={setSeasonsPanelOpen}
                    hemisphere={settings.hemisphere}
                    onChangeHemisphere={(h) => updateSettings({ hemisphere: h })}
                    selectedMilestone={selectedMilestone}
                    onSelectMilestone={handleSelectMilestone}
                    labelsVisible={layers.seasonLabels}
                    onToggleLabels={() => toggleLayer('seasonLabels')}
                  />

                  {/* Bảng mini Góc nhập xạ tại vĩ độ chọn */}
                  <div className="pointer-events-auto hidden w-[285px] sm:w-[315px] rounded-xl border border-white/15 bg-slate-950/85 p-2.5 text-xs text-slate-200 shadow-xl lg:block">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold text-amber-300">
                        <Sun className="h-3.5 w-3.5" />
                        Góc chiếu tia Mặt Trời
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playClick();
                          toggleLayer('sunRays');
                        }}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          layers.sunRays ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {layers.sunRays ? 'Đang hiện tia' : 'Hiện tia sáng'}
                      </button>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 border-t border-white/10 pt-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-400">Chiếu thẳng góc:</span>
                        <div className="font-mono-num font-bold text-amber-300">{formatLatitude(decl)}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          Tại {formatLatitude(settings.observerLatitude)}:
                        </span>
                        <div className="font-mono-num font-bold text-emerald-300">
                          h = {noonAlt.isPolarNight ? '0°' : `${noonAlt.altitude.toFixed(1)}°`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Giữa phía trên: Nút "thay đổi mùa" + Timeline */}
                <div className="hidden md:block">
                  <TopCenterTimeline
                    dayOfYear={dayOfYear}
                    onDayChange={(d) => {
                      updateSettings({ isPlaying: false });
                      setDayOfYear(d);
                    }}
                    isPlaying={settings.isPlaying}
                    onTogglePlay={() => {
                      const nextPlay = !settings.isPlaying;
                      if (nextPlay && viewMode === 'closeup') setViewMode('orbit');
                      updateSettings({ isPlaying: nextPlay });
                    }}
                    speedMultiplier={settings.speedMultiplier}
                    onChangeSpeed={(s) => updateSettings({ speedMultiplier: s })}
                    hemisphere={settings.hemisphere}
                  />
                </div>

                {/* Góc trên bên phải: Thẻ thông tin mùa (trượt vào khi chọn mốc) */}
                <div className="flex flex-col items-end gap-2">
                  <SeasonInfoCard
                    isOpen={infoCardOpen}
                    onClose={() => setInfoCardOpen(false)}
                    milestoneId={selectedMilestone || 'ha_chi'}
                    dayOfYear={dayOfYear}
                    observerLatitude={settings.observerLatitude}
                    onChangeLatitude={(lat) => updateSettings({ observerLatitude: lat })}
                    showSunRays={layers.sunRays}
                    onToggleSunRays={() => toggleLayer('sunRays')}
                  />
                  {!infoCardOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setInfoCardOpen(true);
                      }}
                      className="pointer-events-auto rounded-lg border border-white/20 bg-slate-950/85 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-lg hover:bg-slate-900"
                    >
                      Xem thông số góc chiếu & độ dài ngày
                    </button>
                  )}
                </div>
              </div>

              {/* Thanh timeline cho màn hình nhỏ / tablet */}
              <div className="flex justify-center md:hidden">
                <TopCenterTimeline
                  dayOfYear={dayOfYear}
                  onDayChange={(d) => {
                    updateSettings({ isPlaying: false });
                    setDayOfYear(d);
                  }}
                  isPlaying={settings.isPlaying}
                  onTogglePlay={() => {
                    const nextPlay = !settings.isPlaying;
                    if (nextPlay && viewMode === 'closeup') setViewMode('orbit');
                    updateSettings({ isPlaying: nextPlay });
                  }}
                  speedMultiplier={settings.speedMultiplier}
                  onChangeSpeed={(s) => updateSettings({ speedMultiplier: s })}
                  hemisphere={settings.hemisphere}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* THANH TAB HỌC TẬP PHÍA DƯỚI */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        layers={layers}
        onToggleLayer={toggleLayer}
        onOpenNotes={() => setNotesModalOpen(true)}
      />

      {/* CÁC HỘP THOẠI & TOUR HƯỚNG DẪN */}
      <KnowledgeInfoModal open={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        layers={layers}
        onUpdateSettings={updateSettings}
        onToggleLayer={toggleLayer}
        onResetDefaults={() => {
          setSettings(DEFAULT_SETTINGS);
          setLayers(DEFAULT_LAYERS);
          setDayOfYear(ASTRONOMY_CONFIG.MILESTONE_DAYS.ha_chi);
        }}
      />
      <NotesModal
        open={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        notes={notes}
        onChangeNotes={setNotes}
      />
      <TourOverlay
        stepIndex={tourStep}
        onNext={() => setTourStep((s) => (s !== null ? Math.min(s + 1, 4) : null))}
        onPrev={() => setTourStep((s) => (s !== null ? Math.max(s - 1, 0) : null))}
        onClose={() => setTourStep(null)}
      />
    </div>
  );
}
