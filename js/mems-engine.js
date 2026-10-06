/**
 * MEMS Vector Engine (MemsEngine) - Parametric Rectangles Edition
 * Renders layered 3D Isometric SVG and 2D Cross-Section SVG with accurate depth ordering.
 */

class MemsEngine {
  constructor(options = {}) {
    this.width = options.width || 880;
    this.height = options.height || 560;
    this.isoAngle = options.isoAngle || (Math.PI / 6); // 30 degrees standard
    this.scale = options.scale || 3.3;
    this.zScale = options.zScale || 0.8; // Vertical height aspect ratio
    this.originX = options.originX || (this.width / 2);
    this.originY = options.originY || (this.height / 2 + 65);
    this.showHatch = options.showHatch !== undefined ? options.showHatch : true;
    this.showWireframe = options.showWireframe !== undefined ? options.showWireframe : true;
    this.showAnnotations = options.showAnnotations !== undefined ? options.showAnnotations : true;
    this.cutawayMode = options.cutawayMode || 'none'; // 'none', 'front_half', 'front_quarter'
  }

  /**
   * Project 3D coordinate (x, y, z) into 2D Isometric screen coordinates
   */
  projectIso(x, y, z) {
    const cosA = Math.cos(this.isoAngle);
    const sinA = Math.sin(this.isoAngle);
    
    // Center geometry around (50, 50)
    const cx = x - 50;
    const cy = y - 50;

    const sx = (cx - cy) * cosA * this.scale + this.originX;
    const sy = ((cx + cy) * sinA - z * this.zScale) * this.scale + this.originY;
    return { x: sx, y: sy };
  }

  /**
   * Generate SVG Hatch Pattern Definitions
   */
  generateSVGDefs() {
    return `
    <defs>
      <!-- Academic Hatch Patterns (Pure Vector) -->
      <pattern id="hatch-diagonal" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#111111" stroke-width="1.0" stroke-opacity="0.35" />
      </pattern>
      
      <pattern id="hatch-dense-diagonal" width="5" height="5" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="5" stroke="#111111" stroke-width="1.0" stroke-opacity="0.4" />
      </pattern>

      <pattern id="hatch-cross" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="10" stroke="#111111" stroke-width="0.9" stroke-opacity="0.3" />
        <line x1="0" y1="0" x2="10" y2="0" stroke="#111111" stroke-width="0.9" stroke-opacity="0.3" />
      </pattern>

      <pattern id="hatch-vertical" width="6" height="6" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke="#111111" stroke-width="1.1" stroke-opacity="0.35" />
      </pattern>

      <pattern id="hatch-dots" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.3" fill="#111111" fill-opacity="0.35" />
      </pattern>

      <pattern id="hatch-dots-fine" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="2.5" cy="2.5" r="0.9" fill="#111111" fill-opacity="0.35" />
      </pattern>

      <pattern id="hatch-bricks" width="14" height="8" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="14" y2="0" stroke="#111111" stroke-width="0.9" stroke-opacity="0.35" />
        <line x1="0" y1="4" x2="14" y2="4" stroke="#111111" stroke-width="0.9" stroke-opacity="0.35" />
        <line x1="0" y1="0" x2="0" y2="4" stroke="#111111" stroke-width="0.9" stroke-opacity="0.35" />
        <line x1="7" y1="4" x2="7" y2="8" stroke="#111111" stroke-width="0.9" stroke-opacity="0.35" />
      </pattern>

      <!-- Markers for Dimension Arrows -->
      <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M 2 1.5 L 8 5 L 2 8.5 z" fill="#111111" />
      </marker>
    </defs>`;
  }

