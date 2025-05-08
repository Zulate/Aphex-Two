import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
/* import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; */
import { GUI } from 'dat.gui';

const scene = new THREE.Scene();
const fov = 30;
const aspect = 2;
const near = 0.1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* const controls = new OrbitControls(camera, renderer.domElement); */

camera.position.z = 8;
camera.position.y = 4;
camera.rotation.x = -0.4;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Lights
const MainSpotlight = new THREE.SpotLight(0xffffff, 150);
MainSpotlight.position.set(0, 10, 2);
MainSpotlight.penumbra = 0.3;
MainSpotlight.castShadow = true;
MainSpotlight.angle = Math.PI / 4;
MainSpotlight.distance = 30;
MainSpotlight.decay = 2;

const dummyTarget = new THREE.Object3D();
dummyTarget.position.set(0, 0, 0);
scene.add(dummyTarget);
MainSpotlight.target = dummyTarget;
MainSpotlight.lookAt(dummyTarget.position);

// weichere Schatten
MainSpotlight.shadow.mapSize.width = 4096;
MainSpotlight.shadow.mapSize.height = 4096;
MainSpotlight.shadow.radius = 4;

scene.add(MainSpotlight);

// model laden
let desk;
const gltfLoader = new GLTFLoader();
gltfLoader.load('resources/models/basement.gltf', (gltf) => {
  desk = gltf.scene;
  scene.add(desk);
  initModelLogic(desk);
});

const glassScreen = new THREE.MeshPhysicalMaterial({
  color: 0x00ffffff,
  transparent: true,
  opacity: 0.5,
  reflectivity: 0.9,
  roughness: 0.1,
  ior: 1.6,
  transmission: 1,
  thickness: 2,
});

const screenPlane = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    mousePosition: { value: new THREE.Vector2(0.5, 0.5) },
  },
  vertexShader: `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec2 mousePosition;
    varying vec2 vUv;

    void main() {
      vec2 dist = vUv - mousePosition;
      float distFactor = length(dist) * 1.0;

      float noise = sin(vUv.y * 100.0 + time * 2.0) * 0.5 + 0.5;
      float scanlines = step(0.1, mod(vUv.y * 1000.0, 4.0));

      vec3 color = vec3(1.0, 1.0, 1.0) * (noise * distFactor);
      color *= scanlines;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.FrontSide,
  transparent: false,  // Ensure transparency is enabled for the effect
});

const material3 = new THREE.MeshStandardMaterial({ color: 0x0f0f0f });

let screenMesh;  // This will store the screen-plane mesh
const boundingBox = new THREE.Box3();  // To store the bounding box of the screen mesh

function initModelLogic(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      switch (child.name) {
        case 'glass-screen':
          child.material = glassScreen; 
          break;
        case 'screen-plane':
          child.material = screenPlane;
          screenMesh = child;  // Save the reference to the screen-plane mesh
          break;
        case 'Cube009':
          child.material = material3;
          break;
        default:
          child.material = new THREE.MeshPhysicalMaterial({ color: 0x000000 });
      }
    }
  });
}

const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3;
ground.receiveShadow = true;
scene.add(ground);

var exposure = 10.0;
camera.exposure = exposure;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = exposure;

// GUI
const gui = new GUI();
const lightSettings = {
  intensity: MainSpotlight.intensity,
  color: MainSpotlight.color.getHex(),
};

gui.add(lightSettings, 'intensity', 0, 300).onChange((value) => {
  MainSpotlight.intensity = value;
});
gui.addColor(lightSettings, 'color').onChange((value) => {
  MainSpotlight.color.set(value);
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('mousemove', (event) => {
  if (!screenMesh) return;

  // Mausposition im Normalized Device Coordinate Space (-1 bis 1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  camera.rotation.y = -(mouse.x / (window.innerWidth / 16));
  camera.rotation.z = -(mouse.x / (window.innerWidth / 32));
  camera.rotation.x = (mouse.y / (window.innerHeight / 16)) - 0.4;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(screenMesh);
  if (intersects.length > 0) {
    const point = intersects[0].point;

    // Bounding Box aufbauen und aktuelle world-space Koordinaten holen
    const bbox = new THREE.Box3().setFromObject(screenMesh);
    const size = new THREE.Vector3();
    const min = bbox.min.clone();
    bbox.getSize(size);

    // Lokale Position im Bounding Box-Raum berechnen (0–1 normalisiert)
    const localPos = point.clone().sub(min).divide(size);

    // Optional: Y umkehren, wenn Shader das erwartet
    const uvX = localPos.x;
    const uvY = 1.0 - localPos.y;

    screenPlane.uniforms.mousePosition.value.set(uvX, uvY);
  }
});

function animate() {
/*   controls.update(); */
  screenPlane.uniforms.time.value += 0.05;
  renderer.render(scene, camera);
}

animate();