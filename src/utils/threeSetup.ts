import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Phát hiện phần mềm WebGL (SwiftShader, llvmpipe, WARP) qua chuỗi GPU renderer
 */
export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

/**
 * Khởi tạo WebGLRenderer chuẩn màu sRGB + ACESFilmic + RoomEnvironment
 */
export function createConfiguredRenderer(
  container: HTMLElement,
  quality: 'high' | 'standard' = 'high'
) {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl && quality === 'high',
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(
    isSoftwareGl ? 1 : quality === 'high' ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 1.25)
  );
  renderer.setSize(width, height);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  return { renderer, isSoftwareGl };
}

/**
 * Gắn môi trường ánh sáng studio RoomEnvironment vào scene
 */
export function applyStudioEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.25;
  pmremGenerator.dispose();
  return envTex;
}

/**
 * Đồng bộ GPU trên Software WebGL trước khi lên lịch frame tiếp theo
 */
export function scheduleAfterDraw(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  registerTimer: (id: number) => void
) {
  try {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          registerTimer(window.setTimeout(poll, 5));
        } else {
          if (sync) gl.deleteSync(sync);
          registerTimer(window.setTimeout(cb, 80));
        }
      };
      registerTimer(window.setTimeout(poll, 5));
      return;
    }
  } catch {
    // fallback
  }
  registerTimer(window.setTimeout(cb, 80));
}

/**
 * Giải phóng toàn bộ geometry, material, texture trong một Object3D
 */
export function disposeSceneObjects(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const record = m as unknown as Record<string, unknown>;
        ['map', 'bumpMap', 'emissiveMap', 'alphaMap', 'normalMap'].forEach((key) => {
          const tex = record[key];
          if (tex && typeof (tex as THREE.Texture).dispose === 'function') {
            (tex as THREE.Texture).dispose();
          }
        });
        m.dispose();
      });
    }
  });
}
