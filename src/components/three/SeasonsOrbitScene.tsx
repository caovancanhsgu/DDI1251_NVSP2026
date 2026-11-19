import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type {
  CameraPreset,
  Hemisphere,
  MilestoneId,
  SceneLayers,
} from '../../types/geography';
import {
  ASTRONOMY_CONFIG,
  getOrbitalPositions,
  getSeasonInfoForDay,
  getSolarDeclination,
  normalizeDayOfYear,
  shortestDayDelta,
} from '../../utils/astronomy';
import {
  createGalaxyBackdropTexture,
  createGlowSpriteTexture,
  createNightLightsTexture,
  createProceduralEarthTexture,
  createSunSurfaceTexture,
  loadPublicEarthTextures,
} from '../../utils/textures';
import {
  applyStudioEnvironment,
  createConfiguredRenderer,
  disposeSceneObjects,
  scheduleAfterDraw,
} from '../../utils/threeSetup';

interface SeasonsOrbitSceneProps {
  dayOfYear: number;
  onDayChange: (day: number) => void;
  isPlaying: boolean;
  speedMultiplier: number;
  earthSelfRotate: boolean;
  isEllipticalOrbit: boolean;
  hemisphere: Hemisphere;
  layers: SceneLayers;
  labelScale: 'small' | 'normal' | 'large';
  graphicsQuality: 'high' | 'standard';
  darkMode: boolean;
  cameraPreset: CameraPreset;
  presetVersion: number;
  flyRequest: { day: number; milestoneId?: MilestoneId; version: number } | null;
  onMilestoneClick: (id: MilestoneId) => void;
}

// Biến toán học tái sử dụng ngoài vòng lặp render (tránh GC)
const _sunDir = new THREE.Vector3();
const _earthPos = new THREE.Vector3();
const _sunPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesiredPos = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);

/**
 * Tạo đường tròn vĩ tuyến trên mặt cầu bán kính r ở vĩ độ latDeg
 */
function createLatitudeRing(
  radius: number,
  latDeg: number,
  color: number,
  dashed = false,
  opacity = 0.85
): THREE.Line {
  const latRad = (latDeg * Math.PI) / 180;
  const r = radius * Math.cos(latRad);
  const y = radius * Math.sin(latRad);
  const segments = 96;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  if (dashed) {
    const mat = new THREE.LineDashedMaterial({
      color,
      dashSize: 0.14,
      gapSize: 0.08,
      transparent: true,
      opacity,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  return new THREE.Line(geo, mat);
}

/**
 * Tạo cung quỹ đạo elip dạng TubeGeometry từ góc startAngle đến endAngle
 */
function createOrbitArcTube(
  a: number,
  b: number,
  startAngle: number,
  endAngle: number,
  colorHex: string,
  radius = 0.09
): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = startAngle + (endAngle - startAngle) * t;
    pts.push(new THREE.Vector3(a * Math.cos(theta), 0, -b * Math.sin(theta)));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, 48, radius, 8, false);
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.1,
  });
  return new THREE.Mesh(geo, mat);
}

