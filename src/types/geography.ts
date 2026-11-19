export type TabId = 'sun_rays';

export type MilestoneId = 'xuan_phan' | 'ha_chi' | 'thu_phan' | 'dong_chi';

export type Hemisphere = 'north' | 'south';

export type CameraPreset = 'default' | 'top' | 'earth_close' | 'equator';

export interface SceneLayers {
  orbit: boolean;
  seasonLabels: boolean;
  axis: boolean;
  parallels: boolean;
  terminator: boolean;
  eclipticPlane: boolean;
  sunRays: boolean;
  trail: boolean;
  connectionLines: boolean;
  grid: boolean;
}

export interface AppSettings {
  speedMultiplier: number;
  isPlaying: boolean;
  earthSelfRotate: boolean;
  isEllipticalOrbit: boolean;
  hemisphere: Hemisphere;
  labelScale: 'small' | 'normal' | 'large';
  graphicsQuality: 'high' | 'standard';
  darkMode: boolean;
  volume: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  observerLatitude: number;
  observerLongitude: number;
}

export interface MilestoneInfo {
  id: MilestoneId;
  name: string;
  dateLabel: string;
  dayOfYear: number;
  subsolarLabel: string;
  subsolarLat: number;
  color: string;
  arcColor: string;
  northSeason: string;
  southSeason: string;
  northDetails: string;
  southDetails: string;
  explanation: string;
}
