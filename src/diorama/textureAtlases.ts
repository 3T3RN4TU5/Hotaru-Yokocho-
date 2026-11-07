import * as THREE from 'three';
import { getAtlasUvRect } from './dioramaLogic';

export interface DioramaAtlasBundle {
  buildingsColor: THREE.CanvasTexture;
  buildingsEmissive: THREE.CanvasTexture;
  propsColor: THREE.CanvasTexture;
  propsEmissive: THREE.CanvasTexture;
  groundColor: THREE.CanvasTexture;
  groundBump: THREE.CanvasTexture;
  previews: {
    buildingsDataUrl: string;
    propsDataUrl: string;
    groundDataUrl: string;
  };
  dispose: () => void;
}

/**
 * Remaps a BufferGeometry's [0..1] UVs into a specific (col, row) cell of a 4x4 texture atlas.
 */
export function mapGeometryToAtlasCell(
  geometry: THREE.BufferGeometry,
  col: number,
  row: number,
  gridCols = 4,
  gridRows = 4,
): THREE.BufferGeometry {
  const uvAttr = geometry.attributes.uv;
  if (!uvAttr) return geometry;

  const rect = getAtlasUvRect(col, row, gridCols, gridRows, 1024, 6);
  const uSpan = rect.uMax - rect.uMin;
  const vSpan = rect.vMax - rect.vMin;

  for (let i = 0; i < uvAttr.count; i++) {
    const u = Math.max(0, Math.min(1, uvAttr.getX(i)));
    const v = Math.max(0, Math.min(1, uvAttr.getY(i)));
    uvAttr.setXY(i, rect.uMin + u * uSpan, rect.vMin + v * vSpan);
  }
  uvAttr.needsUpdate = true;
  return geometry;
}

function paintHandbrushedBase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  topHex: string,
  bottomHex: string,
  aoStrength = 0.28,
) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.78, bottomHex);
  grad.addColorStop(1, '#1A162B');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Soft painterly horizontal brush strokes
  ctx.save();
  for (let i = 0; i < 28; i++) {
    const bx = x + ((i * 37) % (w - 24));
    const by = y + ((i * 53) % (h - 10));
    const bw = 18 + (i % 3) * 14;
    const bh = 4 + (i % 2) * 4;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(15,12,30,0.06)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.fill();
  }

  // Painted edge highlight at top & baked contact shadow at bottom
  const topHighlight = ctx.createLinearGradient(x, y, x, y + 18);
  topHighlight.addColorStop(0, 'rgba(255, 248, 231, 0.24)');
  topHighlight.addColorStop(1, 'rgba(255, 248, 231, 0)');
  ctx.fillStyle = topHighlight;
  ctx.fillRect(x, y, w, 18);

  const bottomAo = ctx.createLinearGradient(x, y + h - 32, x, y + h);
  bottomAo.addColorStop(0, 'rgba(12, 10, 24, 0)');
  bottomAo.addColorStop(1, `rgba(12, 10, 24, ${aoStrength})`);
  ctx.fillStyle = bottomAo;
  ctx.fillRect(x, y + h - 32, w, 32);
  ctx.restore();
}

function drawWindowGrid(
  ctx: CanvasRenderingContext2D,
  emCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cols: number,
  rows: number,
  frameHex: string,
  glowHex: string,
) {
  const padX = 26;
  const padY = 34;
  const cellW = (256 - padX * 2) / cols;
  const cellH = (150 - padY) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + padX + c * cellW + 6;
      const wy = y + padY + r * cellH + 6;
      const ww = cellW - 12;
      const wh = cellH - 12;

      // Window frame with painted drop shadow
      ctx.fillStyle = 'rgba(15, 10, 25, 0.35)';
      ctx.fillRect(wx - 2, wy + 2, ww + 4, wh + 4);
      ctx.fillStyle = frameHex;
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

      // Warm hand-painted glass gradient
      const wGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
      wGrad.addColorStop(0, glowHex);
      wGrad.addColorStop(1, '#FFF7ED');
      ctx.fillStyle = wGrad;
      ctx.fillRect(wx, wy, ww, wh);

      // Mullion bars
      ctx.fillStyle = frameHex;
      ctx.fillRect(wx + ww * 0.5 - 1.5, wy, 3, wh);
      ctx.fillRect(wx, wy + wh * 0.55 - 1.5, ww, 3);

      // Emissive mask
      const eGrad = emCtx.createLinearGradient(wx, wy, wx, wy + wh);
      eGrad.addColorStop(0, glowHex);
      eGrad.addColorStop(1, '#FDE68A');
      emCtx.fillStyle = eGrad;
      emCtx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
    }
  }
}

