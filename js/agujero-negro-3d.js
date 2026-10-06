import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =========================================================
// SHADERS (Raymarching para lente gravitacional de agujero negro)
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
    
    // Controles de cámara desde Three.js
    uniform vec3 u_cameraPos;
    uniform vec3 u_cameraDir;
    uniform vec3 u_cameraUp;
    uniform vec3 u_cameraRight;
    uniform float u_fov;

    // Parámetros interactivos
    uniform float u_density;
    uniform float u_speed;
    uniform float u_colorT;
    uniform float u_lensing;
    uniform float u_doppler;

    varying vec2 vUv;

    // Matriz de rotación 2D
    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    // Función de ruido simple para el disco de plasma
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

    // FBM (Fractal Brownian Motion) para textura del gas
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

    // Densidad volumétrica del disco de acreción
    float getDiskDensity(vec3 p) {
        float r = length(p.xz);
        
        // El disco existe entre r=2.5 y r=9.0
        if(r < 2.5 || r > 9.0) return 0.0;
        
        // Perfil de grosor: más grueso en los bordes, fino en el centro
        float h = abs(p.y);
        float maxH = 0.1 + 0.05 * r;
        if(h > maxH) return 0.0;
        
        // Giramos las coordenadas para simular rotación (más rápido cerca del centro)
        float angularSpeed = u_speed * 3.0 / pow(r, 1.5);
        vec3 pRot = p;
        pRot.xz *= rot(-u_time * angularSpeed);
        
        // Aplicar ruido
        float n = fbm(pRot * 2.0);
        
        // Desvanecimiento suave en los bordes interior, exterior y vertical
        float fadeR = smoothstep(2.5, 3.5, r) * smoothstep(9.0, 7.0, r);
        float fadeH = smoothstep(maxH, 0.0, h);
        
        return n * fadeR * fadeH * u_density * 3.0;
    }

    void main() {
        // Coordenadas de pantalla normalizadas (-1 a 1, corregidas por el aspecto)
        vec2 uv = (vUv - 0.5) * 2.0;
        uv.x *= u_resolution.x / u_resolution.y;
        
        // Construcción del rayo inicial
        float fovScale = tan(u_fov * 0.5 * 3.14159 / 180.0);
        vec3 rayDir = normalize(uv.x * u_cameraRight * fovScale + uv.y * u_cameraUp * fovScale + u_cameraDir);
        vec3 rayPos = u_cameraPos;

        vec3 col = vec3(0.0);
        float transmittance = 1.0;
        float mass = 1.0;
        
        // Configuración de colores según slider (Naranja rojizo a Cian de rayos X)
        vec3 colorInner = mix(vec3(1.0, 0.3, 0.0), vec3(0.0, 0.8, 1.0), u_colorT);
        vec3 colorOuter = mix(vec3(0.8, 0.1, 0.0), vec3(0.0, 0.3, 0.8), u_colorT);
        
        // Raymarching: integrar a lo largo del rayo
        float dt = 0.15;
        const int MAX_STEPS = 120;
        
        for(int i = 0; i < MAX_STEPS; i++) {
            float r2 = dot(rayPos, rayPos);
            float r = sqrt(r2);
            
            // Horizonte de eventos (r = 2M en Schwarzschild)
            // Hacemos el corte en r=2.0
            if(r < 2.0) {
                // El rayo cayó al agujero negro, no llega luz del fondo.
                transmittance = 0.0;
                break;
            }
            
            // Gravedad dobla la luz: a = -M * r_vec / r^3
            // Usamos una aproximación newtoniana/eikonal para simulación rápida.
            if(u_lensing > 0.5) {
                // Desviación del rayo hacia el centro
                vec3 g = -rayPos * (mass * 3.0 / (r2 * r * r)); // Factor exagerado para estética
                rayDir = normalize(rayDir + g * dt);
            }
            
            // Si el rayo está cerca del disco, acumular color
            if(abs(rayPos.y) < 1.0 && r < 10.0) {
                float d = getDiskDensity(rayPos);
                if(d > 0.0) {
                    // Gradiente de color según la distancia
                    vec3 localColor = mix(colorInner, colorOuter, smoothstep(2.5, 9.0, r));
                    
                    // Efecto Doppler Relativista (Beaming)
                    // La luz que viaja hacia nosotros (producto punto rayDir y velocidad) se ve más brillante y azul.
                    if (u_doppler > 0.5) {
                        // Vector de velocidad del fluido (circular tangencial)
                        vec3 velDir = normalize(vec3(-rayPos.z, 0.0, rayPos.x));
                        float doppler = dot(rayDir, velDir); 
                        // Aumentamos brillo y desplazamos a blanco si viene hacia nosotros
                        float boost = 1.0 + doppler * 0.8; 
                        localColor *= pow(boost, 3.0); // Factor exponencial para exagerar
                    }

                    // Radiación del plasma
                    float emission = d * 0.8;
                    col += localColor * emission * transmittance * dt;
                    
                    // Absorción
                    transmittance *= exp(-d * dt * 0.2);
                }
            }
            
            // Paso variable: más pequeño cerca del horizonte para mayor precisión matemática
            float stepSize = dt * min(1.0, r * 0.2);
            rayPos += rayDir * stepSize;
            
            // Optimización: si estamos muy lejos y saliendo, o totalmente opacos, salir
            if(r > 25.0 || transmittance < 0.01) break;
        }
        
        // Estrellas de fondo
        if(transmittance > 0.01) {
            float starNoise = noise(rayDir * 150.0);
            float stars = pow(max(0.0, starNoise - 0.7) * 3.3, 4.0);
            col += vec3(stars) * transmittance;
        }

        // Post-procesado: Tonemapping y Gamma
        col = col / (1.0 + col);
        col = pow(col, vec3(1.0 / 2.2));

        gl_FragColor = vec4(col, 1.0);
    }
