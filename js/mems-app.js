/**
 * MEMS Vector Studio - Application Controller (Parametric Rectangles Edition)
 * Fine Grid Drawing with Draggable & Resizable Rectangles paired with Real-Time 3D Isometric SVG.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    project: JSON.parse(JSON.stringify(MEMS_PRESETS.cantilever)),
    activeLayerIndex: 2, // Default to Cantilever layer
    selectedRectIndex: 1, // Default selected rectangle (beam)
    gridDivisions: 40, // 40x40 fine grid
    snapStep: 2.5, // 100 / 40 = 2.5%
    activeView: 'iso', // 'iso', 'cross'
    sliceY: 50, // Y coordinate for 2D cross section
    cutawayMode: 'none', // 'none', 'front_half', 'front_quarter'
    showHatch: true,
    showAnnotations: true,
    showGhostLayers: true,
    
    // Drag / Interaction State
    interactionMode: null, // 'creating', 'moving', 'resizing'
    resizeHandle: null, // 'nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'
    dragStart: { x: 0, y: 0 },
    initialRect: null,
    
    engine: null
  };

  // Initialize Engine
  state.engine = new MemsEngine({
    width: 880,
    height: 560,
    showHatch: state.showHatch,
    showAnnotations: state.showAnnotations,
    cutawayMode: state.cutawayMode
  });

  // DOM Elements
  const maskCanvasContainer = document.getElementById('maskGridCanvas');
  const svgViewport = document.getElementById('svgViewport');
  const layersListContainer = document.getElementById('layersListContainer');
  const templateSelect = document.getElementById('templateSelect');
  const gridSizeSelect = document.getElementById('gridSizeSelect');
  const projectTitleInput = document.getElementById('projectTitleInput');
  const sliceYSlider = document.getElementById('sliceYSlider');
  const sliceYValue = document.getElementById('sliceYValue');

  // Rectangle Inspector Inputs
  const rectXInput = document.getElementById('rectXInput');
  const rectYInput = document.getElementById('rectYInput');
  const rectWInput = document.getElementById('rectWInput');
  const rectHInput = document.getElementById('rectHInput');
  const deleteRectBtn = document.getElementById('deleteRectBtn');
  const duplicateRectBtn = document.getElementById('duplicateRectBtn');
  const addRectBtn = document.getElementById('addRectBtn');
  const fillWaferBtn = document.getElementById('fillWaferBtn');
  const clearLayerBtn = document.getElementById('clearLayerBtn');

  // View / Mode Buttons
  const viewIsoBtn = document.getElementById('viewIsoBtn');
  const viewCrossBtn = document.getElementById('viewCrossBtn');
  const cutawaySelect = document.getElementById('cutawaySelect');
  const toggleHatchBtn = document.getElementById('toggleHatchBtn');
  const toggleGhostBtn = document.getElementById('toggleGhostBtn');

  // Export / Persistence
  const addLayerBtn = document.getElementById('addLayerBtn');
  const exportSvgBtn = document.getElementById('exportSvgBtn');
  const exportPngBtn = document.getElementById('exportPngBtn');
  const copySvgBtn = document.getElementById('copySvgBtn');
  const saveJsonBtn = document.getElementById('saveJsonBtn');
  const loadJsonInput = document.getElementById('loadJsonInput');
  const toastEl = document.getElementById('memsToast');

  /**
   * Toast helper
   */
  function showToast(msg, duration = 2400) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => { toastEl.classList.remove('show'); }, duration);
  }

  /**
   * Snap value to fine grid
   */
  function snap(val) {
    const step = state.snapStep;
    return Math.round(val / step) * step;
  }

  /**
   * Render 3D Isometric Viewport
   */
  function renderViewport() {
    if (!svgViewport) return;

    state.engine.showHatch = state.showHatch;
    state.engine.showAnnotations = state.showAnnotations;
    state.engine.cutawayMode = state.cutawayMode;

    let svgMarkup = '';
    if (state.activeView === 'iso') {
      svgMarkup = state.engine.renderIsometricSVG(state.project, { cutaway: state.cutawayMode });
    } else {
      svgMarkup = state.engine.renderCrossSectionSVG(state.project, state.sliceY);
    }

    svgViewport.innerHTML = svgMarkup;
  }

  /**
   * Render Interactive 2D Layout Canvas with Draggable Rectangles & Handles
   */
  function render2DCanvas() {
    if (!maskCanvasContainer) return;

    const activeLayer = state.project.layers[state.activeLayerIndex] || state.project.layers[0];
    const activeMat = MEMS_MATERIALS[activeLayer.materialId] || MEMS_MATERIALS.si_substrate;

    const pad = 24;
    const canvasSize = 400; // 400x400 px work area
    const totalW = canvasSize + pad * 2;
    const totalH = canvasSize + pad * 2;
    const scale = canvasSize / 100; // 1% = 4px

    let fineGridLines = '';
    const divisions = state.gridDivisions;
    const step = 100 / divisions;

    // Generate fine grid lines
    for (let i = 0; i <= 100; i += step) {
      const pos = pad + i * scale;
      const isMajor = (i % 10 === 0);
      fineGridLines += `
        <line x1="${pos}" y1="${pad}" x2="${pos}" y2="${pad + canvasSize}" 
          stroke="${isMajor ? '#cccccc' : '#ededed'}" stroke-width="${isMajor ? 1 : 0.6}" />
        <line x1="${pad}" y1="${pos}" x2="${pad + canvasSize}" y2="${pos}" 
          stroke="${isMajor ? '#cccccc' : '#ededed'}" stroke-width="${isMajor ? 1 : 0.6}" />`;
    }

    // 1. Ghost Layers (Underlying layers for mask alignment)
    let ghostSvg = '';
    if (state.showGhostLayers && state.activeLayerIndex > 0) {
      for (let li = 0; li < state.activeLayerIndex; li++) {
        const gLayer = state.project.layers[li];
        if (!gLayer.visible) continue;
        const gMat = MEMS_MATERIALS[gLayer.materialId];
        const gRects = gLayer.rects || [];

        gRects.forEach(r => {
          const gx = pad + r.x * scale;
          const gy = pad + r.y * scale;
          const gw = r.w * scale;
          const gh = r.h * scale;
          ghostSvg += `
            <rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" 
              fill="${gMat.colorTop}" opacity="0.25" stroke="#111111" stroke-width="1" stroke-dasharray="2,2" rx="2" pointer-events="none" />`;
        });
      }
    }

    // 2. Active Layer Rectangles
    let rectsSvg = '';
    const rects = activeLayer.rects || [];

    rects.forEach((r, idx) => {
      const rx = pad + r.x * scale;
      const ry = pad + r.y * scale;
      const rw = r.w * scale;
      const rh = r.h * scale;
      const isSelected = (idx === state.selectedRectIndex);

      rectsSvg += `
        <g class="canvas-rect-group ${isSelected ? 'selected' : ''}" data-idx="${idx}">
          <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" 
            fill="${activeMat.colorTop}" stroke="#111111" stroke-width="${isSelected ? 2 : 1.2}" 
            opacity="0.85" rx="3" class="canvas-rect" data-idx="${idx}" style="cursor: move;" />
          
          <!-- Rectangle Dimension Label -->
          ${rw > 35 && rh > 18 ? `
          <text x="${rx + rw / 2}" y="${ry + rh / 2 + 4}" text-anchor="middle" 
            font-family="'Space Mono', monospace" font-size="9" font-weight="700" fill="#111111" pointer-events="none">
            ${r.w}%×${r.h}%
          </text>` : ''}

          <!-- Resize Handles if Selected -->
          ${isSelected ? renderResizeHandles(rx, ry, rw, rh) : ''}
        </g>`;
    });

    // 3. Slice Indicator Line for 2D Cross Section
    const sliceYPos = pad + state.sliceY * scale;
    const sliceLineSvg = `
      <g class="canvas-slice-line" pointer-events="none">
        <line x1="${pad - 12}" y1="${sliceYPos}" x2="${pad + canvasSize + 12}" y2="${sliceYPos}" stroke="#111111" stroke-width="2" stroke-dasharray="4,4" />
        <rect x="${pad + canvasSize + 16}" y="${sliceYPos - 9}" width="70" height="18" rx="4" fill="#111111" />
        <text x="${pad + canvasSize + 51}" y="${sliceYPos + 4}" text-anchor="middle" font-family="'Space Mono', monospace" font-size="9" font-weight="700" fill="#ffffff">CORTE 2D</text>
      </g>`;

    maskCanvasContainer.innerHTML = `
      <svg id="interactiveCanvasSvg" viewBox="0 0 ${totalW + 90} ${totalH}" width="100%" height="100%" style="user-select: none;">
        <!-- Base Platform -->
        <rect x="${pad}" y="${pad}" width="${canvasSize}" height="${canvasSize}" fill="#fafafa" stroke="#111111" stroke-width="1.5" rx="4" id="canvasBgArea" />
        
        <!-- Fine Grid Lines -->
        <g class="fine-grid-lines">
          ${fineGridLines}
        </g>

        <!-- Ghost Underlying Layers -->
        <g class="ghost-layers">
          ${ghostSvg}
        </g>

        <!-- Rectangles -->
        <g class="layer-rects-group">
          ${rectsSvg}
        </g>

        <!-- Slice Line -->
        ${sliceLineSvg}
      </svg>
    `;

    attachCanvasDragListeners(canvasSize, pad, scale);
    updateRectInspectorUI();
  }

  /**
   * Helper to render 8 resize handles for the selected rectangle
   */
  function renderResizeHandles(x, y, w, h) {
    const handleSize = 7;
    const half = handleSize / 2;

    const handles = [
      { type: 'nw', cx: x, cy: y, cursor: 'nwse-resize' },
      { type: 'ne', cx: x + w, cy: y, cursor: 'nesw-resize' },
      { type: 'se', cx: x + w, cy: y + h, cursor: 'nwse-resize' },
      { type: 'sw', cx: x, cy: y + h, cursor: 'nesw-resize' },
      { type: 'n', cx: x + w / 2, cy: y, cursor: 'ns-resize' },
      { type: 's', cx: x + w / 2, cy: y + h, cursor: 'ns-resize' },
      { type: 'w', cx: x, cy: y + h / 2, cursor: 'ew-resize' },
      { type: 'e', cx: x + w, cy: y + h / 2, cursor: 'ew-resize' }
    ];

    let handlesSvg = '';
    handles.forEach(hnd => {
      handlesSvg += `
        <rect x="${hnd.cx - half}" y="${hnd.cy - half}" width="${handleSize}" height="${handleSize}" 
          fill="#111111" stroke="#ffffff" stroke-width="1" rx="1.5" 
          class="resize-handle" data-handle="${hnd.type}" style="cursor: ${hnd.cursor};" />`;
    });

    return handlesSvg;
  }

  /**
   * Attach Mouse Drag, Move, Resize, and Create Events to 2D Canvas
   */
  function attachCanvasDragListeners(canvasSize, pad, scale) {
    const svgEl = document.getElementById('interactiveCanvasSvg');
    const bgArea = document.getElementById('canvasBgArea');
    const activeLayer = state.project.layers[state.activeLayerIndex];
    if (!svgEl || !activeLayer) return;

    function getCanvasCoords(e) {
      const rect = svgEl.getBoundingClientRect();
      const ptX = ((e.clientX - rect.left) / rect.width) * (canvasSize + pad * 2 + 90);
      const ptY = ((e.clientY - rect.top) / rect.height) * (canvasSize + pad * 2);
      const normX = Math.max(0, Math.min(100, (ptX - pad) / scale));
      const normY = Math.max(0, Math.min(100, (ptY - pad) / scale));
      return { normX, normY };
    }

    // 1. Mouse Down on Resize Handles
    svgEl.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        state.interactionMode = 'resizing';
        state.resizeHandle = handle.getAttribute('data-handle');
        const coords = getCanvasCoords(e);
        state.dragStart = coords;
        const selRect = activeLayer.rects[state.selectedRectIndex];
        state.initialRect = { ...selRect };
      });
    });

    // 2. Mouse Down on Rectangle Body (Selection & Move)
    svgEl.querySelectorAll('.canvas-rect').forEach(rectEl => {
      rectEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const idx = parseInt(rectEl.getAttribute('data-idx'), 10);
        state.selectedRectIndex = idx;
        state.interactionMode = 'moving';
        const coords = getCanvasCoords(e);
        state.dragStart = coords;
        const selRect = activeLayer.rects[idx];
        state.initialRect = { ...selRect };
        render2DCanvas();
      });
    });

    // 3. Mouse Down on Canvas Background (Create New Rectangle)
    bgArea.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const coords = getCanvasCoords(e);
      const startX = snap(coords.normX);
      const startY = snap(coords.normY);

      const newRect = {
        id: `r_${Date.now()}`,
        x: startX,
        y: startY,
        w: snap(state.snapStep * 4),
        h: snap(state.snapStep * 4)
      };

      if (!activeLayer.rects) activeLayer.rects = [];
      activeLayer.rects.push(newRect);
      state.selectedRectIndex = activeLayer.rects.length - 1;
      state.interactionMode = 'creating';
      state.dragStart = { normX: startX, normY: startY };
      state.initialRect = { ...newRect };
      render2DCanvas();
      renderViewport();
    });

    // 4. Global Mouse Move for Dragging / Resizing
    window.onmousemove = (e) => {
      if (!state.interactionMode || state.selectedRectIndex === null) return;
      const activeRect = activeLayer.rects[state.selectedRectIndex];
      if (!activeRect) return;

      const coords = getCanvasCoords(e);
      const dx = coords.normX - state.dragStart.normX;
      const dy = coords.normY - state.dragStart.normY;

      if (state.interactionMode === 'moving') {
        const newX = snap(Math.max(0, Math.min(100 - state.initialRect.w, state.initialRect.x + dx)));
        const newY = snap(Math.max(0, Math.min(100 - state.initialRect.h, state.initialRect.y + dy)));
        activeRect.x = newX;
        activeRect.y = newY;
      } else if (state.interactionMode === 'resizing' || state.interactionMode === 'creating') {
        const hnd = state.resizeHandle || 'se';
        let x0 = state.initialRect.x;
        let y0 = state.initialRect.y;
        let x1 = x0 + state.initialRect.w;
        let y1 = y0 + state.initialRect.h;

        if (state.interactionMode === 'creating') {
          x1 = snap(coords.normX);
          y1 = snap(coords.normY);
          activeRect.x = Math.min(x0, x1);
          activeRect.y = Math.min(y0, y1);
          activeRect.w = Math.max(state.snapStep, Math.abs(x1 - x0));
          activeRect.h = Math.max(state.snapStep, Math.abs(y1 - y0));
        } else {
          if (hnd.includes('e')) x1 = snap(Math.min(100, state.initialRect.x + state.initialRect.w + dx));
          if (hnd.includes('s')) y1 = snap(Math.min(100, state.initialRect.y + state.initialRect.h + dy));
          if (hnd.includes('w')) x0 = snap(Math.max(0, state.initialRect.x + dx));
          if (hnd.includes('n')) y0 = snap(Math.max(0, state.initialRect.y + dy));

          if (x1 - x0 >= state.snapStep) {
            activeRect.x = x0;
            activeRect.w = x1 - x0;
          }
          if (y1 - y0 >= state.snapStep) {
            activeRect.y = y0;
            activeRect.h = y1 - y0;
          }
        }
      }

      render2DCanvas();
      renderViewport();
    };

    // 5. Global Mouse Up
    window.onmouseup = () => {
      if (state.interactionMode) {
        state.interactionMode = null;
        state.resizeHandle = null;
        state.initialRect = null;
        render2DCanvas();
        renderViewport();
      }
    };
  }

  /**
   * Update Rectangle Numeric Inspector Fields
   */
  function updateRectInspectorUI() {
    const activeLayer = state.project.layers[state.activeLayerIndex];
    const selRect = activeLayer && activeLayer.rects ? activeLayer.rects[state.selectedRectIndex] : null;

    if (selRect) {
      if (rectXInput) rectXInput.value = selRect.x;
      if (rectYInput) rectYInput.value = selRect.y;
      if (rectWInput) rectWInput.value = selRect.w;
      if (rectHInput) rectHInput.value = selRect.h;
    }
  }

  // --- Inspector Event Listeners ---
  if (rectXInput) {
    rectXInput.addEventListener('input', (e) => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      const selRect = activeLayer && activeLayer.rects ? activeLayer.rects[state.selectedRectIndex] : null;
      if (selRect) {
        selRect.x = Math.max(0, Math.min(100 - selRect.w, parseFloat(e.target.value) || 0));
        render2DCanvas();
        renderViewport();
      }
    });
  }

  if (rectYInput) {
    rectYInput.addEventListener('input', (e) => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      const selRect = activeLayer && activeLayer.rects ? activeLayer.rects[state.selectedRectIndex] : null;
      if (selRect) {
        selRect.y = Math.max(0, Math.min(100 - selRect.h, parseFloat(e.target.value) || 0));
        render2DCanvas();
        renderViewport();
      }
    });
  }

  if (rectWInput) {
    rectWInput.addEventListener('input', (e) => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      const selRect = activeLayer && activeLayer.rects ? activeLayer.rects[state.selectedRectIndex] : null;
      if (selRect) {
        selRect.w = Math.max(state.snapStep, Math.min(100 - selRect.x, parseFloat(e.target.value) || state.snapStep));
        render2DCanvas();
        renderViewport();
      }
    });
  }

  if (rectHInput) {
    rectHInput.addEventListener('input', (e) => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      const selRect = activeLayer && activeLayer.rects ? activeLayer.rects[state.selectedRectIndex] : null;
      if (selRect) {
        selRect.h = Math.max(state.snapStep, Math.min(100 - selRect.y, parseFloat(e.target.value) || state.snapStep));
        render2DCanvas();
        renderViewport();
      }
    });
  }

  // Add Rectangle
  if (addRectBtn) {
    addRectBtn.addEventListener('click', () => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      if (!activeLayer.rects) activeLayer.rects = [];
      const newR = { id: `r_${Date.now()}`, x: 30, y: 30, w: 40, h: 40 };
      activeLayer.rects.push(newR);
      state.selectedRectIndex = activeLayer.rects.length - 1;
      render2DCanvas();
      renderViewport();
      showToast('Rectángulo añadido');
    });
  }

  // Duplicate Rectangle
  if (duplicateRectBtn) {
    duplicateRectBtn.addEventListener('click', () => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      const selRect = activeLayer && activeLayer.rects ? activeLayer.rects[state.selectedRectIndex] : null;
      if (!selRect) return;
      const cloned = { ...selRect, id: `r_${Date.now()}`, x: Math.min(100 - selRect.w, selRect.x + 5), y: Math.min(100 - selRect.h, selRect.y + 5) };
      activeLayer.rects.push(cloned);
      state.selectedRectIndex = activeLayer.rects.length - 1;
      render2DCanvas();
      renderViewport();
      showToast('Rectángulo duplicado');
    });
  }

  // Delete Rectangle
  if (deleteRectBtn) {
    deleteRectBtn.addEventListener('click', () => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      if (activeLayer && activeLayer.rects && activeLayer.rects.length > 0 && state.selectedRectIndex !== null) {
        activeLayer.rects.splice(state.selectedRectIndex, 1);
        state.selectedRectIndex = activeLayer.rects.length > 0 ? 0 : null;
        render2DCanvas();
        renderViewport();
        showToast('Rectángulo eliminado');
      }
    });
  }

  // Fill Full Wafer (0..100)
  if (fillWaferBtn) {
    fillWaferBtn.addEventListener('click', () => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      activeLayer.rects = [{ id: `r_full_${Date.now()}`, x: 5, y: 5, w: 90, h: 90 }];
      state.selectedRectIndex = 0;
      render2DCanvas();
      renderViewport();
      showToast('Oblea completa rellenada');
    });
  }

  // Clear Layer
  if (clearLayerBtn) {
    clearLayerBtn.addEventListener('click', () => {
      const activeLayer = state.project.layers[state.activeLayerIndex];
      activeLayer.rects = [];
      state.selectedRectIndex = null;
      render2DCanvas();
      renderViewport();
      showToast('Capa limpiada');
    });
  }

  /**
   * Render Layer Stack List in Sidebar / Bottom
   */
  function renderLayersListUI() {
    if (!layersListContainer) return;
    layersListContainer.innerHTML = '';

    const layers = state.project.layers;

    layers.forEach((layer, idx) => {
      const mat = MEMS_MATERIALS[layer.materialId] || MEMS_MATERIALS.si_substrate;
      const isSelected = (idx === state.activeLayerIndex);

      const layerItem = document.createElement('div');
      layerItem.className = `layer-card ${isSelected ? 'selected' : ''}`;
      
      let matOptions = '';
      for (const [k, v] of Object.entries(MEMS_MATERIALS)) {
        matOptions += `<option value="${k}" ${k === layer.materialId ? 'selected' : ''}>${v.name}</option>`;
      }

      layerItem.innerHTML = `
        <div class="layer-card-header">
          <div class="layer-select-badge" data-idx="${idx}">
            <span class="layer-dot" style="background-color: ${mat.colorTop}"></span>
            <input type="text" class="layer-name-edit" value="${layer.name || mat.name}" data-idx="${idx}" />
          </div>
          <div class="layer-quick-actions">
            <button class="btn-micro toggle-vis-btn" title="Visibilidad" data-idx="${idx}">
              ${layer.visible !== false ? '👁️' : '🚫'}
            </button>
            ${layers.length > 1 ? `<button class="btn-micro delete-layer-btn" title="Eliminar capa" data-idx="${idx}">✕</button>` : ''}
          </div>
        </div>
        
        <div class="layer-card-body">
          <div class="form-row">
            <label>Material:</label>
            <select class="mat-select" data-idx="${idx}">
              ${matOptions}
            </select>
          </div>
          <div class="form-row">
            <label>Espesor (${layer.thickness || 20} µm):</label>
            <input type="range" class="thickness-slider" min="4" max="60" value="${layer.thickness || 20}" data-idx="${idx}" />
          </div>
        </div>
      `;

      // Select Layer to Draw on Click
      layerItem.querySelector('.layer-select-badge').addEventListener('click', () => {
        state.activeLayerIndex = idx;
        state.selectedRectIndex = layer.rects && layer.rects.length > 0 ? 0 : null;
        renderLayersListUI();
        render2DCanvas();
      });

      layersListContainer.appendChild(layerItem);
    });

    attachLayerListListeners();
  }

  function attachLayerListListeners() {
    // Name editing
    layersListContainer.querySelectorAll('.layer-name-edit').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        state.project.layers[idx].name = e.target.value;
        renderViewport();
      });
    });

    // Material selector
    layersListContainer.querySelectorAll('.mat-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        state.project.layers[idx].materialId = e.target.value;
        renderLayersListUI();
        render2DCanvas();
        renderViewport();
      });
    });

    // Thickness Slider
    layersListContainer.querySelectorAll('.thickness-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        state.project.layers[idx].thickness = parseInt(e.target.value, 10);
        renderLayersListUI();
        renderViewport();
      });
    });

    // Toggle Visibility
    layersListContainer.querySelectorAll('.toggle-vis-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        state.project.layers[idx].visible = !(state.project.layers[idx].visible !== false);
        renderLayersListUI();
        render2DCanvas();
        renderViewport();
      });
    });

    // Delete Layer
    layersListContainer.querySelectorAll('.delete-layer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        state.project.layers.splice(idx, 1);
        if (state.activeLayerIndex >= state.project.layers.length) {
          state.activeLayerIndex = Math.max(0, state.project.layers.length - 1);
        }
        state.selectedRectIndex = 0;
        renderLayersListUI();
        render2DCanvas();
        renderViewport();
        showToast('Capa eliminada');
      });
    });
  }

  // --- Add Layer ---
  addLayerBtn.addEventListener('click', () => {
    const newLayer = {
      id: `layer_${Date.now()}`,
      name: `Nueva Capa ${state.project.layers.length + 1}`,
      materialId: 'polysilicon',
      thickness: 18,
      visible: true,
      rects: [{ id: `r_${Date.now()}`, x: 20, y: 20, w: 60, h: 60 }]
    };
    state.project.layers.push(newLayer);
    state.activeLayerIndex = state.project.layers.length - 1;
    state.selectedRectIndex = 0;
    renderLayersListUI();
    render2DCanvas();
    renderViewport();
    showToast('Capa añadida al stack');
  });

  // --- View Switcher ---
  viewIsoBtn.addEventListener('click', () => {
    state.activeView = 'iso';
    viewIsoBtn.classList.add('active');
    viewCrossBtn.classList.remove('active');
    renderViewport();
  });

  viewCrossBtn.addEventListener('click', () => {
    state.activeView = 'cross';
    viewCrossBtn.classList.add('active');
    viewIsoBtn.classList.remove('active');
    renderViewport();
  });

  // Cutaway mode
  cutawaySelect.addEventListener('change', (e) => {
    state.cutawayMode = e.target.value;
    renderViewport();
  });

  // Hatch toggle
  toggleHatchBtn.addEventListener('click', () => {
    state.showHatch = !state.showHatch;
    toggleHatchBtn.classList.toggle('active', state.showHatch);
    renderViewport();
  });

  // Ghost layer toggle
  toggleGhostBtn.addEventListener('click', () => {
    state.showGhostLayers = !state.showGhostLayers;
    toggleGhostBtn.classList.toggle('active', state.showGhostLayers);
    render2DCanvas();
  });

  // Slice Y Slider (Cross Section)
  sliceYSlider.addEventListener('input', (e) => {
    state.sliceY = parseFloat(e.target.value);
    sliceYValue.textContent = `${state.sliceY}%`;
    render2DCanvas();
    if (state.activeView === 'cross') {
      renderViewport();
    }
  });

  // --- Template Selector ---
  templateSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (MEMS_PRESETS[key]) {
      state.project = JSON.parse(JSON.stringify(MEMS_PRESETS[key]));
      state.activeLayerIndex = Math.min(2, state.project.layers.length - 1);
      state.selectedRectIndex = 0;
      if (gridSizeSelect) gridSizeSelect.value = state.project.gridDivisions || 40;
      if (projectTitleInput) projectTitleInput.value = state.project.title;

      renderLayersListUI();
      render2DCanvas();
      renderViewport();
      showToast(`Plantilla cargada: ${state.project.title}`);
    }
  });

  // --- Fine Grid Selector ---
  gridSizeSelect.addEventListener('change', (e) => {
    const newDivs = parseInt(e.target.value, 10);
    state.gridDivisions = newDivs;
    state.snapStep = 100 / newDivs;
    state.project.gridDivisions = newDivs;
    render2DCanvas();
    renderViewport();
    showToast(`Cuadrícula fina: ${newDivs}x${newDivs} (Snap ${state.snapStep.toFixed(1)}%)`);
  });

  // Project Title
  projectTitleInput.addEventListener('input', (e) => {
    state.project.title = e.target.value;
    renderViewport();
  });

  // --- Exporting ---
  function getSVGString() {
    if (state.activeView === 'iso') {
      return state.engine.renderIsometricSVG(state.project, { cutaway: state.cutawayMode });
    } else {
      return state.engine.renderCrossSectionSVG(state.project, state.sliceY);
    }
  }

  // Export SVG File
  exportSvgBtn.addEventListener('click', () => {
    const svgData = getSVGString();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (state.project.title || 'mems_structure').toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.download = `${safeTitle}_${state.activeView}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SVG exportado con éxito');
  });

  // Copy SVG to Clipboard
  copySvgBtn.addEventListener('click', async () => {
    const svgData = getSVGString();
    try {
      await navigator.clipboard.writeText(svgData);
      showToast('Código SVG copiado al portapapeles');
    } catch (err) {
      showToast('Error al copiar al portapapeles');
    }
  });

  // Export PNG HD (300 DPI)
  exportPngBtn.addEventListener('click', () => {
    const svgData = getSVGString();
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const scaleFactor = 3.0; // Ultra HD 300 DPI
      const canvas = document.createElement('canvas');
      canvas.width = 880 * scaleFactor;
      canvas.height = 560 * scaleFactor;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        const safeTitle = (state.project.title || 'mems_structure').toLowerCase().replace(/[^a-z0-9]/g, '_');
        a.download = `${safeTitle}_${state.activeView}_300dpi.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
        showToast('PNG HD descargado');
      }, 'image/png');
    };
    img.src = url;
  });

  // Save Project JSON
  saveJsonBtn.addEventListener('click', () => {
    const jsonStr = JSON.stringify(state.project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mems_recipe_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Proyecto guardado en JSON');
  });

  // Load Project JSON
  loadJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loaded = JSON.parse(event.target.result);
        if (loaded && loaded.layers && Array.isArray(loaded.layers)) {
          state.project = loaded;
          state.activeLayerIndex = 0;
          state.selectedRectIndex = 0;
          if (gridSizeSelect) gridSizeSelect.value = state.project.gridDivisions || 40;
          if (projectTitleInput) projectTitleInput.value = state.project.title;
          renderLayersListUI();
          render2DCanvas();
          renderViewport();
          showToast('Proyecto cargado con éxito');
        } else {
          showToast('Formato JSON no válido');
        }
      } catch (err) {
        showToast('Error al parsear el archivo JSON');
      }
    };
    reader.readAsText(file);
  });

  // Initial Boot
  renderLayersListUI();
  render2DCanvas();
  renderViewport();
});
