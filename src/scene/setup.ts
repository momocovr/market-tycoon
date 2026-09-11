import * as THREE from 'three';
import { PALETTE } from './materials';

export interface SceneRig {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  /** Call every frame. */
  update(): void;
  /** Screen → ground-plane (y=0) hit, or null. */
  pickGround(clientX: number, clientY: number): THREE.Vector3 | null;
  raycaster: THREE.Raycaster;
  ndc(clientX: number, clientY: number): THREE.Vector2;
}

const ISO_X = -35.264 * (Math.PI / 180);
const ISO_Y = 45 * (Math.PI / 180);

export function createScene(canvas: HTMLCanvasElement): SceneRig {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const camTarget = new THREE.Vector3(0, 0, 0);
  let zoom = 14; // half-height of the view in metres

  const camOffset = new THREE.Vector3(0, 0, 60).applyEuler(new THREE.Euler(ISO_X, ISO_Y, 0, 'YXZ'));
  const applyCamera = () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -zoom * aspect; camera.right = zoom * aspect;
    camera.top = zoom; camera.bottom = -zoom;
    camera.position.copy(camTarget).add(camOffset);
    camera.lookAt(camTarget);
    camera.updateProjectionMatrix();
  };

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    applyCamera();
  };
  window.addEventListener('resize', resize);
  resize();

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, PALETTE.grass, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
  sun.position.set(18, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = 20;
  sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
  sun.shadow.camera.top = s; sun.shadow.camera.bottom = -s;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Pan (drag) & zoom (wheel / pinch). Clicks are handled by main.ts via the returned helpers.
  let dragging = false; let lastX = 0; let lastY = 0;
  const panRight = new THREE.Vector3(1, 0, -1).normalize();
  const panFwd = new THREE.Vector3(-1, 0, -1).normalize();
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !(e.buttons & 1 || e.buttons & 4 || e.pointerType === 'touch')) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    const k = (zoom * 2) / window.innerHeight;
    camTarget.addScaledVector(panRight, -dx * k).addScaledVector(panFwd, dy * k * 1.4);
    camTarget.x = THREE.MathUtils.clamp(camTarget.x, -14, 14);
    camTarget.z = THREE.MathUtils.clamp(camTarget.z, -14, 14);
    applyCamera();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom * (e.deltaY > 0 ? 1.1 : 0.9), 6, 24);
    applyCamera();
  }, { passive: false });
  let pinch = 0;
  canvas.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) { zoom = THREE.MathUtils.clamp(zoom * (pinch / d), 6, 24); applyCamera(); }
    pinch = d;
  }, { passive: true });

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndcV = new THREE.Vector2();
  const ndc = (x: number, y: number) => ndcV.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  const hit = new THREE.Vector3();

  return {
    renderer, scene, camera, raycaster, ndc,
    update() { renderer.render(scene, camera); },
    pickGround(x, y) {
      raycaster.setFromCamera(ndc(x, y), camera);
      return raycaster.ray.intersectPlane(groundPlane, hit) ? hit.clone() : null;
    },
  };
}
