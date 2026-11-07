export type TimeOfDay = 'night' | 'day';

export interface UvRect {
  uMin: number;
  vMin: number;
  uMax: number;
  vMax: number;
}

export interface BuildingSpec {
  id: string;
  number: string;
  nameEn: string;
  nameJp: string;
  category: string;
  story: string;
  details: string[];
  position: [number, number, number];
  size: [number, number, number]; // width, height, depth
  cameraOffset: [number, number, number];
  lookAtOffset: [number, number, number];
  accentHex: string;
  atlasCell: [number, number]; // [col, row] in 4x4 building atlas
}

export interface AtmosphereState {
  skyTopHex: string;
  skyBottomHex: string;
  fogHex: string;
  fogDensity: number;
  keyLightHex: string;
  keyLightIntensity: number;
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  rimLightHex: string;
  rimLightIntensity: number;
  emissiveIntensity: number;
  bloomStrength: number;
  outlineHex: string;
  lanternLightIntensity: number;
}

export interface BudgetReport {
  baseTriangles: number;
  outlineTriangles: number;
  totalTriangles: number;
  withinHardLimit: boolean;
  withinTargetZone: boolean;
  atlasCount: number;
  atlasResolution: number;
}

export interface WaypointSample {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

export const BUILDINGS: BuildingSpec[] = [
  {
    id: 'inari-shrine',
    number: '01',
    nameEn: 'Kitsune Inari Shrine',
    nameJp: '狐稲荷神社',
    category: 'Sacred Landmark',
    story:
      'Perched on an ancient mossy stone terrace at the heart of Hotaru Yokocho, this miniature vermilion shrine guards the neighborhood with twin carved stone foxes and glowing bonbori paper lanterns.',
    details: [
      'Vermilion Torii gate & copper-shingled honden roof',
      'Twin stone Kitsune guardians with red bibs',
      'Wooden saisenbako offering chest & brass bell rope',
    ],
    position: [0.2, 0.35, -0.4],
    size: [4.2, 4.4, 4.2],
    cameraOffset: [0.0, 5.8, 6.8],
    lookAtOffset: [0, 1.6, 0],
    accentHex: '#EF4444',
    atlasCell: [0, 0],
  },
  {
    id: 'menya-hotaru',
    number: '02',
    nameEn: 'Menya Hotaru Ramen',
    nameJp: '麺屋ほたる',
    category: 'Late-Night Noodle Bar',
    story:
      'Famous for its 18-hour tonkotsu broth. A oversized glowing ramen bowl crowns the tiled gable while fragrant steam puffs into the night air above four oak counter stools.',
    details: [
      'Illuminated rooftop ramen bowl & floating chopsticks sign',
      'Indigo noren curtains & glowing red chochin lanterns',
      'Active bamboo chimney stack venting warm broth steam',
    ],
    position: [-5.6, 0, 4.2],
    size: [3.8, 4.6, 3.6],
    cameraOffset: [-1.2, 3.8, 9.2],
    lookAtOffset: [0, 1.8, 0],
    accentHex: '#F59E0B',
    atlasCell: [1, 0],
  },
  {
    id: 'kuroneko-kissaten',
    number: '03',
    nameEn: 'Kuroneko Kissaten',
    nameJp: '黒猫珈琲店',
    category: 'Showa Retro Roastery',
    story:
      'A cozy two-story brick and mint-wood coffee house playing jazz on vinyl. The upstairs bay window glows warm amber over striped canvas awnings and potted ferns.',
    details: [
      'Hand-painted warm brick facade with mint timber bay windows',
      'Striped cream-and-forest awning with brass café lamps',
      'Rooftop cedar water tank & neon black-cat blade sign',
    ],
    position: [-5.8, 0, -1.2],
    size: [3.6, 5.4, 3.8],
    cameraOffset: [-10.8, 4.6, 2.5],
    lookAtOffset: [0, 2.2, 0],
    accentHex: '#10B981',
    atlasCell: [2, 0],
  },
  {
    id: 'hoshizora-arcade',
    number: '04',
    nameEn: 'Hoshizora Game Center',
    nameJp: '星空ゲーム',
    category: 'Retro Arcade & Gachapon',
    story:
      'A narrow three-story neon pencil tower packed with rhythm cabinets and claw machines. Stacked gachapon capsule dispensers line the ground-floor entrance.',
    details: [
      'Three-story coral & midnight-indigo paneled facade',
      'Row of 6 colorful street-side gachapon capsule machines',
      'Flickering vertical kanji neon & pixel-star rooftop marquee',
    ],
    position: [5.6, 0, -1.0],
    size: [3.6, 6.8, 3.8],
    cameraOffset: [10.8, 5.2, 3.2],
    lookAtOffset: [0, 2.8, 0],
    accentHex: '#EC4899',
    atlasCell: [3, 0],
  },
  {
    id: 'sakura-sento',
    number: '05',
    nameEn: 'Sakura-Yu Bathhouse',
    nameJp: '桜湯銭湯',
    category: 'Neighborhood Sento',
    story:
      'Built with a curved karahafu temple-style entrance gable and a tall tiled smokestack. Locals stroll home in yukata beneath the warm glow of its frosted lattice windows.',
    details: [
      'Traditional curved karahafu timber porch &波 (wave) noren',
      'Tall cylindrical bathhouse chimney puffing gentle white steam',
      'Frosted shoji clerestory windows & wooden shoe lockers',
    ],
    position: [-5.5, 0, -6.4],
    size: [4.2, 5.2, 3.6],
    cameraOffset: [-9.8, 4.8, -1.8],
    lookAtOffset: [0, 2.2, 0],
    accentHex: '#F472B6',
    atlasCell: [0, 1],
  },
  {
    id: 'taiyaki-stand',
    number: '06',
    nameEn: 'Kogane Taiyaki Stall',
    nameJp: '黄金たい焼き',
    category: 'Sweet Street Kiosk',
    story:
      'Tucked beside the shrine steps, this tiny cypress kiosk bakes crispy red-bean and custard taiyaki pastries under a scalloped hồng-and-cream festival awning.',
    details: [
      'Sculpted low-poly golden fish signboard on the roof ridge',
      'Warm glass pastry warmer & red festival bunting',
      'Stacked wooden flour crates & matcha ice-cream cone prop',
    ],
    position: [-1.2, 0, 4.6],
    size: [2.8, 3.4, 2.8],
    cameraOffset: [1.8, 3.2, 9.4],
    lookAtOffset: [0, 1.4, 0],
    accentHex: '#FB923C',
    atlasCell: [1, 1],
  },
  {
    id: 'midori-vinyl',
    number: '07',
    nameEn: 'Midori Records & Loft',
    nameJp: 'みどり音盤堂',
    category: 'Indie Vinyl & Zine Studio',
    story:
      'A mustard-ochre creative studio with an external iron spiral stair leading to a sunlit rooftop conservatory overflowing with monstera plants and string lights.',
    details: [
      'Ochre plaster walls with exterior steel staircase',
      'Rooftop glass-and-timber plant conservatory',
      'Spinning vinyl LP wall emblem & crate browsing bins',
    ],
    position: [5.6, 0, 4.2],
    size: [3.8, 5.5, 3.6],
    cameraOffset: [10.4, 4.6, 8.6],
    lookAtOffset: [0, 2.2, 0],
    accentHex: '#EAB308',
    atlasCell: [2, 1],
  },
  {
    id: 'hotaru-mart',
    number: '08',
    nameEn: 'Hotaru Mart 24h',
    nameJp: 'ほたるマート',
    category: 'Corner Konbini',
    story:
      'The glowing beacon of every Tokyo block. Crisp tangerine-and-mint fascia stripes illuminate rows of steamed nikuman buns, cold milk tea, and manga racks.',
    details: [
      'Signature tri-color luminous konbini fascia wrap',
      'Panoramic lit storefront windows & magazine stand',
      'Dual glowing beverage vending machines flanked outside',
    ],
    position: [5.5, 0, -6.2],
    size: [4.0, 4.4, 3.6],
    cameraOffset: [10.2, 4.2, -1.6],
    lookAtOffset: [0, 1.8, 0],
    accentHex: '#38BDF8',
    atlasCell: [3, 1],
  },
  {
    id: 'koban-box',
    number: '09',
    nameEn: 'Hotaru-cho Koban',
    nameJp: '蛍町交番',
    category: 'Community Police Box',
    story:
      'A friendly chamfered-corner neighborhood koban crowned with a warm golden Sakura star emblem, a white patrol bicycle, and a hand-drawn local map board.',
    details: [
      'Chamfered cream masonry booth with round porthole window',
      'Glowing golden five-pointed star emblem above the door',
      'Parked white patrol bicycle & neighborhood map kiosk',
    ],
    position: [2.2, 0, 5.2],
    size: [2.4, 3.5, 2.4],
    cameraOffset: [4.8, 3.2, 9.8],
    lookAtOffset: [0, 1.4, 0],
    accentHex: '#FBBF24',
    atlasCell: [0, 2],
  },
  {
    id: 'tram-viaduct',
    number: '10',
    nameEn: 'Yokocho Tram Viaduct',
    nameJp: '高架路面電車駅',
    category: 'Elevated Transit Line',
    story:
      'An arched red-brick viaduct along the northern edge where the single-car Arakawa-style vintage streetcar glides beneath overhead catenary wires.',
    details: [
      'Arched hand-painted brick viaduct piers & steel railings',
      'Wooden platform waiting shelter with vintage clock',
      'Animated cream-and-jade streetcar with glowing headlights',
    ],
    position: [0.0, 0, -8.2],
    size: [16.0, 5.2, 2.6],
    cameraOffset: [0.0, 6.2, -2.2],
    lookAtOffset: [0, 2.6, -8.0],
    accentHex: '#34D399',
    atlasCell: [1, 2],
  },
];

/**
 * Computes inset UV bounds for a cell in a square texture atlas grid.
 * Applies half-texel padding so adjacent cells never bleed under linear filtering.
 */
export function getAtlasUvRect(
  col: number,
  row: number,
  gridCols = 4,
  gridRows = 4,
  atlasPixels = 1024,
  paddingPixels = 6,
): UvRect {
  const safeCol = Math.max(0, Math.min(gridCols - 1, col));
  const safeRow = Math.max(0, Math.min(gridRows - 1, row));
  const cellW = 1 / gridCols;
  const cellH = 1 / gridRows;
  const padU = paddingPixels / atlasPixels;
  const padV = paddingPixels / atlasPixels;

  // Canvas row 0 is top, while WebGL UV v=1 is top
  const invRow = gridRows - 1 - safeRow;
  return {
    uMin: safeCol * cellW + padU,
    vMin: invRow * cellH + padV,
    uMax: (safeCol + 1) * cellW - padU,
    vMax: (invRow + 1) * cellH - padV,
  };
}

/**
 * Returns calibrated lighting, sky, fog, and emissive parameters for Night vs Day.
 */
export function getAtmospherePreset(mode: TimeOfDay): AtmosphereState {
  if (mode === 'night') {
    return {
      skyTopHex: '#0B1026',
      skyBottomHex: '#1E1B4B',
      fogHex: '#0F142C',
      fogDensity: 0.0055,
      keyLightHex: '#93C5FD',
      keyLightIntensity: 0.72,
      hemiSkyHex: '#312E81',
      hemiGroundHex: '#1E1B2E',
      hemiIntensity: 0.55,
      rimLightHex: '#F472B6',
      rimLightIntensity: 0.48,
      emissiveIntensity: 0.85,
      bloomStrength: 0.18,
      outlineHex: '#090A1A',
      lanternLightIntensity: 0.75,
    };
  }
  return {
    skyTopHex: '#38BDF8',
    skyBottomHex: '#FEF3C7',
    fogHex: '#DBEAFE',
    fogDensity: 0.0035,
    keyLightHex: '#FFFBEB',
    keyLightIntensity: 1.35,
    hemiSkyHex: '#E0F2FE',
    hemiGroundHex: '#FDE68A',
    hemiIntensity: 0.72,
    rimLightHex: '#FDBA74',
    rimLightIntensity: 0.38,
    emissiveIntensity: 0.0,
    bloomStrength: 0.0,
    outlineHex: '#271C19',
    lanternLightIntensity: 0.0,
  };
}

/**
 * Evaluates triangle count against the low-poly diorama budget (<150k max, ~80k target).
 * Inverted-hull outline triangles are tracked separately as specified.
 */
export function evaluateSceneBudget(
  baseTriangles: number,
  outlineTriangles: number,
  atlasCount = 3,
  atlasResolution = 1024,
): BudgetReport {
  const safeBase = Math.max(0, Math.round(baseTriangles));
  const safeOutline = Math.max(0, Math.round(outlineTriangles));
  return {
    baseTriangles: safeBase,
    outlineTriangles: safeOutline,
    totalTriangles: safeBase + safeOutline,
    withinHardLimit: safeBase < 150_000,
    withinTargetZone: safeBase <= 95_000 && safeBase >= 2_000,
    atlasCount,
    atlasResolution,
  };
}

/**
 * Samples a closed 2D loop path `[x, z]` at normalized progress `t` in `[0, 1)`,
 * returning world coordinates and smooth heading angle `rotationY`.
 */
export function sampleLoopPath(
  waypoints: Array<[number, number]>,
  t: number,
  yOffset = 0,
): WaypointSample {
  if (waypoints.length === 0) {
    return { x: 0, y: yOffset, z: 0, rotationY: 0 };
  }
  if (waypoints.length === 1) {
    return { x: waypoints[0][0], y: yOffset, z: waypoints[0][1], rotationY: 0 };
  }

  const normT = ((t % 1) + 1) % 1;
  const totalSegments = waypoints.length;
  const scaled = normT * totalSegments;
  const segIndex = Math.floor(scaled) % totalSegments;
  const localAlpha = scaled - Math.floor(scaled);

  const p0 = waypoints[segIndex];
  const p1 = waypoints[(segIndex + 1) % totalSegments];

  const x = p0[0] + (p1[0] - p0[0]) * localAlpha;
  const z = p0[1] + (p1[1] - p0[1]) * localAlpha;
  const dx = p1[0] - p0[0];
  const dz = p1[1] - p0[1];
  const rotationY = Math.atan2(dx, dz);

  return { x, y: yOffset, z, rotationY };
}

/**
 * Computes a gentle, deterministic neon sign flicker multiplier in `[0.45, 1.15]`.
 */
export function computeNeonFlicker(elapsedSeconds: number, seed = 1): number {
  const s1 = Math.sin(elapsedSeconds * 7.3 + seed * 2.1);
  const s2 = Math.sin(elapsedSeconds * 23.7 + seed * 5.4);
  const dip = s1 > 0.92 && s2 > 0.6 ? 0.45 : 1.0;
  const hum = 0.95 + 0.08 * Math.sin(elapsedSeconds * 3.2 + seed);
  return Math.max(0.4, Math.min(1.15, dip * hum));
}
