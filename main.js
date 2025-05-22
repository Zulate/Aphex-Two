///////////////////////////////////////////////////////
// File: main.js
// Working: Marco Stalder, Iacopo Turano
// 
// Description: manages music player system,
//              recieves input from 3d scene
//              and plays the corresponding sound
//
///////////////////////////////////////////////////////
//
// ToDo: - Tidy up code (done)
//       - Anonymize object interactions (ongoing, need to fix ridges and ridges buttons)
//       - Add 3d interactions
//       - Finish scene
//
///////////////////////////////////////////////////////

///////////////////////////////////////////////////////
// Imports

// musicplayer.js
import { buttonsReader } from './musicplayer.js';

// three.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'dat.gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { screenPlane1 } from '/resources/shaders/screenPlane1.js';
import { screenPlane2 } from '/resources/shaders/screenPlane2.js';
import { vec3 } from 'three/tsl';
import { DirectionalLight, Vector3 } from 'three/webgpu';

/* import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; */

///////////////////////////////////////////////////////
// Global variables

// Scene
const scene = new THREE.Scene();
const fov = 35;
const aspect = 2;
const near = 1;
const far = 30;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
const renderer = new THREE.WebGLRenderer();

camera.position.set(0, 8, 2); // x y z 

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
renderer.shadowMap.enabled = true;
renderer.shadowMap.autoUpdate = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);

/* renderer.setPixelRatio(window.devicePixelRatio * 0.4); */
/* const controls = new OrbitControls(camera, renderer.domElement); */

// Lights
const MainSpotlight = new THREE.SpotLight(0xffffff, 150);
MainSpotlight.position.set(0, 15, 2);
MainSpotlight.angle = Math.PI / 4;
MainSpotlight.distance = 30;
MainSpotlight.decay = 1.5;

MainSpotlight.penumbra = 0.3;
MainSpotlight.castShadow = true;
MainSpotlight.shadow.mapSize.set(1024, 1024);
MainSpotlight.shadow.radius = 0;
MainSpotlight.shadow.normalBias = 0.05;

console.log(renderer.shadowMap);

scene.add(MainSpotlight);

// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Camera Target
const cameraTarget = new THREE.Object3D();
cameraTarget.position.set(0, 2.5, -10);
let lastTargetY = cameraTarget.position.y;
let lastTargetX = cameraTarget.position.x;
let lastTargetZ = cameraTarget.position.z;

camera.lookAt(cameraTarget.position);
MainSpotlight.lookAt(cameraTarget.position);

// Mouse
const mouse = new THREE.Vector2();

// Camera positions
let oldPosition = cameraTarget.position;
let newPosition = cameraTarget.position;

// Ppostprocessing
const renderScene = new RenderPass(scene, camera);

var strength = 0.6;
var radius = 1.2;
var threshold = 0.5;

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  strength, // strength
  radius, // radius
  threshold // threshold
);

// Composer
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.renderTarget1.samples = 16;
composer.renderTarget2.samples = 16;
composer.addPass(bloomPass);

// 3D interactive objects
let screenMesh;  // This will store the screen-plane mesh
let Keys1;
let Keys2;
let Keys3;
let Ridges1;
let Ridges1Buttons;
let Ridges2;
let Ridges2Buttons;

const interactiveObjects = [];

///////////////////////////////////////////////////////
// Loading models and textures

// Ground
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3;
scene.add(ground);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 3;

// Desk
let desk;
const gltfLoader = new GLTFLoader();
gltfLoader.load('resources/models/basement.gltf', (gltf) => {
  desk = gltf.scene;
  scene.add(desk);
  initModelLogic(desk);
  console.log(gltf.scene);
});

// Glass
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

// Video
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

// GUI
const gui = new GUI();
let shaderSelect = 0;
const shaderMaterials = [screenPlane, screenPlane1, screenPlane2];
const lightSettings = {
  intensity: MainSpotlight.intensity,
  lightColor: MainSpotlight.color.getHex(),
  exposure: renderer.toneMappingExposure,
  bloomStrenght: bloomPass.strength,
  bloomRadius: bloomPass.radius,
  bloomThreshold: bloomPass.threshold,
  selectShader: shaderSelect,
};

///////////////////////////////////////////////////////
// Functions

