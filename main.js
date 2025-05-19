import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'dat.gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { screenPlane1 } from './resources/shaders/screenPlane1.js';
import { screenPlane2 } from './resources/shaders/screenPlane2.js';
import { outline } from 'three/examples/jsm/tsl/display/OutlineNode.js';
import { vec3 } from 'three/tsl';
import { Vector3 } from 'three/webgpu';

/* import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; */

const scene = new THREE.Scene();
const fov = 35;
const aspect = 2;
const near = 0.1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
/* renderer.setPixelRatio(window.devicePixelRatio * 1.5); */

/* const controls = new OrbitControls(camera, renderer.domElement); */

camera.position.set(0, 8, 2); /* x y z */

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Lights
const MainSpotlight = new THREE.SpotLight(0xffffff, 175);
MainSpotlight.position.set(0, 15, 2);
MainSpotlight.penumbra = 0.1;
MainSpotlight.castShadow = true;
MainSpotlight.angle = Math.PI / 4;
MainSpotlight.distance = 100;
MainSpotlight.decay = 1.5;

const dummyTarget = new THREE.Object3D();
dummyTarget.position.set(0, 0, 0);
scene.add(dummyTarget);
MainSpotlight.target = dummyTarget;
MainSpotlight.lookAt(dummyTarget.position);

const cameraTarget = new THREE.Object3D();
cameraTarget.position.set(0, 2.5, -10);
let lastTargetY = cameraTarget.position.y;
let lastTargetX = cameraTarget.position.x;
let lastTargetZ = cameraTarget.position.z;
camera.lookAt(cameraTarget.position);

// weichere Schatten
MainSpotlight.shadow.mapSize.width = 4096;
MainSpotlight.shadow.mapSize.height = 4096;
MainSpotlight.shadow.radius = 4;

scene.add(MainSpotlight);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

// model laden
let desk;
const gltfLoader = new GLTFLoader();
gltfLoader.load('resources/models/basement.gltf', (gltf) => {
  desk = gltf.scene;
  scene.add(desk);
  initModelLogic(desk);
  console.log(gltf.scene);
});

const glassRoughnessTexture = new THREE.TextureLoader().load('resources/textures/shader-1-displacement.jpg');

const glassScreen = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 1,
  reflectivity: 0.5,
  roughness: 0.2,
  ior: 2,
  transmission: 1,
  thickness: 0.5,
});

// Videotextur laden
const video = document.createElement('video');
video.src = 'resources/textures/catjam-texture-2.mp4'; // Pfad zum Video
video.crossOrigin = 'anonymous';
video.loop = true;
video.muted = true;
video.play();

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBFormat;

// Displacement-Map laden (z. B. Noise-Textur)
const displacementTexture = new THREE.TextureLoader().load('resources/textures/shader-1-displacement.jpg');

