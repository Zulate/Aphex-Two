import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


const scene = new THREE.Scene();
const fov = 45;
const aspect = 2;  // the canvas default
const near = 0.1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

const renderer = new THREE.WebGLRenderer();

const controls = new OrbitControls( camera, renderer.domElement );

renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshPhongMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );

let desk;
const gltfLoader = new GLTFLoader();
gltfLoader.load('resources/models/basement.gltf', (gltf) => {
  const root = gltf.scene;
  scene.add(root);
  desk = root.getObjectByName('Cube.014');
})


const skyColor = 0xB1E1FF;  // light blue
const groundColor = 0xB97A20;  // brownish orange
const intensity = 1;
const hemispherelight = new THREE.HemisphereLight(skyColor, groundColor, intensity);
scene.add(hemispherelight);

const color = 0xFFFFFF;
const intensity2 = 1;
const directional = new THREE.DirectionalLight(color, intensity2);
directional.position.set(0, 10, 0);
directional.target.position.set(-5, 0, 0);
scene.add(directional);
scene.add(directional.target);

camera.position.z = 5;

function animate() {

    if(desk){
        for (const dj of desk.children) {
          dj.rotation.y += 0.01;
          dj.rotation.x += 0.01;
          console.log("success");
        }
      }

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

  renderer.render( scene, camera );

}