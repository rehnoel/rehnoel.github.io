/* =========================================================
   Anatomía de un agujero negro — visualizador interactivo
   Geometría basada en la métrica de Kerr (unidades G = c = 1, M = 1)
   ========================================================= */
(() => {
    'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const W = 800, H = 580;
    const CX = 400, CY = 290;
    const S = 28;            // píxeles por unidad de GM/c²
    const K = 0.22;          // aplanamiento del disco (inclinación de la vista)
    const R_OUT = 13;        // borde exterior del disco dibujado (en M)
    const R_SHADOW = Math.sqrt(27); // radio aparente de la sombra (Schwarzschild)
    const KM_PER_M = 1.4766; // GM/c² para 1 masa solar, en km
    const KM_PER_AU = 1.496e8;
    const OMEGA0 = 9;        // velocidad angular de referencia de la animación

    /* ---------------- Física ---------------- */
    function geom(a) {
        const rp = 1 + Math.sqrt(1 - a * a);
        const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a));
        const z2 = Math.sqrt(3 * a * a + z1 * z1);
        const isco = 3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2)); // órbita prógrada
        const phPro = 2 * (1 + Math.cos((2 / 3) * Math.acos(-a)));
        const phRet = 2 * (1 + Math.cos((2 / 3) * Math.acos(a)));
        return { a, rp, isco, phPro, phRet };
    }

    /* ---------------- Formato ---------------- */
    const fmtNum = (x) => x.toLocaleString('es-MX', { maximumSignificantDigits: 3 });
    function fmtLen(km) {
        if (km < 1e-3) return fmtNum(km * 1e6) + ' mm';
        if (km < 1) return fmtNum(km * 1e3) + ' m';
        if (km < 1e8) return fmtNum(km) + ' km';
        return fmtNum(km / KM_PER_AU) + ' UA';
    }

    /* ---------------- Masas de referencia ---------------- */
    const MASSES = [
        { id: 'tierra', label: 'La Tierra', mass: 3.003e-6, desc: '3 millonésimas de masa solar',
          scale: 'Del tamaño de una canica (~2 cm).' },
        { id: 'sol', label: 'El Sol', mass: 1, desc: '1 masa solar (M☉)',
          scale: 'Cabría en una ciudad pequeña (~6 km de ancho).' },
        { id: 'cyg', label: 'Cygnus X-1', mass: 21, desc: '21 M☉ · agujero negro estelar en nuestra galaxia',
          scale: 'Uno de los primeros identificados como agujero negro (1972).' },
        { id: 'sgra', label: 'Sagitario A*', mass: 4.3e6, desc: '4.3 millones de M☉ · centro de la Vía Láctea',
          scale: 'Cabría holgadamente dentro de la órbita de Mercurio.' },
        { id: 'm87', label: 'M87*', mass: 6.5e9, desc: '6,500 millones de M☉ · galaxia M87',
          scale: 'Más grande que todo el Sistema Solar hasta Plutón.' }
    ];

    /* ---------------- Contenido de cada parte ---------------- */
    const km = (r) => r * KM_PER_M * state.massObj.mass;

    const INTRO = {
        tag: 'Cómo usar',
        name: 'Anatomía de un agujero negro',
        short: 'Una región del espacio donde la gravedad es tan intensa que nada, ni siquiera la luz, puede escapar.',
        body: 'Toca cualquier parte del diagrama o usa los botones numerados. Cambia la masa para ver de qué tamaño sería cada región y aumenta la rotación para descubrir la ergosfera.',
        question: 'Antes de empezar: ¿qué imaginan cuando escuchan “agujero negro”? ¿Un hoyo, una aspiradora, una estrella?',
        data: () => [['Masa', state.massObj.desc]]
    };

    const PARTS = [
        {
            id: 'disco', chip: 'Disco de acreción', label: 'DISCO DE ACRECIÓN',
            tag: '01 · Lo que sí vemos', name: 'Disco de acreción',
            short: 'Gas y polvo que giran alrededor del agujero negro a enorme velocidad, calentándose a millones de grados antes de caer.',
            body: 'La materia no cae en línea recta: forma un disco que gira, como el agua que se arremolina al irse por el desagüe. La fricción y los campos magnéticos lo calientan tanto que brilla en rayos X. Por eso, aunque el agujero negro no emite luz, su entorno puede estar entre los objetos más brillantes del universo: los cuásares.',
            question: '¿Notan que las partículas de adentro giran más rápido que las de afuera? ¿Qué otro sistema funciona igual? (El Sistema Solar: Mercurio da la vuelta al Sol mucho más rápido que Neptuno.)',
            data: (g) => [
                ['Borde interior', fmtLen(km(g.isco))],
                ['Temperatura', state.massObj.mass < 1000 ? 'Millones de °C → brilla en rayos X' : 'Cientos de miles de °C → brilla en ultravioleta']
            ],
            side: 'L', labelY: 445,
            anchor: () => [CX + 10 * S * Math.cos(2.1), CY + 10 * S * K * Math.sin(2.1)]
        },
        {
            id: 'chorros', chip: 'Chorros', label: 'CHORRO RELATIVISTA',
            tag: '02 · Lo que sí vemos', name: 'Chorros relativistas',
            short: 'Haces de partículas disparados desde los polos a velocidades cercanas a la de la luz.',
            body: 'No todo lo que se acerca termina adentro. Los campos magnéticos del disco, retorcidos por la rotación del agujero negro, canalizan parte de la materia y la expulsan por los polos. Algunos chorros miden miles de años luz y escapan de su propia galaxia: el de M87 se extiende unos 5,000 años luz. Sube la rotación y observa cómo se intensifican.',
            question: '¿Por qué creen que los chorros salen por los polos y no por el ecuador? (Pista: en el ecuador “estorba” el disco, y el campo magnético se enrosca a lo largo del eje de giro.)',
            data: (g) => [
                ['Velocidad', 'Hasta ~99 % de la luz'],
                ['Intensidad (modelo)', Math.round(g.a * g.a * 100) + ' % · crece con el giro²']
            ],
            side: 'L', labelY: 60,
            anchor: () => [CX, 70]
        },
        {
            id: 'isco', chip: 'ISCO', label: 'ISCO · ÚLTIMA ÓRBITA',
            tag: '03 · El límite de las órbitas', name: 'Última órbita estable (ISCO)',
            short: 'La órbita estable más cercana posible. Más adentro, la materia ya no puede orbitar: cae en espiral.',
            body: 'Lejos del agujero negro, la materia puede orbitar tranquilamente, como los planetas alrededor del Sol. Pero existe un límite: la ISCO (siglas en inglés de “órbita circular estable más interna”). Al cruzarla, el gas se precipita hacia el horizonte. Si el agujero negro gira rápido, la ISCO se acerca mucho más: mueve el control de rotación y compruébalo.',
            question: 'Miren las partículas que caen dentro del círculo punteado: ¿por qué creen que se aceleran conforme se acercan?',
            data: (g) => [
                ['Radio', fmtLen(km(g.isco))],
                ['Respecto al horizonte', fmtNum(g.isco / g.rp) + ' ×']
            ],
            side: 'R', labelY: 425,
            anchor: (g) => [CX + g.isco * S * Math.cos(0.45), CY + g.isco * S * K * Math.sin(0.45)]
        },
        {
            id: 'fotones', chip: 'Esfera de fotones', label: 'ESFERA DE FOTONES',
            tag: '04 · Luz en órbita', name: 'Esfera de fotones',
            short: 'La distancia a la que la gravedad es tan intensa que la luz misma puede dar vueltas en círculo.',
            body: 'A 1.5 veces el radio del horizonte (en un agujero negro sin giro), los fotones pueden orbitar. Es una órbita inestable, como una canica en la cima de una colina: cualquier empujón los hace caer o escapar. La luz que pasa rozando esta zona forma el anillo brillante de las fotografías del Event Horizon Telescope de M87* (2019) y Sagitario A* (2022). Si el agujero gira, la esfera se convierte en una franja: la luz que viaja a favor del giro orbita más cerca.',
            question: 'Si pudieran pararse en la esfera de fotones y mirar al frente, ¿qué verían? (¡Su propia nuca! La luz que sale de ustedes da la vuelta completa.)',
            data: (g) => g.a < 0.02
                ? [['Radio', fmtLen(km(g.phPro))]]
                : [['A favor del giro', fmtLen(km(g.phPro))], ['En contra del giro', fmtLen(km(g.phRet))]],
            side: 'R', labelY: 180,
            anchor: (g) => [CX + g.phRet * S * Math.cos(0.61), CY - g.phRet * S * Math.sin(0.61)]
        },
        {
            id: 'horizonte', chip: 'Horizonte', label: 'HORIZONTE DE EVENTOS',
            tag: '05 · El punto sin retorno', name: 'Horizonte de eventos',
            short: 'La frontera de la que nada puede regresar, ni siquiera la luz. Por eso el agujero negro es “negro”.',
            body: 'No es una superficie sólida, sino una frontera invisible. Un astronauta que la cruzara no sentiría nada especial en ese instante, pero todos sus caminos posibles apuntarían hacia el centro. Desde fuera lo veríamos moverse cada vez más lento y enrojecerse hasta desvanecerse. Su tamaño depende de la masa: cámbiala abajo para comparar.',
            question: 'Si comprimiéramos toda la Tierra hasta volverla un agujero negro, ¿de qué tamaño sería? (Elige “La Tierra” en el selector de masa para descubrirlo.)',
            data: (g) => [
                ['Radio', fmtLen(km(g.rp))],
                ['Diámetro', fmtLen(2 * km(g.rp))],
                ['Escala', state.massObj.scale]
            ],
            side: 'R', labelY: 125,
            anchor: (g) => [CX + g.rp * S * Math.cos(1.05), CY - g.rp * S * Math.sin(1.05)]
        },
        {
            id: 'singularidad', chip: 'Singularidad', label: 'SINGULARIDAD',
            tag: '06 · Lo que nunca veremos', name: 'Singularidad',
            short: 'El lugar donde, según la teoría, toda la masa queda comprimida en un volumen nulo.',
            body: 'La relatividad general de Einstein predice que la materia que cae termina en una región de densidad infinita: un punto si el agujero negro no gira, o un anillo si gira. Que una teoría prediga “infinitos” suele significar que está llegando a su límite. Para entender qué pasa realmente ahí necesitamos una teoría que aún no tenemos: la gravedad cuántica.',
            question: 'Si nada puede salir del horizonte para contarnos, ¿cómo podríamos saber alguna vez qué hay en el centro?',
            data: (g) => g.a < 0.02
                ? [['Forma', 'Un punto'], ['Densidad', 'Infinita (según la teoría)']]
                : [['Forma', 'Un anillo'], ['Radio del anillo', fmtLen(km(g.a))], ['Densidad', 'Infinita (según la teoría)']],
            side: 'R', labelY: 240,
            anchor: () => [CX, CY]
        },
        {
            id: 'ergosfera', chip: 'Ergosfera', label: 'ERGOSFERA',
            tag: '07 · Extra · Agujeros que giran', name: 'Ergosfera',
            short: 'Una región donde el propio espacio gira tan rápido que nada puede quedarse quieto.',
            body: 'Solo existe si el agujero negro rota. El giro arrastra el espacio-tiempo a su alrededor, como un remolino arrastra a una hoja en un río. Dentro de la ergosfera todavía se puede escapar, y en teoría podría robarse energía a la rotación del agujero negro (el proceso de Penrose). Observa los polos: ahí la ergosfera toca el horizonte.',
            question: 'Si nadan cerca de un remolino, ¿pueden quedarse quietos en un mismo lugar? ¿Qué tendrían que hacer?',
            data: (g) => g.a < 0.02
                ? [['Estado', 'No existe sin rotación']]
                : [['Radio en el ecuador', fmtLen(km(2))], ['Radio en los polos', fmtLen(km(g.rp))]],
            side: 'L', labelY: 250,
            anchor: (g) => {
                const th = 0.96;
                const r = 1 + Math.sqrt(1 - g.a * g.a * Math.cos(th) ** 2);
                return [CX - r * S * Math.sin(th), CY - r * S * Math.cos(th)];
            }
        },
        {
            id: 'lente', chip: 'Lente gravitacional', label: 'LENTE GRAVITACIONAL',
            tag: '08 · Extra · La luz se dobla', name: 'Lente gravitacional',
            short: 'La gravedad curva el camino de la luz: vemos la parte trasera del disco “doblada” por encima del agujero negro.',
            body: 'La masa curva el espacio-tiempo y la luz sigue esa curvatura. La luz que sale de la parte de atrás del disco pasa por encima (y por debajo) del agujero negro y llega a nosotros, así que lo vemos como un halo. Por eso la sombra que observamos (círculo punteado) es mucho más grande que el horizonte. Es el efecto que muestra la película Interstellar (2014), calculado con física real.',
            question: 'Si la gravedad dobla la luz, ¿podría una galaxia entera funcionar como una lupa gigante? (Sí: los astrónomos usan estas “lentes gravitacionales” para ver galaxias lejanísimas.)',
            data: (g) => [
                ['Radio de la sombra', fmtLen(km(R_SHADOW))],
                ['Sombra / horizonte', fmtNum(R_SHADOW / g.rp) + ' ×']
            ],
            side: 'L', labelY: 135,
            anchor: () => {
                const r = ((R_SHADOW + 7.6) / 2) * S;
                return [CX + r * Math.cos(2.44), CY - r * Math.sin(2.44)];
            }
        }
    ];
    const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p]));

    /* ---------------- Estado ---------------- */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = {
        spin: 0,
        g: geom(0),
        massObj: MASSES[3],
        selected: null,
        labels: window.matchMedia('(min-width: 640px)').matches,
        lens: true,
        animate: !reduceMotion,
        tour: false
    };

    /* ---------------- Utilidades SVG ---------------- */
    function mk(tag, attrs = {}) {
        const n = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
        return n;
    }
    const f = (n) => n.toFixed(2);

    function ellipseHalf(r, back) {
        const rx = r * S, ry = r * S * K;
        return `M ${f(CX - rx)} ${CY} A ${f(rx)} ${f(ry)} 0 0 ${back ? 1 : 0} ${f(CX + rx)} ${CY}`;
    }
    function ringHalf(rIn, rOut, back) {
        const a = rOut * S, b = rOut * S * K, c = rIn * S, d = rIn * S * K;
        return `M ${f(CX - a)} ${CY} A ${f(a)} ${f(b)} 0 0 ${back ? 1 : 0} ${f(CX + a)} ${CY} ` +
               `L ${f(CX + c)} ${CY} A ${f(c)} ${f(d)} 0 0 ${back ? 0 : 1} ${f(CX - c)} ${CY} Z`;
    }
    function circlePath(r) {
        return `M ${f(CX - r)} ${CY} a ${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0 a ${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0 Z`;
    }
    function semiAnnulus(r1, r2, up) {
        return `M ${f(CX - r2)} ${CY} A ${f(r2)} ${f(r2)} 0 0 ${up ? 1 : 0} ${f(CX + r2)} ${CY} ` +
               `L ${f(CX + r1)} ${CY} A ${f(r1)} ${f(r1)} 0 0 ${up ? 0 : 1} ${f(CX - r1)} ${CY} Z`;
    }
    function ergoPath(a) {
        let d = '';
        const n = 96;
        for (let i = 0; i <= n; i++) {
            const th = (i / n) * 2 * Math.PI;
            const r = 1 + Math.sqrt(1 - a * a * Math.cos(th) ** 2);
            d += `${i ? 'L' : 'M'} ${f(CX + r * Math.sin(th) * S)} ${f(CY - r * Math.cos(th) * S)} `;
        }
        return d + 'Z';
    }
    function mulberry32(seed) {
        return () => {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* ---------------- Referencias DOM ---------------- */
    const $ = (id) => document.getElementById(id);
    let svg, el, particles = [], plungers = [], jetFlowEls = [], tourTimer = null, jetOffset = 0;

    function init() {
        svg = $('bh-svg');
        el = {
            card: $('bh-card'),
            horizon: $('horizon'),
            ergoGroup: $('p-ergo'), ergo: $('ergo'), ergoHit: $('ergo-hit'),
            phBand: $('ph-band'), phPro: $('ph-pro'), phRet: $('ph-ret'), phHit: $('ph-hit'),
            singDot: $('sing-dot'), singRing: $('sing-ring'),
            diskBack: $('disk-back'), diskFront: $('disk-front'),
            iscoBack: $('isco-back'), iscoFront: $('isco-front'),
            iscoBackHit: $('isco-back-hit'), iscoFrontHit: $('isco-front-hit'),
            diskStop: $('diskStop'), diskStopSel: $('diskStopSel'),
            jetsInner: $('jets-inner'), jetUp: $('jet-up'), jetDown: $('jet-down'), jetFlows: $('jet-flows'),
            lensGroup: $('p-lens'), lensUpper: $('lens-upper'), lensLower: $('lens-lower'), lensShadow: $('lens-shadow'),
            labels: $('bh-labels'), stars: $('bh-stars'),
            pBack: $('particles-back'), pFront: $('particles-front'),
            chips: $('bh-chips'), massGrid: $('bh-mass-grid'), massDesc: $('bh-mass-desc'),
            slider: $('bh-spin'), spinDesc: $('bh-spin-desc'),
            readMass: $('bh-readout-mass'), readSpin: $('bh-readout-spin'),
            infoTag: $('info-tag'), infoTitle: $('info-title'), infoShort: $('info-short'),
            infoBody: $('info-body'), infoData: $('info-data'), infoQuestion: $('info-question'),
            measures: $('bh-measures'), present: $('bh-present'),
            swLabels: $('sw-labels'), swLens: $('sw-lens'), swAnim: $('sw-anim'), swTour: $('sw-tour')
        };

        buildStars();
        buildStatic();
        buildParticles();
        buildChips();
        buildMassButtons();
        bindControls();

        el.swLabels.selected = state.labels;
        el.swAnim.selected = state.animate;

        updateGeometry();
        select(null);
        requestAnimationFrame(frame);
    }

    /* ---------------- Construcción ---------------- */
    function buildStars() {
        const rng = mulberry32(42);
        for (let i = 0; i < 90; i++) {
            el.stars.append(mk('circle', {
                class: 'bh-star', cx: f(rng() * W), cy: f(rng() * H), r: f(0.5 + rng() * 1.1)
            }));
        }
    }

    function buildStatic() {
        // Lente gravitacional: arco superior (parte trasera del disco) e inferior (imagen secundaria)
        const r1 = R_SHADOW * S;
        el.lensUpper.setAttribute('d', semiAnnulus(r1, 7.6 * S, true));
        el.lensLower.setAttribute('d', semiAnnulus(r1, (R_SHADOW + 0.7) * S, false));
        el.lensShadow.setAttribute('r', f(r1));

        // Líneas de flujo de los chorros
        for (let i = 0; i < 6; i++) {
            const p = mk('path', { class: 'jet-flow' });
            el.jetFlows.append(p);
            jetFlowEls.push(p);
        }
    }

    function buildParticles() {
        const rng = mulberry32(7);
        for (let i = 0; i < 170; i++) {
            const c = mk('circle', { class: 'particle', r: f(0.8 + rng() * 1.5) });
            particles.push({ el: c, u: Math.pow(rng(), 1.5), phi: rng() * 2 * Math.PI, back: null });
        }
        for (let i = 0; i < 14; i++) {
            const c = mk('circle', { class: 'plunger', r: '1.9' });
            plungers.push({ el: c, r: null, phi: 0, delay: rng() * 4, back: null, rng });
        }
    }

    function buildChips() {
        PARTS.forEach((p, i) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bh-chip';
            b.dataset.target = p.id;
            b.setAttribute('aria-pressed', 'false');
            b.innerHTML = `<span class="num">${String(i + 1).padStart(2, '0')}</span>`;
            b.append(p.chip);
            b.addEventListener('click', () => select(state.selected === p.id ? null : p.id));
            el.chips.append(b);
        });
    }

    function buildMassButtons() {
        MASSES.forEach((m) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'bh-mass';
            b.dataset.mass = m.id;
            b.textContent = m.label;
            b.addEventListener('click', () => setMass(m));
            el.massGrid.append(b);
        });
    }

    /* ---------------- Controles ---------------- */
    function bindControls() {
        svg.addEventListener('click', (e) => {
            const target = e.target.closest('[data-part]');
            select(target ? target.dataset.part : null);
        });

        el.slider.addEventListener('input', (e) => setSpin(Number(e.target.value), false));
        el.swLabels.addEventListener('change', (e) => { state.labels = e.target.selected; renderLabels(); });
        el.swLens.addEventListener('change', (e) => setLens(e.target.selected));
        el.swAnim.addEventListener('change', (e) => { state.animate = e.target.selected; });
        el.swTour.addEventListener('change', (e) => setTour(e.target.selected));
        el.present.addEventListener('click', togglePresent);

        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) exitPresent();
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.closest && e.target.closest('md-slider, input, textarea')) return;
            if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
            else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
            else if (e.key === 'Escape') {
                if (el.card.classList.contains('is-presenting') && !document.fullscreenElement) exitPresent();
                else select(null);
            }
        });
    }

    function step(dir, fromTour = false) {
        const ids = PARTS.map((p) => p.id);
        const i = ids.indexOf(state.selected);
        const next = i === -1 ? (dir > 0 ? 0 : ids.length - 1) : (i + dir + ids.length) % ids.length;
        select(ids[next], { fromTour });
    }

    function setSpin(v, syncSlider = true) {
        state.spin = Math.max(0, Math.min(0.99, v));
        if (syncSlider) el.slider.value = state.spin;
        updateGeometry();
    }

    function setMass(m) {
        state.massObj = m;
        renderReadout();
        renderInfo();
        renderMeasures();
    }

    function setLens(on) {
        state.lens = on;
        el.swLens.selected = on;
        el.lensGroup.style.display = on ? '' : 'none';
        renderLabels();
    }

    function setTour(on) {
        state.tour = on;
        el.swTour.selected = on;
        clearInterval(tourTimer);
        if (on) {
            step(1, true);
            tourTimer = setInterval(() => step(1, true), 10000);
        }
    }

    /* ---------------- Selección ---------------- */
    function select(id, opts = {}) {
        if (!opts.fromTour && state.tour && id !== state.selected) setTour(false);
        if (id === 'ergosfera' && state.spin < 0.05) setSpin(0.8);
        if (id === 'lente' && !state.lens) setLens(true);

        state.selected = id || null;
        svg.classList.toggle('has-selection', !!state.selected);
        if (state.selected) svg.dataset.sel = state.selected;
        else delete svg.dataset.sel;

        applySelectionClasses();
        el.chips.querySelectorAll('.bh-chip').forEach((b) => {
            b.setAttribute('aria-pressed', String(b.dataset.target === state.selected));
        });
        renderInfo();
    }

    function applySelectionClasses() {
        svg.querySelectorAll('[data-part]').forEach((n) => {
            n.classList.toggle('is-selected', n.dataset.part === state.selected);
        });
    }

    /* ---------------- Render ---------------- */
    function updateGeometry() {
        const g = (state.g = geom(state.spin));
        const spinning = g.a >= 0.02;

        // Horizonte
        el.horizon.setAttribute('r', f(g.rp * S));

        // Ergosfera
        el.ergoGroup.style.display = spinning ? '' : 'none';
        if (spinning) {
            const d = ergoPath(g.a);
            el.ergo.setAttribute('d', d);
            el.ergoHit.setAttribute('d', d);
        }

        // Esfera (franja) de fotones
        const band = circlePath(g.phRet * S) + ' ' + circlePath(g.phPro * S);
        el.phBand.setAttribute('d', band);
        el.phHit.setAttribute('d', band);
        el.phRet.setAttribute('r', f(g.phRet * S));
        el.phPro.setAttribute('r', f(g.phPro * S));
        el.phPro.style.display = spinning ? '' : 'none';

        // Singularidad: punto (sin giro) o anillo (con giro)
        el.singDot.style.display = spinning ? 'none' : '';
        el.singRing.style.display = spinning ? '' : 'none';
        el.singRing.setAttribute('rx', f(Math.max(3, g.a * S)));
        el.singRing.setAttribute('ry', f(Math.max(1.5, g.a * S * K)));

        // Disco + ISCO
        el.diskBack.setAttribute('d', ringHalf(g.isco, R_OUT, true));
        el.diskFront.setAttribute('d', ringHalf(g.isco, R_OUT, false));
        const ib = ellipseHalf(g.isco, true), iff = ellipseHalf(g.isco, false);
        el.iscoBack.setAttribute('d', ib); el.iscoBackHit.setAttribute('d', ib);
        el.iscoFront.setAttribute('d', iff); el.iscoFrontHit.setAttribute('d', iff);
        const off = f(g.isco / R_OUT);
        el.diskStop.setAttribute('offset', off);
        el.diskStopSel.setAttribute('offset', off);

        // Chorros: más anchos e intensos con más giro
        const base = g.rp * S, w0 = 5, w1 = 20 + 26 * g.a;
        el.jetUp.setAttribute('d', `M ${CX - w0} ${f(CY - base)} L ${f(CX - w1)} 0 L ${f(CX + w1)} 0 L ${CX + w0} ${f(CY - base)} Z`);
        el.jetDown.setAttribute('d', `M ${CX - w0} ${f(CY + base)} L ${f(CX - w1)} ${H} L ${f(CX + w1)} ${H} L ${CX + w0} ${f(CY + base)} Z`);
        [-0.6, 0, 0.6].forEach((k, i) => {
            jetFlowEls[i].setAttribute('d', `M ${f(CX + k * w0)} ${f(CY - base - 3)} L ${f(CX + k * w1 * 0.85)} 0`);
            jetFlowEls[i + 3].setAttribute('d', `M ${f(CX + k * w0)} ${f(CY + base + 3)} L ${f(CX + k * w1 * 0.85)} ${H}`);
        });
        el.jetsInner.style.opacity = f(0.35 + 0.65 * g.a);

        renderLabels();
        renderReadout();
        renderInfo();
        renderMeasures();
        if (!state.animate) animateStep(0);
    }

    function renderLabels() {
        el.labels.replaceChildren();
        if (!state.labels) return;
        const g = state.g;
        for (const p of PARTS) {
            if (p.id === 'ergosfera' && g.a < 0.02) continue;
            if (p.id === 'lente' && !state.lens) continue;
            const [ax, ay] = p.anchor(g);
            const left = p.side === 'L';
            const tx = left ? 200 : 600, ty = p.labelY;
            const lx = left ? tx + 6 : tx - 6, ly = ty - 4;
            const grp = mk('g', { class: 'bh-label', 'data-part': p.id });
            const line = { x1: f(ax), y1: f(ay), x2: lx, y2: ly };
            grp.append(
                mk('line', { class: 'bh-label-halo', ...line }),
                mk('line', { class: 'bh-label-line', ...line }),
                mk('circle', { class: 'bh-label-dot', cx: f(ax), cy: f(ay), r: 3.2 })
            );
            const t = mk('text', { x: tx, y: ty, 'text-anchor': left ? 'end' : 'start' });
            t.textContent = p.label;
            grp.append(t);
            el.labels.append(grp);
        }
        applySelectionClasses();
    }

    function spinWord(a) {
        if (a < 0.02) return 'sin rotación';
        if (a < 0.5) return 'rotación lenta';
        if (a < 0.9) return 'rotación rápida';
        return 'rotación casi máxima';
    }

    function renderReadout() {
        const a = state.spin.toFixed(2);
        el.readMass.textContent = state.massObj.label;
        el.readSpin.textContent = `a = ${a}`;
        el.spinDesc.textContent = `a = ${a} · ${spinWord(state.spin)}`;
        el.slider.valueLabel = a;
        el.massDesc.textContent = state.massObj.desc;
        el.massGrid.querySelectorAll('.bh-mass').forEach((b) => {
            b.setAttribute('aria-pressed', String(b.dataset.mass === state.massObj.id));
        });
    }

    function fillDl(dl, rows) {
        dl.replaceChildren();
        for (const [k, v] of rows) {
            const dt = document.createElement('dt');
            const dd = document.createElement('dd');
            dt.textContent = k;
            dd.textContent = v;
            dl.append(dt, dd);
        }
    }

    function renderInfo() {
        const p = PART_BY_ID[state.selected] || INTRO;
        el.infoTag.textContent = p.tag;
        el.infoTitle.textContent = p.name;
        el.infoShort.textContent = p.short;
        el.infoBody.textContent = p.body;
        el.infoQuestion.textContent = p.question;
        fillDl(el.infoData, p.data(state.g));
    }

    function renderMeasures() {
        const g = state.g;
        fillDl(el.measures, [
            ['Horizonte', fmtLen(km(g.rp))],
            ['Esfera de fotones', fmtLen(km(g.phPro))],
            ['ISCO', fmtLen(km(g.isco))],
            ['Sombra aparente', fmtLen(km(R_SHADOW))]
        ]);
    }

    /* ---------------- Animación ---------------- */
    function place(p, r, gBack, gFront) {
        p.el.setAttribute('cx', f(CX + r * S * Math.cos(p.phi)));
        p.el.setAttribute('cy', f(CY + r * S * K * Math.sin(p.phi)));
        const back = Math.sin(p.phi) < 0;
        if (back !== p.back) {
            (back ? gBack : gFront).append(p.el);
            p.back = back;
        }
    }

    function animateStep(dt) {
        const g = state.g;
        const rIn = g.isco;

        // Disco: rotación kepleriana (ω ∝ r^-3/2)
        for (const p of particles) {
            const r = rIn + p.u * (R_OUT - rIn);
            p.phi += OMEGA0 * Math.pow(r, -1.5) * dt;
            place(p, r, el.pBack, el.pFront);
        }

        // Caída en espiral dentro de la ISCO
        for (const p of plungers) {
            if (p.delay > 0) {
                p.delay -= dt;
                p.el.style.opacity = 0;
                continue;
            }
            if (p.r === null || p.r > rIn) { p.r = rIn; p.phi = p.rng() * 2 * Math.PI; }
            const span = Math.max(rIn - g.rp, 0.05);
            const x = (rIn - p.r) / span;
            p.r -= dt * (0.25 + 2.2 * x * x);
            p.phi += OMEGA0 * 1.3 * Math.pow(Math.max(p.r, 0.5), -1.5) * dt;
            if (p.r <= g.rp) {
                p.r = null;
                p.delay = 0.5 + p.rng() * 2.5;
                p.el.style.opacity = 0;
                continue;
            }
            p.el.style.opacity = f(Math.min(1, (p.r - g.rp) / 0.5));
            place(p, p.r, el.pBack, el.pFront);
        }

        // Chorros: el patrón de guiones fluye hacia afuera
        jetOffset -= dt * (25 + 55 * g.a);
        for (const j of jetFlowEls) j.style.strokeDashoffset = f(jetOffset);
    }

    let last = performance.now();
    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (state.animate) animateStep(dt);
        requestAnimationFrame(frame);
    }

    /* ---------------- Modo presentación ---------------- */
    async function togglePresent() {
        if (el.card.classList.contains('is-presenting')) {
            if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
            exitPresent();
            return;
        }
        el.card.classList.add('is-presenting');
        document.body.classList.add('bh-lock');
        el.present.textContent = 'Salir';
        if (el.card.requestFullscreen) {
            try { await el.card.requestFullscreen(); } catch (_) { /* iOS: queda el modo fijo */ }
        }
    }

    function exitPresent() {
        el.card.classList.remove('is-presenting');
        document.body.classList.remove('bh-lock');
        el.present.textContent = 'Pantalla completa';
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
