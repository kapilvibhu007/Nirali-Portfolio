/* ==========================================================================
   Antigravity hero particles

   A port of the first-fold background from https://antigravity.google/.

   Canonical source, fetched and read in full before writing this:
     _astro/MainParticlesComponent.astro_astro_type_script_index_0_lang.Dox42TL8.js
     _astro/Mouse.ZrlRGzn3.js            (the `noise` GLSL chunk)

   Both simulation and render shaders below are that source's GLSL verbatim,
   as is the simplex noise (Ian McEwan / Ashima Arts) they include. The
   original runs on Three.js; this is the same system rebuilt directly on
   WebGL2 so the site keeps its no-build, no-dependency setup. What that
   replaces is only the plumbing Three was doing — GPGPU ping-pong render
   targets, the point mesh, and the camera matrices — all of which are
   reproduced here to the same numbers:

     camera      PerspectiveCamera(40deg, aspect, 0.1, 1000) at z = 3.1
     mesh        scaled 5x, positioned at the origin
     state       RGBA32F 256x256, xy = position, z = scale, w = velocity
     blending    Three's NormalBlending, premultiply off, depth test off

   Tuning is read off the live page's own data-attributes rather than the
   file's defaults, since the site overrides every one of them:
     ringWidth 0.006   ringWidth2 0.107   ringDisplacement 0.62
     density 230       particlesScale 0.59

   The interaction: particles sit on a Poisson-disc field and drift on layered
   noise. A ring tracks the cursor, and inside its band particles grow, brighten
   and are pushed outward — so the field opens up around the pointer and the
   dots streak away behind it.
   ========================================================================== */

/* Simplex noise, verbatim from the source's shared `noise` chunk. Only the 3D
   overload is called by these shaders; the 2D one comes with it. */
const AG_NOISE_GLSL = `
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}

  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
            -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  //	Simplex 3D Noise
  //	by Ian McEwan, Ashima Arts
  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    i = mod(i, 289.0 );
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 1.0/7.0; // N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

/* The simulation pass. Verbatim from the source, with SIZE substituted the way
   the original interpolates `${this.size.toFixed(1)}`. Each texel is one
   particle: xy = live position, z = scale, w = velocity. */
const AG_SIM_FRAG = (size) => `#version 300 es
precision highp float;
uniform sampler2D uPosition;
uniform sampler2D uPosRefs;
uniform vec2 uRingPos;
uniform float uTime;
uniform float uDeltaTime;
uniform float uRingRadius;

uniform float uRingWidth;
uniform float uRingWidth2;
uniform float uRingDisplacement;

out vec4 fragColor;

#define texture2D texture

${AG_NOISE_GLSL}