`;

// =========================================================
// LÓGICA DE APLICACIÓN THREE.JS
// =========================================================

let scene, camera, renderer, material, controls;
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
    // 1. Configuración básica
    scene = new THREE.Scene();
    
    // Cámara perspectiva que solo usaremos para controlar los ángulos mediante OrbitControls.
    // El renderizado final lo hace la cámara virtual dentro del Shader.
    camera = new THREE.PerspectiveCamera(45, DOM.container.clientWidth / DOM.container.clientHeight, 0.1, 100);
    camera.position.set(0, 3, 12); // Vista ligeramente elevada

    renderer = new THREE.WebGLRenderer({ canvas: DOM.canvas, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limitar a 2x para rendimiento
    renderer.setSize(DOM.container.clientWidth, DOM.container.clientHeight);

    // 2. Controles de Cámara
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 20;

    // 3. Crear el plano a pantalla completa que ejecuta el Shader
    const geometry = new THREE.PlaneGeometry(2, 2);
    material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            u_resolution: { value: new THREE.Vector2(DOM.container.clientWidth, DOM.container.clientHeight) },
            u_time: { value: 0 },
            u_cameraPos: { value: camera.position },
            u_cameraDir: { value: new THREE.Vector3() },
            u_cameraUp: { value: new THREE.Vector3() },
            u_cameraRight: { value: new THREE.Vector3() },
            u_fov: { value: camera.fov },
            
            // Conectados a la UI
            u_density: { value: parseFloat(DOM.density.value) },
            u_speed: { value: parseFloat(DOM.speed.value) },
            u_colorT: { value: parseFloat(DOM.color.value) },
            u_lensing: { value: DOM.lensing.selected ? 1.0 : 0.0 },
            u_doppler: { value: DOM.doppler.selected ? 1.0 : 0.0 }
        },
        depthWrite: false,
        depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 4. Eventos
    window.addEventListener('resize', onWindowResize);
    bindUIEvents();

    // 5. Iniciar loop
    animate(0);
}

function bindUIEvents() {
    // Labels array for textual feedback
    const densityLabels = ["Gaseoso", "Ligero", "Normal", "Denso", "Opaco"];
    const speedLabels = ["Pausado", "Lento", "Normal", "Rápido", "Extremo"];

    DOM.density.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        material.uniforms.u_density.value = v;
        DOM.valDensity.textContent = densityLabels[Math.floor((v / 2.0) * 4)] || "Opaco";
    });

    DOM.speed.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        material.uniforms.u_speed.value = v;
        DOM.valSpeed.textContent = speedLabels[Math.floor((v / 3.0) * 4)] || "Extremo";
    });

    DOM.color.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
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
    const width = DOM.container.clientWidth;
    const height = DOM.container.clientHeight;
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    material.uniforms.u_resolution.value.set(width, height);
}

// Variables temporales para extraer los vectores de la cámara sin instanciar objetos cada frame
const camDir = new THREE.Vector3();
const camUp = new THREE.Vector3();
const camRight = new THREE.Vector3();

function animate(time) {
    requestAnimationFrame(animate);

    controls.update();

    // Extraer base vectorial de la cámara de Three.js para enviarla al Raymarcher
    camera.getWorldDirection(camDir);
    camUp.copy(camera.up).applyQuaternion(camera.quaternion);
    camRight.crossVectors(camDir, camUp).normalize();

    material.uniforms.u_time.value = time * 0.001;
    material.uniforms.u_cameraPos.value.copy(camera.position);
    material.uniforms.u_cameraDir.value.copy(camDir);
    material.uniforms.u_cameraUp.value.copy(camUp);
    material.uniforms.u_cameraRight.value.copy(camRight);

    // Para hacer que el render sea a pantalla completa independientemente de la proyección 3D,
    // pasamos la cámara ortográfica al shader (ya que renderizamos un quad 2x2 en coords normalizadas)
    // Three.js no necesita renderizar mallas 3D complejas aquí.
    renderer.render(scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
}

// Arrancar cuando cargue la ventana
init();