const screenPlane = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    mousePosition: { value: new THREE.Vector2(0.5, 0.5) },
    videoTexture: { value: videoTexture },
    displacementMap: { value: displacementTexture },
    displacementStrength: { value: 0.1 }
  },
  vertexShader: `
    varying vec2 vUv;
    uniform sampler2D displacementMap;
    uniform float time;
    uniform float displacementStrength;
    uniform vec2 mousePosition;

    void main() {
      vUv = uv;

      // Hole Displacement-Value aus Noise-Textur
      float displacement = texture2D(displacementMap, uv + vec2(time * 0.01, 0.0)).r;

      // Mausinteraktion einbeziehen
      float mouseDist = distance(uv, mousePosition);
      float mouseEffect = smoothstep(0.3, 0.0, mouseDist);

      // Wellenbewegung + Mausinteraktion
      float wave = sin(uv.y * 20.0 + time * 0.5);

      vec3 displacedPosition = position + normal * displacement * displacementStrength * (1.0 + wave * 0.2 + mouseEffect * 2.0);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D videoTexture;
    uniform vec2 mousePosition;
    uniform float time;
    varying vec2 vUv;

    void main() {
      // Wellenartige Verzerrung der UVs
      vec2 uvDistorted = vUv + 0.01 * vec2(
        sin(vUv.y * 30.0 + time * 0.3),
        cos(vUv.x * 30.0 + time * 0.2)
      );

      // Video-Textur abrufen
      vec3 videoColor = texture2D(videoTexture, uvDistorted).rgb;

      // Leichte Betonung um Maus
      float mouseDist = distance(vUv, mousePosition);
      float glow = smoothstep(0.2, 0.0, mouseDist);
      vec3 mouseHighlight = vec3(0.3, 1.0, 0.3) * glow;

      // Farbmanipulation und Kontrastanhebung
      vec3 finalColor = videoColor * 2.5 + mouseHighlight;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  side: THREE.DoubleSide,
  transparent: false,
});

let screenMesh;  // This will store the screen-plane mesh
let Keys1;
let Keys2;
let Keys3;

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
        case 'Keys-1':
          Keys1 = child;
        break;
        case 'Keys-2':
          Keys2 = child;
        break;
        case 'Keys-3':
          Keys3 = child;
        break;
        default:
          if(child.material.name === '') {
            child.material = new THREE.MeshStandardMaterial({ color: 0x0f0f0f });
          }
          break;
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

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 10;

// Event-Listeners
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  composer.setSize(window.innerWidth, window.innerHeight);
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('mousemove', (event) => {
  if (!screenMesh) return;

  // Mausposition im Normalized Device Coordinate Space (-1 bis 1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  newPosition.x = lastTargetX + (mouse.x / (window.innerWidth) * 200);
  newPosition.y = lastTargetY + (mouse.y / (window.innerHeight) * 200);
  

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
    const uvX = 1.0 - localPos.x;
    const uvY = localPos.y;

    screenPlane.uniforms.mousePosition.value.set(uvX, uvY);
    screenPlane1.uniforms.mousePosition.value.set(uvX, uvY);
    screenPlane2.uniforms.mousePosition.value.set(uvX, uvY);
  }

  // interaction raycaster

  const objectRayCaster = new THREE.Raycaster();
  objectRayCaster.setFromCamera(mouse, camera);

  if(objectRayCaster.intersectObject(Keys1).length > 0) {
    Keys1.material.color.set(0xff0000);
    Keys2.material.color.set(0xffffff);
    Keys3.material.color.set(0xffffff);
  } else if(objectRayCaster.intersectObject(Keys2).length > 0) {
    Keys1.material.color.set(0xffffff);
    Keys2.material.color.set(0xff0000);
    Keys3.material.color.set(0xffffff);
  } else if(objectRayCaster.intersectObject(Keys3).length > 0) {
    Keys1.material.color.set(0xffffff);
    Keys2.material.color.set(0xffffff);
    Keys3.material.color.set(0xff0000);
  }else {
    Keys1.material.color.set(0xffffff);
    Keys2.material.color.set(0xffffff);
    Keys3.material.color.set(0xffffff);
  }
});




// changig cameraTarget position
let oldPosition = cameraTarget.position;
let newPosition = cameraTarget.position;

document.getElementById('pan-left').addEventListener('click', () => {
  if(lastTargetX === 0){
    oldPosition = cameraTarget.position;
    newPosition = new Vector3(-4, 5, 0.5);
    lastTargetX = newPosition.x;
    lastTargetZ = newPosition.z;
    lastTargetY = newPosition.y;
    console.log("kamera hat nach links bewegt");
  } else if (lastTargetX === 4) {
    oldPosition = cameraTarget.position;
    newPosition = new Vector3(0, 2.5, -10);
    lastTargetX = newPosition.x;
    lastTargetZ = newPosition.z;
    lastTargetY = newPosition.y;
    console.log("kamera hat nach mitte bewegt");
  } else{
    console.log("nichts passiert");
  }
})

document.getElementById('pan-right').addEventListener('click', () => {
  if(lastTargetX === 0){
    oldPosition = cameraTarget.position;
    newPosition = new Vector3(4, 5, 0.5);
    lastTargetX = newPosition.x;
    lastTargetZ = newPosition.z;
    lastTargetY = newPosition.y;
    console.log("kamera hat nach rechts bewegt");

  } else if (lastTargetX === -4) {
    oldPosition = cameraTarget.position;
    newPosition = new Vector3(0, 2.5, -10);
    lastTargetX = newPosition.x;
    lastTargetZ = newPosition.z;
    lastTargetY = newPosition.y;
    console.log("kamera hat nach mitte bewegt");

  } else{
    console.log("nichts passiert");
  }
})

// Setup for postprocessing
const renderScene = new RenderPass(scene, camera);

var strength = 0.6;
var radius = 1.5;
var threshold = 0.5;

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  strength, // strength
  radius, // radius
  threshold // threshold
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);


let shaderSelect = 0;
const shaderMaterials = [screenPlane, screenPlane1, screenPlane2];

// GUI
const gui = new GUI();
const lightSettings = {
  intensity: MainSpotlight.intensity,
  lightColor: MainSpotlight.color.getHex(),
  exposure: renderer.toneMappingExposure,
  bloomStrenght: bloomPass.strength,
  bloomRadius: bloomPass.radius,
  bloomThreshold: bloomPass.threshold,
  selectShader: shaderSelect,
};

gui.add(lightSettings, 'intensity', 0, 300).onChange((value) => {
  MainSpotlight.intensity = value;
});
gui.add(lightSettings, 'exposure', 0, 100).onChange((value) => {
  renderer.toneMappingExposure = value;
});

gui.add(lightSettings, 'selectShader', 0, 2,1).onChange((value) => {
  shaderSelect = value;
  screenMesh.material = shaderMaterials[shaderSelect];
});

gui.addColor(lightSettings, 'lightColor').onChange((value) => {
  MainSpotlight.color.set(value);
});

const bloomFolder = gui.addFolder('Bloom Einstellungen');
bloomFolder.add(lightSettings, 'bloomStrenght', 0, 2).onChange((value) => {
  bloomPass.strength = value;
});
bloomFolder.add(lightSettings, 'bloomRadius', 0, 2).onChange((value) => {
  bloomPass.radius = value;
});
bloomFolder.add(lightSettings, 'bloomThreshold', 0, 1).onChange((value) => {
  bloomPass.threshold = value;
});


function animate() {
  cameraTarget.position.lerpVectors(oldPosition, newPosition, 0.05);
/*   controls.update(); */
  camera.lookAt(cameraTarget.position);
  const currentTime = performance.now() * 0.001;
  screenPlane.uniforms.time.value = currentTime;
  screenPlane1.uniforms.time.value = currentTime;
  screenPlane2.uniforms.time.value = currentTime;
  composer.render();

}

animate();