//----------------------------------------------------
function initModelLogic(model)
//----------------------------------------------------
{
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
          interactiveObjects.push(Keys1);
        break;
        case 'Keys-2':
          Keys2 = child;
          interactiveObjects.push(Keys2);
        break;
        case 'Keys-3':
          Keys3 = child;
          interactiveObjects.push(Keys3);
        break;
        case 'ridges-1':
          Ridges1 = child;
          interactiveObjects.push(Ridges1);
        break;
        case 'ridges-1-buttons':
          Ridges1Buttons = child;
          interactiveObjects.push(Ridges1Buttons);
        break;
        case 'ridges-2':
          Ridges2 = child;
          interactiveObjects.push(Ridges2);
        break;
        case 'ridges-2-buttons':
          Ridges2Buttons = child;
          interactiveObjects.push(Ridges2Buttons);
        break;
        default:
          if(child.material.name === '') {
            child.material = new THREE.MeshStandardMaterial({ color: 0x0f0f0f });
          }
          break;
      }
    }
  });

  console.log(interactiveObjects);
}

//----------------------------------------------------
function animate() 
//----------------------------------------------------
{
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

///////////////////////////////////////////////////////
// Events

// Event-Listeners
//----------------------------------------------------
window.addEventListener('resize', () => 
//----------------------------------------------------  
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  composer.setSize(window.innerWidth, window.innerHeight);
});

const raycaster = new THREE.Raycaster();

//----------------------------------------------------
renderer.domElement.addEventListener('mousemove', (event) => 
//----------------------------------------------------  
{
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

  interactiveObjects.forEach((object) => {
    if(objectRayCaster.intersectObject(object).length > 0) {
      object.material.color.set(0xff0000);
    } else {
      object.material.color.set(0xffffff);
    }
  });

/*
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
  }else if(objectRayCaster.intersectObject(Ridges1).length > 0 || objectRayCaster.intersectObject(Ridges1Buttons).length > 0) {
    Ridges1.material.color.set(0xff0000);
    Ridges1Buttons.material.color.set(0xff0000);
  }else if (objectRayCaster.intersectObject(Ridges2).length > 0 || objectRayCaster.intersectObject(Ridges2Buttons).length > 0) {
    Ridges2.material.color.set(0xff0000);
    Ridges2Buttons.material.color.set(0xff0000);
  }else {
    Keys1.material.color.set(0xffffff);
    Keys2.material.color.set(0xffffff);
    Keys3.material.color.set(0xffffff);
    Ridges1.material.color.set(0x000000);
    Ridges2.material.color.set(0x000000);
  }*/
});

renderer.domElement.addEventListener('click', (event) => {
  const objectRayCaster = new THREE.Raycaster();
  objectRayCaster.setFromCamera(mouse, camera);

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;


  if(objectRayCaster.intersectObject(Keys1).length > 0) {
    buttonsReader(Keys1.name);
  } else if(objectRayCaster.intersectObject(Keys2).length > 0) {
    buttonsReader(Keys2.name);
  } else if(objectRayCaster.intersectObject(Keys3).length > 0) {
    buttonsReader(Keys3.name);
  }else {
    console.log("Nothing clicked");
  }
});

//----------------------------------------------------
document.getElementById('pan-left').addEventListener('click', () => 
//----------------------------------------------------  
{
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

//----------------------------------------------------
document.getElementById('pan-right').addEventListener('click', () => 
//----------------------------------------------------  
{
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

//----------------------------------------------------
gui.add(lightSettings, 'intensity', 0, 300).onChange((value) => 
//----------------------------------------------------  
{
  MainSpotlight.intensity = value;
});

//----------------------------------------------------
gui.add(lightSettings, 'exposure', 0, 100).onChange((value) => 
//----------------------------------------------------
{
  renderer.toneMappingExposure = value;
});

//----------------------------------------------------
gui.add(lightSettings, 'selectShader', 0, 2,1).onChange((value) => 
//----------------------------------------------------  
{
  shaderSelect = value;
  screenMesh.material = shaderMaterials[shaderSelect];
});

//----------------------------------------------------
gui.addColor(lightSettings, 'lightColor').onChange((value) => 
//----------------------------------------------------  
{
  MainSpotlight.color.set(value);
});

const bloomFolder = gui.addFolder('Bloom Einstellungen');
//----------------------------------------------------
bloomFolder.add(lightSettings, 'bloomStrenght', 0, 2).onChange((value) => 
//----------------------------------------------------  
{
  bloomPass.strength = value;
});

//----------------------------------------------------
bloomFolder.add(lightSettings, 'bloomRadius', 0, 2).onChange((value) => 
//----------------------------------------------------  
{
  bloomPass.radius = value;
});

//----------------------------------------------------
bloomFolder.add(lightSettings, 'bloomThreshold', 0, 1).onChange((value) => 
//----------------------------------------------------  
{
  bloomPass.threshold = value;
});