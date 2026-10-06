/**
 * MEMS Materials & Parametric Rectangle Presets
 * Microelectronic materials catalog with academic hatch patterns and clean presets.
 */

const MEMS_MATERIALS = {
  si_substrate: {
    id: 'si_substrate',
    name: 'Silicio (Sustrato Si <100>)',
    category: 'substrate',
    color: '#8a9ba8',
    colorTop: '#a2b4c2',
    colorLeft: '#738491',
    colorRight: '#5d6d7a',
    stroke: '#111111',
    hatch: 'hatch-diagonal',
    hatchColor: '#5d6d7a',
    opacity: 1.0,
    description: 'Sustrato de Silicio monocristalino tipo P/N <100>'
  },
  sio2_thermal: {
    id: 'sio2_thermal',
    name: 'Dióxido de Silicio (SiO2 Térmico / Sacrificial)',
    category: 'dielectric',
    color: '#4fa3d1',
    colorTop: '#6cb8e2',
    colorLeft: '#3c8ab5',
    colorRight: '#2f7297',
    stroke: '#111111',
    hatch: 'hatch-dots',
    hatchColor: '#255e7f',
    opacity: 0.92,
    description: 'Óxido de silicio para aislamiento, máscara dura o capa sacrificial'
  },
  si3n4: {
    id: 'si3n4',
    name: 'Nitruro de Silicio (Si3N4 LPCVD)',
    category: 'dielectric',
    color: '#34b79b',
    colorTop: '#4fd1b5',
    colorLeft: '#279880',
    colorRight: '#1c7b67',
    stroke: '#111111',
    hatch: 'hatch-dense-diagonal',
    hatchColor: '#1a6f5d',
    opacity: 0.95,
    description: 'Dieléctrico de alta rigidez y máscara para grabado KOH'
  },
  polysilicon: {
    id: 'polysilicon',
    name: 'Polisilicio (Poly-Si Estructural)',
    category: 'semiconductor',
    color: '#e07a5f',
    colorTop: '#ea937d',
    colorLeft: '#c86248',
    colorRight: '#a94d36',
    stroke: '#111111',
    hatch: 'hatch-bricks',
    hatchColor: '#96402b',
    opacity: 1.0,
    description: 'Capa estructural para microvigas, membranas y sensores'
  },
  gold: {
    id: 'gold',
    name: 'Oro (Au) / Metalización',
    category: 'metal',
    color: '#f4c430',
    colorTop: '#f9d868',
    colorLeft: '#d6a81e',
    colorRight: '#b58c11',
    stroke: '#111111',
    hatch: 'none',
    hatchColor: '#b58c11',
    opacity: 1.0,
    description: 'Metal noble conductor para electrodos BioMEMS y pads'
  },
  aluminum: {
    id: 'aluminum',
    name: 'Aluminio (Al)',
    category: 'metal',
    color: '#c5ccd3',
    colorTop: '#dbe1e6',
    colorLeft: '#a8b0b8',
    colorRight: '#8c959d',
    stroke: '#111111',
    hatch: 'none',
    hatchColor: '#76808a',
    opacity: 1.0,
    description: 'Metalización estándar CMOS para interconexiones'
  },
  platinum: {
    id: 'platinum',
    name: 'Platino / Titanio (Pt/Ti)',
    category: 'metal',
    color: '#a3b899',
    colorTop: '#bcd0b3',
    colorLeft: '#899f80',
    colorRight: '#708367',
    stroke: '#111111',
    hatch: 'none',
    hatchColor: '#5d6e55',
    opacity: 1.0,
    description: 'Metal biocompatible para sensores electroquímicos'
  },
  photoresist: {
    id: 'photoresist',
    name: 'Fotoresina (Positiva / Negativa)',
    category: 'polymer',
    color: '#9b5de5',
    colorTop: '#b37ff0',
    colorLeft: '#8347cc',
    colorRight: '#6c35ad',
    stroke: '#111111',
    hatch: 'hatch-vertical',
    hatchColor: '#6c35ad',
    opacity: 0.85,
    description: 'Polímero fotosensible para litografía óptica'
  },
  su8: {
    id: 'su8',
    name: 'SU-8 (Fotoresina Epóxica)',
    category: 'polymer',
    color: '#f15bb5',
    colorTop: '#f67ec4',
    colorLeft: '#d63f9b',
    colorRight: '#b32b7e',
    stroke: '#111111',
    hatch: 'hatch-cross',
    hatchColor: '#b32b7e',
    opacity: 0.9,
    description: 'Polímero de alto aspecto de forma para moldes y pozos'
  },
  pdms: {
    id: 'pdms',
    name: 'PDMS (Polidimetilsiloxano)',
    category: 'polymer',
    color: '#8ecae6',
    colorTop: '#aadef5',
    colorLeft: '#6fb2d1',
    colorRight: '#549ab9',
    stroke: '#111111',
    hatch: 'hatch-dots-fine',
    hatchColor: '#45819c',
    opacity: 0.75,
    description: 'Elastómero transparente y flexible para chips microfluídicos'
  },
  glass_substrate: {
    id: 'glass_substrate',
    name: 'Vidrio / Pyrex 7740 / Cuarzo',
    category: 'substrate',
    color: '#cbe7ee',
    colorTop: '#dff2f6',
    colorLeft: '#b2d7df',
    colorRight: '#9fc7cf',
    stroke: '#111111',
    hatch: 'none',
    hatchColor: '#669ca6',
    opacity: 0.75,
    description: 'Sustrato transparente para anodic bonding y visión óptica'
  }
};

