import * as THREE from 'three';
export const screenPlane1 = new THREE.ShaderMaterial({
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

      float noise = sin(vUv.y * 100.0 + time * 5.0) * 1.5 + 1.0;
      float scanlines = step(0.1, mod(vUv.y * 1000.0, 4.0));

      vec3 color = vec3(1.0, 1.0, 1.0) * (noise * distFactor);
      color *= scanlines;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.FrontSide,
  transparent: false,  // Ensure transparency is enabled for the effect
});

