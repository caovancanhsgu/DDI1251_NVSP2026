import * as THREE from 'three';

const EARTH_BLUE_MARBLE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_TOPOLOGY_URL = 'https://unpkg.com/three-globe/example/img/earth-topology.png';
const NIGHT_SKY_URL = 'https://unpkg.com/three-globe/example/img/night-sky.png';

/**
 * Vẽ texture Trái Đất dự phòng chất lượng cao bằng Canvas 2D
 * (lục địa, đại dương, chỏm băng cực, mây mỏng) để hiển thị ngay lập tức kể cả khi mất mạng.
 */
export function createProceduralEarthTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Nền đại dương xanh thẳm có chiều sâu theo vĩ độ
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#c8e4f5');
  oceanGrad.addColorStop(0.08, '#164e87');
  oceanGrad.addColorStop(0.5, '#0b3b75');
  oceanGrad.addColorStop(0.92, '#164e87');
  oceanGrad.addColorStop(1, '#dceefa');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Vẽ các khối lục địa cách điệu theo toạ độ kinh/vĩ độ gần đúng
  const drawContinent = (points: [number, number][], fill: string) => {
    ctx.beginPath();
    points.forEach(([lon, lat], i) => {
      const x = ((lon + 180) / 360) * width;
      const y = ((90 - lat) / 180) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  // Bắc Mỹ
  drawContinent(
    [
      [-165, 65], [-130, 70], [-95, 72], [-75, 60], [-60, 46], [-80, 26],
      [-92, 18], [-82, 10], [-95, 15], [-108, 24], [-125, 42], [-145, 58],
    ],
    '#3c8d50'
  );
  // Greenland
  drawContinent(
    [[-52, 82], [-22, 80], [-25, 66], [-45, 60], [-56, 72]],
    '#e2edf7'
  );
  // Nam Mỹ
  drawContinent(
    [
      [-80, 10], [-62, 10], [-36, -6], [-40, -22], [-58, -38],
      [-68, -54], [-75, -44], [-72, -18], [-81, -4],
    ],
    '#429954'
  );
  // Châu Âu
  drawContinent(
    [
      [-10, 36], [5, 44], [-4, 52], [10, 62], [28, 70], [56, 68],
      [58, 50], [40, 42], [25, 38], [12, 40],
    ],
    '#529c5a'
  );
  // Châu Phi
  drawContinent(
    [
      [-16, 34], [10, 37], [33, 31], [43, 12], [50, 10], [40, -10],
      [34, -26], [20, -35], [14, -20], [8, 4], [-16, 14],
    ],
    '#a39d52'
  );
  // Châu Á (bao gồm Đông Nam Á & Việt Nam)
  drawContinent(
    [
      [42, 44], [60, 68], [105, 74], [168, 66], [150, 52], [132, 42],
      [120, 30], [108, 20], [109, 10], [102, 8], [98, 16], [88, 22],
      [78, 8], [68, 24], [55, 25], [38, 32],
    ],
    '#4c9455'
  );
  // Quần đảo Indonesia / Philippines / Nhật Bản
  drawContinent([[132, 32], [142, 40], [144, 44], [136, 35]], '#4c9455');
  drawContinent([[98, 4], [116, 4], [118, -7], [104, -6]], '#4c9455');
  // Úc
  drawContinent(
    [
      [114, -22], [132, -12], [146, -18], [153, -28], [146, -38],
      [130, -33], [116, -34],
    ],
    '#b88948'
  );
  // Nam Cực
  ctx.fillStyle = '#e8f2fa';
  ctx.fillRect(0, height - 36, width, 36);
  ctx.fillRect(0, 0, width, 24);

  // Hiệu ứng mây nhẹ
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  for (let i = 0; i < 45; i++) {
    const cx = (Math.sin(i * 12.9898) * 0.5 + 0.5) * width;
    const cy = (Math.cos(i * 78.233) * 0.4 + 0.5) * height;
    const rw = 40 + (i % 5) * 18;
    const rh = 10 + (i % 3) * 6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Tạo texture đèn thành phố ban đêm nhẹ (dùng cho mặt tối Trái Đất)
 */
export function createNightLightsTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Các cụm đô thị lớn (Bắc Mỹ, Châu Âu, Ấn Độ, Đông Á, Đông Nam Á)
  const clusters: [number, number, number][] = [
    [-82, 40, 28], [-100, 35, 16], [-46, -23, 12],
    [8, 49, 32], [25, 52, 20], [37, 55, 16],
    [77, 25, 28], [105, 21, 18], [116, 35, 34], [139, 36, 18],
    [107, 10, 10], [106, -6, 12], [151, -33, 8], [31, 30, 12],
  ];

  clusters.forEach(([lon, lat, count]) => {
    const baseX = ((lon + 180) / 360) * width;
    const baseY = ((90 - lat) / 180) * height;
    for (let i = 0; i < count; i++) {
      const dx = (Math.sin(i * 19.3 + lon) * 0.5 + Math.cos(i * 7.1) * 0.5) * 18;
      const dy = (Math.cos(i * 13.7 + lat) * 0.5 + Math.sin(i * 5.3) * 0.5) * 10;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 215, 130, 0.85)' : 'rgba(255, 185, 90, 0.55)';
      ctx.beginPath();
      ctx.arc(baseX + dx, baseY + dy, i % 4 === 0 ? 1.5 : 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Tạo texture Mặt Trời rực sáng dạng hạt lửa
 */
export function createSunSurfaceTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#ffae00');
  grad.addColorStop(0.5, '#ff8800');
  grad.addColorStop(1, '#ffd040');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 450; i++) {
    const x = (Math.sin(i * 43.12) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 91.77) * 0.5 + 0.5) * size;
    const r = 4 + (i % 14);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, i % 2 === 0 ? 'rgba(255, 250, 200, 0.45)' : 'rgba(235, 80, 0, 0.35)');
    g.addColorStop(1, 'rgba(255, 160, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Tạo sprite hào quang Mặt Trời (glow/corona)
 */
export function createGlowSpriteTexture(innerColor = '#fff7cc', midColor = '#ffaa22'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, innerColor);
  g.addColorStop(0.22, midColor);
  g.addColorStop(0.55, 'rgba(255, 140, 20, 0.25)');
  g.addColorStop(1, 'rgba(255, 100, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Tạo texture thiên hà mờ ở góc nền vũ trụ
 */
export function createGalaxyBackdropTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#030612';
  ctx.fillRect(0, 0, width, height);

  // Dải ngân hà nghiêng mờ ảo
  ctx.save();
  ctx.translate(width * 0.72, height * 0.35);
  ctx.rotate(-0.38);
  const milky = ctx.createRadialGradient(0, 0, 10, 0, 0, 320);
  milky.addColorStop(0, 'rgba(130, 175, 255, 0.22)');
  milky.addColorStop(0.4, 'rgba(72, 106, 190, 0.11)');
  milky.addColorStop(1, 'rgba(3, 6, 18, 0)');
  ctx.scale(1.8, 0.45);
  ctx.fillStyle = milky;
  ctx.beginPath();
  ctx.arc(0, 0, 320, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hàng nghìn ngôi sao nhỏ nhiều độ sáng
  for (let i = 0; i < 1200; i++) {
    const x = (Math.sin(i * 127.1) * 0.5 + 0.5) * width;
    const y = (Math.sin(i * 311.7) * 0.5 + 0.5) * height;
    const r = i % 25 === 0 ? 1.6 : i % 7 === 0 ? 1.0 : 0.6;
    const alpha = 0.25 + (i % 10) * 0.07;
    ctx.fillStyle = `rgba(225, 238, 255, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Tải texture công khai từ unpkg (có fallback tự động nếu mất mạng)
 */
export function loadPublicEarthTextures(
  maxAnisotropy: number,
  onEarthMap: (tex: THREE.Texture) => void,
  onBumpMap: (tex: THREE.Texture) => void,
  onSkyMap?: (tex: THREE.Texture) => void
) {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  loader.load(
    EARTH_BLUE_MARBLE_URL,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAnisotropy;
      onEarthMap(tex);
    },
    undefined,
    () => {
      // Giữ nguyên texture dự phòng đã tạo sẵn
    }
  );

  loader.load(
    EARTH_TOPOLOGY_URL,
    (tex) => {
      tex.anisotropy = maxAnisotropy;
      onBumpMap(tex);
    },
    undefined,
    () => {}
  );

  if (onSkyMap) {
    loader.load(
      NIGHT_SKY_URL,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        onSkyMap(tex);
      },
      undefined,
      () => {}
    );
  }
}