  /**
   * Render 3D Isometric View from multi-layer parametric rectangles
   */
  renderIsometricSVG(project, customOptions = {}) {
    const cutaway = customOptions.cutaway || this.cutawayMode;
    const layers = (project.layers || []).filter(l => l.visible !== false);

    // Compute Z offsets stack
    let currentZ = 0;
    const computedLayers = layers.map((l, lIdx) => {
      const z0 = currentZ;
      const z1 = z0 + (l.thickness || 16);
      currentZ = z1;
      return {
        ...l,
        z0,
        z1,
        layerIndex: lIdx,
        mat: MEMS_MATERIALS[l.materialId] || MEMS_MATERIALS.si_substrate
      };
    });

    // Collect all rectangular blocks
    const prisms = [];

    computedLayers.forEach(layer => {
      const rects = layer.rects || [];
      rects.forEach((rect, rIdx) => {
        let x0 = rect.x;
        let x1 = rect.x + rect.w;
        let y0 = rect.y;
        let y1 = rect.y + rect.h;

        // Apply 3D cutaway clipping
        if (cutaway === 'front_half' || cutaway === 'front_quarter') {
          if (y0 >= 50) return; // Completely clipped
          if (y1 > 50) y1 = 50; // Cut at y = 50
        }
        if (cutaway === 'front_quarter') {
          if (x0 >= 50) return;
          if (x1 > 50) x1 = 50;
        }

        if (x1 <= x0 || y1 <= y0) return;

        prisms.push({
          id: rect.id || `r_${layer.id}_${rIdx}`,
          layer,
          mat: layer.mat,
          x0, x1, y0, y1,
          z0: layer.z0,
          z1: layer.z1,
          // CRITICAL: Sort primarily by layer vertical height z0, then by (y1 + x1)
          depthKey: layer.z0 * 10000 + (y1 + x1)
        });
      });
    });

    // Sort prisms from bottom layers to top layers, and back to front
    prisms.sort((a, b) => a.depthKey - b.depthKey);

    // Render 3D faces for each prism
    let prismsSvg = '';
    const strokeColor = '#111111';
    const strokeWidth = '1.2';

    prisms.forEach(prism => {
      const { mat, x0, x1, y0, y1, z0, z1 } = prism;

      // 8 Isometric Vertices
      const p000 = this.projectIso(x0, y0, z0);
      const p100 = this.projectIso(x1, y0, z0);
      const p110 = this.projectIso(x1, y1, z0);
      const p010 = this.projectIso(x0, y1, z0);

      const p001 = this.projectIso(x0, y0, z1);
      const p101 = this.projectIso(x1, y0, z1);
      const p111 = this.projectIso(x1, y1, z1);
      const p011 = this.projectIso(x0, y1, z1);

      // Top Face (Z = z1)
      const topPath = `M ${p001.x},${p001.y} L ${p101.x},${p101.y} L ${p111.x},${p111.y} L ${p011.x},${p011.y} Z`;
      
      // Front-Left Face (Y = y1)
      const leftPath = `M ${p011.x},${p011.y} L ${p111.x},${p111.y} L ${p110.x},${p110.y} L ${p010.x},${p010.y} Z`;

      // Front-Right Face (X = x1)
      const rightPath = `M ${p101.x},${p101.y} L ${p111.x},${p111.y} L ${p110.x},${p110.y} L ${p100.x},${p100.y} Z`;

      prismsSvg += `
      <g class="iso-prism" data-layer="${prism.layer.id}">
        <!-- Front-Left Face -->
        <path d="${leftPath}" fill="${mat.colorLeft}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" opacity="${mat.opacity}" />
        ${this.showHatch && mat.hatch !== 'none' ? `<path d="${leftPath}" fill="url(#${mat.hatch})" opacity="0.65" />` : ''}

        <!-- Front-Right Face -->
        <path d="${rightPath}" fill="${mat.colorRight}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" opacity="${mat.opacity}" />
        ${this.showHatch && mat.hatch !== 'none' ? `<path d="${rightPath}" fill="url(#${mat.hatch})" opacity="0.75" />` : ''}

        <!-- Top Face -->
        <path d="${topPath}" fill="${mat.colorTop}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" opacity="${mat.opacity}" />
        ${this.showHatch && mat.hatch !== 'none' ? `<path d="${topPath}" fill="url(#${mat.hatch})" opacity="0.5" />` : ''}
      </g>`;
    });

    const annotationsSvg = this.renderLayerAnnotations(computedLayers);
    const axesSvg = this.renderAxes();
    const baseGridSvg = this.renderBaseWaferGrid(project.gridDivisions || 40);

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}" style="background-color: #f4f4f4; font-family: 'Space Mono', monospace;">
  ${this.generateSVGDefs()}
  <rect width="${this.width}" height="${this.height}" fill="#f4f4f4" />

  <!-- Header Box -->
  <g class="mems-header" transform="translate(30, 40)">
    <text x="0" y="0" font-family="'Inter', sans-serif" font-size="18" font-weight="700" fill="#111111" letter-spacing="-0.5px">
      ${project.title || 'Estructura MEMS'}
    </text>
    <text x="0" y="20" font-family="'Space Mono', monospace" font-size="11" fill="#555555" text-transform="uppercase">
      VISTA ISOMÉTRICA (RECTÁNGULOS VECTORIALES) ${cutaway !== 'none' ? '• CORTE 3D ACTIVADO' : ''}
    </text>
  </g>

