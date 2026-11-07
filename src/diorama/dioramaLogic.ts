export type TimeOfDay = 'night' | 'day' | 'infinity';

export type CameraMode = 'orbit' | 'pov';

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

export interface PlayerPovState {
  x: number;
  y: number;
  z: number;
  eyeY: number;
  yaw: number;
  pitch: number;
  walkCycle: number;
}

export interface PovInputState {
  forward: number; // -1..1
  right: number; // -1..1
  turnYaw: number; // -1..1 continuous keyboard/button turn
  lookYawDelta: number; // pointer drag delta radians
  lookPitchDelta: number; // pointer drag delta radians
  sprint: boolean;
}

export interface PovSpawnPreset {
  id: string;
  label: string;
  themeBadge: string;
  accentHex: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export type YokochoBlockOrientation = 'upright' | 'inverted' | 'sideways-wall';

export type YokochoThemeId =
  | 'amber-shrine'
  | 'cyan-arcade'
  | 'matcha-canal'
  | 'wisteria-onsen'
  | 'rose-sky';

export interface MultiYokochoBlockInstance {
  id: string;
  themeId: YokochoThemeId;
  themeName: string;
  tintHex: string; // Multiplied into buildings & props via InstancedMesh.setColorAt
  groundTintHex: string; // Multiplied into chunky base via InstancedMesh.setColorAt
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  orientation: YokochoBlockOrientation;
}

export interface InfinityBridgeInstance {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  tintHex: string;
}

export interface InfinityCastleLayout {
  yokochoBlocks: MultiYokochoBlockInstance[];
  bridges: InfinityBridgeInstance[];
  pillars: InfinityBridgeInstance[];
  floatingLanterns: Array<{
    basePos: [number, number, number];
    phase: number;
    speed: number;
    tintHex: string;
  }>;
}

export const YOKOCHO_THEMES: Record<
  YokochoThemeId,
  { name: string; tintHex: string; groundTintHex: string; accentHex: string }
> = {
  'amber-shrine': {
    name: 'Kitsune Crimson-Gold District',
    tintHex: '#FDE047',
    groundTintHex: '#FCA5A5',
    accentHex: '#F59E0B',
  },
  'cyan-arcade': {
    name: 'Denki Cyber-Jade District',
    tintHex: '#67E8F9',
    groundTintHex: '#93C5FD',
    accentHex: '#06B6D4',
  },
  'matcha-canal': {
    name: 'Uji Matcha-Emerald District',
    tintHex: '#86EFAC',
    groundTintHex: '#A7F3D0',
    accentHex: '#10B981',
  },
  'wisteria-onsen': {
    name: 'Fuji Wisteria-Violet District',
    tintHex: '#D8B4FE',
    groundTintHex: '#C4B5FD',
    accentHex: '#A855F7',
  },
  'rose-sky': {
    name: 'Sakura Rose-Quartet Sanctum',
    tintHex: '#FDA4AF',
    groundTintHex: '#FBCFE8',
    accentHex: '#F43F5E',
  },
};

export const POV_SPAWN_PRESETS: PovSpawnPreset[] = [
  {
    id: 'origin-hotaru',
    label: '01 · Central Hotaru Yokocho',
    themeBadge: 'Showa Lantern Theme',
    accentHex: '#F59E0B',
    x: 0.2,
    y: 0.08,
    z: 7.5,
    yaw: 0,
    pitch: 0.16,
  },
  {
    id: 'north-crimson',
    label: '02 · North Crimson-Gold Bridge',
    themeBadge: 'Inari Festival Theme',
    accentHex: '#EF4444',
    x: 0.2,
    y: 0.08,
    z: -14.5,
    yaw: 0,
    pitch: 0.18,
  },
  {
    id: 'east-cyber',
    label: '03 · East Cyber-Jade Bridge',
    themeBadge: 'Denki Arcade Theme',
    accentHex: '#06B6D4',
    x: 14.5,
    y: 0.08,
    z: 1.8,
    yaw: -Math.PI / 2,
    pitch: 0.18,
  },
  {
    id: 'south-matcha',
    label: '04 · South Matcha-Tea Bridge',
    themeBadge: 'Uji Roastery Theme',
    accentHex: '#10B981',
    x: 0.2,
    y: 0.08,
    z: 14.5,
    yaw: Math.PI,
    pitch: 0.18,
  },
  {
    id: 'west-wisteria',
    label: '05 · West Wisteria-Onsen Bridge',
    themeBadge: 'Fuji Bathhouse Theme',
    accentHex: '#A855F7',
    x: -14.5,
    y: 0.08,
    z: 1.8,
    yaw: Math.PI / 2,
    pitch: 0.18,
  },
  {
    id: 'skyward-inverted',
    label: '06 · Skyward Mirror Canopy',
    themeBadge: 'Inverted Ceiling View',
    accentHex: '#F43F5E',
    x: 0.2,
    y: 0.42,
    z: 2.1,
    yaw: 0.22,
    pitch: 0.48,
  },
];

export const AUTO_WALK_WAYPOINTS: Array<[number, number]> = [
  [0.2, 7.8],
  [0.2, 1.8],
  [22.0, 1.8],
  [0.2, 1.8],
  [0.2, -22.0],
  [0.2, 1.8],
  [-22.0, 1.8],
  [0.2, 1.8],
  [0.2, 22.0],
  [0.2, 7.8],
];

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
    position: [-6.0, 0, 4.4],
    size: [3.6, 4.6, 3.4],
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
    position: [-2.45, 0, 4.6],
    size: [2.2, 3.3, 2.3],
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
    position: [6.0, 0, 4.4],
    size: [3.6, 5.5, 3.4],
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
    position: [2.75, 0, 4.8],
    size: [2.2, 3.4, 2.2],
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
 * Returns calibrated lighting, sky, fog, and emissive parameters for Infinity Castle, Night, or Day.
 */
export function getAtmospherePreset(mode: TimeOfDay): AtmosphereState {
  if (mode === 'infinity') {
    return {
      skyTopHex: '#10071A',
      skyBottomHex: '#250E2C',
      fogHex: '#14091E',
      fogDensity: 0.0029,
      keyLightHex: '#FDBA74',
      keyLightIntensity: 0.86,
      hemiSkyHex: '#4C1D95',
      hemiGroundHex: '#3B0764',
      hemiIntensity: 0.66,
      rimLightHex: '#F43F5E',
      rimLightIntensity: 0.58,
      emissiveIntensity: 0.92,
      bloomStrength: 0.18,
      outlineHex: '#0D0614',
      lanternLightIntensity: 0.88,
    };
  }
  if (mode === 'night') {
    return {
      skyTopHex: '#0B1026',
      skyBottomHex: '#1E1B4B',
      fogHex: '#0F142C',
      fogDensity: 0.0034,
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
    fogDensity: 0.0026,
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
    withinTargetZone: safeBase <= 115_000 && safeBase >= 2_000,
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

/**
 * Generates a well-structured, architectural 4-Tier Multi-Yokocho Infinity Castle Lattice
 * where each district block has a distinct color palette & theme:
 * - Tier 1: Cardinal Cross Plaza (North Crimson-Gold, East Cyber-Jade, South Matcha-Emerald, West Wisteria-Violet)
 *   + 4 Stepped Outer Corner Terraces
 * - Tier 2: 4 Symmetrical 90-Degree Vertical Chasm Walls (8 Wall-Mounted Yokocho Districts)
 * - Tier 3: Overhead Inverted Sky Canopy (6 Upside-Down Mirror Yokocho Districts at y = +28)
 * - Tier 4: Deep Abyssal Underworld Foundation (6 Lower Terraced Yokocho Districts at y = -18..-26)
 */
export function generateInfinityCastleLayout(): InfinityCastleLayout {
  const yokochoBlocks: MultiYokochoBlockInstance[] = [];
  const bridges: InfinityBridgeInstance[] = [];
  const pillars: InfinityBridgeInstance[] = [];
  const floatingLanterns: InfinityCastleLayout['floatingLanterns'] = [];

  const addBlock = (
    id: string,
    themeId: YokochoThemeId,
    position: [number, number, number],
    rotation: [number, number, number],
    scaleScalar: number,
    orientation: YokochoBlockOrientation,
  ) => {
    const theme = YOKOCHO_THEMES[themeId];
    yokochoBlocks.push({
      id,
      themeId,
      themeName: theme.name,
      tintHex: theme.tintHex,
      groundTintHex: theme.groundTintHex,
      position,
      rotation,
      scale: [scaleScalar, scaleScalar, scaleScalar],
      orientation,
    });
  };

  // ==========================================================================
  // TIER 1: CARDINAL CROSS PLAZA (y = 0.0, Walkable Neighbor Districts at ±30)
  // ==========================================================================
  addBlock('cardinal-north-crimson', 'amber-shrine', [0, 0, -30.0], [0, 0, 0], 0.96, 'upright');
  addBlock('cardinal-east-cyber', 'cyan-arcade', [30.0, 0, 0], [0, -Math.PI / 2, 0], 0.96, 'upright');
  addBlock('cardinal-south-matcha', 'matcha-canal', [0, 0, 30.0], [0, Math.PI, 0], 0.96, 'upright');
  addBlock('cardinal-west-wisteria', 'wisteria-onsen', [-30.0, 0, 0], [0, Math.PI / 2, 0], 0.96, 'upright');

  // 4 Symmetrical Stepped Corner Plaza Blocks at (±30, y, ±30)
  addBlock('corner-nw-wisteria', 'wisteria-onsen', [-30.0, -5.5, -30.0], [0, Math.PI / 4, 0], 0.92, 'upright');
  addBlock('corner-ne-cyber', 'cyan-arcade', [30.0, -5.5, -30.0], [0, -Math.PI / 4, 0], 0.92, 'upright');
  addBlock('corner-sw-matcha', 'matcha-canal', [-30.0, -5.5, 30.0], [0, (Math.PI * 3) / 4, 0], 0.92, 'upright');
  // SE corner stepped lower (-12.5) so the Southeast overview camera has a panoramic vista
  addBlock('corner-se-rose', 'rose-sky', [30.0, -12.5, 30.0], [0, -Math.PI / 4, 0], 0.92, 'upright');

  // ==========================================================================
  // TIER 2: SYMMETRICAL 90-DEGREE VERTICAL CHASM WALLS (±45.0 units out)
  // ==========================================================================
  // North Vertical Wall (facing South toward plaza)
  addBlock('wall-north-west', 'amber-shrine', [-16.0, 12.0, -45.0], [Math.PI / 2, 0, 0], 0.92, 'sideways-wall');
  addBlock('wall-north-east', 'cyan-arcade', [16.0, 12.0, -45.0], [Math.PI / 2, 0, 0], 0.92, 'sideways-wall');

  // West Vertical Wall (facing East toward plaza)
  addBlock('wall-west-north', 'wisteria-onsen', [-45.0, 12.0, -16.0], [0, 0, -Math.PI / 2], 0.92, 'sideways-wall');
  addBlock('wall-west-south', 'rose-sky', [-45.0, 12.0, 16.0], [0, 0, -Math.PI / 2], 0.92, 'sideways-wall');

  // East Vertical Wall (facing West toward plaza)
  addBlock('wall-east-north', 'cyan-arcade', [45.0, 12.0, -16.0], [0, 0, Math.PI / 2], 0.92, 'sideways-wall');
  addBlock('wall-east-lower', 'matcha-canal', [45.0, -9.0, 0.0], [0, 0, Math.PI / 2], 0.9, 'sideways-wall');

  // South Vertical Wall (facing North toward plaza)
  addBlock('wall-south-west', 'matcha-canal', [-16.0, 12.0, 45.0], [-Math.PI / 2, 0, 0], 0.92, 'sideways-wall');
  addBlock('wall-south-lower', 'amber-shrine', [0.0, -9.0, 45.0], [-Math.PI / 2, 0, 0], 0.9, 'sideways-wall');

  // ==========================================================================
  // TIER 3: INVERTED MIRROR SKY CANOPY (y = +28.5, Upside-Down Ceiling Grid)
  // ==========================================================================
  addBlock('sky-center-rose', 'rose-sky', [0, 28.5, 0], [Math.PI, Math.PI / 2, 0], 0.95, 'inverted');
  addBlock('sky-north-crimson', 'amber-shrine', [0, 27.5, -30.0], [Math.PI, 0, 0], 0.92, 'inverted');
  addBlock('sky-west-wisteria', 'wisteria-onsen', [-30.0, 27.5, 0], [Math.PI, Math.PI / 2, 0], 0.92, 'inverted');
  addBlock('sky-east-cyber', 'cyan-arcade', [30.0, 27.5, 0], [Math.PI, -Math.PI / 2, 0], 0.92, 'inverted');
  addBlock('sky-nw-rose', 'rose-sky', [-28.0, 25.0, -28.0], [Math.PI, Math.PI / 4, 0], 0.88, 'inverted');
  addBlock('sky-ne-amber', 'amber-shrine', [28.0, 25.0, -28.0], [Math.PI, -Math.PI / 4, 0], 0.88, 'inverted');

  // ==========================================================================
  // TIER 4: DEEP ABYSSAL FOUNDATION (y = -18.5 to -26.0, Underworld Grid)
  // ==========================================================================
  addBlock('abyss-center-wisteria', 'wisteria-onsen', [0, -19.0, 0], [0, Math.PI / 2, 0], 0.95, 'upright');
  addBlock('abyss-north-cyber', 'cyan-arcade', [0, -18.5, -30.0], [0, 0, 0], 0.92, 'upright');
  addBlock('abyss-west-matcha', 'matcha-canal', [-30.0, -18.5, 0], [0, Math.PI / 2, 0], 0.92, 'upright');
  addBlock('abyss-east-amber', 'amber-shrine', [30.0, -18.5, 0], [0, -Math.PI / 2, 0], 0.92, 'upright');
  addBlock('abyss-south-rose', 'rose-sky', [0, -18.5, 30.0], [0, Math.PI, 0], 0.92, 'upright');
  addBlock('abyss-inv-nw', 'rose-sky', [-20.0, -26.0, -20.0], [Math.PI, 0, 0], 0.86, 'inverted');
  addBlock('abyss-inv-ne', 'wisteria-onsen', [20.0, -26.0, -20.0], [Math.PI, Math.PI / 2, 0], 0.86, 'inverted');

  // ==========================================================================
  // ALIGNED VERMILION & THEME-TINTED BRIDGES LINKING THE GRID
  // ==========================================================================
  // 4 Primary Cardinal Walkable Bridges linking Origin (0,0,0) to North, East, South, West Districts
  bridges.push(
    { position: [0.2, -0.04, -15.0], rotation: [0, 0, 0], scale: [1.25, 1, 1.08], tintHex: '#FDE047' }, // North Crimson-Gold Bridge
    { position: [15.0, -0.04, 1.8], rotation: [0, Math.PI / 2, 0], scale: [1.25, 1, 1.08], tintHex: '#67E8F9' }, // East Cyber-Jade Bridge
    { position: [0.2, -0.04, 15.0], rotation: [0, 0, 0], scale: [1.25, 1, 1.08], tintHex: '#86EFAC' }, // South Matcha Bridge
    { position: [-15.0, -0.04, 1.8], rotation: [0, Math.PI / 2, 0], scale: [1.25, 1, 1.08], tintHex: '#D8B4FE' }, // West Wisteria Bridge
  );

  // 8 Outer Ring Bridges connecting the Cardinal Blocks to the 4 Corner Plaza Blocks
  const outerBridgeSpecs: Array<{ pos: [number, number, number]; rot: [number, number, number]; tint: string }> = [
    { pos: [-15.0, -2.8, -30.0], rot: [0, Math.PI / 2, -0.25], tint: '#D8B4FE' },
    { pos: [15.0, -2.8, -30.0], rot: [0, Math.PI / 2, 0.25], tint: '#67E8F9' },
    { pos: [-30.0, -2.8, -15.0], rot: [-0.25, 0, 0], tint: '#D8B4FE' },
    { pos: [30.0, -2.8, -15.0], rot: [-0.25, 0, 0], tint: '#67E8F9' },
    { pos: [-30.0, -2.8, 15.0], rot: [0.25, 0, 0], tint: '#86EFAC' },
    { pos: [-15.0, -2.8, 30.0], rot: [0, Math.PI / 2, -0.25], tint: '#86EFAC' },
    // Upper Sky Canopy Bridges (at y = +26)
    { pos: [0.2, 26.5, -15.0], rot: [0, 0, 0], tint: '#FDA4AF' },
    { pos: [-15.0, 26.5, 0], rot: [0, Math.PI / 2, 0], tint: '#D8B4FE' },
    { pos: [15.0, 26.5, 0], rot: [0, Math.PI / 2, 0], tint: '#67E8F9' },
    // Lower Abyssal Bridges (at y = -18.5)
    { pos: [0.2, -18.5, -15.0], rot: [0, 0, 0], tint: '#67E8F9' },
    { pos: [-15.0, -18.5, 0], rot: [0, Math.PI / 2, 0], tint: '#86EFAC' },
    { pos: [15.0, -18.5, 0], rot: [0, Math.PI / 2, 0], tint: '#FDE047' },
    { pos: [0.2, -18.5, 15.0], rot: [0, 0, 0], tint: '#FDA4AF' },
    // High Chasm Wall Viaduct Spans (at y = +12)
    { pos: [-16.0, 11.5, -36.0], rot: [0, 0, 0], tint: '#FDE047' },
    { pos: [16.0, 11.5, -36.0], rot: [0, 0, 0], tint: '#67E8F9' },
    { pos: [-36.0, 11.5, -16.0], rot: [0, Math.PI / 2, 0], tint: '#D8B4FE' },
    { pos: [-36.0, 11.5, 16.0], rot: [0, Math.PI / 2, 0], tint: '#FDA4AF' },
  ];
  for (const ob of outerBridgeSpecs) {
    bridges.push({
      position: ob.pos,
      rotation: ob.rot,
      scale: [1.1, 1, 1.15],
      tintHex: ob.tint,
    });
  }

  // ==========================================================================
  // STRUCTURAL HINOKI MEGA-PILLARS AT EXACT GRID INTERSECTIONS
  // ==========================================================================
  const pillarGridCoords: Array<[number, number, string]> = [
    [-16.5, -16.5, '#FDE047'],
    [16.5, -16.5, '#67E8F9'],
    [-16.5, 16.5, '#86EFAC'],
    // Note: (16.5, 16.5) intentionally omitted so Southeast camera view is 100% clear
    [-38.0, -38.0, '#D8B4FE'],
    [38.0, -38.0, '#67E8F9'],
    [-38.0, 38.0, '#86EFAC'],
    [38.0, -16.5, '#67E8F9'],
    [-38.0, -16.5, '#D8B4FE'],
    [-16.5, -38.0, '#FDE047'],
    [16.5, -38.0, '#FDE047'],
    [-38.0, 16.5, '#FDA4AF'],
    [-16.5, 38.0, '#86EFAC'],
    [0.0, -44.0, '#FDE047'],
    [-44.0, 0.0, '#D8B4FE'],
    [44.0, -28.0, '#67E8F9'],
    [-28.0, 44.0, '#86EFAC'],
  ];
  for (const [px, pz, tintHex] of pillarGridCoords) {
    pillars.push({
      position: [px, 0, pz],
      rotation: [0, 0, 0],
      scale: [1.15, 1, 1.15],
      tintHex,
    });
  }

  // ==========================================================================
  // COLOR-COORDINATED FLOATING LANTERNS ALONG THE 4 DISTRICT CORRIDORS
  // ==========================================================================
  const lanternTints = ['#FDE047', '#67E8F9', '#86EFAC', '#D8B4FE', '#FDA4AF'];
  for (let i = 0; i < 60; i++) {
    const ringIdx = i % 3;
    const angle = (i / 60) * Math.PI * 2 * 2;
    const radius = 16.5 + ringIdx * 8.5;
    const lx = Math.cos(angle) * radius;
    const lz = Math.sin(angle) * radius;
    if (lx > 12 && lz > 12) continue; // Keep Southeast camera lens clear
    const ly = -14 + ((i * 7) % 34);
    floatingLanterns.push({
      basePos: [lx, ly, lz],
      phase: i * 0.65,
      speed: 0.45 + (i % 4) * 0.1,
      tintHex: lanternTints[i % lanternTints.length],
    });
  }

  return { yokochoBlocks, bridges, pillars, floatingLanterns };
}

/**
 * Checks whether a 2D coordinate `(x, z)` lies on the main Hotaru Yokocho block,
 * one of the 4 Cardinal Infinity Bridges, or the 4 Neighboring Themed Yokocho blocks!
 */
export function clampToWalkableSurface(x: number, z: number): {
  x: number;
  z: number;
  surfaceY: number;
} {
  // Walkable South or North Corridor (Origin Block -> Bridge -> Neighboring Yokocho Block out to ±36)
  if (Math.abs(x - 0.2) <= 1.85 && Math.abs(z) > 10.2 && Math.abs(z) <= 36.0) {
    const clampedX = Math.max(-1.55, Math.min(1.95, x));
    const clampedZ = Math.max(-36.0, Math.min(36.0, z));
    return { x: clampedX, z: clampedZ, surfaceY: 0.08 };
  }

  // Walkable East or West Corridor (Origin Block -> Bridge -> Neighboring Yokocho Block out to ±36)
  if (Math.abs(z - 1.8) <= 1.85 && Math.abs(x) > 10.2 && Math.abs(x) <= 36.0) {
    const clampedX = Math.max(-36.0, Math.min(36.0, x));
    const clampedZ = Math.max(0.05, Math.min(3.55, z));
    return { x: clampedX, z: clampedZ, surfaceY: 0.08 };
  }

  // Otherwise clamp to the main floating city block [-10.3, 10.3]
  const clampedX = Math.max(-10.3, Math.min(10.3, x));
  const clampedZ = Math.max(-10.3, Math.min(10.3, z));

  // Raised Inari Shrine mossy stone terrace (centered at [0.2, -0.4], size 4.8x4.8)
  const onShrineTerrace =
    Math.abs(clampedX - 0.2) <= 2.35 && Math.abs(clampedZ - -0.4) <= 2.35;

  return {
    x: clampedX,
    z: clampedZ,
    surfaceY: onShrineTerrace ? 0.42 : 0.08,
  };
}

/**
 * Resolves 2D circle-vs-AABB collisions against solid ground-level buildings so the first-person
 * walker smoothly slides along shop walls without clipping inside buildings.
 */
export function resolveBuildingCollision(
  x: number,
  z: number,
  playerRadius = 0.42,
): { x: number; z: number } {
  let resolvedX = x;
  let resolvedZ = z;

  for (const b of BUILDINGS) {
    if (b.id === 'tram-viaduct') continue;

    const bx = b.position[0];
    const bz = b.position[2];
    const halfW = (b.id === 'inari-shrine' ? 2.6 : b.size[0]) * 0.5 + playerRadius;
    const halfD = (b.id === 'inari-shrine' ? 2.2 : b.size[2]) * 0.5 + playerRadius;
    const centerZ = b.id === 'inari-shrine' ? bz - 0.65 : bz;

    const dx = resolvedX - bx;
    const dz = resolvedZ - centerZ;

    if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
      const overlapX = halfW - Math.abs(dx);
      const overlapZ = halfD - Math.abs(dz);
      if (overlapX < overlapZ) {
        resolvedX += dx >= 0 ? overlapX : -overlapX;
      } else {
        resolvedZ += dz >= 0 ? overlapZ : -overlapZ;
      }
    }
  }

  return { x: resolvedX, z: resolvedZ };
}

/**
 * Advances the First-Person Walking POV state by `dt` seconds with smooth movement,
 * pitch clamping, wall sliding, walkable bridge clamping, and subtle footstep head-bob.
 */
export function stepWalkthroughPov(
  state: PlayerPovState,
  input: PovInputState,
  dt: number,
): PlayerPovState {
  const safeDt = Math.max(0, Math.min(0.1, dt));

  // 1. Update yaw and clamped pitch
  const turnSpeed = 1.85;
  const nextYaw = state.yaw - input.turnYaw * turnSpeed * safeDt - input.lookYawDelta;
  const rawPitch = state.pitch - input.lookPitchDelta;
  const nextPitch = Math.max(-1.22, Math.min(1.22, rawPitch));

  // 2. Compute forward & right movement vectors in XZ plane
  const forwardX = -Math.sin(nextYaw);
  const forwardZ = -Math.cos(nextYaw);
  const rightX = Math.cos(nextYaw);
  const rightZ = -Math.sin(nextYaw);

  const mag = Math.hypot(input.forward, input.right);
  const normForward = mag > 1 ? input.forward / mag : input.forward;
  const normRight = mag > 1 ? input.right / mag : input.right;

  const baseSpeed = input.sprint ? 6.8 : 4.2;
  const moveX = (forwardX * normForward + rightX * normRight) * baseSpeed * safeDt;
  const moveZ = (forwardZ * normForward + rightZ * normRight) * baseSpeed * safeDt;

  const candidateX = state.x + moveX;
  const candidateZ = state.z + moveZ;

  // 3. Resolve building wall collisions & clamp to block + Infinity Bridges
  const collided = resolveBuildingCollision(candidateX, candidateZ, 0.42);
  const clamped = clampToWalkableSurface(collided.x, collided.z);

  // 4. Advance walk cycle and compute subtle eye-level head-bob
  const isMoving = Math.abs(normForward) > 0.01 || Math.abs(normRight) > 0.01;
  const cycleRate = input.sprint ? 11.5 : 7.8;
  const nextWalkCycle = isMoving ? state.walkCycle + safeDt * cycleRate : state.walkCycle;
  const bobOffset = isMoving ? Math.sin(nextWalkCycle) * 0.036 : 0;
  const eyeHeightAboveGround = 0.92;

  return {
    x: clamped.x,
    y: clamped.surfaceY,
    z: clamped.z,
    eyeY: clamped.surfaceY + eyeHeightAboveGround + bobOffset,
    yaw: nextYaw,
    pitch: nextPitch,
    walkCycle: nextWalkCycle,
  };
}