export const SeasonsOrbitScene: React.FC<SeasonsOrbitSceneProps> = ({
  dayOfYear,
  onDayChange,
  isPlaying,
  speedMultiplier,
  earthSelfRotate,
  isEllipticalOrbit,
  hemisphere,
  layers,
  labelScale,
  graphicsQuality,
  darkMode,
  cameraPreset,
  presetVersion,
  flyRequest,
  onMilestoneClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);

  // Refs đồng bộ state React vào vòng lặp Three.js không gây re-mount WebGL
  const stateRef = useRef({
    dayOfYear,
    isPlaying,
    speedMultiplier,
    earthSelfRotate,
    isEllipticalOrbit,
    hemisphere,
    layers,
    labelScale,
    darkMode,
    onDayChange,
    onMilestoneClick,
  });
  stateRef.current = {
    dayOfYear,
    isPlaying,
    speedMultiplier,
    earthSelfRotate,
    isEllipticalOrbit,
    hemisphere,
    layers,
    labelScale,
    darkMode,
    onDayChange,
    onMilestoneClick,
  };

  // Trạng thái bay animation (easing) giữa các mốc mùa & preset camera
  const flightRef = useRef<{
    active: boolean;
    startDay: number;
    deltaDay: number;
    elapsed: number;
    duration: number;
    camActive: boolean;
    camPos: THREE.Vector3;
    camLook: THREE.Vector3;
  }>({
    active: false,
    startDay: dayOfYear,
    deltaDay: 0,
    elapsed: 0,
    duration: 1.7,
    camActive: false,
    camPos: new THREE.Vector3(0, 14.5, 25.5),
    camLook: new THREE.Vector3(0, 0, 0),
  });

  // Kích hoạt bay khi user chọn mốc
  useEffect(() => {
    if (!flyRequest) return;
    const cur = stateRef.current.dayOfYear;
    const delta = shortestDayDelta(cur, flyRequest.day);
    const { earthX, earthZ } = getOrbitalPositions(
      flyRequest.day,
      stateRef.current.isEllipticalOrbit
    );

    // Đặt vị trí camera hơi chếch về phía nhìn rõ phần chiếu sáng trên Trái Đất
    const dirToCenter = new THREE.Vector3(-earthX, 0, -earthZ).normalize();
    const sideOffset = new THREE.Vector3(-dirToCenter.z, 0, dirToCenter.x);
    const camPos = new THREE.Vector3(earthX, 0, earthZ)
      .addScaledVector(dirToCenter, 6.2)
      .addScaledVector(sideOffset, 7.8)
      .add(new THREE.Vector3(0, 5.2, 0));

    flightRef.current = {
      active: Math.abs(delta) > 0.2,
      startDay: cur,
      deltaDay: delta,
      elapsed: 0,
      duration: 1.65,
      camActive: true,
      camPos,
      camLook: new THREE.Vector3(earthX * 0.65, 0, earthZ * 0.65),
    };
  }, [flyRequest]);

  // Kích hoạt chuyển đổi preset camera
  useEffect(() => {
    if (presetVersion === 0) return;
    const { earthX, earthZ } = getOrbitalPositions(
      stateRef.current.dayOfYear,
      stateRef.current.isEllipticalOrbit
    );
    const pos = new THREE.Vector3(0, 14.5, 25.5);
    const look = new THREE.Vector3(0, 0, 0);

    if (cameraPreset === 'top') {
      pos.set(0, 33, 0.01);
      look.set(0, 0, 0);
    } else if (cameraPreset === 'earth_close') {
      const toSun = new THREE.Vector3(-earthX, 0, -earthZ).normalize();
      const perp = new THREE.Vector3(-toSun.z, 0, toSun.x);
      pos.set(earthX, 0, earthZ).addScaledVector(toSun, 3.2).addScaledVector(perp, 5.2).add(new THREE.Vector3(0, 2.5, 0));
      look.set(earthX, 0, earthZ);
    } else if (cameraPreset === 'equator') {
      pos.set(0, 2.2, 26);
      look.set(0, 0, 0);
    }

    flightRef.current.camActive = true;
    flightRef.current.camPos.copy(pos);
    flightRef.current.camLook.copy(look);
  }, [cameraPreset, presetVersion]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    let isSoftwareGl = false;
    try {
      const res = createConfiguredRenderer(container, graphicsQuality);
      renderer = res.renderer;
      isSoftwareGl = res.isSoftwareGl;
    } catch {
      setWebglError(true);
      return;
    }

    container.appendChild(renderer.domElement);

    // CSS2DRenderer cho nhãn mùa, mốc, cực Bắc/Nam quay mặt về camera
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040714');
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      44,
      Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
      0.1,
      400
    );
    camera.position.set(0, 14.5, 25.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 4.2;
    controls.maxDistance = 58;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.minPolarAngle = 0.05;
    controls.target.set(0, 0, 0);

    // Hủy auto-camera ngay khi người dùng xoay chuột
    const handleControlsStart = () => {
      flightRef.current.camActive = false;
    };
    controls.addEventListener('start', handleControlsStart);

    // ========================
    // 1. NỀN VŨ TRỤ & SAO LẤP LÁNH
    // ========================
    const skyGeo = new THREE.SphereGeometry(160, 32, 24);
    const skyTex = createGalaxyBackdropTexture();
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Hệ thống sao 3D lấp lánh nhẹ
    const starCount = 750;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 65 + Math.random() * 75;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const tint = 0.78 + Math.random() * 0.22;
      starColors[i * 3] = tint;
      starColors[i * 3 + 1] = tint + 0.05;
      starColors[i * 3 + 2] = 1.0;
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.36,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });
    const starPoints = new THREE.Points(starsGeo, starsMat);
    scene.add(starPoints);

    // Lưới không gian tham chiếu (tùy chọn trong cài đặt/Lớp)
    const spaceGrid = new THREE.GridHelper(48, 24, 0x2a4570, 0x16243d);
    spaceGrid.position.y = -0.05;
    spaceGrid.visible = stateRef.current.layers.grid;
    scene.add(spaceGrid);

    // ========================
    // 2. MẶT TRỜI & ÁNH SÁNG
    // ========================
    const sunGroup = new THREE.Group();
    scene.add(sunGroup);

    const sunTex = createSunSurfaceTexture();
    const sunCoreMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(ASTRONOMY_CONFIG.SUN_RADIUS, 48, 36),
      sunCoreMat
    );
    sunGroup.add(sunCore);

    // Hào quang corona phát sáng
    const glowTex = createGlowSpriteTexture('rgba(255, 250, 210, 0.95)', 'rgba(255, 165, 30, 0.55)');
    const coronaSpriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffcc55,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coronaSprite = new THREE.Sprite(coronaSpriteMat);
    coronaSprite.scale.set(10.5, 10.5, 1);
    sunGroup.add(coronaSprite);

    const flareTex = createGlowSpriteTexture('rgba(255, 255, 255, 0.55)', 'rgba(255, 190, 60, 0.15)');
    const flareSpriteMat = new THREE.SpriteMaterial({
      map: flareTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flareSprite = new THREE.Sprite(flareSpriteMat);
    flareSprite.scale.set(16, 16, 1);
    sunGroup.add(flareSprite);

    // Ánh sáng từ Mặt Trời (DirectionalLight theo trục Mặt Trời -> Trái Đất để đường phân chia sáng tối chính xác 50/50)
    const hemiLight = new THREE.HemisphereLight(0x4a6fa5, 0x0b1120, 0.22);
    scene.add(hemiLight);

    const sunDirLight = new THREE.DirectionalLight(0xfff5e0, 2.9);
    scene.add(sunDirLight);
    scene.add(sunDirLight.target);

    const sunPointLight = new THREE.PointLight(0xffd27a, 1.4, 55, 1.2);
    sunGroup.add(sunPointLight);

    // ========================
    // 3. QUỸ ĐẠO, MẶT PHẲNG HOÀNG ĐẠO & 4 CUNG MÙA
    // ========================
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    let orbitPlaneMesh: THREE.Mesh | null = null;
    let arcMeshes: Record<'xuan' | 'he' | 'thu' | 'dong', THREE.Mesh> | null = null;
    let crossLinesGroup: THREE.Group | null = null;
    let directionArrowsGroup: THREE.Group | null = null;
    const milestoneMeshes: { id: MilestoneId; mesh: THREE.Mesh }[] = [];

    // Tạo nhãn HTML CSS2D cho mốc & mùa
    const milestoneLabels: Record<MilestoneId, { el: HTMLButtonElement; obj: CSS2DObject }> = {} as Record<
      MilestoneId,
      { el: HTMLButtonElement; obj: CSS2DObject }
    >;
    const seasonLabels: Record<'xuan' | 'he' | 'thu' | 'dong', { el: HTMLButtonElement; obj: CSS2DObject }> = {} as Record<
      'xuan' | 'he' | 'thu' | 'dong',
      { el: HTMLButtonElement; obj: CSS2DObject }
    >;

    const milestoneMeta: { id: MilestoneId; label: string; angle: number }[] = [
      { id: 'xuan_phan', label: 'xuân phân ✲', angle: Math.PI * 0.5 },
      { id: 'ha_chi', label: 'hạ chí ✲', angle: Math.PI },
      { id: 'thu_phan', label: 'thu phân ✲', angle: Math.PI * 1.5 },
      { id: 'dong_chi', label: 'đông chí ✲', angle: 0 },
    ];

    milestoneMeta.forEach((m) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'label-3d-milestone px-2 py-0.5 rounded text-white font-semibold text-xs tracking-wide bg-slate-950/60 border border-white/15 hover:border-yellow-300';
      btn.textContent = m.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        stateRef.current.onMilestoneClick(m.id);
      });
      const obj = new CSS2DObject(btn);
      orbitGroup.add(obj);
      milestoneLabels[m.id] = { el: btn, obj };
    });

    const seasonMeta: {
      key: 'xuan' | 'he' | 'thu' | 'dong';
      color: string;
      angle: number;
      northTarget: MilestoneId;
    }[] = [
      { key: 'xuan', color: ASTRONOMY_CONFIG.SEASON_COLORS.xuan, angle: Math.PI * 0.75, northTarget: 'xuan_phan' },
      { key: 'he', color: ASTRONOMY_CONFIG.SEASON_COLORS.he, angle: Math.PI * 1.25, northTarget: 'ha_chi' },
      { key: 'thu', color: ASTRONOMY_CONFIG.SEASON_COLORS.thu, angle: Math.PI * 1.75, northTarget: 'thu_phan' },
      { key: 'dong', color: ASTRONOMY_CONFIG.SEASON_COLORS.dong, angle: Math.PI * 0.25, northTarget: 'dong_chi' },
    ];

    seasonMeta.forEach((s) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'label-3d-season px-3 py-1 rounded-full text-white font-bold text-xs shadow-lg border border-white/30';
      btn.style.backgroundColor = s.color;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        stateRef.current.onMilestoneClick(s.northTarget);
      });
      const obj = new CSS2DObject(btn);
      orbitGroup.add(obj);
      seasonLabels[s.key] = { el: btn, obj };
    });

    const rebuildOrbitGeometry = (isElliptical: boolean) => {
      // Xoá hình cũ
      if (orbitPlaneMesh) {
        orbitGroup.remove(orbitPlaneMesh);
        orbitPlaneMesh.geometry.dispose();
        (orbitPlaneMesh.material as THREE.Material).dispose();
      }
      if (arcMeshes) {
        Object.values(arcMeshes).forEach((m) => {
          orbitGroup.remove(m);
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        });
      }
      if (crossLinesGroup) {
        orbitGroup.remove(crossLinesGroup);
        disposeSceneObjects(crossLinesGroup);
      }
      if (directionArrowsGroup) {
        orbitGroup.remove(directionArrowsGroup);
        disposeSceneObjects(directionArrowsGroup);
      }
      milestoneMeshes.forEach((mm) => {
        orbitGroup.remove(mm.mesh);
        mm.mesh.geometry.dispose();
        (mm.mesh.material as THREE.Material).dispose();
      });
      milestoneMeshes.length = 0;

      const a = ASTRONOMY_CONFIG.ORBIT_SEMI_MAJOR;
      const e = isElliptical ? ASTRONOMY_CONFIG.EXAGGERATED_ECCENTRICITY : 0;
      const b = a * Math.sqrt(1 - e * e);

      // Mặt phẳng hoàng đạo tô vàng nâu trong suốt (alpha ~0.15)
      const planeShape = new THREE.Shape();
      planeShape.absellipse(0, 0, a, b, 0, Math.PI * 2, false, 0);
      const planeGeo = new THREE.ShapeGeometry(planeShape, 96);
      planeGeo.rotateX(Math.PI / 2);
      const planeMat = new THREE.MeshBasicMaterial({
        color: 0xc2923a,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      orbitPlaneMesh = new THREE.Mesh(planeGeo, planeMat);
      orbitPlaneMesh.position.y = -0.02;
      orbitGroup.add(orbitPlaneMesh);

      // 4 cung quỹ đạo màu theo đúng mùa Bắc bán cầu (ngược chiều kim đồng hồ)
      arcMeshes = {
        xuan: createOrbitArcTube(a, b, Math.PI * 0.5, Math.PI, ASTRONOMY_CONFIG.SEASON_COLORS.xuan),
        he: createOrbitArcTube(a, b, Math.PI, Math.PI * 1.5, ASTRONOMY_CONFIG.SEASON_COLORS.he),
        thu: createOrbitArcTube(a, b, Math.PI * 1.5, Math.PI * 2, ASTRONOMY_CONFIG.SEASON_COLORS.thu),
        dong: createOrbitArcTube(a, b, 0, Math.PI * 0.5, ASTRONOMY_CONFIG.SEASON_COLORS.dong),
      };
      Object.values(arcMeshes).forEach((m) => orbitGroup.add(m));

      // 2 đường thẳng vàng mảnh nối Xuân phân – Thu phân và Hạ chí – Đông chí
      crossLinesGroup = new THREE.Group();
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.58,
      });
      const line1Geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-a, 0, 0),
        new THREE.Vector3(a, 0, 0),
      ]);
      const line2Geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -b),
        new THREE.Vector3(0, 0, b),
      ]);
      crossLinesGroup.add(new THREE.Line(line1Geo, lineMat));
      crossLinesGroup.add(new THREE.Line(line2Geo, lineMat));
      orbitGroup.add(crossLinesGroup);

      // Mũi tên chỉ chiều chuyển động ngược chiều kim đồng hồ
      directionArrowsGroup = new THREE.Group();
      [Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75, Math.PI * 0.25].forEach((theta) => {
        const px = a * Math.cos(theta);
        const pz = -b * Math.sin(theta);
        const tx = -a * Math.sin(theta);
        const tz = -b * Math.cos(theta);
        const tangent = new THREE.Vector3(tx, 0, tz).normalize();
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.24, 0.65, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        cone.position.set(px, 0.02, pz);
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        directionArrowsGroup!.add(cone);
      });
      orbitGroup.add(directionArrowsGroup);

      // 4 điểm mốc tròn vàng sáng + cập nhật vị trí nhãn
      milestoneMeta.forEach((m) => {
        const px = a * Math.cos(m.angle);
        const pz = -b * Math.sin(m.angle);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.32, 20, 20),
          new THREE.MeshStandardMaterial({
            color: 0xfacc15,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.9,
          })
        );
        dot.position.set(px, 0.05, pz);
        dot.userData.milestoneId = m.id;
        orbitGroup.add(dot);
        milestoneMeshes.push({ id: m.id, mesh: dot });

        const labelOffset = 1.15;
        milestoneLabels[m.id].obj.position.set(
          px * labelOffset,
          0.9,
          pz * labelOffset
        );
      });

      seasonMeta.forEach((s) => {
        const sx = a * 1.2 * Math.cos(s.angle);
        const sz = -b * 1.2 * Math.sin(s.angle);
        seasonLabels[s.key].obj.position.set(sx, 0.45, sz);
      });
    };

    rebuildOrbitGeometry(stateRef.current.isEllipticalOrbit);

    // ========================
    // 4. VỆT QUỸ ĐẠO (TRAIL) PHÍA SAU TRÁI ĐẤT
    // ========================
    const trailLength = 52;
    const trailPositions = new Float32Array(trailLength * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    trailLine.frustumCulled = false;
    scene.add(trailLine);

    const updateTrail = (currentDay: number, elliptical: boolean) => {
      const posAttr = trailGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < trailLength; i++) {
        const d = normalizeDayOfYear(currentDay - i * 0.75);
        const p = getOrbitalPositions(d, elliptical);
        posAttr.setXYZ(i, p.earthX, 0, p.earthZ);
      }
      posAttr.needsUpdate = true;
    };

    // ========================
    // 5. MÔ HÌNH TRÁI ĐẤT ĐA THÀNH PHẦN (NGHIÊNG 23°27' CỐ ĐỊNH)
    // ========================
    const earthRoot = new THREE.Group();
    scene.add(earthRoot);

    // Nhóm nghiêng trục cố định trong không gian: cực Bắc nghiêng sang +X (23.44°)
    const earthTiltGroup = new THREE.Group();
    earthTiltGroup.rotation.z = -ASTRONOMY_CONFIG.AXIAL_TILT_RAD;
    earthRoot.add(earthTiltGroup);

    // Nhóm tự quay quanh trục Y địa phương
    const earthSpinGroup = new THREE.Group();
    earthTiltGroup.add(earthSpinGroup);

    const R = ASTRONOMY_CONFIG.EARTH_RADIUS;
    const proceduralEarthTex = createProceduralEarthTexture();
    const nightLightsTex = createNightLightsTexture();

    const earthMat = new THREE.MeshStandardMaterial({
      map: proceduralEarthTex,
      bumpScale: 0.04,
      roughness: 0.68,
      metalness: 0.05,
    });
    const earthSphere = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), earthMat);
    earthSpinGroup.add(earthSphere);

    // Lớp đèn thành phố ban đêm (chỉ hiện ở nửa tối nhờ ShaderMaterial)
    const nightShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uNightMap: { value: nightLightsTex },
        uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uNightMap;
        uniform vec3 uSunDir;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          float sunDot = dot(normalize(vWorldNormal), normalize(uSunDir));
          float nightMask = smoothstep(0.08, -0.22, sunDot);
          vec3 lights = texture2D(uNightMap, vUv).rgb;
          gl_FragColor = vec4(lights * 1.15, nightMask * 0.85);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nightLightsMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.004, 48, 36), nightShaderMat);
    earthSpinGroup.add(nightLightsMesh);

    // Khí quyển xanh mỏng quanh Trái Đất
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const atmoMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.055, 48, 36), atmoMat);
    earthSpinGroup.add(atmoMesh);

    // Tải texture Blue Marble & Topology thật (tự nâng cấp mượt nếu online)
    loadPublicEarthTextures(
      renderer.capabilities.getMaxAnisotropy(),
      (tex) => {
        earthMat.map = tex;
        earthMat.needsUpdate = true;
      },
      (bump) => {
        earthMat.bumpMap = bump;
        earthMat.needsUpdate = true;
      },
      (sky) => {
        skyMat.map = sky;
        skyMat.needsUpdate = true;
      }
    );

    // Các vòng vĩ tuyến chính trên Trái Đất
    const parallelsGroup = new THREE.Group();
    parallelsGroup.add(createLatitudeRing(R * 1.012, 0, 0xef4444, false, 0.95)); // Xích đạo (đỏ)
    parallelsGroup.add(createLatitudeRing(R * 1.012, 23.44, 0xfef08a, true, 0.9)); // Chí tuyến Bắc
    parallelsGroup.add(createLatitudeRing(R * 1.012, -23.44, 0xfef08a, true, 0.9)); // Chí tuyến Nam
    parallelsGroup.add(createLatitudeRing(R * 1.012, 66.56, 0x7dd3fc, false, 0.85)); // Vòng cực Bắc
    parallelsGroup.add(createLatitudeRing(R * 1.012, -66.56, 0x7dd3fc, false, 0.85)); // Vòng cực Nam
    earthSpinGroup.add(parallelsGroup);

    // Đường trục Trái Đất (không tự quay theo spin, gắn vào TiltGroup)
    const axisGroup = new THREE.Group();
    earthTiltGroup.add(axisGroup);

    const axisGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -R * 1.75, 0),
      new THREE.Vector3(0, R * 1.75, 0),
    ]);
    const axisLine = new THREE.Line(
      axisGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 })
    );
    axisGroup.add(axisLine);

    // Mũi tên nhỏ đầu cực Bắc
    const northTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.25, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    northTip.position.y = R * 1.75;
    axisGroup.add(northTip);

    // Nhãn "Bắc" và "Nam" ở hai đầu trục
    const northEl = document.createElement('div');
    northEl.className = 'label-3d-pole px-1.5 py-0.5 rounded bg-slate-900/80 text-[11px] font-bold text-sky-200 border border-sky-400/30';
    northEl.textContent = 'Bắc';
    const northLabelObj = new CSS2DObject(northEl);
    northLabelObj.position.set(0, R * 1.98, 0);
    axisGroup.add(northLabelObj);

    const southEl = document.createElement('div');
    southEl.className = 'label-3d-pole px-1.5 py-0.5 rounded bg-slate-900/80 text-[11px] font-bold text-slate-200 border border-white/20';
    southEl.textContent = 'Nam';
    const southLabelObj = new CSS2DObject(southEl);
    southLabelObj.position.set(0, -R * 1.98, 0);
    axisGroup.add(southLabelObj);

    // Đường nét đứt thẳng đứng vuông góc mặt phẳng quỹ đạo & cung góc 23°27' (gắn vào earthRoot)
    const refAxisGroup = new THREE.Group();
    earthRoot.add(refAxisGroup);

    const vertLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -R * 1.65, 0),
      new THREE.Vector3(0, R * 1.65, 0),
    ]);
    const vertLine = new THREE.Line(
      vertLineGeo,
      new THREE.LineDashedMaterial({
        color: 0x94a3b8,
        dashSize: 0.16,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.8,
      })
    );
    vertLine.computeLineDistances();
    refAxisGroup.add(vertLine);

    // Cung tròn đánh dấu góc nghiêng 23°27'
    const arcPts: THREE.Vector3[] = [];
    const arcR = R * 1.38;
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * ASTRONOMY_CONFIG.AXIAL_TILT_RAD;
      arcPts.push(new THREE.Vector3(Math.sin(a) * arcR, Math.cos(a) * arcR, 0));
    }
    const tiltArc = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arcPts),
      new THREE.LineBasicMaterial({ color: 0xfacc15 })
    );
    refAxisGroup.add(tiltArc);

    const tiltEl = document.createElement('div');
    tiltEl.className = 'label-3d-pole text-[10px] font-semibold text-yellow-300 font-mono-num';
    tiltEl.textContent = "23°27'";
    const tiltLabelObj = new CSS2DObject(tiltEl);
    tiltLabelObj.position.set(
      Math.sin(ASTRONOMY_CONFIG.AXIAL_TILT_RAD * 0.5) * (arcR + 0.38),
      Math.cos(ASTRONOMY_CONFIG.AXIAL_TILT_RAD * 0.5) * (arcR + 0.38),
      0
    );
    refAxisGroup.add(tiltLabelObj);

    // Vòng phân chia sáng – tối (Terminator) luôn vuông góc với tia sáng Mặt Trời
    const terminatorPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const ang = (i / 96) * Math.PI * 2;
      terminatorPts.push(new THREE.Vector3(0, Math.cos(ang) * R * 1.025, Math.sin(ang) * R * 1.025));
    }
    const terminatorRing = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(terminatorPts),
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
    );
    earthRoot.add(terminatorRing);

    // ========================
    // 6. TIA SÁNG MẶT TRỜI & ĐIỂM CHIẾU THẲNG GÓC
    // ========================
    const sunRaysGroup = new THREE.Group();
    scene.add(sunRaysGroup);

    const rayLines: THREE.Line[] = [];
    const rayOffsets = [-0.95, -0.48, 0, 0.48, 0.95];
    rayOffsets.forEach((off, idx) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, off, 0),
        new THREE.Vector3(1, off, 0),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: idx === 2 ? 0xfacc15 : 0xfde68a,
        transparent: true,
        opacity: idx === 2 ? 0.95 : 0.45,
      });
      const line = new THREE.Line(geo, mat);
      rayLines.push(line);
      sunRaysGroup.add(line);
    });

    // Điểm sáng tại nơi tia Mặt Trời chiếu thẳng góc lên bề mặt Trái Đất
    const subsolarDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff066 })
    );
    sunRaysGroup.add(subsolarDot);

    // Đường nối từ tâm Mặt Trời tới tâm Trái Đất
    const centerLinkGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ]);
    const centerLinkMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.4,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.7,
    });
    const centerLinkLine = new THREE.Line(centerLinkGeo, centerLinkMat);
    scene.add(centerLinkLine);

    // ========================
    // 7. RAYCASTING CLICK TRÊN 4 MỐC TRONG KHÔNG GIAN 3D
    // ========================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return; // Tránh kích hoạt nhầm khi xoay camera

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects(
        milestoneMeshes.map((m) => m.mesh),
        false
      );
      if (hits.length > 0) {
        const id = hits[0].object.userData.milestoneId as MilestoneId | undefined;
        if (id) stateRef.current.onMilestoneClick(id);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Theo dõi thay đổi chế độ elip
    let lastElliptical = stateRef.current.isEllipticalOrbit;

    // Cập nhật kích thước theo khung chứa
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 1);
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ========================
    // 8. VÒNG LẶP ANIMATION 60 FPS
    // ========================
    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();

    const tick = () => {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();
      const s = stateRef.current;

      // Xây lại quỹ đạo nếu người dùng bật/tắt chế độ elip
      if (s.isEllipticalOrbit !== lastElliptical) {
        lastElliptical = s.isEllipticalOrbit;
        rebuildOrbitGeometry(lastElliptical);
      }

      // 1) Xử lý bay tới mốc mùa hoặc tự động chuyển động quanh Mặt Trời
      let activeDay = s.dayOfYear;
      if (flightRef.current.active) {
        flightRef.current.elapsed += delta;
        const rawT = Math.min(flightRef.current.elapsed / flightRef.current.duration, 1);
        // Cubic ease-in-out mượt mà
        const eased = rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
        activeDay = normalizeDayOfYear(flightRef.current.startDay + flightRef.current.deltaDay * eased);
        s.onDayChange(activeDay);
        if (rawT >= 1) {
          flightRef.current.active = false;
        }
      } else if (s.isPlaying) {
        // 1 năm (365 ngày) mất ~24 giây ở tốc độ 1x
        const daysPerSecond = 15.2 * s.speedMultiplier;
        activeDay = normalizeDayOfYear(activeDay + delta * daysPerSecond);
        s.onDayChange(activeDay);
      }

      // 2) Tính toạ độ Trái Đất và Mặt Trời
      const orb = getOrbitalPositions(activeDay, s.isEllipticalOrbit);
      sunGroup.position.set(orb.sunX, 0, orb.sunZ);
      earthRoot.position.set(orb.earthX, 0, orb.earthZ);

      // Tự quay quanh trục Trái Đất (1 vòng / ~3 giây)
      if (s.earthSelfRotate) {
        earthSpinGroup.rotation.y += delta * ((Math.PI * 2) / 3.2);
      }

      // 3) Hiệu ứng "thở" cho Mặt Trời & xoay nhẹ
      sunCore.rotation.y += delta * 0.18;
      const pulse = 1 + Math.sin(elapsed * 2.4) * 0.05;
      coronaSprite.scale.set(10.5 * pulse, 10.5 * pulse, 1);
      coronaSpriteMat.opacity = 0.85 + Math.sin(elapsed * 2.4) * 0.1;
      flareSprite.scale.set(16.5 * (2 - pulse * 0.95), 16.5 * (2 - pulse * 0.95), 1);

      // 4) Cập nhật hướng ánh sáng Mặt Trời -> Trái Đất (terminator chính xác)
      _sunPos.set(orb.sunX, 0, orb.sunZ);
      _earthPos.set(orb.earthX, 0, orb.earthZ);
      _sunDir.subVectors(_sunPos, _earthPos).normalize();

      sunDirLight.position.copy(_earthPos).addScaledVector(_sunDir, 22);
      sunDirLight.target.position.copy(_earthPos);
      sunDirLight.target.updateMatrixWorld();

      nightShaderMat.uniforms.uSunDir.value.copy(_sunDir);

      // Xoay vòng phân chia sáng tối (terminator) vuông góc với _sunDir
      terminatorRing.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), _sunDir);

      // 5) Cập nhật tia sáng Mặt Trời & điểm chiếu thẳng góc
      sunRaysGroup.visible = s.layers.sunRays;
      if (s.layers.sunRays) {
        const subsolarPoint = _earthPos.clone().addScaledVector(_sunDir, R * 1.02);
        subsolarDot.position.copy(subsolarPoint);

        const perpY = _upVec;
        rayOffsets.forEach((off, idx) => {
          const line = rayLines[idx];
          const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
          const start = _sunPos.clone().addScaledVector(_sunDir, -2.5).addScaledVector(perpY, off);
          const end = _earthPos.clone().addScaledVector(_sunDir, R * 0.98).addScaledVector(perpY, off);
          posAttr.setXYZ(0, start.x, start.y, start.z);
          posAttr.setXYZ(1, end.x, end.y, end.z);
          posAttr.needsUpdate = true;
        });
      }

      // Đường nối tâm Mặt Trời – Trái Đất
      centerLinkLine.visible = s.layers.connectionLines;
      if (s.layers.connectionLines) {
        const linkAttr = centerLinkLine.geometry.getAttribute('position') as THREE.BufferAttribute;
        linkAttr.setXYZ(0, orb.sunX, 0, orb.sunZ);
        linkAttr.setXYZ(1, orb.earthX, 0, orb.earthZ);
        linkAttr.needsUpdate = true;
        centerLinkLine.computeLineDistances();
      }

      // 6) Cập nhật hiển thị các lớp
      orbitGroup.visible = s.layers.orbit;
      if (orbitPlaneMesh) orbitPlaneMesh.visible = s.layers.eclipticPlane;
      if (crossLinesGroup) crossLinesGroup.visible = s.layers.connectionLines;
      axisGroup.visible = s.layers.axis;
      refAxisGroup.visible = s.layers.axis;
      parallelsGroup.visible = s.layers.parallels;
      terminatorRing.visible = s.layers.terminator;
      spaceGrid.visible = s.layers.grid;

      trailLine.visible = s.layers.trail;
      if (s.layers.trail) {
        updateTrail(activeDay, s.isEllipticalOrbit);
      }

      // 7) Cập nhật nhãn mùa (theo Bắc / Nam bán cầu) & làm sáng cung mùa hiện tại
      const curSeason = getSeasonInfoForDay(activeDay, s.hemisphere);
      const scaleMap = { small: 0.85, normal: 1.0, large: 1.18 };
      const lblScale = scaleMap[s.labelScale];

      const seasonTextMap: Record<'xuan' | 'he' | 'thu' | 'dong', string> =
        s.hemisphere === 'north'
          ? { xuan: 'mùa xuân', he: 'mùa hè', thu: 'mùa thu', dong: 'mùa đông' }
          : { xuan: 'mùa thu', he: 'mùa đông', thu: 'mùa xuân', dong: 'mùa hè' };

      (['xuan', 'he', 'thu', 'dong'] as const).forEach((k) => {
        const isCurrent = curSeason.northSeasonKey === k;
        const lbl = seasonLabels[k];
        lbl.obj.visible = s.layers.seasonLabels && s.layers.orbit;
        lbl.el.textContent = seasonTextMap[k];
        lbl.el.style.transform = `scale(${(isCurrent ? 1.16 : 1.0) * lblScale})`;
        lbl.el.classList.toggle('label-3d-season-active', isCurrent);

        if (arcMeshes) {
          const mat = arcMeshes[k].material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = isCurrent ? 1.25 : 0.35;
          mat.opacity = isCurrent ? 1 : 0.85;
        }
      });

      milestoneMeta.forEach((m) => {
        const ml = milestoneLabels[m.id];
        ml.obj.visible = s.layers.seasonLabels && s.layers.orbit;
        ml.el.style.transform = `scale(${lblScale})`;
        const isNearest = curSeason.nearestMilestone === m.id;
        ml.el.style.color = isNearest ? '#fef08a' : '#ffffff';
      });

      northLabelObj.visible = s.layers.axis;
      southLabelObj.visible = s.layers.axis;
      tiltLabelObj.visible = s.layers.axis;

      // 8) Cập nhật màu nền tối / sáng vừa phải
      (scene.background as THREE.Color).set(s.darkMode ? '#040714' : '#0b162e');

      // 9) Chuyển động camera mượt (exponential damping) khi chọn mốc / preset
      if (flightRef.current.camActive) {
        const dampFactor = 1 - Math.exp(-3.6 * delta);
        _camDesiredPos.copy(flightRef.current.camPos);
        _camTarget.copy(flightRef.current.camLook);
        camera.position.lerp(_camDesiredPos, dampFactor);
        controls.target.lerp(_camTarget, dampFactor);
        if (
          camera.position.distanceTo(_camDesiredPos) < 0.08 &&
          controls.target.distanceTo(_camTarget) < 0.08
        ) {
          flightRef.current.camActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);

      if (isSoftwareGl) {
        scheduleAfterDraw(renderer, tick, (id) => {
          frameId = id;
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    // Khởi động
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlsStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      disposeSceneObjects(scene);
      envTex.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(labelRenderer.domElement)) container.removeChild(labelRenderer.domElement);
    };
  }, [graphicsQuality]);

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#060b1c] p-8 text-center text-slate-200">
        <div className="max-w-md rounded-xl border border-blue-500/30 bg-slate-900/90 p-6">
          <h3 className="text-lg font-bold text-white">Không thể khởi tạo WebGL 3D</h3>
          <p className="mt-2 text-sm text-slate-300">
            Trình duyệt hoặc thiết bị hiện tại chưa bật tăng tốc phần cứng WebGL. Vui lòng kiểm tra cài đặt trình duyệt hoặc thử lại.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/65 px-3 py-1 text-[11px] text-slate-300 border border-white/10">
        Hình vẽ phóng đại tỷ lệ để dễ quan sát; ngoài thực tế quỹ đạo Trái Đất gần tròn (e ≈ 0,0167)
      </div>
    </div>
  );
};