void main() {

    vec2 simTexCoords = gl_FragCoord.xy / vec2(${size.toFixed(1)}, ${size.toFixed(1)});
    vec4 pFrame = texture2D(uPosition, simTexCoords);

    float scale = pFrame.z;
    float velocity = pFrame.w;
    vec2 refPos = texture2D(uPosRefs, simTexCoords).xy;

    float time = uTime * .5;
    vec2 curentPos = refPos;

    vec2 pos = pFrame.xy;
    pos *= .8;

    float dist = distance(curentPos.xy, uRingPos);
    float noise0 = snoise(vec3(curentPos.xy * .2 + vec2(18.4924, 72.9744), time * 0.5));
    float dist1 = distance(curentPos.xy + (noise0 * .005), uRingPos);

    float t = smoothstep(uRingRadius - (uRingWidth * 2.), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius + uRingWidth, dist1);
    float t2 = smoothstep(uRingRadius - (uRingWidth2 * 2.), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius + uRingWidth2, dist1);
    float t3 = smoothstep(uRingRadius + uRingWidth2, uRingRadius, dist);

    t = pow(t, 2.);
    t2 = pow(t2, 3.);

    t += t2 * 3.;
    t += t3 * .4;
    t += snoise(vec3(curentPos.xy * 30. + vec2(11.4924, 12.9744), time * 0.5)) * t3 * .5;

    float nS = snoise(vec3(curentPos.xy * 2. + vec2(18.4924, 72.9744), time * 0.5));
    t += pow((nS + 1.5) * .5, 2.) * .6;

    // Mid scale noise
    float noise1 = snoise(vec3(curentPos.xy * 4. + vec2(88.494, 32.4397), time * 0.35));
    float noise2 = snoise(vec3(curentPos.xy * 4. + vec2(50.904, 120.947), time * 0.35));

    // Close scale noise
    float noise3 = snoise(vec3(curentPos.xy * 20. + vec2(18.4924, 72.9744), time * .5));
    float noise4 = snoise(vec3(curentPos.xy * 20. + vec2(50.904, 120.947), time * .5));

    vec2 disp = vec2(noise1, noise2) * .03;
    disp += vec2(noise3, noise4) * .005;

    // Sin wave
    disp.x += sin((refPos.x * 20.) + (time * 4.)) * .02 * clamp(dist, 0., 1.);
    disp.y += cos((refPos.y * 20.) + (time * 3.)) * .02 * clamp(dist, 0., 1.);

    pos -= (uRingPos - (curentPos + disp)) * pow(t2, .75) * uRingDisplacement;

    // Add scale
    float scaleDiff = t - scale;
    scaleDiff *= .2;
    scale += scaleDiff;

    // Final position
    vec2 finalPos = curentPos + disp + (pos * .25);

    velocity *= .5;
    velocity += scale * .25;

    fragColor = vec4(finalPos, scale, velocity);
}
`;

const AG_SIM_VERT = `#version 300 es
in vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

/* The point pass. Verbatim from the source; `modelViewMatrix` and
   `projectionMatrix` were supplied by Three and are passed in as uniforms
   here instead. */
const AG_RENDER_VERT = `#version 300 es
precision highp float;
in vec4 seeds;
in vec2 uv;

uniform sampler2D uPosition;
uniform float uTime;
uniform float uParticleScale;
uniform float uPixelRatio;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

out vec4 vSeeds;
out float vVelocity;
out vec2 vLocalPos;
out vec2 vScreenPos;
out float vScale;

#define texture2D texture

void main() {

    vec4 pos = texture2D(uPosition, uv);
    vSeeds = seeds;

    vVelocity = pos.w;
    vScale = pos.z;
    vLocalPos = pos.xy;
    vec4 viewSpace  = modelViewMatrix * vec4(vec3(pos.xy, 0.), 1.0);

    gl_Position = projectionMatrix * viewSpace;
    vScreenPos = gl_Position.xy;

    gl_PointSize = ((vScale * 7.) * (uPixelRatio * 0.5) * uParticleScale);
}
`;

