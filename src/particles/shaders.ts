export const vertexShader = /* glsl */ `
  attribute float aTone;
  attribute float aGlow;
  attribute vec2 aUv;
  attribute float aSeed;
  attribute float aSpeed;

  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uLoose;       // 0 = settled shape, 1 = free swarm
  uniform vec2 uPointer;      // cursor on the z = 0 plane (world)
  uniform float uHasPointer;
  uniform vec2 uCenter;       // scene centre (world)
  uniform float uScale;       // scene height (world)
  uniform sampler2D uTitles;  // project titles, stacked vertically
  uniform float uTitleCount;
  uniform float uDotScale;    // per-scene dot size
  uniform float uGain;        // per-scene brightness

  varying vec3 vColor;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Code that types itself on the monitor, one line at a time.
  float codePixel(vec2 uv, out vec3 col) {
    float rows = 15.0;
    float y = 1.0 - uv.y;
    float line = floor(y * rows);
    float inLine = fract(y * rows);
    col = vec3(0.9);
    if (inLine < 0.22 || inLine > 0.78) return 0.0;

    float tt = mod(uTime * 1.7, rows + 5.0);
    float cur = floor(tt);
    float indent = floor(hash(vec2(line, 1.0)) * 4.0) * 0.06 * step(1.0, line);
    float len = 0.12 + hash(vec2(line, 2.0)) * 0.6;
    float typed = line < cur ? len : (line == cur ? len * fract(tt) : 0.0);
    float x = uv.x - 0.06 - indent;

    // Blinking block cursor at the end of the current line.
    if (line == cur && x > typed && x < typed + 0.025) {
      col = vec3(0.85, 0.95, 1.0);
      return step(0.5, fract(uTime * 2.0));
    }
    if (x < 0.0 || x > typed) return 0.0;

    float w = x * 15.0 + hash(vec2(line, 3.0)) * 3.0;
    float h = hash(vec2(line, floor(w)));
    col = h < 0.3 ? vec3(0.45, 0.68, 1.0)
        : h < 0.5 ? vec3(0.98, 0.55, 0.82)
        : h < 0.7 ? vec3(0.5, 0.95, 0.82)
        : vec3(0.92, 0.92, 0.88);
    return 1.0 - step(0.8, fract(w));
  }

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    vec3 deep = vec3(0.145, 0.388, 0.922);  // #2563eb
    vec3 ice = vec3(0.62, 0.80, 1.0);
    vec3 white = vec3(1.0, 0.97, 0.93);

    float tone = smoothstep(0.02, 0.85, aTone);
    float glow = aGlow;
    vec3 glowCol = mix(vec3(0.45, 0.75, 1.0), vec3(1.0, 0.93, 0.85), aSeed);

    if (aUv.x >= 0.0) {
      // Monitor pixel: code most of the time, then a project title.
      float cycle = 11.0;
      float showTitle = step(7.5, mod(uTime, cycle));
      float idx = mod(floor(uTime / cycle), uTitleCount);
      vec3 codeCol;
      float lit = codePixel(aUv, codeCol);
      float title = texture2D(uTitles, vec2(aUv.x, (aUv.y + idx) / uTitleCount)).r;
      lit = mix(lit, title, showTitle);
      codeCol = mix(codeCol, vec3(1.0, 0.95, 0.85), showTitle);
      float flicker = 0.92 + 0.08 * sin(uTime * 60.0 + aUv.y * 40.0);
      tone = mix(0.1, 0.95, lit) * flicker;
      glow = lit * 0.9;
      glowCol = codeCol;
    } else if (aUv.x < -1.5) {
      // Keyboard key: flashes when "pressed".
      float key = floor(aUv.y * 64.0);
      glow += step(0.86, hash(vec2(key, floor(uTime * 9.0)))) * 1.4;
    }

    // Sparkles: a few dots flare up for a moment.
    float sparkle = pow(max(0.0, sin(uTime * (0.4 + aSeed * 1.2) + aSeed * 628.0)), 400.0) * step(0.7, fract(aSeed * 13.7));
    glow += sparkle * 2.2;

    // Light sweep: a diagonal band of light crosses the shape every few seconds.
    vec2 rel = (position.xy - uCenter) / uScale;
    float d = dot(rel, vec2(0.83, 0.55));
    float sweep = mod(uTime * 0.5, 4.0) - 1.4;
    glow += exp(-pow((d - sweep) * 7.0, 2.0)) * 0.7 * (1.0 - uLoose);

    // Glow around the cursor.
    float dc = length(position.xy - uPointer) / uScale;
    glow += uHasPointer * exp(-dc * dc * 90.0) * 0.8 * (1.0 - uLoose);

    // In the swarm, the fastest dots streak brightest.
    glow += uLoose * smoothstep(2.0, 6.0, aSpeed / uScale) * 0.6;

    float twinkle = 0.85 + 0.15 * sin(uTime * 2.0 + aSeed * 60.0);
    float size = uSize * (0.5 + tone * 0.7);
    size = mix(size, uSize * (0.7 + aSeed * 0.6), uLoose) * (1.0 + min(glow, 2.0) * 0.35);
    gl_PointSize = size * uDotScale * uPixelRatio * twinkle / -mvPosition.z;

    vec3 base = mix(deep, mix(ice, white, smoothstep(0.55, 1.0, tone)), smoothstep(0.0, 0.55, tone));
    base = mix(base, mix(deep, ice, aSeed), uLoose * 0.7);
    float alpha = mix(0.05 + 0.95 * pow(tone, 1.6), 0.5, uLoose) * uGain;
    vColor = base * alpha + glowCol * glow * mix(uGain, 1.0, 0.5);
  }
`

export const fragmentShader = /* glsl */ `
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * core * core, 1.0);
  }
`
