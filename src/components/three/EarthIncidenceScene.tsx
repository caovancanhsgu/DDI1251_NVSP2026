import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import type { MilestoneId, SceneLayers } from '../../types/geography';
import { formatLatitude, getSolarDeclination } from '../../utils/astronomy';
import {
  createGalaxyBackdropTexture,
  createNightLightsTexture,
  createProceduralEarthTexture,
  loadPublicEarthTextures,
} from '../../utils/textures';
import {
  applyStudioEnvironment,
  createConfiguredRenderer,
  disposeSceneObjects,
  scheduleAfterDraw,
} from '../../utils/threeSetup';

interface EarthIncidenceSceneProps {
  dayOfYear: number;
  selectedMilestone: MilestoneId | null;
  earthSelfRotate: boolean;
  layers: SceneLayers;
  labelScale: 'small' | 'normal' | 'large';
  graphicsQuality: 'high' | 'standard';
  darkMode: boolean;
}

const EARTH_R = 2.55;

function createLatitudeCircle(
  radius: number,
  latDeg: number,
  color: number,
  dashed = false
): THREE.Line {
  const latRad = (latDeg * Math.PI) / 180;
  const r = radius * Math.cos(latRad);
  const y = radius * Math.sin(latRad);
  const segs = 128;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  if (dashed) {
    const mat = new THREE.LineDashedMaterial({
      color,
      dashSize: 0.2,
      gapSize: 0.14,
      transparent: true,
      opacity: 0.92,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    return line;
  }
  return new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.96 })
  );
}

/**
 * Tạo mũi tên nhỏ hướng sang trái (-X) cho tia sáng Mặt Trời
 */
function createLeftArrowHead(x: number, y: number, z: number): THREE.Mesh {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.042, 0.14, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  cone.position.set(x, y, z);
  cone.rotation.z = Math.PI / 2; // Đỉnh hướng sang trái (-X)
  return cone;
}

