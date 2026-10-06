import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =========================================================
// SHADERS (Raymarching para lente gravitacional)
// =========================================================

const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform vec2 u_resolution;
    uniform float u_time;
    
    uniform vec3 u_cameraPos;
    uniform vec3 u_cameraDir;
    uniform vec3 u_cameraUp;
    uniform vec3 u_cameraRight;
    uniform float u_fov;

    uniform float u_density;
    uniform float u_speed;
    uniform float u_colorT;
    uniform float u_lensing;
    uniform float u_doppler;

    varying vec2 vUv;

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    float hash(float n) { return fract(sin(n) * 43758.5453123); }
    float noise(vec3 x) {
        vec3 p = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        float n = p.x + p.y * 57.0 + 113.0 * p.z;
        return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                       mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
                   mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                       mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
    }

    float fbm(vec3 p) {
        float f = 0.0;
        float w = 0.5;
        for (int i = 0; i < 4; i++) {
            f += w * noise(p);
            p *= 2.0;
            w *= 0.5;
        }
        return f;
    }

    float getDiskDensity(vec3 p) {
        float r = length(p.xz);
        if(r < 2.5 || r > 9.0) return 0.0;
        
        float h = abs(p.y);
        float maxH = 0.1 + 0.05 * r;
        if(h > maxH) return 0.0;
        
        float angularSpeed = u_speed * 3.0 / pow(max(r, 0.1), 1.5);
        vec3 pRot = p;
        pRot.xz *= rot(-u_time * angularSpeed);
        
        float n = fbm(pRot * 2.0);
        float fadeR = smoothstep(2.5, 3.5, r) * smoothstep(9.0, 7.0, r);
        float fadeH = smoothstep(maxH, 0.0, h);
        
        return n * fadeR * fadeH * u_density * 3.0;
    }

    void main() {
        vec2 uv = (vUv - 0.5) * 2.0;
        
        // Evitar división por cero si la resolución aún no se actualiza
        float aspect = u_resolution.y > 0.0 ? u_resolution.x / u_resolution.y : 1.0;
        uv.x *= aspect;
        
        float fovScale = tan(u_fov * 0.5 * 3.14159 / 180.0);
        vec3 rayDir = normalize(uv.x * u_cameraRight * fovScale + uv.y * u_cameraUp * fovScale + u_cameraDir);
        vec3 rayPos = u_cameraPos;

        vec3 col = vec3(0.0);
        float transmittance = 1.0;
        float mass = 1.0;
        
        vec3 colorInner = mix(vec3(1.0, 0.3, 0.0), vec3(0.0, 0.8, 1.0), u_colorT);
        vec3 colorOuter = mix(vec3(0.8, 0.1, 0.0), vec3(0.0, 0.3, 0.8), u_colorT);
        
        float dt = 0.15;
        const int MAX_STEPS = 120;
        
        for(int i = 0; i < MAX_STEPS; i++) {
            float r2 = dot(rayPos, rayPos);
            float r = sqrt(r2);
            
            if(r < 2.0) {
                transmittance = 0.0;
                break;
            }
            
            if(u_lensing > 0.5) {
                vec3 g = -rayPos * (mass * 3.0 / (r2 * r * max(r, 0.1)));
                rayDir = normalize(rayDir + g * dt);
            }
            
            if(abs(rayPos.y) < 1.0 && r < 10.0) {
                float d = getDiskDensity(rayPos);
                if(d > 0.0) {
                    vec3 localColor = mix(colorInner, colorOuter, smoothstep(2.5, 9.0, r));
                    
                    if (u_doppler > 0.5) {
                        vec3 velDir = normalize(vec3(-rayPos.z, 0.0, rayPos.x));
                        float doppler = dot(rayDir, velDir); 
                        float boost = max(0.0, 1.0 + doppler * 0.8); 
                        localColor *= pow(boost, 3.0); 
                    }

                    float emission = d * 0.8;
                    col += localColor * emission * transmittance * dt;
                    transmittance *= exp(-d * dt * 0.2);
                }
            }
            
            float stepSize = dt * min(1.0, r * 0.2);
            rayPos += rayDir * stepSize;
            
            if(r > 25.0 || transmittance < 0.01) break;
        }
        
        if(transmittance > 0.01) {
            float starNoise = noise(rayDir * 150.0);
            float stars = pow(max(0.0, starNoise - 0.7) * 3.3, 4.0);
            col += vec3(stars) * transmittance;
        }

        col = col / (1.0 + col);
        col = pow(col, vec3(1.0 / 2.2));

        gl_FragColor = vec4(col, 1.0);
    }
