export const vertexShader = /* glsl */ `
  attribute float aTone;
  attribute float aEdge;
  attribute float aSeed;

  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uLoose; // 0 = portrait, 1 = free swarm

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float twinkle = 0.85 + 0.15 * sin(uTime * 2.0 + aSeed * 60.0);
    // Halftone: bright pixels → big, bright dots; dark pixels → small, dim, blue.
    // Contours (hair strands, glasses frame) glow too, so dark hair still reads.
    float tone = smoothstep(0.04, 0.95, max(aTone, aEdge * 0.7));
    float size = uSize * (0.5 + tone * 0.7 + aEdge * 0.2);
    size = mix(size, uSize * (0.7 + aSeed * 0.6), uLoose);
    gl_PointSize = size * uPixelRatio * twinkle / -mvPosition.z;

    vec3 deep = vec3(0.145, 0.388, 0.922);  // #2563eb
    vec3 ice = vec3(0.62, 0.80, 1.0);
    vec3 white = vec3(1.0, 0.97, 0.93);
    vec3 portrait = mix(deep, mix(ice, white, smoothstep(0.55, 1.0, tone)), smoothstep(0.0, 0.55, tone));
    vec3 swarm = mix(deep, ice, aSeed);
    vColor = mix(portrait, swarm, uLoose * 0.7);
    vAlpha = mix(0.24 + 0.76 * tone * tone, 0.8, uLoose);
  }
`

export const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor, vAlpha * core * core);
  }
`