const AG_RENDER_FRAG = `#version 300 es
precision highp float;

in vec4 vSeeds;
in vec2 vScreenPos;
in vec2 vLocalPos;
in float vScale;
in float vVelocity;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

uniform vec2 uRingPos;
uniform vec2 uRez;

uniform float uAlpha;
uniform float uTime;

uniform int uColorScheme;

out vec4 fragColor;

${AG_NOISE_GLSL}

#define PI 3.1415926535897932384626433832795

float sdRoundBox( in vec2 p, in vec2 b, in vec4 r )
{
    r.xy = (p.x>0.0)?r.xy : r.zw;
    r.x  = (p.y>0.0)?r.x  : r.y;
    vec2 q = abs(p)-b+r.x;
    return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r.x;
}

// rotate uv by angle
vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, s, -s, c);
    return m * v;
}

void main() {

    float uBorderSize = 0.2;
    vec2 center = vec2(.48, .4);
    float ratio = uRez.x / uRez.y;

    // Noise
    float noiseAngle = snoise(vec3(vLocalPos * 10. + vec2(18.4924, 72.9744), uTime * .85));
    float noiseColor = snoise(vec3(vLocalPos * 2. + vec2(74.664, 91.556), uTime * .5));
    noiseColor = (noiseColor + 1.) * .5;

    // get angle between
    float angle = atan(vLocalPos.y - uRingPos.y, vLocalPos.x - uRingPos.x);

    vec2 uv = gl_PointCoord.xy;
    uv -= vec2(0.5);
    uv.y *= -1.;
    uv = rotate(uv, -angle + (noiseAngle * .5));

    vec2 tuv = vScreenPos;
    tuv = rotate(tuv, uTime * 1.);
    tuv.y *= 1./ratio;
    tuv += .5;

    float h = 0.8; // adjust position of middleColor
    float progress = smoothstep(0., .75, pow(noiseColor, 2.));
    vec3 col = mix(mix(uColor1, uColor2, progress/h), mix(uColor2, uColor3, (progress - h)/(1.0 - h)), step(h, progress));
    vec3 color = col;

    float dist = sqrt(dot(uv, uv));

    float dr = .5;
    float t = smoothstep(dr+(uBorderSize + .0001), dr-uBorderSize, dist);
    t = clamp(t, 0., 1.);

    float rounded = sdRoundBox(uv, vec2(0.5, 0.2), vec4(.25));
    rounded = smoothstep(.1, 0., rounded);

    float a = uAlpha * rounded * smoothstep(0.1, 0.2, vScale);

    if(a < 0.01){
        discard;
    }

    color = clamp(color, 0., 1.);
    color = mix(color, color * clamp(vVelocity, 0., 1.), float(uColorScheme));

    fragColor = vec4(color, clamp(a, 0., 1.));
}
`;

/* Bridson's Poisson-disc sampling, standing in for the source's
   `poisson-disk-sampling` package. Same call shape: a 500x500 field, the same
   min/max spacing mapped from density, 20 tries per active sample. What the
   package adds over plain Bridson is a per-sample radius drawn between min
   and max, which is reproduced here — it is what keeps the field from reading
   as a regular grid. */
function agPoissonDisc(width, height, minDistance, maxDistance, tries, random) {
    const cellSize = minDistance / Math.SQRT2;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const grid = new Int32Array(cols * rows).fill(-1);
    const points = [];
    const radii = [];
    const active = [];

    function fits(x, y, radius) {
        if (x < 0 || y < 0 || x >= width || y >= height) return false;
        const cx = Math.floor(x / cellSize);
        const cy = Math.floor(y / cellSize);
        // A sample can only conflict with points within two cells, since no
        // cell holds more than one.
        const x0 = Math.max(cx - 2, 0);
        const x1 = Math.min(cx + 2, cols - 1);
        const y0 = Math.max(cy - 2, 0);
        const y1 = Math.min(cy + 2, rows - 1);
        for (let gy = y0; gy <= y1; gy++) {
            for (let gx = x0; gx <= x1; gx++) {
                const idx = grid[gy * cols + gx];
                if (idx === -1) continue;
                const dx = points[idx * 2] - x;
                const dy = points[idx * 2 + 1] - y;
                // Either sample's radius must be cleared, so take the larger.
                const need = Math.max(radius, radii[idx]);
                if (dx * dx + dy * dy < need * need) return false;
            }
        }
        return true;
    }

    function add(x, y, radius) {
        const idx = points.length / 2;
        points.push(x, y);
        radii.push(radius);
        grid[Math.floor(y / cellSize) * cols + Math.floor(x / cellSize)] = idx;
        active.push(idx);
    }

    add(width / 2, height / 2, minDistance + random() * (maxDistance - minDistance));

    while (active.length) {
        const pick = (random() * active.length) | 0;
        const idx = active[pick];
        const px = points[idx * 2];
        const py = points[idx * 2 + 1];
        const pr = radii[idx];
        let placed = false;

        for (let i = 0; i < tries; i++) {
            const angle = random() * Math.PI * 2;
            // Annulus between r and 2r, the standard Bridson choice.
            const dist = pr + random() * pr;
            const nx = px + Math.cos(angle) * dist;
            const ny = py + Math.sin(angle) * dist;
            const nr = minDistance + random() * (maxDistance - minDistance);
            if (fits(nx, ny, nr)) {
                add(nx, ny, nr);
                placed = true;
                break;
            }
        }

        if (!placed) {
            active[pick] = active[active.length - 1];
            active.pop();
        }
    }

    return points;
}