`;

// =========================================================
// LÓGICA THREE.JS
// =========================================================

let scene, camera, orthoCamera, renderer, material, controls;
const DOM = {
    container: document.getElementById('canvas-container'),
    canvas: document.getElementById('glcanvas'),
    density: document.getElementById('sl-density'),
    valDensity: document.getElementById('val-density'),
    speed: document.getElementById('sl-speed'),
    valSpeed: document.getElementById('val-speed'),
    color: document.getElementById('sl-color'),
    valColor: document.getElementById('val-color'),
    lensing: document.getElementById('sw-lensing'),
    doppler: document.getElementById('sw-doppler')
};

function init() {
    // Protección contra contenedores no renderizados
    let width = DOM.container.clientWidth || window.innerWidth;
    let height = DOM.container.clientHeight || window.innerHeight;

    scene = new THREE.Scene();
    
    // Cámara perspectiva solo para orbitar
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 3, 12); 

    // Cámara ortográfica SEGURA para renderizar el quad a pantalla completa
    orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

    renderer = new THREE.WebGLRenderer({ canvas: DOM.canvas, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 20;

    const geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            u_resolution: { value: new THREE.Vector2(width, height) },
            u_time: { value: 0 },
            u_cameraPos: { value: camera.position },
            u_cameraDir: { value: new THREE.Vector3() },
            u_cameraUp: { value: new THREE.Vector3() },
            u_cameraRight: { value: new THREE.Vector3() },
            u_fov: { value: camera.fov },
            
            // Valores iniciales quemados por si Material Web tarda en inicializar
            u_density: { value: 1.0 },
            u_speed: { value: 1.0 },
            u_colorT: { value: 0.5 },
            u_lensing: { value: 1.0 },
            u_doppler: { value: 1.0 }
        },
        depthWrite: false,
        depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    window.addEventListener('resize', onWindowResize);
    
    // Sincronizar UI después de un pequeño retraso para asegurar que Web Components cargaron
    setTimeout(bindUIEvents, 500);

    animate(0);
}

function bindUIEvents() {
    const densityLabels = ["Gaseoso", "Ligero", "Normal", "Denso", "Opaco"];
    const speedLabels = ["Pausado", "Lento", "Normal", "Rápido", "Extremo"];

    // Función segura para leer sliders
    const safeRead = (el, def) => {
        if(!el) return def;
        const v = parseFloat(el.value);
        return isNaN(v) ? def : v;
    };

    DOM.density.addEventListener('input', (e) => {
        const v = safeRead(e.target, 1.0);
        material.uniforms.u_density.value = v;
        DOM.valDensity.textContent = densityLabels[Math.floor((v / 2.0) * 4)] || "Opaco";
    });

    DOM.speed.addEventListener('input', (e) => {
        const v = safeRead(e.target, 1.0);
        material.uniforms.u_speed.value = v;
        DOM.valSpeed.textContent = speedLabels[Math.floor((v / 3.0) * 4)] || "Extremo";
    });

    DOM.color.addEventListener('input', (e) => {
        const v = safeRead(e.target, 0.5);
        material.uniforms.u_colorT.value = v;
        if(v < 0.3) DOM.valColor.textContent = "Fuego (Naranja)";
        else if(v < 0.7) DOM.valColor.textContent = "Estelar (Blanco/Cian)";
        else DOM.valColor.textContent = "Rayos X (Azul intenso)";
    });

    DOM.lensing.addEventListener('change', (e) => {
        material.uniforms.u_lensing.value = e.target.selected ? 1.0 : 0.0;
    });

    DOM.doppler.addEventListener('change', (e) => {
        material.uniforms.u_doppler.value = e.target.selected ? 1.0 : 0.0;
    });
}

function onWindowResize() {
    const width = DOM.container.clientWidth || window.innerWidth;
    const height = DOM.container.clientHeight || window.innerHeight;
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    material.uniforms.u_resolution.value.set(width, height);
}

const camDir = new THREE.Vector3();
const camUp = new THREE.Vector3();
const camRight = new THREE.Vector3();

function animate(time) {
    requestAnimationFrame(animate);
    controls.update();

    camera.getWorldDirection(camDir);
    camUp.copy(camera.up).applyQuaternion(camera.quaternion);
    camRight.crossVectors(camDir, camUp).normalize();

    material.uniforms.u_time.value = time * 0.001;
    material.uniforms.u_cameraPos.value.copy(camera.position);
    material.uniforms.u_cameraDir.value.copy(camDir);
    material.uniforms.u_cameraUp.value.copy(camUp);
    material.uniforms.u_cameraRight.value.copy(camRight);

    renderer.render(scene, orthoCamera);
}

// Iniciar al cargar
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