  <!-- Base Grid Platform -->
  <g class="mems-base-grid" opacity="0.45">
    ${baseGridSvg}
  </g>

  <!-- 3D Geometric Prisms -->
  <g class="mems-structure">
    ${prismsSvg}
  </g>

  <!-- Annotations & Legend -->
  ${annotationsSvg}

  <!-- Coordinate Axes -->
  ${axesSvg}
</svg>`.trim();
  }

  /**
   * Render 2D Cross-Section SVG along slice line Y = sliceY
   */
  renderCrossSectionSVG(project, sliceY = 50) {
    const layers = (project.layers || []).filter(l => l.visible !== false);
    const w = this.width;
    const h = this.height;
    const padX = 70;
    const padY = 120;
    const drawW = w - padX * 2;
    const drawH = h - padY * 2;

    let totalZ = 0;
    layers.forEach(l => { totalZ += (l.thickness || 16); });
    const maxZ = Math.max(70, totalZ + 20);

    const scaleX = drawW / 100;
    const scaleZ = drawH / maxZ;
    const baselineY = h - padY;

    let layersCrossSvg = '';
    let currentZ = 0;

    layers.forEach(layer => {
      const mat = MEMS_MATERIALS[layer.materialId] || MEMS_MATERIALS.si_substrate;
      const th = layer.thickness || 16;
      const z0 = currentZ;
      const z1 = z0 + th;
      currentZ = z1;

      const rects = layer.rects || [];
      rects.forEach(rect => {
        const y0 = rect.y;
        const y1 = rect.y + rect.h;

        // Check if slice intersects this rectangle
        if (sliceY >= y0 && sliceY <= y1) {
          const bx = padX + rect.x * scaleX;
          const by = baselineY - z1 * scaleZ;
          const bw = rect.w * scaleX;
          const bh = th * scaleZ;

          layersCrossSvg += `
          <g class="cross-rect" data-layer="${layer.id}">
            <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${mat.colorTop}" stroke="#111111" stroke-width="1.3" opacity="${mat.opacity}" />
            ${this.showHatch && mat.hatch !== 'none' ? `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="url(#${mat.hatch})" opacity="0.6" />` : ''}
            
