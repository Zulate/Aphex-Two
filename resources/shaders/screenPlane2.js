import * as THREE from 'three';

export const displacementTexture = new THREE.TextureLoader().load('resources/textures/shader-1-displacement.jpg');

export const screenPlane2 = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    mousePosition: { value: new THREE.Vector2(0.5, 0.5) },
    displacementMap: { value: displacementTexture },
    displacementStrength: { value: 0.2 }
  },
  vertexShader: `
    varying vec2 vUv;
    uniform sampler2D displacementMap;
    uniform float time;
    uniform float displacementStrength;
    uniform vec2 mousePosition;

    void main() {
      vUv = uv;

      vec4 disp = texture2D(displacementMap, uv);
      float displacement = disp.r;

      // Abstand zur Mausposition im UV-Space
      float mouseDist = distance(vUv, mousePosition);
      float mouseInfluence = smoothstep(0.5, 0.0, mouseDist);

      // Kombination aus Wave und Mausdistanz
      float wave = sin(uv.y * 10.0 + time * 2.0);
      float totalDisplacement = displacement * (0.5 + 0.1 * mouseInfluence) * wave;

      vec3 newPosition = position + normal * displacementStrength * totalDisplacement;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec2 mousePosition;
    varying vec2 vUv;

    void main() {
      vec2 dist = vUv - mousePosition;
      float distFactor = 1.0 - smoothstep(0.0, 0.5, length(dist));

      float wave = sin((vUv.x + time * 0.05) * 40.0) * 10.0 + 2.5;

      // Grundfarbe leicht entsättigt mit dunklerem Grünton
      vec3 baseColor = vec3(0, 0, 0) + wave * 0.1;

      // Highlight durch Mausnähe in hellem Grün
      vec3 mouseGlow = vec3(0.3, 1.0, 0.3) * pow(distFactor, 10.0);

      // Kontrast über Aufhellung und Abdunklung
      vec3 finalColor = mix(baseColor, mouseGlow, distFactor);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  side: THREE.FrontSide,
  transparent: false,
});