import type { Hemisphere, MilestoneId } from '../types/geography';

// Hằng số thiên văn & tham số mô phỏng có thể tuỳ chỉnh
export const ASTRONOMY_CONFIG = {
  AXIAL_TILT_DEG: 23.44, // 23°27'
  AXIAL_TILT_RAD: (23.44 * Math.PI) / 180,
  ORBIT_DAYS: 365.25,
  ORBIT_SEMI_MAJOR: 15.5, // Bán trục lớn (đơn vị 3D)
  EXAGGERATED_ECCENTRICITY: 0.2, // Độ lệch tâm phóng đại dễ quan sát
  EARTH_RADIUS: 1.55,
  SUN_RADIUS: 2.15,
  MILESTONE_DAYS: {
    xuan_phan: 80, // 21/3
    ha_chi: 172, // 21-22/6
    thu_phan: 266, // 23/9
    dong_chi: 356, // 22/12
  } as Record<MilestoneId, number>,
  SEASON_COLORS: {
    xuan: '#e0b400', // Vàng
    he: '#e02020', // Đỏ
    thu: '#f08a00', // Cam
    dong: '#1e90ff', // Xanh dương
  },
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

/**
 * Chuẩn hoá ngày trong năm về khoảng [1, 365.25]
 */
export function normalizeDayOfYear(day: number): number {
  const period = 365;
  let d = ((day - 1) % period + period) % period + 1;
  return d;
}

/**
 * Chuyển đổi thứ tự ngày N trong năm (1..365) sang ngày/tháng
 */
export function dayOfYearToDate(dayOfYear: number): {
  day: number;
  month: number;
  monthName: string;
  formatted: string;
} {
  let n = Math.round(normalizeDayOfYear(dayOfYear));
  if (n < 1) n = 1;
  if (n > 365) n = 365;

  let remaining = n;
  let month = 1;
  for (let i = 0; i < 12; i++) {
    if (remaining <= DAYS_IN_MONTH[i]) {
      month = i + 1;
      break;
    }
    remaining -= DAYS_IN_MONTH[i];
  }

  return {
    day: remaining,
    month,
    monthName: MONTH_NAMES[month - 1],
    formatted: `${remaining}/${month}`,
  };
}

/**
 * Tính góc quỹ đạo θ (radian) từ ngày trong năm N.
 * Quy ước hệ toạ độ Three.js (+X phải, +Y trên, +Z hướng về người xem):
 * Trái Đất chuyển động NGƯỢC CHIỀU KIM ĐỒNG HỒ khi nhìn từ cực Bắc (+Y):
 * x = a * cos(θ), z = -b * sin(θ)
 * - Xuân phân (N=80, 21/3)  -> θ = π/2    (0, 0, -b)
 * - Hạ chí    (N=172, 21/6) -> θ = π      (-a, 0, 0)
 * - Thu phân  (N=266, 23/9) -> θ = 3π/2   (0, 0, +b)
 * - Đông chí  (N=356, 22/12)-> θ = 2π     (+a, 0, 0)
 */
export function getOrbitAngleFromDay(dayOfYear: number): number {
  const n = normalizeDayOfYear(dayOfYear);
  const { xuan_phan, ha_chi, thu_phan, dong_chi } = ASTRONOMY_CONFIG.MILESTONE_DAYS;

  if (n >= xuan_phan && n < ha_chi) {
    const t = (n - xuan_phan) / (ha_chi - xuan_phan);
    return Math.PI * 0.5 + t * Math.PI * 0.5;
  }
  if (n >= ha_chi && n < thu_phan) {
    const t = (n - ha_chi) / (thu_phan - ha_chi);
    return Math.PI + t * Math.PI * 0.5;
  }
  if (n >= thu_phan && n < dong_chi) {
    const t = (n - thu_phan) / (dong_chi - thu_phan);
    return Math.PI * 1.5 + t * Math.PI * 0.5;
  }
  // Từ Đông chí (356) -> 365 -> 1 -> Xuân phân (80)
  const span = 365 - dong_chi + xuan_phan; // 89 ngày
  const elapsed = n >= dong_chi ? n - dong_chi : 365 - dong_chi + n;
  const t = elapsed / span;
  return t * Math.PI * 0.5;
}

/**
 * Tính vị trí 3D của Trái Đất và Mặt Trời trên mặt phẳng hoàng đạo (Y = 0)
 */
export function getOrbitalPositions(dayOfYear: number, isElliptical: boolean) {
  const a = ASTRONOMY_CONFIG.ORBIT_SEMI_MAJOR;
  const e = isElliptical ? ASTRONOMY_CONFIG.EXAGGERATED_ECCENTRICITY : 0;
  const b = a * Math.sqrt(1 - e * e);
  const c = a * e; // Mặt Trời lệch về phía Đông chí (+X, điểm cận nhật tháng 1)

  const theta = getOrbitAngleFromDay(dayOfYear);
  const earthX = a * Math.cos(theta);
  const earthZ = -b * Math.sin(theta);

  return {
    theta,
    a,
    b,
    sunX: c,
    sunZ: 0,
    earthX,
    earthZ,
  };
}

/**
 * Công thức xích vĩ Mặt Trời (vĩ độ có tia sáng chiếu thẳng góc):
 * δ = 23.44° × sin(360°/365 × (N − 80))
 * (Hiệu chỉnh khớp chính xác mốc 21/3 = 0°, 21/6 = +23.44°, 23/9 = 0°, 22/12 = -23.44°)
 */
export function getSolarDeclination(dayOfYear: number): number {
  const n = normalizeDayOfYear(dayOfYear);
  const angleRad = ((2 * Math.PI) / 365) * (n - 80.5);
  return ASTRONOMY_CONFIG.AXIAL_TILT_DEG * Math.sin(angleRad);
}

/**
 * Tính độ cao Mặt Trời lúc 12h trưa tại vĩ độ φ (độ):
 * h = 90° - |φ - δ|
 */
export function getSolarNoonAltitude(latDeg: number, declDeg: number): {
  altitude: number;
  rawAltitude: number;
  isPolarNight: boolean;
  zenithDirection: 'Bắc' | 'Nam' | 'Thiên đỉnh';
} {
  const rawAltitude = 90 - Math.abs(latDeg - declDeg);
  const isPolarNight = rawAltitude <= 0;
  const altitude = Math.max(0, rawAltitude);

  let zenithDirection: 'Bắc' | 'Nam' | 'Thiên đỉnh' = 'Thiên đỉnh';
  if (Math.abs(latDeg - declDeg) > 0.25) {
    zenithDirection = declDeg > latDeg ? 'Bắc' : 'Nam';
  }

  return { altitude, rawAltitude, isPolarNight, zenithDirection };
}

/**
 * Tính độ dài ban ngày và ban đêm tại vĩ độ φ (độ) với xích vĩ δ (độ):
 * cos(H) = -tan(φ) * tan(δ)
 */
export function getDayLengthHours(latDeg: number, declDeg: number): {
  dayHours: number;
  nightHours: number;
  status: 'normal' | 'polar_day' | 'polar_night';
} {
  const clampedLat = Math.max(-89.99, Math.min(89.99, latDeg));
  const phi = (clampedLat * Math.PI) / 180;
  const delta = (declDeg * Math.PI) / 180;

  const cosH = -Math.tan(phi) * Math.tan(delta);
  if (cosH <= -1) {
    return { dayHours: 24, nightHours: 0, status: 'polar_day' };
  }
  if (cosH >= 1) {
    return { dayHours: 0, nightHours: 24, status: 'polar_night' };
  }
  const H = Math.acos(cosH); // radian
  const dayHours = (24 * H) / Math.PI;
  return {
    dayHours,
    nightHours: 24 - dayHours,
    status: 'normal',
  };
}

/**
 * Định dạng số giờ thập phân sang "XXg YYph"
 */
export function formatHoursToHm(hours: number): string {
  const clamped = Math.max(0, Math.min(24, hours));
  let h = Math.floor(clamped);
  let m = Math.round((clamped - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return `${h} giờ ${m.toString().padStart(2, '0')} phút`;
}

/**
 * Định dạng vĩ độ sang ký hiệu Địa lí (ví dụ: 23°27'B, 0°, 23°27'N)
 */
export function formatLatitude(latDeg: number): string {
  if (Math.abs(latDeg) < 0.08) return '0° (Xích đạo)';
  const abs = Math.abs(latDeg);
  const deg = Math.floor(abs);
  const min = Math.round((abs - deg) * 60);
  const dir = latDeg >= 0 ? 'B' : 'N';
  if (min === 60) return `${deg + 1}°00'${dir}`;
  return `${deg}°${min.toString().padStart(2, '0')}'${dir}`;
}

/**
 * Xác định mùa hiện tại theo ngày trong năm và bán cầu
 */
export function getSeasonInfoForDay(
  dayOfYear: number,
  hemisphere: Hemisphere
): {
  northSeasonKey: 'xuan' | 'he' | 'thu' | 'dong';
  displayName: string;
  color: string;
  nearestMilestone: MilestoneId;
} {
  const n = normalizeDayOfYear(dayOfYear);
  const { xuan_phan, ha_chi, thu_phan, dong_chi } = ASTRONOMY_CONFIG.MILESTONE_DAYS;

  let northSeasonKey: 'xuan' | 'he' | 'thu' | 'dong' = 'xuan';
  if (n >= xuan_phan && n < ha_chi) northSeasonKey = 'xuan';
  else if (n >= ha_chi && n < thu_phan) northSeasonKey = 'he';
  else if (n >= thu_phan && n < dong_chi) northSeasonKey = 'thu';
  else northSeasonKey = 'dong';

  const northNames = {
    xuan: 'Mùa xuân',
    he: 'Mùa hè',
    thu: 'Mùa thu',
    dong: 'Mùa đông',
  };
  const southNames = {
    xuan: 'Mùa thu',
    he: 'Mùa đông',
    thu: 'Mùa xuân',
    dong: 'Mùa hè',
  };

  // Xác định mốc gần nhất (trong vòng ±8 ngày hoặc theo cung)
  const distances: { id: MilestoneId; dist: number }[] = (
    Object.keys(ASTRONOMY_CONFIG.MILESTONE_DAYS) as MilestoneId[]
  ).map((id) => {
    const target = ASTRONOMY_CONFIG.MILESTONE_DAYS[id];
    const diff = Math.abs(n - target);
    return { id, dist: Math.min(diff, 365 - diff) };
  });
  distances.sort((a, b) => a.dist - b.dist);

  return {
    northSeasonKey,
    displayName: hemisphere === 'north' ? northNames[northSeasonKey] : southNames[northSeasonKey],
    color: ASTRONOMY_CONFIG.SEASON_COLORS[northSeasonKey],
    nearestMilestone: distances[0].id,
  };
}

/**
 * Khoảng cách ngắn nhất theo chu kỳ 365 ngày từ currentDay tới targetDay
 */
export function shortestDayDelta(currentDay: number, targetDay: number): number {
  const period = 365;
  const cur = normalizeDayOfYear(currentDay);
  const tar = normalizeDayOfYear(targetDay);
  let delta = tar - cur;
  if (delta > period / 2) delta -= period;
  if (delta < -period / 2) delta += period;
  return delta;
}