/**
 * Standard Presets with clean, well-proportioned rectangular geometries
 */
const MEMS_PRESETS = {
  cantilever: {
    id: 'cantilever',
    title: 'Microviga Libre (Cantilever de Polisilicio)',
    gridDivisions: 40,
    layers: [
      {
        id: 'l1',
        name: 'Sustrato Si <100>',
        materialId: 'si_substrate',
        thickness: 16,
        visible: true,
        rects: [
          { id: 'r_sub', x: 5, y: 5, w: 90, h: 90 }
        ]
      },
      {
        id: 'l2',
        name: 'Óxido Sacrificial (SiO2)',
        materialId: 'sio2_thermal',
        thickness: 10,
        visible: true,
        rects: [
          { id: 'r_ox', x: 30, y: 20, w: 65, h: 60 }
        ]
      },
      {
        id: 'l3',
        name: 'Microviga de Polisilicio',
        materialId: 'polysilicon',
        thickness: 10,
        visible: true,
        rects: [
          { id: 'r_anchor', x: 10, y: 25, w: 20, h: 50 },
          { id: 'r_beam', x: 10, y: 35, w: 75, h: 30 }
        ]
      },
      {
        id: 'l4',
        name: 'Pad de Contacto / Oro (Au)',
        materialId: 'gold',
        thickness: 6,
        visible: true,
        rects: [
          { id: 'r_pad', x: 70, y: 40, w: 15, h: 20 }
        ]
      }
    ]
  },
  pressure_sensor: {
    id: 'pressure_sensor',
    title: 'Sensor de Presión (Membrana con Cavidad)',
    gridDivisions: 40,
    layers: [
      {
        id: 'l1',
        name: 'Sustrato con Cavidad',
        materialId: 'si_substrate',
        thickness: 18,
        visible: true,
        rects: [
          { id: 'r_sub_l', x: 5, y: 5, w: 25, h: 90 },
          { id: 'r_sub_r', x: 70, y: 5, w: 25, h: 90 },
          { id: 'r_sub_t', x: 30, y: 5, w: 40, h: 25 },
          { id: 'r_sub_b', x: 30, y: 70, w: 40, h: 25 }
        ]
      },
      {
        id: 'l2',
        name: 'Membrana de Nitruro (Si3N4)',
        materialId: 'si3n4',
        thickness: 10,
        visible: true,
        rects: [
          { id: 'r_membrane', x: 5, y: 5, w: 90, h: 90 }
        ]
      },
      {
        id: 'l3',
        name: 'Piezorresistores Poly-Si',
        materialId: 'polysilicon',
        thickness: 8,
        visible: true,
        rects: [
          { id: 'r_pz1', x: 24, y: 42, w: 10, h: 16 },
          { id: 'r_pz2', x: 66, y: 42, w: 10, h: 16 }
        ]
      },
      {
        id: 'l4',
        name: 'Pistas de Aluminio (Al)',
        materialId: 'aluminum',
        thickness: 6,
        visible: true,
        rects: [
          { id: 'r_al1', x: 8, y: 45, w: 18, h: 10 },
          { id: 'r_al2', x: 74, y: 45, w: 18, h: 10 }
        ]
      }
    ]
  },
  microfluidics: {
    id: 'microfluidics',
    title: 'Canal Microfluídico PDMS / Vidrio',
    gridDivisions: 40,
    layers: [
      {
        id: 'l1',
        name: 'Portaobjetos de Vidrio',
        materialId: 'glass_substrate',
        thickness: 16,
        visible: true,
        rects: [
          { id: 'r_glass', x: 5, y: 5, w: 90, h: 90 }
        ]
      },
      {
        id: 'l2',
        name: 'Paredes del Canal (PDMS)',
        materialId: 'pdms',
        thickness: 20,
        visible: true,
        rects: [
          { id: 'r_pdms_l', x: 5, y: 5, w: 30, h: 90 },
          { id: 'r_pdms_r', x: 65, y: 5, w: 30, h: 90 }
        ]
      },
      {
        id: 'l3',
        name: 'Techo Sellado de PDMS',
        materialId: 'pdms',
        thickness: 14,
        visible: true,
        rects: [
          { id: 'r_pdms_top', x: 5, y: 5, w: 90, h: 90 }
        ]
      }
    ]
  },
  biomems: {
    id: 'biomems',
    title: 'Arreglo de Microelectrodos BioMEMS (MEA)',
    gridDivisions: 40,
    layers: [
      {
        id: 'l1',
        name: 'Sustrato Silicio',
        materialId: 'si_substrate',
        thickness: 16,
        visible: true,
        rects: [
          { id: 'r_sub', x: 5, y: 5, w: 90, h: 90 }
        ]
      },
      {
        id: 'l2',
        name: 'Aislante Térmico SiO2',
        materialId: 'sio2_thermal',
        thickness: 10,
        visible: true,
        rects: [
          { id: 'r_ox', x: 5, y: 5, w: 90, h: 90 }
        ]
      },
      {
        id: 'l3',
        name: 'Microelectrodos de Oro (Au)',
        materialId: 'gold',
        thickness: 6,
        visible: true,
        rects: [
          { id: 'r_e1', x: 28, y: 28, w: 16, h: 16 },
          { id: 'r_e2', x: 56, y: 28, w: 16, h: 16 },
          { id: 'r_e3', x: 28, y: 56, w: 16, h: 16 },
          { id: 'r_e4', x: 56, y: 56, w: 16, h: 16 },
          { id: 'r_w1', x: 8, y: 32, w: 20, h: 8 },
          { id: 'r_w2', x: 72, y: 32, w: 20, h: 8 },
          { id: 'r_w3', x: 8, y: 60, w: 20, h: 8 },
          { id: 'r_w4', x: 72, y: 60, w: 20, h: 8 }
        ]
      },
      {
        id: 'l4',
        name: 'Pozos Aislantes de SU-8',
        materialId: 'su8',
        thickness: 14,
        visible: true,
        rects: [
          { id: 'r_su8_l', x: 5, y: 5, w: 20, h: 90 },
          { id: 'r_su8_r', x: 75, y: 5, w: 20, h: 90 },
          { id: 'r_su8_c', x: 46, y: 10, w: 8, h: 80 }
        ]
      }
    ]
  }
};

// Scope Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MEMS_MATERIALS, MEMS_PRESETS };
} else {
  window.MEMS_MATERIALS = MEMS_MATERIALS;
  window.MEMS_PRESETS = MEMS_PRESETS;
}