/* Value noise over one dimension, standing in for the source's `Noise` helper.
   Used only to wander the ring around when the pointer is away, so all it has
   to be is smooth and in [0, 1]. */
function agDrift(seed) {
    const table = new Float32Array(256);
    let s = seed;
    for (let i = 0; i < 256; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        table[i] = s / 4294967296;
    }
    return function (x) {
        const i = Math.floor(x);
        const f = x - i;
        const a = table[((i % 256) + 256) % 256];
        const b = table[(((i + 1) % 256) + 256) % 256];
        const smooth = f * f * (3 - 2 * f);   // smoothstep, so it has no corners
        return a + (b - a) * smooth;
    };
}

function agCompile(gl, vertSrc, fragSrc) {
    function shader(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
        }
        return sh;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertSrc));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
    }
    return program;
}

function agHexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    // ColorManagement is disabled in the source, so the sRGB values go to the
    // shader unconverted. Matching that keeps the palette identical.
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function initAntigravityParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const host = canvas.parentElement;

    // The site's own tuning, read off the live page rather than the file's
    // defaults — every one of these is overridden there.
    const RING_WIDTH = 0.006;
    const RING_WIDTH2 = 0.107;
    const RING_DISPLACEMENT = 0.62;

    /* Density is the reference's 230 on a desktop canvas, which yields ~7,700
       particles. A phone runs the same per-frame GPGPU pass over the same
       256x256 state texture on a far smaller GPU, and at that count it costs
       frames and battery for detail nobody can resolve on a 390px-wide canvas.
       Dropping to 150 roughly halves the particle count and keeps the field
       reading the same, because the spacing is scaled to the canvas anyway.

       Matched to the CSS phone breakpoint so the two never disagree. */
    const isPhone = window.matchMedia
        && window.matchMedia('(max-width: 600px)').matches;
    const DENSITY = isPhone ? 150 : 230;
    const PARTICLES_SCALE = 0.59;
    const SIZE = 256;                 // state texture is SIZE x SIZE
    const CAMERA_Z = 3.1;
    const FOV = 40;
    const MESH_SCALE = 5;

    const PALETTE = {
        dark: { c1: '#7189ff', c2: '#3074f9', c3: '#000000', scheme: 0 },
        light: { c1: '#2c64ed', c2: '#f84242', c3: '#ffcf03', scheme: 1 },
    };

    const gl = canvas.getContext('webgl2', {
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
        stencil: false,
        premultipliedAlpha: false,
    });
    // No WebGL2, or no float render targets: leave the hero clean rather than
    // dropping in a different-looking effect.
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
        host.style.display = 'none';
        return;
    }
    gl.getExtension('OES_texture_float_linear');

    /* ---- the particle field -------------------------------------------- */

    // map(density, 0, 300, 10, 2) and map(density, 0, 300, 11, 3)
    const map = (v, a, b, c, d) => (v - a) * (d - c) / (b - a) + c;
    const minDistance = map(DENSITY, 0, 300, 10, 2);
    const maxDistance = map(DENSITY, 0, 300, 11, 3);

    // Fixed seed: the field is a design decision, not something that should
    // differ between reloads.
    let seedState = 0x2f6e2b1;
    const random = () => {
        seedState ^= seedState << 13; seedState >>>= 0;
        seedState ^= seedState >> 17;
        seedState ^= seedState << 5; seedState >>>= 0;
        return seedState / 4294967296;
    };

    const raw = agPoissonDisc(500, 500, minDistance, maxDistance, 20, random);
    // Centre on the origin and normalise to [-1, 1], as the source does.
    let count = Math.min(raw.length / 2, SIZE * SIZE);

    const posData = new Float32Array(SIZE * SIZE * 4);
    for (let i = 0; i < count; i++) {
        posData[i * 4 + 0] = (raw[i * 2 + 0] - 250) * (1 / 250);
        posData[i * 4 + 1] = (raw[i * 2 + 1] - 250) * (1 / 250);
        posData[i * 4 + 2] = 0;
        posData[i * 4 + 3] = 0;
    }

    const uvData = new Float32Array(count * 2);
    const seedData = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
        uvData[i * 2 + 0] = (i % SIZE) / SIZE;
        uvData[i * 2 + 1] = Math.floor(i / SIZE) / SIZE;
        seedData[i * 4 + 0] = random();
        seedData[i * 4 + 1] = random();
        seedData[i * 4 + 2] = random();
        seedData[i * 4 + 3] = random();
    }

    /* ---- GL objects ----------------------------------------------------- */

    function makeStateTexture(data) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SIZE, SIZE, 0, gl.RGBA, gl.FLOAT, data);
        // NEAREST: each texel is one particle, so there is nothing to filter
        // between — and RGBA32F is not linearly filterable everywhere.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    function makeTarget() {
        const tex = makeStateTexture(null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { tex, fbo };
    }

    const refTex = makeStateTexture(posData);   // untouched reference positions
    let rt1 = makeTarget();
    let rt2 = makeTarget();

    let simProgram, renderProgram;
    try {
        simProgram = agCompile(gl, AG_SIM_VERT, AG_SIM_FRAG(SIZE));
        renderProgram = agCompile(gl, AG_RENDER_VERT, AG_RENDER_FRAG);
    } catch (error) {
        host.style.display = 'none';
        return;
    }

    /* `seeds` only ever feeds a varying the fragment shader never reads, so a
       driver is free to optimise the whole chain away and hand back -1. Passing
       -1 to enableVertexAttribArray is an INVALID_VALUE, so bind through a
       helper that skips absent attributes. */
    function bindAttrib(program, name, buffer, size) {
        const loc = gl.getAttribLocation(program, name);
        if (loc < 0) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }

    // Fullscreen triangle for the simulation pass.
    const quadVao = gl.createVertexArray();
    gl.bindVertexArray(quadVao);
    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    bindAttrib(simProgram, 'position', quadBuf, 2);

    const pointVao = gl.createVertexArray();
    gl.bindVertexArray(pointVao);
    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, uvData, gl.STATIC_DRAW);
    const seedBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, seedData, gl.STATIC_DRAW);
    bindAttrib(renderProgram, 'uv', uvBuf, 2);
    bindAttrib(renderProgram, 'seeds', seedBuf, 4);
    gl.bindVertexArray(null);

    const simU = {};
    ['uPosition', 'uPosRefs', 'uRingPos', 'uTime', 'uDeltaTime', 'uRingRadius',
     'uRingWidth', 'uRingWidth2', 'uRingDisplacement'].forEach((n) => {
        simU[n] = gl.getUniformLocation(simProgram, n);
    });
    const renU = {};
    ['uPosition', 'uTime', 'uParticleScale', 'uPixelRatio', 'uColor1', 'uColor2',
     'uColor3', 'uAlpha', 'uRingPos', 'uRez', 'uColorScheme',
     'modelViewMatrix', 'projectionMatrix'].forEach((n) => {
        renU[n] = gl.getUniformLocation(renderProgram, n);
    });

    /* ---- camera ---------------------------------------------------------
       Three's PerspectiveCamera and a mesh scaled 5x, written out directly.
       Both matrices are column-major, matching GL's expectation. */
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const projection = new Float32Array(16);
    const modelView = new Float32Array(16);

    function buildMatrices(aspect) {
        const f = 1 / Math.tan((FOV * Math.PI / 180) / 2);
        const near = 0.1;
        const far = 1000;
        projection.fill(0);
        projection[0] = f / aspect;
        projection[5] = f;
        projection[10] = (far + near) / (near - far);
        projection[11] = -1;
        projection[14] = (2 * far * near) / (near - far);

        // Camera at +Z looking back at the origin, mesh uniformly scaled.
        modelView.fill(0);
        modelView[0] = MESH_SCALE;
        modelView[5] = MESH_SCALE;
        modelView[10] = MESH_SCALE;
        modelView[14] = -CAMERA_Z;
        modelView[15] = 1;
    }

    /* ---- pointer --------------------------------------------------------
       The source raycasts a 12.5 x 12.5 plane at z = 0. For a camera looking
       straight down -Z that reduces to scaling normalised device coordinates
       by the view size at the camera's distance, which is what this does. */
    const halfHeightAtPlane = CAMERA_Z * Math.tan((FOV * Math.PI / 180) / 2);
    let pointerNdc = { x: 0, y: 0 };
    let isIntersecting = false;

    function onPointerMove(evt) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
        pointerNdc = { x: nx, y: ny };
        isIntersecting = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1;
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', () => { isIntersecting = false; });
    // Touch has no hovering pointer; leave it on the idle drift.
    window.addEventListener('touchstart', () => { isIntersecting = false; }, { passive: true });

    /* ---- resize ---------------------------------------------------------- */
    let viewW = 0;
    let viewH = 0;

    function resize() {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const w = host.offsetWidth;
        const h = host.offsetHeight;
        if (!w || !h) return;
        viewW = Math.floor(w * pixelRatio);
        viewH = Math.floor(h * pixelRatio);
        canvas.width = viewW;
        canvas.height = viewH;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        buildMatrices(w / h);
    }

    resize();
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);

    /* ---- loop ------------------------------------------------------------ */
    const driftX = agDrift(0x9e3779b9);
    const driftY = agDrift(0x85ebca6b);

    let ringX = 0;
    let ringY = 0;
    let time = 0;
    let elapsed = 0;
    let lastFrame = 0;
    let everRendered = false;
    let onScreen = true;

    function frame(now) {
        requestAnimationFrame(frame);
        if (!onScreen || !viewW) return;

        const nowSec = now / 1000;
        // First frame after a pause has no meaningful delta, and a long one
        // would jump the field forward; clamp it.
        const delta = lastFrame ? Math.min(nowSec - lastFrame, 0.1) : 0;
        lastFrame = nowSec;
        elapsed += delta;
        time += delta;

        // Idle wander, so the field is never completely still.
        const dx = (driftX(elapsed * 0.66 + 94.234) - 0.5) * 2;
        const dy = (driftY(elapsed * 0.75 + 21.028) - 0.5) * 2;

        const aspect = viewW / viewH;

        /* The field lives in local units, which are world units over the mesh
           scale — so 1/MESH_SCALE puts the ring exactly under the pointer.
           The source damps this to 0.175 instead, which on a hero this wide
           left the ring travelling much further across than down. */
        const TO_LOCAL = 1 / MESH_SCALE;

        /* Half the visible field, in those same local units. Using it for the
           idle wander is what lets the ring roam the whole fold instead of
           tracing a band across the middle: the source's fixed 0.2 / 0.1 pair
           gave the vertical half the range of the horizontal regardless of
           the shape of the canvas. */
        const roam = halfHeightAtPlane * TO_LOCAL;

        let cursorX, cursorY, ease;
        if (isIntersecting) {
            const px = pointerNdc.x * halfHeightAtPlane * aspect;
            const py = pointerNdc.y * halfHeightAtPlane;
            // Equal wander on both axes, so the drift never favours one.
            cursorX = px * TO_LOCAL + dx * roam * 0.35;
            cursorY = py * TO_LOCAL + dy * roam * 0.35;
            ease = 0.055;
        } else {
            cursorX = dx * roam * aspect;
            cursorY = dy * roam;
            ease = 0.02;
        }
        /* Still an eased follow so the ring has weight, but quick enough that
           a vertical flick registers — at the source's 0.02 the ring settled
           over roughly a second, long enough that only broad horizontal
           sweeps ever read. */
        ringX += (cursorX - ringX) * ease;
        ringY += (cursorY - ringY) * ease;

        const ringRadius = 0.175 + Math.sin(time) * 0.03 + Math.cos(time * 3) * 0.02;

        /* simulation pass */
        gl.useProgram(simProgram);
        gl.bindVertexArray(quadVao);
        gl.bindFramebuffer(gl.FRAMEBUFFER, rt2.fbo);
        gl.viewport(0, 0, SIZE, SIZE);
        gl.disable(gl.BLEND);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, everRendered ? rt1.tex : refTex);
        gl.uniform1i(simU.uPosition, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, refTex);
        gl.uniform1i(simU.uPosRefs, 1);

        gl.uniform2f(simU.uRingPos, ringX, ringY);
        gl.uniform1f(simU.uTime, elapsed);
        gl.uniform1f(simU.uDeltaTime, delta);
        gl.uniform1f(simU.uRingRadius, ringRadius);
        gl.uniform1f(simU.uRingWidth, RING_WIDTH);
        gl.uniform1f(simU.uRingWidth2, RING_WIDTH2);
        gl.uniform1f(simU.uRingDisplacement, RING_DISPLACEMENT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        /* point pass */
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, viewW, viewH);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        // Three's NormalBlending with premultiplied alpha off.
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);

        gl.useProgram(renderProgram);
        gl.bindVertexArray(pointVao);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, everRendered ? rt2.tex : refTex);
        gl.uniform1i(renU.uPosition, 0);

        const theme = document.documentElement.classList.contains('light')
            ? PALETTE.light : PALETTE.dark;
        gl.uniform3fv(renU.uColor1, agHexToRgb(theme.c1));
        gl.uniform3fv(renU.uColor2, agHexToRgb(theme.c2));
        gl.uniform3fv(renU.uColor3, agHexToRgb(theme.c3));
        gl.uniform1i(renU.uColorScheme, theme.scheme);

        gl.uniform1f(renU.uTime, elapsed);
        gl.uniform1f(renU.uAlpha, 1);
        gl.uniform2f(renU.uRingPos, ringX, ringY);
        gl.uniform2f(renU.uRez, viewW, viewH);
        gl.uniform1f(renU.uPixelRatio, pixelRatio);
        gl.uniform1f(renU.uParticleScale, viewW / pixelRatio / 2000 * PARTICLES_SCALE);
        gl.uniformMatrix4fv(renU.modelViewMatrix, false, modelView);
        gl.uniformMatrix4fv(renU.projectionMatrix, false, projection);

        gl.drawArrays(gl.POINTS, 0, count);
        gl.bindVertexArray(null);

        // Ping-pong: what was just written becomes next frame's input.
        const swap = rt1; rt1 = rt2; rt2 = swap;
        everRendered = true;
    }

    // Only run while the hero is on screen.
    new IntersectionObserver(([entry]) => {
        onScreen = entry ? entry.isIntersecting : true;
        // Restart the clock on return so the field does not jump forward by
        // however long it was scrolled away.
        if (onScreen) lastFrame = 0;
    }, { threshold: 0 }).observe(host);

    document.addEventListener('visibilitychange', () => { lastFrame = 0; });

    requestAnimationFrame(frame);
}