function drawSignBanner(
  ctx: CanvasRenderingContext2D,
  emCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  bgHex: string,
  textHex: string,
  neonGlowHex: string,
) {
  const bx = x + 22;
  const by = y + 178;
  const bw = 212;
  const bh = 46;

  ctx.fillStyle = 'rgba(10, 8, 20, 0.45)';
  ctx.beginPath();
  ctx.roundRect(bx + 2, by + 4, bw, bh, 8);
  ctx.fill();

  ctx.fillStyle = bgHex;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();

  ctx.strokeStyle = neonGlowHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);

  ctx.fillStyle = textHex;
  ctx.font = 'bold 24px "Fredoka", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);

  // Emissive sign glow
  emCtx.fillStyle = neonGlowHex;
  emCtx.beginPath();
  emCtx.roundRect(bx + 3, by + 3, bw - 6, bh - 6, 6);
  emCtx.fill();
  emCtx.fillStyle = '#FFFFFF';
  emCtx.font = 'bold 24px "Fredoka", "Plus Jakarta Sans", sans-serif';
  emCtx.textAlign = 'center';
  emCtx.textBaseline = 'middle';
  emCtx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
}

/**
 * Generates all 3 hand-painted 1024x1024 texture atlases on HTML5 2D canvases.
 */
export function createDioramaAtlases(
  maxAnisotropy = 4,
  onProgress?: (step: number, label: string) => void,
): DioramaAtlasBundle {
  onProgress?.(20, 'Painting Atlas 01: Hand-Painted Building Facades & Shoji Windows...');

  // ============================================================================
  // ATLAS 1: BUILDINGS & SIGNAGE (1024 x 1024, 4x4 grid of 256x256 cells)
  // ============================================================================
  const bCanvas = document.createElement('canvas');
  bCanvas.width = 1024;
  bCanvas.height = 1024;
  const bCtx = bCanvas.getContext('2d')!;

  const bEmCanvas = document.createElement('canvas');
  bEmCanvas.width = 1024;
  bEmCanvas.height = 1024;
  const bEmCtx = bEmCanvas.getContext('2d')!;
  bEmCtx.fillStyle = '#000000';
  bEmCtx.fillRect(0, 0, 1024, 1024);

  const buildingCells: Array<{
    col: number;
    row: number;
    topHex: string;
    botHex: string;
    frameHex: string;
    glowHex: string;
    signBg: string;
    signText: string;
    signLabel: string;
    winCols: number;
    winRows: number;
  }> = [
    // Row 0
    {
      col: 0,
      row: 0,
      topHex: '#DC2626',
      botHex: '#991B1B',
      frameHex: '#450A0A',
      glowHex: '#FDE047',
      signBg: '#7F1D1D',
      signText: '#FEF08A',
      signLabel: '狐稲荷神社',
      winCols: 3,
      winRows: 2,
    },
    {
      col: 1,
      row: 0,
      topHex: '#78350F',
      botHex: '#451A03',
      frameHex: '#271206',
      glowHex: '#FBBF24',
      signBg: '#B45309',
      signText: '#FFFBEB',
      signLabel: '麺屋ほたる',
      winCols: 2,
      winRows: 2,
    },
    {
      col: 2,
      row: 0,
      topHex: '#9A3412',
      botHex: '#571D0B',
      frameHex: '#065F46',
      glowHex: '#FCD34D',
      signBg: '#064E3B',
      signText: '#A7F3D0',
      signLabel: '黒猫珈琲店',
      winCols: 3,
      winRows: 2,
    },
    {
      col: 3,
      row: 0,
      topHex: '#312E81',
      botHex: '#1E1B4B',
      frameHex: '#EC4899',
      glowHex: '#F472B6',
      signBg: '#831843',
      signText: '#FBCFE8',
      signLabel: '星空ゲーム',
      winCols: 3,
      winRows: 3,
    },
    // Row 1
    {
      col: 0,
      row: 1,
      topHex: '#F3E8FF',
      botHex: '#C4B5FD',
      frameHex: '#5B21B6',
      glowHex: '#FDBA74',
      signBg: '#4C1D95',
      signText: '#FDE68A',
      signLabel: '桜湯 ゆ',
      winCols: 4,
      winRows: 2,
    },
    {
      col: 1,
      row: 1,
      topHex: '#FDE68A',
      botHex: '#D97706',
      frameHex: '#78350F',
      glowHex: '#FEF08A',
      signBg: '#BE123C',
      signText: '#FFE4E6',
      signLabel: '黄金たい焼き',
      winCols: 2,
      winRows: 1,
    },
    {
      col: 2,
      row: 1,
      topHex: '#EAB308',
      botHex: '#A16207',
      frameHex: '#1E293B',
      glowHex: '#FEF08A',
      signBg: '#0F172A',
      signText: '#34D399',
      signLabel: 'みどり音盤',
      winCols: 3,
      winRows: 2,
    },
    {
      col: 3,
      row: 1,
      topHex: '#F8FAFC',
      botHex: '#CBD5E1',
      frameHex: '#0284C7',
      glowHex: '#7DD3FC',
      signBg: '#0369A1',
      signText: '#F0F9FF',
      signLabel: 'ほたるMART',
      winCols: 3,
      winRows: 2,
    },
    // Row 2: Koban, Tram Viaduct, Roof Tiles (Slate), Roof Tiles (Copper/Green)
    {
      col: 0,
      row: 2,
      topHex: '#E2E8F0',
      botHex: '#94A3B8',
      frameHex: '#1E293B',
      glowHex: '#FDE047',
      signBg: '#1E3A8A',
      signText: '#FEF08A',
      signLabel: '蛍町交番',
      winCols: 2,
      winRows: 2,
    },
    {
      col: 1,
      row: 2,
      topHex: '#991B1B',
      botHex: '#450A0A',
      frameHex: '#1F2937',
      glowHex: '#6EE7B7',
      signBg: '#065F46',
      signText: '#ECFDF5',
      signLabel: '高架電停',
      winCols: 4,
      winRows: 1,
    },
  ];

  for (const cell of buildingCells) {
    const cx = cell.col * 256;
    const cy = cell.row * 256;
    paintHandbrushedBase(bCtx, cx, cy, 256, 256, cell.topHex, cell.botHex, 0.35);
    drawWindowGrid(bCtx, bEmCtx, cx, cy, cell.winCols, cell.winRows, cell.frameHex, cell.glowHex);
    drawSignBanner(bCtx, bEmCtx, cx, cy, cell.signLabel, cell.signBg, cell.signText, cell.glowHex);
  }

  // Cell (2, 2): Hand-painted Kawara Slate Roof Tiles
  {
    const rx = 2 * 256;
    const ry = 2 * 256;
    paintHandbrushedBase(bCtx, rx, ry, 256, 256, '#334155', '#1E293B', 0.35);
    for (let row = 0; row < 10; row++) {
      const y = ry + row * 26;
      bCtx.fillStyle = row % 2 === 0 ? '#475569' : '#334155';
      bCtx.fillRect(rx, y, 256, 24);
      for (let col = 0; col < 10; col++) {
        bCtx.strokeStyle = 'rgba(226, 232, 240, 0.18)';
        bCtx.lineWidth = 2;
        bCtx.beginPath();
        bCtx.arc(rx + col * 26 + 13, y + 20, 11, Math.PI, 0);
        bCtx.stroke();
      }
    }
  }

  // Cell (3, 2): Hand-painted Warm Terracotta & Copper Roof Shingles
  {
    const rx = 3 * 256;
    const ry = 2 * 256;
    paintHandbrushedBase(bCtx, rx, ry, 256, 256, '#0D9488', '#115E59', 0.3);
    for (let row = 0; row < 10; row++) {
      const y = ry + row * 26;
      bCtx.fillStyle = row % 2 === 0 ? '#14B8A6' : '#0F766E';
      bCtx.fillRect(rx, y, 256, 22);
      bCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      bCtx.fillRect(rx, y, 256, 3);
    }
  }

  // Row 3: Awning Stripes, Noren Curtains, Warm Wood Planks, Neon Kanji Billboards
  // Cell (0, 3): Striped Awning Fabric (Red/Cream & Mint/Cream)
  {
    const ax = 0;
    const ay = 3 * 256;
    for (let i = 0; i < 8; i++) {
      bCtx.fillStyle = i % 2 === 0 ? '#F43F5E' : '#FFFBEB';
      bCtx.fillRect(ax + i * 32, ay, 32, 128);
      bCtx.fillStyle = i % 2 === 0 ? '#10B981' : '#FFFBEB';
      bCtx.fillRect(ax + i * 32, ay + 128, 32, 128);
    }
  }

  // Cell (1, 3): Indigo Noren Curtain with Wave Crest
  {
    const nx = 256;
    const ny = 3 * 256;
    paintHandbrushedBase(bCtx, nx, ny, 256, 256, '#1E3A8A', '#172554', 0.3);
    bCtx.strokeStyle = '#F8FAFC';
    bCtx.lineWidth = 4;
    for (let i = 1; i < 4; i++) {
      bCtx.beginPath();
      bCtx.moveTo(nx + i * 64, ny + 20);
      bCtx.lineTo(nx + i * 64, ny + 256);
      bCtx.stroke();
    }
    bCtx.fillStyle = '#F8FAFC';
    bCtx.font = 'bold 44px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('ほたる', nx + 128, ny + 140);
  }

  // Cell (2, 3): Mugenjo Castle Hinoki Timber & Glowing Golden Shoji Lattice (無限城 障子)
  {
    const wx = 2 * 256;
    const wy = 3 * 256;
    paintHandbrushedBase(bCtx, wx, wy, 256, 256, '#451A03', '#271206', 0.35);

    // Paint 3x3 warm glowing Shoji Screen panels with kumiko wooden lattice
    const panelCols = 3;
    const panelRows = 3;
    const pw = 68;
    const ph = 66;
    for (let r = 0; r < panelRows; r++) {
      for (let c = 0; c < panelCols; c++) {
        const px = wx + 18 + c * 76;
        const py = wy + 18 + r * 76;

        const shojiGrad = bCtx.createLinearGradient(px, py, px, py + ph);
        shojiGrad.addColorStop(0, '#FDE047');
        shojiGrad.addColorStop(0.55, '#F59E0B');
        shojiGrad.addColorStop(1, '#EA580C');
        bCtx.fillStyle = shojiGrad;
        bCtx.fillRect(px, py, pw, ph);

        // Emissive warm biwa-amber shoji glow
        const emGrad = bEmCtx.createLinearGradient(px, py, px, py + ph);
        emGrad.addColorStop(0, '#FEF08A');
        emGrad.addColorStop(0.6, '#F59E0B');
        emGrad.addColorStop(1, '#DC2626');
        bEmCtx.fillStyle = emGrad;
        bEmCtx.fillRect(px + 2, py + 2, pw - 4, ph - 4);

        // Fine dark hinoki kumiko lattice bars
        bCtx.strokeStyle = '#3B1105';
        bCtx.lineWidth = 3;
        bCtx.strokeRect(px, py, pw, ph);
        bCtx.beginPath();
        bCtx.moveTo(px + pw / 2, py);
        bCtx.lineTo(px + pw / 2, py + ph);
        bCtx.moveTo(px, py + ph / 2);
        bCtx.lineTo(px + pw, py + ph / 2);
        bCtx.stroke();

        bEmCtx.strokeStyle = '#1C0903';
        bEmCtx.lineWidth = 3;
        bEmCtx.beginPath();
        bEmCtx.moveTo(px + pw / 2, py);
        bEmCtx.lineTo(px + pw / 2, py + ph);
        bEmCtx.moveTo(px, py + ph / 2);
        bEmCtx.lineTo(px + pw, py + ph / 2);
        bEmCtx.stroke();
      }
    }
  }

  // Cell (3, 3): Glowing Neon Signs & Ramen Bowl Emblem
  {
    const sx = 3 * 256;
    const sy = 3 * 256;
    paintHandbrushedBase(bCtx, sx, sy, 256, 256, '#1E1B4B', '#090D16', 0.2);
    const colors = ['#F43F5E', '#38BDF8', '#FACC15', '#A855F7'];
    const texts = ['ラーメン', 'ぎょうざ', '氷・甘味', 'カラオケ'];
    for (let i = 0; i < 4; i++) {
      const by = sy + 12 + i * 60;
      bCtx.fillStyle = colors[i];
      bCtx.beginPath();
      bCtx.roundRect(sx + 16, by, 224, 48, 10);
      bCtx.fill();
      bCtx.fillStyle = '#FFFFFF';
      bCtx.font = 'bold 28px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.fillText(texts[i], sx + 128, by + 32);

      bEmCtx.fillStyle = colors[i];
      bEmCtx.beginPath();
      bEmCtx.roundRect(sx + 16, by, 224, 48, 10);
      bEmCtx.fill();
      bEmCtx.fillStyle = '#FFFFFF';
      bEmCtx.font = 'bold 28px sans-serif';
      bEmCtx.textAlign = 'center';
      bEmCtx.fillText(texts[i], sx + 128, by + 32);
    }
  }

  onProgress?.(50, 'Painting Atlas 02: Props, Sakura Foliage, Vehicles & Characters...');

  // ============================================================================
  // ATLAS 2: PROPS, FOLIAGE & VEHICLES (1024 x 1024, 4x4 grid)
  // ============================================================================
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 1024;
  pCanvas.height = 1024;
  const pCtx = pCanvas.getContext('2d')!;

  const pEmCanvas = document.createElement('canvas');
  pEmCanvas.width = 1024;
  pEmCanvas.height = 1024;
  const pEmCtx = pEmCanvas.getContext('2d')!;
  pEmCtx.fillStyle = '#000000';
  pEmCtx.fillRect(0, 0, 1024, 1024);

  // (0,0) Sakura Blossom Pink Canopy
  paintHandbrushedBase(pCtx, 0, 0, 256, 256, '#FBCFE8', '#F472B6', 0.25);
  for (let i = 0; i < 45; i++) {
    pCtx.fillStyle = i % 2 === 0 ? '#FFF1F2' : '#FB7185';
    pCtx.beginPath();
    pCtx.arc(20 + ((i * 47) % 216), 20 + ((i * 71) % 216), 10 + (i % 8), 0, Math.PI * 2);
    pCtx.fill();
  }

  // (1,0) Ginkgo & Matcha Lush Foliage Canopy
  paintHandbrushedBase(pCtx, 256, 0, 256, 256, '#FDE047', '#65A30D', 0.28);
  for (let i = 0; i < 45; i++) {
    pCtx.fillStyle = i % 2 === 0 ? '#FEF08A' : '#4D7C0F';
    pCtx.beginPath();
    pCtx.arc(276 + ((i * 53) % 216), 20 + ((i * 67) % 216), 10 + (i % 7), 0, Math.PI * 2);
    pCtx.fill();
  }

  // (2,0) Vermilion Torii Gate & Gold Ornaments
  paintHandbrushedBase(pCtx, 512, 0, 256, 256, '#EF4444', '#B91C1C', 0.3);
  pCtx.fillStyle = '#1E1B4B';
  pCtx.fillRect(512, 210, 256, 46);
  pCtx.fillStyle = '#FACC15';
  pCtx.fillRect(512, 80, 256, 22);

  // (3,0) Glowing Vending Machine Front
  paintHandbrushedBase(pCtx, 768, 0, 256, 256, '#38BDF8', '#0284C7', 0.3);
  pCtx.fillStyle = '#FFFBEB';
  pCtx.fillRect(790, 24, 212, 130);
  pEmCtx.fillStyle = '#E0F2FE';
  pEmCtx.fillRect(792, 26, 208, 126);
  const canColors = ['#EF4444', '#22C55E', '#F59E0B', '#3B82F6', '#EC4899'];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      pCtx.fillStyle = canColors[(r + c) % canColors.length];
      pCtx.fillRect(802 + c * 38, 36 + r * 38, 26, 28);
      pEmCtx.fillStyle = canColors[(r + c) % canColors.length];
      pEmCtx.fillRect(802 + c * 38, 36 + r * 38, 26, 28);
    }
  }
  pCtx.fillStyle = '#0F172A';
  pCtx.fillRect(796, 178, 140, 42);

  // (0,1) Red & Gold Paper Chochin Lanterns
  paintHandbrushedBase(pCtx, 0, 256, 256, 256, '#FB7185', '#E11D48', 0.15);
  pEmCtx.fillStyle = '#FB923C';
  pEmCtx.fillRect(8, 264, 240, 240);
  for (let i = 0; i < 6; i++) {
    pCtx.strokeStyle = '#881337';
    pCtx.lineWidth = 3;
    pCtx.beginPath();
    pCtx.moveTo(0, 256 + i * 42);
    pCtx.lineTo(256, 256 + i * 42);
    pCtx.stroke();
  }

  // (1,1) Kei Truck & Delivery Scooter Bodywork
  paintHandbrushedBase(pCtx, 256, 256, 256, 256, '#F8FAFC', '#94A3B8', 0.25);
  pCtx.fillStyle = '#38BDF8';
  pCtx.fillRect(256, 360, 256, 60);
  pCtx.fillStyle = '#FDE047';
  pCtx.fillRect(276, 440, 60, 36);
  pEmCtx.fillStyle = '#FDE047';
  pEmCtx.fillRect(276, 440, 60, 36);

  // (2,1) Vintage Arakawa Tram Car (Cream & Jade Green)
  paintHandbrushedBase(pCtx, 512, 256, 256, 256, '#FEF3C7', '#10B981', 0.25);
  pCtx.fillStyle = '#065F46';
  pCtx.fillRect(512, 380, 256, 132);
  drawWindowGrid(pCtx, pEmCtx, 512, 256, 4, 1, '#064E3B', '#FEF08A');

  // (3,1) Outdoor AC Units, Pipes & Utility Boxes
  paintHandbrushedBase(pCtx, 768, 256, 256, 256, '#E2E8F0', '#94A3B8', 0.35);
  pCtx.fillStyle = '#334155';
  pCtx.beginPath();
  pCtx.arc(860, 384, 62, 0, Math.PI * 2);
  pCtx.fill();

  // Row 2 & 3 of Props Atlas: Tree bark, Stone shrines/foxes, Beer crates, Anime Characters & Pets
  paintHandbrushedBase(pCtx, 0, 512, 256, 256, '#78350F', '#451A03', 0.4); // (0,2) Bark
  paintHandbrushedBase(pCtx, 256, 512, 256, 256, '#CBD5E1', '#64748B', 0.35); // (1,2) Stone Kitsune & Torii Base
  paintHandbrushedBase(pCtx, 512, 512, 256, 256, '#FACC15', '#CA8A04', 0.3); // (2,2) Plastic Izakaya Crates

  // (3,2) Anime Swordsman Checkered Haori (Emerald Green & Charcoal Black Ichimatsu + White Belt)
  {
    const cx = 768;
    const cy = 512;
    const sq = 32;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 8; c++) {
        pCtx.fillStyle = (r + c) % 2 === 0 ? '#10B981' : '#0F172A';
        pCtx.fillRect(cx + c * sq, cy + r * sq, sq, sq);
        pEmCtx.fillStyle = (r + c) % 2 === 0 ? '#064E3B' : '#020617';
        pEmCtx.fillRect(cx + c * sq, cy + r * sq, sq, sq);
      }
    }
    // White kimono collar & belt band + dark hakama hem
    pCtx.fillStyle = '#F8FAFC';
    pCtx.fillRect(cx, cy + 184, 256, 18);
    pCtx.fillStyle = '#1E1B4B';
    pCtx.fillRect(cx, cy + 202, 256, 54);
  }

  // (0,3) Warm Peach Cream Anime Face / Skin with Rosy Blush Cheeks (clean without dark bottom AO)
  {
    const fGrad = pCtx.createLinearGradient(0, 768, 0, 1024);
    fGrad.addColorStop(0, '#FFF5EB');
    fGrad.addColorStop(1, '#FED7AA');
    pCtx.fillStyle = fGrad;
    pCtx.fillRect(0, 768, 256, 256);
    pCtx.fillStyle = 'rgba(251, 113, 133, 0.55)';
    pCtx.beginPath();
    pCtx.arc(72, 900, 24, 0, Math.PI * 2);
    pCtx.arc(184, 900, 24, 0, Math.PI * 2);
    pCtx.fill();
    pEmCtx.fillStyle = '#3B281E';
    pEmCtx.fillRect(0, 768, 256, 256);
  }

  // (1,3) Sakura-Pink & Flame-Gold Anime Kimono / Haori with Crimson Obi Sash
  {
    const cx = 256;
    const cy = 768;
    paintHandbrushedBase(pCtx, cx, cy, 256, 256, '#F472B6', '#FB7185', 0.18);
    pEmCtx.fillStyle = '#4C1D3D';
    pEmCtx.fillRect(cx, cy, 256, 256);
    // Gold & crimson flame/geometric hem motifs
    for (let i = 0; i < 8; i++) {
      pCtx.fillStyle = i % 2 === 0 ? '#FBBF24' : '#EF4444';
      pCtx.beginPath();
      pCtx.moveTo(cx + i * 32, cy + 160);
      pCtx.lineTo(cx + i * 32 + 16, cy + 95);
      pCtx.lineTo(cx + i * 32 + 32, cy + 160);
      pCtx.closePath();
      pCtx.fill();
    }
    // Emerald & gold checkered obi sash
    pCtx.fillStyle = '#059669';
    pCtx.fillRect(cx, cy + 160, 256, 36);
    pCtx.fillStyle = '#FDE047';
    pCtx.fillRect(cx, cy + 174, 256, 8);
  }

  // (2,3) Golden-Tan Shiba Inu & Calico Neko Pet Fur (Warm Amber-Gold + Cream Belly + Red Collar)
  {
    const cx = 512;
    const cy = 768;
    const sGrad = pCtx.createLinearGradient(cx, cy, cx, cy + 256);
    sGrad.addColorStop(0, '#F59E0B');
    sGrad.addColorStop(0.65, '#D97706');
    sGrad.addColorStop(1, '#FEF3C7');
    pCtx.fillStyle = sGrad;
    pCtx.fillRect(cx, cy, 256, 256);
    pEmCtx.fillStyle = '#3D260A';
    pEmCtx.fillRect(cx, cy, 256, 256);
    // Red pet collar with golden bell stripe
    pCtx.fillStyle = '#EF4444';
    pCtx.fillRect(cx, cy + 148, 256, 20);
    pCtx.fillStyle = '#FDE047';
    pCtx.fillRect(cx + 108, cy + 146, 40, 24);
  }

  // (3,3) Top Half (row 6 of 8): Dark Burgundy-Black Anime Hair & Eyes
  //       Bottom Half (row 7 of 8): Snowy White Kitsune / Neko Fur with Vermilion Collar
  {
    const cx = 768;
    const cy = 768;
    // Upper half (y = 768..896): Pure dark burgundy-black anime hair & glossy dark eyes
    pCtx.fillStyle = '#180D1E';
    pCtx.fillRect(cx, cy, 256, 128);
    pCtx.fillStyle = '#7F1D1D';
    for (let i = 0; i < 6; i++) {
      pCtx.fillRect(cx + i * 42 + 8, cy + 12, 16, 104);
    }
    pEmCtx.fillStyle = '#140A18';
    pEmCtx.fillRect(cx, cy, 256, 128);

    // Lower half (y = 896..1024): Pure snowy white Kitsune / Neko fur with vermilion markings
    pCtx.fillStyle = '#F8FAFC';
    pCtx.fillRect(cx, cy + 128, 256, 128);
    pCtx.fillStyle = '#EF4444';
    pCtx.fillRect(cx, cy + 136, 256, 20);
    pEmCtx.fillStyle = '#332B38';
    pEmCtx.fillRect(cx, cy + 128, 256, 128);
  }

  onProgress?.(75, 'Painting Atlas 03: Cobblestone Alleys, Asphalt & Earth Cross-Section...');

  // ============================================================================
  // ATLAS 3: GROUND & CHUNKY CROSS-SECTION (1024 x 1024, 4x4 grid)
  // ============================================================================
  const gCanvas = document.createElement('canvas');
  gCanvas.width = 1024;
  gCanvas.height = 1024;
  const gCtx = gCanvas.getContext('2d')!;

  const gBumpCanvas = document.createElement('canvas');
  gBumpCanvas.width = 1024;
  gBumpCanvas.height = 1024;
  const gBumpCtx = gBumpCanvas.getContext('2d')!;
  gBumpCtx.fillStyle = '#808080';
  gBumpCtx.fillRect(0, 0, 1024, 1024);

  // (0,0) Rain-Sheen Tokyo Asphalt with Dashed Center Line & Tactile Curbs
  paintHandbrushedBase(gCtx, 0, 0, 256, 256, '#334155', '#1E293B', 0.22);
  gCtx.fillStyle = '#FACC15';
  gCtx.fillRect(0, 12, 256, 8);
  gCtx.fillRect(0, 236, 256, 8);
  gCtx.fillStyle = 'rgba(248, 250, 252, 0.75)';
  for (let i = 0; i < 6; i++) {
    gCtx.fillRect(12 + i * 42, 124, 24, 8);
  }

  // (1,0) Crisp Zebra Crosswalk Stripes
  paintHandbrushedBase(gCtx, 256, 0, 256, 256, '#334155', '#1E293B', 0.22);
  gCtx.fillStyle = '#F8FAFC';
  for (let i = 0; i < 5; i++) {
    gCtx.fillRect(276, 18 + i * 48, 216, 26);
  }

  // (2,0) Yokocho Hand-Painted Flagstone Cobblestones
  paintHandbrushedBase(gCtx, 512, 0, 512, 512, '#64748B', '#334155', 0.3);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sx = 520 + c * 62 + (r % 2) * 16;
      const sy = 10 + r * 62;
      gCtx.fillStyle = (r + c) % 2 === 0 ? '#94A3B8' : '#475569';
      gCtx.beginPath();
      gCtx.roundRect(sx, sy, 52, 52, 10);
      gCtx.fill();

      gBumpCtx.fillStyle = '#D4D4D8';
      gBumpCtx.beginPath();
      gBumpCtx.roundRect(sx, sy, 52, 52, 10);
      gBumpCtx.fill();
    }
  }

  // (0,2) Shrine Mossy Stone Terrace & Gravel
  paintHandbrushedBase(gCtx, 0, 512, 512, 256, '#A3E635', '#4D7C0F', 0.3);
  for (let i = 0; i < 60; i++) {
    gCtx.fillStyle = i % 2 === 0 ? '#D9F99D' : '#3F6212';
    gCtx.beginPath();
    gCtx.arc(20 + ((i * 73) % 470), 530 + ((i * 41) % 220), 8 + (i % 6), 0, Math.PI * 2);
    gCtx.fill();
  }

  // (2,2) Multi-Layered Soil, Roots & Bedrock Cross-Section (for the floating island base)
  paintHandbrushedBase(gCtx, 512, 512, 512, 512, '#B45309', '#312E81', 0.45);
  // Top terracotta tile rim
  gCtx.fillStyle = '#F59E0B';
  gCtx.fillRect(512, 512, 512, 52);
  // Middle warm sienna soil with embedded stones
  gCtx.fillStyle = '#92400E';
  gCtx.fillRect(512, 564, 512, 160);
  for (let i = 0; i < 24; i++) {
    gCtx.fillStyle = i % 2 === 0 ? '#D97706' : '#451A03';
    gCtx.beginPath();
    gCtx.roundRect(530 + ((i * 61) % 460), 580 + ((i * 29) % 120), 28, 16, 6);
    gCtx.fill();
  }
  // Bottom chunky low-poly basalt rock underside
  gCtx.fillStyle = '#334155';
  gCtx.fillRect(512, 724, 512, 300);

  // Convert canvases to THREE.CanvasTexture with proper color space & anisotropy
  const makeTex = (canvas: HTMLCanvasElement, isSrgb: boolean) => {
    const tex = new THREE.CanvasTexture(canvas);
    if (isSrgb) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.anisotropy = maxAnisotropy;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  };

  const buildingsColor = makeTex(bCanvas, true);
  const buildingsEmissive = makeTex(bEmCanvas, true);
  const propsColor = makeTex(pCanvas, true);
  const propsEmissive = makeTex(pEmCanvas, true);
  const groundColor = makeTex(gCanvas, true);
  const groundBump = makeTex(gBumpCanvas, false);

  const previews = {
    buildingsDataUrl: bCanvas.toDataURL('image/png'),
    propsDataUrl: pCanvas.toDataURL('image/png'),
    groundDataUrl: gCanvas.toDataURL('image/png'),
  };

  return {
    buildingsColor,
    buildingsEmissive,
    propsColor,
    propsEmissive,
    groundColor,
    groundBump,
    previews,
    dispose: () => {
      buildingsColor.dispose();
      buildingsEmissive.dispose();
      propsColor.dispose();
      propsEmissive.dispose();
      groundColor.dispose();
      groundBump.dispose();
    },
  };
}