            ${bw > 50 && bh > 14 ? `
            <text x="${bx + bw / 2}" y="${by + bh / 2 + 4}" text-anchor="middle" font-family="'Space Mono', monospace" font-size="10" font-weight="700" fill="#111111">
              ${layer.name}
            </text>` : ''}
          </g>`;
        }
      });
    });

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="background-color: #f4f4f4; font-family: 'Space Mono', monospace;">
  ${this.generateSVGDefs()}
  <rect width="${w}" height="${h}" fill="#f4f4f4" />

  <g class="mems-header" transform="translate(30, 40)">
    <text x="0" y="0" font-family="'Inter', sans-serif" font-size="18" font-weight="700" fill="#111111" letter-spacing="-0.5px">
      ${project.title || 'Corte Transversal'}
    </text>
    <text x="0" y="20" font-family="'Space Mono', monospace" font-size="11" fill="#555555" text-transform="uppercase">
      CORTE 2D EN Y = ${sliceY.toFixed(1)}%
    </text>
  </g>

  <!-- Baseline -->
  <line x1="${padX - 15}" y1="${baselineY}" x2="${w - padX + 15}" y2="${baselineY}" stroke="#111111" stroke-width="1.5" stroke-dasharray="3,3" />

  <!-- Rendered Slices -->
  <g class="mems-cross-layers">
    ${layersCrossSvg}
  </g>

  <!-- Scale Bar Indicator -->
  <g class="mems-scale-bar" transform="translate(${padX}, ${h - 55})">
    <line x1="0" y1="0" x2="${scaleX * 25}" y2="0" stroke="#111111" stroke-width="3" />
    <line x1="0" y1="-5" x2="0" y2="5" stroke="#111111" stroke-width="2" />
    <line x1="${scaleX * 25}" y1="-5" x2="${scaleX * 25}" y2="5" stroke="#111111" stroke-width="2" />
    <text x="${scaleX * 12.5}" y="18" text-anchor="middle" font-family="'Space Mono', monospace" font-size="11" font-weight="700" fill="#111111">
      25 µm (25% ANCHO)
    </text>
  </g>
</svg>`.trim();
  }

  /**
   * Render fine base grid lines
   */
  renderBaseWaferGrid(divisions = 40) {
    const step = 100 / divisions;
    let gridLines = '';

    for (let c = 0; c <= 100; c += step * 4) {
      const pA = this.projectIso(c, 0, 0);
      const pB = this.projectIso(c, 100, 0);
      gridLines += `<line x1="${pA.x}" y1="${pA.y}" x2="${pB.x}" y2="${pB.y}" stroke="#aaaaaa" stroke-width="0.8" stroke-dasharray="2,2" />`;
    }

    for (let r = 0; r <= 100; r += step * 4) {
      const pA = this.projectIso(0, r, 0);
      const pB = this.projectIso(100, r, 0);
      gridLines += `<line x1="${pA.x}" y1="${pA.y}" x2="${pB.x}" y2="${pB.y}" stroke="#aaaaaa" stroke-width="0.8" stroke-dasharray="2,2" />`;
    }

    return gridLines;
  }

  /**
   * Render Layer Annotations Legend
   */
  renderLayerAnnotations(layers) {
    if (!this.showAnnotations) return '';

    let legendItems = '';
    const boxX = this.width - 240;
    let cursorY = 40;

    layers.forEach((layer, idx) => {
      const mat = layer.mat;
      legendItems += `
      <g transform="translate(0, ${idx * 28})">
        <rect x="0" y="0" width="16" height="16" rx="3" fill="${mat.colorTop}" stroke="#111111" stroke-width="1.2" />
        ${this.showHatch && mat.hatch !== 'none' ? `<rect x="0" y="0" width="16" height="16" rx="3" fill="url(#${mat.hatch})" opacity="0.6" />` : ''}
        <text x="24" y="12" font-family="'Space Mono', monospace" font-size="11" font-weight="700" fill="#111111">
          ${layer.name || mat.name} (${layer.thickness || 16}µm)
        </text>
      </g>`;
    });

    return `
    <g class="mems-legend" transform="translate(${boxX}, ${cursorY})">
      <rect x="-12" y="-12" width="230" height="${layers.length * 28 + 20}" rx="10" fill="#ffffff" stroke="#111111" stroke-width="1.2" />
      <text x="0" y="4" font-family="'Space Mono', monospace" font-size="10" font-weight="700" fill="#555555" text-transform="uppercase">
        CAPAS DEL DISPOSITIVO
      </text>
      <g transform="translate(0, 16)">
        ${legendItems}
      </g>
    </g>`;
  }

  /**
   * Render Coordinate Direction Axes
   */
  renderAxes() {
    const o = { x: 70, y: this.height - 60 };
    const len = 40;
    const cosA = Math.cos(this.isoAngle);
    const sinA = Math.sin(this.isoAngle);

    const xEnd = { x: o.x + len * cosA, y: o.y + len * sinA };
    const yEnd = { x: o.x - len * cosA, y: o.y + len * sinA };
    const zEnd = { x: o.x, y: o.y - len };

    return `
    <g class="mems-axes">
      <!-- X [110] -->
      <line x1="${o.x}" y1="${o.y}" x2="${xEnd.x}" y2="${xEnd.y}" stroke="#111111" stroke-width="1.5" marker-end="url(#arrow-end)" />
      <text x="${xEnd.x + 6}" y="${xEnd.y + 4}" font-family="'Space Mono', monospace" font-size="10" font-weight="700" fill="#111111">X</text>

      <!-- Y [1-10] -->
      <line x1="${o.x}" y1="${o.y}" x2="${yEnd.x}" y2="${yEnd.y}" stroke="#111111" stroke-width="1.5" marker-end="url(#arrow-end)" />
      <text x="${yEnd.x - 14}" y="${yEnd.y + 4}" font-family="'Space Mono', monospace" font-size="10" font-weight="700" fill="#111111">Y</text>

      <!-- Z [001] -->
      <line x1="${o.x}" y1="${o.y}" x2="${zEnd.x}" y2="${zEnd.y}" stroke="#111111" stroke-width="1.5" marker-end="url(#arrow-end)" />
      <text x="${zEnd.x - 5}" y="${zEnd.y - 6}" font-family="'Space Mono', monospace" font-size="10" font-weight="700" fill="#111111">Z</text>

      <circle cx="${o.x}" cy="${o.y}" r="2.5" fill="#111111" />
    </g>`;
  }
}

// Scope Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MemsEngine };
} else {
  window.MemsEngine = MemsEngine;
}