export const EarthIncidenceScene: React.FC<EarthIncidenceSceneProps> = ({
  dayOfYear,
  earthSelfRotate,
  layers,
  labelScale,
  graphicsQuality,
  darkMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);

  const stateRef = useRef({
    dayOfYear,
    earthSelfRotate,
    layers,
    labelScale,
    darkMode,
  });
  stateRef.current = { dayOfYear, earthSelfRotate, layers, labelScale, darkMode };

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

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.left = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02040a');
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      38,
      Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
      0.1,
      200
    );
    // Đặt camera hơi dịch phải để tia sáng ngang từ cạnh phải màn hình trải dài rõ ràng
    camera.position.set(1.2, 0.05, 10.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 5.5;
    controls.maxDistance = 18;
    controls.target.set(1.2, 0, 0);

    // 1. NỀN SAO VŨ TRỤ SẮC NÉT
    const skyTex = createGalaxyBackdropTexture();
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(95, 32, 24), skyMat));

    const starCount = 1100;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 35 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(
      new THREE.Points(
        starsGeo,
        new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.14, transparent: true, opacity: 0.9 })
      )
    );

    // 2. ÁNH SÁNG MẶT TRỜI CHIẾU NGANG TỪ PHẢI (+X -> -X)
    const hemi = new THREE.HemisphereLight(0x3b82f6, 0x050814, 0.22);
    scene.add(hemi);
    const sunDirLight = new THREE.DirectionalLight(0xfff8e8, 3.0);
    sunDirLight.position.set(25, 0, 0);
    scene.add(sunDirLight);

    // 3. QUẢ ĐỊA CẦU NGHIÊNG THEO XÍCH VĨ HIỆN TẠI
    const earthTiltGroup = new THREE.Group();
    scene.add(earthTiltGroup);

    const earthSpinGroup = new THREE.Group();
    earthTiltGroup.add(earthSpinGroup);

    const earthMat = new THREE.MeshStandardMaterial({
      map: createProceduralEarthTexture(),
      bumpScale: 0.04,
      roughness: 0.62,
      metalness: 0.04,
    });
    earthSpinGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 72, 56), earthMat));

    // Đèn thành phố ban đêm trên nửa tối bên trái
    const nightTex = createNightLightsTexture();
    const nightMat = new THREE.ShaderMaterial({
      uniforms: {
        uNightMap: { value: nightTex },
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
          float nightMask = smoothstep(0.06, -0.22, sunDot);
          vec3 lights = texture2D(uNightMap, vUv).rgb;
          gl_FragColor = vec4(lights * 1.1, nightMask * 0.75);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    earthSpinGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.003, 48, 36), nightMat));

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

    // Các vòng vĩ tuyến nổi bật giống ảnh mẫu mozaik3D
    const parallelsGroup = new THREE.Group();
    parallelsGroup.add(createLatitudeCircle(EARTH_R * 1.008, 0, 0xff1e1e, false)); // Xích đạo đỏ tươi
    parallelsGroup.add(createLatitudeCircle(EARTH_R * 1.008, 23.44, 0xffffff, true)); // Chí tuyến Bắc nét đứt trắng
    parallelsGroup.add(createLatitudeCircle(EARTH_R * 1.008, -23.44, 0xffffff, true)); // Chí tuyến Nam nét đứt trắng
    parallelsGroup.add(createLatitudeCircle(EARTH_R * 1.008, 66.56, 0x94a3b8, true)); // Vòng cực Bắc
    parallelsGroup.add(createLatitudeCircle(EARTH_R * 1.008, -66.56, 0x94a3b8, true)); // Vòng cực Nam
    earthSpinGroup.add(parallelsGroup);

    // Trục Trái Đất nét liền trắng + chấm vàng ở cực
    const axisGroup = new THREE.Group();
    earthTiltGroup.add(axisGroup);

    const axisLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -EARTH_R * 1.65, 0),
        new THREE.Vector3(0, EARTH_R * 1.65, 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xffffff })
    );
    axisGroup.add(axisLine);

    const poleDotMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const northDot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), poleDotMat);
    northDot.position.y = EARTH_R * 1.005;
    axisGroup.add(northDot);
    const southDot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), poleDotMat);
    southDot.position.y = -EARTH_R * 1.005;
    axisGroup.add(southDot);

    // Đường phân chia sáng - tối (Terminator) thẳng đứng ở x = 0
    const termPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      termPts.push(new THREE.Vector3(0, Math.cos(a) * EARTH_R * 1.012, Math.sin(a) * EARTH_R * 1.012));
    }
    const terminatorRing = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(termPts),
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.75 })
    );
    scene.add(terminatorRing);

    // 4. NHÓM TIA SÁNG MẶT TRỜI SONG SONG TỪ PHẢI & KÝ HIỆU GÓC TỚI
    const raysRoot = new THREE.Group();
    scene.add(raysRoot);

    const angleLabels: CSS2DObject[] = [];

    const rebuildRaysForDeclination = (declDeg: number) => {
      // Xoá tia cũ
      while (raysRoot.children.length > 0) {
        const child = raysRoot.children[0];
        raysRoot.remove(child);
        disposeSceneObjects(child);
      }
      angleLabels.forEach((lbl) => {
        if (lbl.element.parentNode) lbl.element.parentNode.removeChild(lbl.element);
      });
      angleLabels.length = 0;

      // 5 vĩ độ tiêu biểu trên bán cầu chiếu sáng
      const targets: { lat: number; name: string }[] = [
        { lat: 66.56, name: "Vòng cực Bắc" },
        { lat: 23.44, name: "Chí tuyến Bắc" },
        { lat: 0, name: "Xích đạo" },
        { lat: -23.44, name: "Chí tuyến Nam" },
        { lat: -66.56, name: "Vòng cực Nam" },
      ];

      // Nếu cực Bắc hoặc cực Nam nằm sâu trong vùng chiếu sáng 24h, thêm tia tại cực
      if (declDeg > 12) targets.unshift({ lat: 90, name: 'Cực Bắc' });
      if (declDeg < -12) targets.push({ lat: -90, name: 'Cực Nam' });

      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
      const rayRightStart = 12.5;

      targets.forEach((t) => {
        // Khi earthTiltGroup.rotation.z = -declRad:
        // điểm tại vĩ độ lat nằm ở góc alpha = lat - declDeg trên mép phải
        let alphaDeg = t.lat - declDeg;
        if (Math.abs(alphaDeg) > 90.5) return; // Đang ở nửa tối
        if (Math.abs(alphaDeg) > 88.2) {
          alphaDeg = 88.2 * Math.sign(alphaDeg); // Tia tiếp tuyến sát mép cực sáng
        }

        const alpha = (alphaDeg * Math.PI) / 180;
        const hx = EARTH_R * Math.cos(alpha);
        const hy = EARTH_R * Math.sin(alpha);

        const isPerpendicular = Math.abs(alphaDeg) < 1.2;
        const incidenceDeg = Math.max(0, 90 - Math.abs(t.lat - declDeg));

        // 1) Vẽ bó 3 tia mũi tên song song nằm ngang từ cạnh phải tới gần bề mặt Trái Đất
        const bundleGap = 0.085;
        const offsets = [-bundleGap, 0, bundleGap];
        const arrowStopX = hx + 0.54;

        offsets.forEach((dy) => {
          const yPos = hy + dy;
          const pts = [new THREE.Vector3(rayRightStart, yPos, 0.04), new THREE.Vector3(arrowStopX, yPos, 0.04)];
          raysRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
          raysRoot.add(createLeftArrowHead(arrowStopX - 0.04, yPos, 0.04));
        });

        // 2) Vẽ ký hiệu góc tới (tiếp tuyến + cung góc hoặc ký hiệu góc vuông có chấm ở giữa)
        const symbolLen = 0.44;
        if (isPerpendicular) {
          // Ký hiệu góc vuông 90° kèm dấu chấm tròn ở giữa
          const cornerPts = [
            new THREE.Vector3(hx, hy + 0.06, 0.05),
            new THREE.Vector3(hx, hy - symbolLen, 0.05),
          ];
          raysRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cornerPts), lineMat));

          const topSeg = [
            new THREE.Vector3(hx, hy, 0.05),
            new THREE.Vector3(hx + symbolLen, hy, 0.05),
          ];
          raysRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(topSeg), lineMat));

          // Cung góc vuông + chấm tròn trắng ở giữa
          const arcPts: THREE.Vector3[] = [];
          const arcR = 0.3;
          for (let i = 0; i <= 18; i++) {
            const a = -Math.PI * 0.5 + (i / 18) * Math.PI * 0.5;
            arcPts.push(new THREE.Vector3(hx + Math.cos(a) * arcR, hy + Math.sin(a) * arcR, 0.05));
          }
          raysRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), lineMat));

          const dot = new THREE.Mesh(
            new THREE.CircleGeometry(0.05, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
          );
          dot.position.set(hx + 0.13, hy - 0.13, 0.05);
          raysRoot.add(dot);
        } else {
          // Tiếp tuyến hướng về phía xích đạo chiếu sáng để tạo góc nhọn rõ ràng với tia ngang
          const sign = alphaDeg > 0 ? 1 : -1;
          const tx = Math.sin(Math.abs(alpha));
          const ty = -sign * Math.cos(alpha);

          const horizSeg = [
            new THREE.Vector3(hx, hy, 0.05),
            new THREE.Vector3(hx + symbolLen, hy, 0.05),
          ];
          const tangSeg = [
            new THREE.Vector3(hx, hy, 0.05),
            new THREE.Vector3(hx + tx * symbolLen, hy + ty * symbolLen, 0.05),
          ];
          raysRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(horizSeg), lineMat));
          raysRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(tangSeg), lineMat));

          // Cung tròn nối tia ngang (góc 0) với tiếp tuyến
          const tangAngle = Math.atan2(ty, tx);
          const arcPts: THREE.Vector3[] = [];
          const arcR = 0.28;
          for (let i = 0; i <= 16; i++) {
            const a = (i / 16) * tangAngle;
            arcPts.push(new THREE.Vector3(hx + Math.cos(a) * arcR, hy + Math.sin(a) * arcR, 0.05));
          }
          raysRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), lineMat));
        }

        // Nhãn gọn không nền che tia sáng (chỉ hiển thị vĩ tuyến & số đo góc thanh thoát)
        const lblEl = document.createElement('div');
        lblEl.className = isPerpendicular
          ? 'label-3d-milestone text-[11px] font-bold text-amber-300 font-mono-num'
          : 'label-3d-milestone text-[10px] font-semibold text-white/90 font-mono-num';
        lblEl.textContent = `${t.name} (${formatLatitude(t.lat).split(' ')[0]}) · ${incidenceDeg.toFixed(1)}°`;
        const lblObj = new CSS2DObject(lblEl);
        lblObj.position.set(hx + 2.15, hy + 0.24, 0.05);
        raysRoot.add(lblObj);
        angleLabels.push(lblObj);
      });
    };

    let lastDeclKey = -999;

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

    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();

    // Smooth interpolation của góc nghiêng trục khi chuyển mùa
    let currentTiltDeg = getSolarDeclination(stateRef.current.dayOfYear);

    const tick = () => {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const s = stateRef.current;

      const targetDecl = getSolarDeclination(s.dayOfYear);
      const damp = 1 - Math.exp(-7 * delta);
      currentTiltDeg += (targetDecl - currentTiltDeg) * damp;

      // Xoay trục Trái Đất theo góc xích vĩ (Hạ chí: cực Bắc nghiêng phải +X; Đông chí: cực Bắc nghiêng trái -X)
      earthTiltGroup.rotation.z = -(currentTiltDeg * Math.PI) / 180;

      // Khi ở Xuân phân / Thu phân (độ nghiêng theo X ~ 0), nghiêng nhẹ theo Z-axis camera để thấy rõ vĩ tuyến
      const equinoxFactor = Math.max(0, 1 - Math.abs(currentTiltDeg) / 23.44);
      earthTiltGroup.rotation.x = 0.16 * equinoxFactor;

      if (s.earthSelfRotate) {
        earthSpinGroup.rotation.y += delta * 0.45;
      }

      // Cập nhật tia sáng & ký hiệu góc tới mỗi khi độ nghiêng thay đổi > 0.15°
      if (Math.abs(currentTiltDeg - lastDeclKey) > 0.15) {
        lastDeclKey = currentTiltDeg;
        rebuildRaysForDeclination(currentTiltDeg);
      }

      // Cập nhật hiển thị các lớp
      axisGroup.visible = s.layers.axis;
      parallelsGroup.visible = s.layers.parallels;
      terminatorRing.visible = s.layers.terminator;
      raysRoot.visible = s.layers.sunRays;
      angleLabels.forEach((lbl) => {
        lbl.visible = s.layers.seasonLabels && s.layers.sunRays;
      });
      (scene.background as THREE.Color).set(s.darkMode ? '#02040a' : '#081229');

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

    if (!isSoftwareGl) renderer.compile(scene, camera);
    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      disposeSceneObjects(scene);
      envTex.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(labelRenderer.domElement)) container.removeChild(labelRenderer.domElement);
    };
  }, [graphicsQuality]);

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#02040a] text-slate-200">
        Không thể khởi tạo chế độ 3D cận cảnh.
      </div>
    );
  }

  return <div ref={containerRef} className="relative h-full w-full overflow-hidden" />;
};
