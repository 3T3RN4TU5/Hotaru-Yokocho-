import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BUILDINGS,
  BuildingSpec,
  WaypointSample,
  sampleLoopPath,
  computeNeonFlicker,
  generateInfinityCastleLayout,
} from './dioramaLogic';
import { DioramaAtlasBundle, mapGeometryToAtlasCell } from './textureAtlases';

export interface BuiltDioramaScene {
  rootGroup: THREE.Group;
  infinityGroup: THREE.Group;
  setOutlineVisible: (visible: boolean) => void;
  setInfinityCastleVisible: (visible: boolean) => void;
  raycastTargets: THREE.Object3D[];
  buildingGroups: Map<string, THREE.Group>;
  materials: {
    buildingsMat: THREE.MeshStandardMaterial;
    propsMat: THREE.MeshStandardMaterial;
    groundMat: THREE.MeshStandardMaterial;
    neonSignsMat: THREE.MeshStandardMaterial;
    outlineMat: THREE.MeshBasicMaterial;
    highlightRingMat: THREE.MeshBasicMaterial;
  };
  highlightRing: THREE.Mesh;
  lanternLights: THREE.PointLight[];
  stats: {
    baseTriangles: number;
    outlineTriangles: number;
  };
  updateAnimation: (elapsed: number, delta: number, isNight: boolean) => void;
  dispose: () => void;
}

const KEI_TRUCK_LOOP: Array<[number, number]> = [
  [-8.6, 8.2],
  [8.6, 8.2],
  [8.6, 1.8],
  [-8.6, 1.8],
];

const SCOOTER_LOOP: Array<[number, number]> = [
  [-2.8, 8.4],
  [-2.8, -5.8],
  [3.0, -5.8],
  [3.0, 8.4],
];

function createInvertedHullMaterial(colorHex = '#0F0E24'): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    side: THREE.BackSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      vec3 transformed = position + normal * 0.032;
      `,
    );
  };
  return mat;
}

function countGroupTriangles(root: THREE.Object3D): { base: number; outline: number } {
  let base = 0;
  let outline = 0;
  root.traverse((obj) => {
    if ((obj as THREE.InstancedMesh).isInstancedMesh) {
      const im = obj as THREE.InstancedMesh;
      const g = im.geometry;
      const perInstance = g.index
        ? g.index.count / 3
        : (g.attributes.position?.count ?? 0) / 3;
      base += perInstance * im.count;
    } else if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.userData.isRaycastProxy) return;
      const g = m.geometry;
      const meshTris = g.index
        ? g.index.count / 3
        : (g.attributes.position?.count ?? 0) / 3;
      if (m.userData.isOutlineMesh) {
        outline += meshTris;
      } else {
        base += meshTris;
      }
    }
  });
  return { base: Math.round(base), outline: Math.round(outline) };
}

export function buildDioramaScene(
  atlases: DioramaAtlasBundle,
  onProgress?: (step: number, label: string) => void,
): BuiltDioramaScene {
  const rootGroup = new THREE.Group();
  const outlineMeshes: THREE.Mesh[] = [];
  const raycastTargets: THREE.Object3D[] = [];
  const buildingGroups = new Map<string, THREE.Group>();
  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeometries.push(g);
    return g;
  };

  // Shared Atlas Materials (3 primary texture atlases)
  const applyInstanceEmissiveTint = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      #ifdef USE_INSTANCING_COLOR
        totalEmissiveRadiance *= vInstanceColor;
      #endif
      `,
    );
  };

  const buildingsMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: atlases.buildingsColor,
    emissive: new THREE.Color('#FFFBEB'),
    emissiveMap: atlases.buildingsEmissive,
    emissiveIntensity: 0.85,
    envMapIntensity: 0.18,
    roughness: 0.72,
    metalness: 0.05,
  });
  buildingsMat.onBeforeCompile = applyInstanceEmissiveTint;

  const propsMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: atlases.propsColor,
    emissive: new THREE.Color('#FFFBEB'),
    emissiveMap: atlases.propsEmissive,
    emissiveIntensity: 0.8,
    envMapIntensity: 0.18,
    roughness: 0.65,
    metalness: 0.08,
  });
  propsMat.onBeforeCompile = applyInstanceEmissiveTint;

  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: atlases.groundColor,
    bumpMap: atlases.groundBump,
    bumpScale: 0.04,
    envMapIntensity: 0.15,
    roughness: 0.82,
    metalness: 0.04,
  });

  const neonSignsMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: atlases.buildingsColor,
    emissive: new THREE.Color('#FFFFFF'),
    emissiveMap: atlases.buildingsEmissive,
    emissiveIntensity: 1.05,
    envMapIntensity: 0.18,
    roughness: 0.45,
    metalness: 0.1,
  });

  const outlineMat = createInvertedHullMaterial('#0F0E24');

  const highlightRingMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  disposableMaterials.push(
    buildingsMat,
    propsMat,
    groundMat,
    neonSignsMat,
    outlineMat,
    highlightRingMat,
  );

  // Helper to add a mesh and keep its inverted-hull outline child inside the same local parent group
  const addMeshWithOutline = (
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: [number, number, number],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
    includeOutline = true,
    castShadow = true,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);

    if (includeOutline) {
      const outlineMesh = new THREE.Mesh(geo, outlineMat);
      outlineMesh.position.copy(mesh.position);
      outlineMesh.rotation.copy(mesh.rotation);
      outlineMesh.scale.copy(mesh.scale);
      outlineMesh.userData.isOutlineMesh = true;
      parent.add(outlineMesh);
      outlineMeshes.push(outlineMesh);
    }
    return mesh;
  };

  onProgress?.(82, 'Sculpting Chunky Floating Block & Earth Cross-Section...');

  // ============================================================================
  // 1. FLOATING CHUNKY BASE & CROSS-SECTION STRATA (Merged Static Geometry)
  // ============================================================================
  const baseGeos: THREE.BufferGeometry[] = [];

  // Layer A: Terracotta Upper Crust Slab (22 x 0.45 x 22)
  const crustGeo = mapGeometryToAtlasCell(
    new THREE.BoxGeometry(22.4, 0.45, 22.4, 2, 1, 2),
    2,
    2,
  );
  crustGeo.translate(0, -0.225, 0);
  baseGeos.push(crustGeo);

  // Layer B: Rich Sienna Soil Stratum (21.6 x 1.15 x 21.6)
  const soilGeo = mapGeometryToAtlasCell(
    new THREE.BoxGeometry(21.6, 1.15, 21.6, 2, 1, 2),
    2,
    2,
  );
  soilGeo.translate(0, -1.0, 0);
  baseGeos.push(soilGeo);

  // Layer C: Tapered Chunky Basalt Bedrock Underside
  const rockMainGeo = mapGeometryToAtlasCell(
    new THREE.CylinderGeometry(14.2, 9.2, 2.1, 8, 2),
    3,
    3,
  );
  rockMainGeo.rotateY(Math.PI / 8);
  rockMainGeo.translate(0, -2.55, 0);
  baseGeos.push(rockMainGeo);

  const rockTipGeo = mapGeometryToAtlasCell(
    new THREE.ConeGeometry(8.8, 1.6, 7),
    3,
    3,
  );
  rockTipGeo.rotateX(Math.PI);
  rockTipGeo.translate(0, -4.2, 0);
  baseGeos.push(rockTipGeo);

  // Sub-surface Storm Drain Pipe Cross-Section visible on front & east cut wall
  const drainPipeOuter = mapGeometryToAtlasCell(
    new THREE.CylinderGeometry(0.52, 0.52, 22.5, 12),
    2,
    0,
  );
  drainPipeOuter.rotateX(Math.PI / 2);
  drainPipeOuter.translate(-2.8, -0.95, 0);
  baseGeos.push(drainPipeOuter);

  // Top Street Asphalt Surface (offset +0.04 to prevent Z-fighting)
  const mainRoadGeo = mapGeometryToAtlasCell(
    new THREE.BoxGeometry(21.8, 0.08, 3.8),
    0,
    0,
  );
  mainRoadGeo.translate(0, 0.04, 8.0);
  baseGeos.push(mainRoadGeo);

  const northAlleyGeo = mapGeometryToAtlasCell(
    new THREE.BoxGeometry(21.8, 0.08, 2.8),
    0,
    0,
  );
  northAlleyGeo.translate(0, 0.04, 1.8);
  baseGeos.push(northAlleyGeo);

  // Crisp Zebra Crosswalk Pads (offset +0.06 on Y)
  for (const cwX of [-3.0, 3.2]) {
    const cwGeo = mapGeometryToAtlasCell(new THREE.BoxGeometry(2.2, 0.08, 3.4), 1, 0);
    cwGeo.translate(cwX, 0.055, 8.0);
    baseGeos.push(cwGeo);
  }

  // Cobblestone Yokocho Pedestrian Alleys
  const centerCobbleGeo = mapGeometryToAtlasCell(
    new THREE.BoxGeometry(19.6, 0.08, 14.4),
    2,
    0,
  );
  centerCobbleGeo.translate(0, 0.035, -2.0);
  baseGeos.push(centerCobbleGeo);

  // Shrine Raised Mossy Stone Podium
  const shrinePodiumGeo = mapGeometryToAtlasCell(
    new THREE.BoxGeometry(4.8, 0.42, 4.8),
    0,
    2,
  );
  shrinePodiumGeo.translate(0.2, 0.21, -0.4);
  baseGeos.push(shrinePodiumGeo);

  const shrineStepsGeo = mapGeometryToAtlasCell(
    new THREE.BoxGeometry(1.8, 0.24, 0.9),
    2,
    0,
  );
  shrineStepsGeo.translate(0.2, 0.12, 2.2);
  baseGeos.push(shrineStepsGeo);

  const mergedBaseGeo = trackGeo(mergeGeometries(baseGeos, false)!);
  baseGeos.forEach((g) => g.dispose());

  const baseMesh = new THREE.Mesh(mergedBaseGeo, groundMat);
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = true;
  rootGroup.add(baseMesh);

  const baseOutline = new THREE.Mesh(mergedBaseGeo, outlineMat);
  baseOutline.userData.isOutlineMesh = true;
  rootGroup.add(baseOutline);
  outlineMeshes.push(baseOutline);

  // Selection / Hover Highlight Ring on the Ground
  const highlightRingGeo = trackGeo(new THREE.RingGeometry(2.1, 2.45, 32));
  highlightRingGeo.rotateX(-Math.PI / 2);
  const highlightRing = new THREE.Mesh(highlightRingGeo, highlightRingMat);
  highlightRing.position.set(0, 0.14, 0);
  rootGroup.add(highlightRing);

  onProgress?.(88, 'Constructing 10 Composite Hand-Painted Tokyo Buildings...');

  // ============================================================================
  // 2. COMPOSITE 8-12 PART BUILDINGS (10 Interactive Buildings)
  // ============================================================================
  const buildSingleStructure = (spec: BuildingSpec) => {
    const group = new THREE.Group();
    group.position.set(spec.position[0], spec.position[1], spec.position[2]);
    group.userData.buildingSpec = spec;
    rootGroup.add(group);
    buildingGroups.set(spec.id, group);

    const [w, h, d] = spec.size;
    const [col, row] = spec.atlasCell;

    // Invisible Raycast Proxy Box on Layer 1 for crisp hover/click selection
    const proxyGeo = trackGeo(new THREE.BoxGeometry(w + 0.3, h + 0.6, d + 0.3));
    proxyGeo.translate(0, h / 2, 0);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    disposableMaterials.push(proxyMat);
    const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
    proxyMesh.layers.enable(1);
    proxyMesh.userData.buildingSpec = spec;
    proxyMesh.userData.isRaycastProxy = true;
    group.add(proxyMesh);
    raycastTargets.push(proxyMesh);

    if (spec.id === 'inari-shrine') {
      // 1. KITSUNE INARI SHRINE (Focal Point Landmark - 10 composite parts)
      const hondenBody = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(2.6, 2.1, 2.4), col, row),
      );
      addMeshWithOutline(group, hondenBody, buildingsMat, [0, 1.05, -0.5]);

      // Curving Copper-Shingled Gable Roof
      const roofEave = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(3.2, 0.24, 3.0), 3, 2),
      );
      addMeshWithOutline(group, roofEave, buildingsMat, [0, 2.18, -0.5]);

      const roofMain = trackGeo(
        mapGeometryToAtlasCell(new THREE.ConeGeometry(2.2, 1.25, 4), 3, 2),
      );
      roofMain.rotateY(Math.PI / 4);
      addMeshWithOutline(group, roofMain, buildingsMat, [0, 2.85, -0.5], [0, 0, 0], [1.15, 1, 1.05]);

      // Gold Ridge Beam & Chigi Finials
      const ridgeGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(2.1, 0.22, 0.25), 2, 0),
      );
      addMeshWithOutline(group, ridgeGeo, propsMat, [0, 3.42, -0.5], [0, 0, 0], [1, 1, 1], false);

      // Vermilion Torii Gate at front of shrine terrace
      const pillarGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.14, 0.16, 2.5, 10), 2, 0),
      );
      addMeshWithOutline(group, pillarGeo, propsMat, [-0.85, 1.25, 1.45]);
      addMeshWithOutline(group, pillarGeo, propsMat, [0.85, 1.25, 1.45]);

      const kasagiGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(2.55, 0.22, 0.32), 2, 0),
      );
      addMeshWithOutline(group, kasagiGeo, propsMat, [0, 2.48, 1.45]);

      const nukiGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(2.15, 0.15, 0.22), 2, 0),
      );
      addMeshWithOutline(group, nukiGeo, propsMat, [0, 2.02, 1.45]);

      // Twin Stone Kitsune Fox Guardians
      const foxBaseGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(0.42, 0.45, 0.42), 1, 2),
      );
      const foxBodyGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.ConeGeometry(0.22, 0.65, 6), 1, 2),
      );
      addMeshWithOutline(group, foxBaseGeo, propsMat, [-1.25, 0.22, 0.85], [0, 0, 0], [1, 1, 1], false);
      addMeshWithOutline(group, foxBodyGeo, propsMat, [-1.25, 0.72, 0.85], [0, 0, 0], [1, 1, 1], false);
      addMeshWithOutline(group, foxBaseGeo, propsMat, [1.25, 0.22, 0.85], [0, 0, 0], [1, 1, 1], false);
      addMeshWithOutline(group, foxBodyGeo, propsMat, [1.25, 0.72, 0.85], [0, 0, 0], [1, 1, 1], false);

      // Wooden Saisenbako Offering Box
      const saisenGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(0.85, 0.48, 0.52), 2, 3),
      );
      addMeshWithOutline(group, saisenGeo, buildingsMat, [0, 0.24, 0.8], [0, 0, 0], [1, 1, 1], false);
      return;
    }

    if (spec.id === 'tram-viaduct') {
      // 10. ELEVATED TRAM VIADUCT & SHELTER
      const deckGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(17.6, 0.65, 2.5), col, row),
      );
      addMeshWithOutline(group, deckGeo, buildingsMat, [0, 2.6, 0]);

      // 4 Brick Viaduct Piers
      const pierGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(1.4, 2.4, 2.2), col, row),
      );
      for (const px of [-6.8, -2.3, 2.3, 6.8]) {
        addMeshWithOutline(group, pierGeo, buildingsMat, [px, 1.2, 0]);
      }

      // Platform Waiting Shelter Canopy
      const canopyGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(4.6, 0.22, 1.6), 3, 2),
      );
      addMeshWithOutline(group, canopyGeo, buildingsMat, [0, 4.15, -0.35]);

      const postGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.08, 0.08, 1.25, 8), 2, 2),
      );
      addMeshWithOutline(group, postGeo, buildingsMat, [-1.8, 3.5, -0.6], [0, 0, 0], [1, 1, 1], false);
      addMeshWithOutline(group, postGeo, buildingsMat, [1.8, 3.5, -0.6], [0, 0, 0], [1, 1, 1], false);
      return;
    }

    // Standard Multi-Tier Kawaii Tokyo Building Construction (6–10 distinct parts per building)
    const lowerH = h * 0.56;
    const upperH = h * 0.36;

    // 1. Primary First-Floor Hull
    const body1Geo = trackGeo(
      mapGeometryToAtlasCell(new THREE.BoxGeometry(w, lowerH, d), col, row),
    );
    addMeshWithOutline(group, body1Geo, buildingsMat, [0, lowerH / 2, 0]);

    // 2. Second-Story Stepped Upper Volume
    const body2Geo = trackGeo(
      mapGeometryToAtlasCell(
        new THREE.BoxGeometry(w * 0.92, upperH, d * 0.92),
        col,
        row,
      ),
    );
    addMeshWithOutline(group, body2Geo, buildingsMat, [0, lowerH + upperH / 2, -0.08]);

    // 3. Architectural Roof Variety: Flat Parapet + Penthouse vs Pitched Kawara Roof
    const isFlatCommercial =
      spec.id === 'hoshizora-arcade' ||
      spec.id === 'hotaru-mart' ||
      spec.id === 'midori-vinyl' ||
      spec.id === 'koban-box';

    if (isFlatCommercial) {
      const parapetGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(w * 0.98, 0.28, d * 0.98), 2, 2),
      );
      addMeshWithOutline(group, parapetGeo, buildingsMat, [0, lowerH + upperH + 0.14, -0.08]);

      // Rooftop Mechanical Penthouse / Skylight Box
      const pentGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(w * 0.45, 0.65, d * 0.45), 3, 1),
      );
      addMeshWithOutline(group, pentGeo, propsMat, [-w * 0.16, lowerH + upperH + 0.58, -0.2]);
    } else {
      const eaveSlabGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(w * 1.06, 0.2, d * 1.06), 2, 2),
      );
      addMeshWithOutline(group, eaveSlabGeo, buildingsMat, [0, lowerH + upperH + 0.1, -0.08]);

      const roofTileCell: [number, number] =
        spec.id === 'sakura-sento' || spec.id === 'menya-hotaru' ? [2, 2] : [3, 2];
      const roofGeo = trackGeo(
        mapGeometryToAtlasCell(
          new THREE.ConeGeometry(Math.max(w, d) * 0.65, h * 0.22, 4),
          roofTileCell[0],
          roofTileCell[1],
        ),
      );
      roofGeo.rotateY(Math.PI / 4);
      addMeshWithOutline(
        group,
        roofGeo,
        buildingsMat,
        [0, lowerH + upperH + 0.2 + h * 0.1, -0.08],
      );
    }

    // 4. Striped Storefront Awning (No outline on thin angled awning so it stays bright)
    const awningGeo = trackGeo(
      mapGeometryToAtlasCell(new THREE.BoxGeometry(w * 0.86, 0.22, 0.85), 0, 3),
    );
    addMeshWithOutline(
      group,
      awningGeo,
      buildingsMat,
      [0, lowerH * 0.64, d / 2 + 0.36],
      [0.22, 0, 0],
      [1, 1, 1],
      false,
    );

    // 5. Indigo Noren Entrance Curtain
    const norenGeo = trackGeo(
      mapGeometryToAtlasCell(new THREE.BoxGeometry(w * 0.46, 0.62, 0.08), 1, 3),
    );
    addMeshWithOutline(
      group,
      norenGeo,
      buildingsMat,
      [0, lowerH * 0.38, d / 2 + 0.06],
      [0, 0, 0],
      [1, 1, 1],
      false,
    );

    // 6. Vertical Projecting Neon Kanji Blade Sign
    const neonBladeGeo = trackGeo(
      mapGeometryToAtlasCell(new THREE.BoxGeometry(0.22, upperH * 0.85, 0.78), 3, 3),
    );
    addMeshWithOutline(
      group,
      neonBladeGeo,
      neonSignsMat,
      [w / 2 + 0.14, lowerH + upperH * 0.45, d * 0.22],
      [0, 0, 0],
      [1, 1, 1],
      false,
    );

    // 7. Special Landmark Hero Props per Building
    if (spec.id === 'menya-hotaru') {
      // Giant Rooftop Glowing Ramen Bowl & Chopsticks
      const bowlGeo = trackGeo(
        mapGeometryToAtlasCell(
          new THREE.CylinderGeometry(0.85, 0.52, 0.65, 14),
          0,
          1,
        ),
      );
      addMeshWithOutline(group, bowlGeo, propsMat, [0, h + 0.45, 0.2]);
    } else if (spec.id === 'sakura-sento') {
      // Tall Bathhouse Brick Chimney Stack
      const chimneyGeo = trackGeo(
        mapGeometryToAtlasCell(
          new THREE.CylinderGeometry(0.28, 0.42, 3.8, 12),
          1,
          2,
        ),
      );
      addMeshWithOutline(group, chimneyGeo, buildingsMat, [-w * 0.35, h + 0.8, -d * 0.25]);
    } else if (spec.id === 'hoshizora-arcade') {
      // Row of Colorful Gachapon Capsule Machines in front
      const gachaGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.BoxGeometry(0.45, 0.95, 0.42), 3, 0),
      );
      for (const gx of [-1.1, -0.55, 0.55, 1.1]) {
        addMeshWithOutline(
          group,
          gachaGeo,
          propsMat,
          [gx, 0.48, d / 2 + 0.26],
          [0, 0, 0],
          [1, 1, 1],
          false,
        );
      }
    } else if (spec.id === 'koban-box') {
      // Golden Police Star Emblem
      const emblemGeo = trackGeo(
        mapGeometryToAtlasCell(new THREE.OctahedronGeometry(0.32, 0), 0, 1),
      );
      addMeshWithOutline(
        group,
        emblemGeo,
        propsMat,
        [0, lowerH + 0.35, d / 2 + 0.15],
        [0, 0, 0],
        [1, 1, 1],
        false,
      );
    }
  };

  for (const spec of BUILDINGS) {
    buildSingleStructure(spec);
  }

  onProgress?.(94, 'Populating Instanced Street Lamps, Vending Machines, Trees & Vehicles...');

  // ============================================================================
  // 3. INSTANCED PROPS (Street Lamps, Vending Machines, Chochin Lanterns, Crates)
  // ============================================================================
  const dummy = new THREE.Object3D();

  // 3A. Instanced Retro Street Lamps (12 units)
  const lampPoleGeo = mapGeometryToAtlasCell(
    new THREE.CylinderGeometry(0.06, 0.09, 2.4, 8),
    3,
    1,
  );
  lampPoleGeo.translate(0, 1.2, 0);
  const lampGlobeGeo = mapGeometryToAtlasCell(
    new THREE.SphereGeometry(0.22, 10, 8),
    0,
    1,
  );
  lampGlobeGeo.translate(0, 2.48, 0);
  const lampMergedGeo = trackGeo(mergeGeometries([lampPoleGeo, lampGlobeGeo], false)!);
  lampPoleGeo.dispose();
  lampGlobeGeo.dispose();

  const lampPositions: Array<[number, number, number]> = [
    [-8.8, 0.08, 6.2],
    [-4.2, 0.08, 6.2],
    [-1.7, 0.08, 6.2],
    [4.8, 0.08, 6.2],
    [8.8, 0.08, 6.2],
    [-3.2, 0.08, 2.4],
    [3.2, 0.08, 2.4],
    [-3.2, 0.08, -2.8],
    [3.2, 0.08, -2.8],
    [-8.5, 0.08, -3.5],
    [8.5, 0.08, -3.5],
    [1.8, 0.42, 1.8],
  ];

  const lampsInstanced = new THREE.InstancedMesh(
    lampMergedGeo,
    propsMat,
    lampPositions.length,
  );
  lampPositions.forEach(([lx, ly, lz], idx) => {
    dummy.position.set(lx, ly, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    lampsInstanced.setMatrixAt(idx, dummy.matrix);
  });
  lampsInstanced.instanceMatrix.needsUpdate = true;
  lampsInstanced.computeBoundingSphere();
  rootGroup.add(lampsInstanced);

  // 3B. Instanced Beverage Vending Machines (8 units)
  const vendingGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.75, 1.45, 0.58), 3, 0),
  );
  vendingGeo.translate(0, 0.725, 0);
  const vendingTransforms: Array<[number, number, number, number]> = [
    [-3.4, 0.08, 4.4, Math.PI / 2],
    [-3.4, 0.08, 3.5, Math.PI / 2],
    [3.4, 0.08, -0.6, -Math.PI / 2],
    [3.4, 0.08, -1.5, -Math.PI / 2],
    [3.2, 0.08, -5.6, 0],
    [4.1, 0.08, -5.6, 0],
    [-7.8, 0.08, 4.2, 0],
    [7.8, 0.08, 4.2, 0],
  ];
  const vendingInstanced = new THREE.InstancedMesh(
    vendingGeo,
    propsMat,
    vendingTransforms.length,
  );
  vendingTransforms.forEach(([vx, vy, vz, ry], idx) => {
    dummy.position.set(vx, vy, vz);
    dummy.rotation.set(0, ry, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    vendingInstanced.setMatrixAt(idx, dummy.matrix);
  });
  vendingInstanced.instanceMatrix.needsUpdate = true;
  vendingInstanced.computeBoundingSphere();
  rootGroup.add(vendingInstanced);

  // 3C. Instanced Hanging Red Chochin Paper Lanterns (24 units)
  const lanternGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.SphereGeometry(0.18, 10, 8), 0, 1),
  );
  lanternGeo.scale(1, 1.35, 1);
  const lanternCoords: Array<[number, number, number]> = [];
  for (let i = 0; i < 12; i++) {
    const z = -5.5 + i * 1.05;
    lanternCoords.push([-2.4, 2.35 + Math.sin(i) * 0.08, z]);
    lanternCoords.push([2.6, 2.35 + Math.cos(i) * 0.08, z]);
  }
  const lanternsInstanced = new THREE.InstancedMesh(
    lanternGeo,
    propsMat,
    lanternCoords.length,
  );
  lanternCoords.forEach(([x, y, z], idx) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    lanternsInstanced.setMatrixAt(idx, dummy.matrix);
  });
  lanternsInstanced.instanceMatrix.needsUpdate = true;
  lanternsInstanced.computeBoundingSphere();
  rootGroup.add(lanternsInstanced);

  // 3D. Instanced Izakaya Beer Crates (20 units)
  const crateGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.42, 0.34, 0.42), 2, 2),
  );
  crateGeo.translate(0, 0.17, 0);
  const crateCoords: Array<[number, number, number]> = [
    [-7.7, 0.08, 2.8],
    [-7.7, 0.42, 2.8],
    [-7.2, 0.08, 2.8],
    [-7.7, 0.08, -2.9],
    [-7.7, 0.42, -2.9],
    [7.7, 0.08, 2.6],
    [7.7, 0.42, 2.6],
    [7.7, 0.76, 2.6],
    [-3.5, 0.08, -4.8],
    [-3.5, 0.42, -4.8],
    [3.5, 0.08, 3.0],
    [3.5, 0.42, 3.0],
  ];
  const cratesInstanced = new THREE.InstancedMesh(
    crateGeo,
    propsMat,
    crateCoords.length,
  );
  crateCoords.forEach(([x, y, z], idx) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, idx * 0.4, 0);
    dummy.scale.setScalar(0.9 + (idx % 3) * 0.1);
    dummy.updateMatrix();
    cratesInstanced.setMatrixAt(idx, dummy.matrix);
  });
  cratesInstanced.instanceMatrix.needsUpdate = true;
  cratesInstanced.computeBoundingSphere();
  rootGroup.add(cratesInstanced);

  // ============================================================================
  // 4. SWAYING SAKURA & GINKGO TREES (Composite 4-part Groups)
  // ============================================================================
  const treeGroups: THREE.Group[] = [];
  const treeSpecs: Array<{ pos: [number, number, number]; isSakura: boolean; scale: number }> = [
    { pos: [-2.1, 0.35, -1.8], isSakura: true, scale: 1.15 },
    { pos: [2.4, 0.35, -1.6], isSakura: true, scale: 1.1 },
    { pos: [-8.6, 0.08, 5.4], isSakura: false, scale: 1.05 },
    { pos: [8.6, 0.08, 5.4], isSakura: true, scale: 1.05 },
    { pos: [-8.6, 0.08, -4.2], isSakura: true, scale: 1.0 },
    { pos: [8.6, 0.08, -4.2], isSakura: false, scale: 1.1 },
    { pos: [0.2, 0.35, -2.5], isSakura: true, scale: 1.25 },
  ];

  const trunkGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.14, 0.24, 1.4, 7), 0, 2),
  );
  trunkGeo.translate(0, 0.7, 0);
  const sakuraCrownGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.IcosahedronGeometry(0.85, 1), 0, 0),
  );
  const ginkgoCrownGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.IcosahedronGeometry(0.82, 1), 1, 0),
  );

  for (const tSpec of treeSpecs) {
    const tGroup = new THREE.Group();
    tGroup.position.set(tSpec.pos[0], tSpec.pos[1], tSpec.pos[2]);
    tGroup.scale.setScalar(tSpec.scale);
    rootGroup.add(tGroup);
    treeGroups.push(tGroup);

    const trunk = new THREE.Mesh(trunkGeo, propsMat);
    trunk.castShadow = true;
    tGroup.add(trunk);

    const crownGeo = tSpec.isSakura ? sakuraCrownGeo : ginkgoCrownGeo;
    const c1 = new THREE.Mesh(crownGeo, propsMat);
    c1.position.set(0, 1.75, 0);
    c1.scale.set(1.15, 0.9, 1.15);
    c1.castShadow = true;
    tGroup.add(c1);

    const c2 = new THREE.Mesh(crownGeo, propsMat);
    c2.position.set(0.45, 1.45, 0.25);
    c2.scale.setScalar(0.72);
    tGroup.add(c2);

    const c3 = new THREE.Mesh(crownGeo, propsMat);
    c3.position.set(-0.42, 1.52, -0.22);
    c3.scale.setScalar(0.68);
    tGroup.add(c3);
  }

  // ============================================================================
  // 5. ANIMATED VEHICLES, TRAM, TINY CHARACTERS & STEAM/CLOUDS
  // ============================================================================
  // 5A. Composite Kei Truck (cab + flatbed + wheels + headlights)
  const keiTruckGroup = new THREE.Group();
  rootGroup.add(keiTruckGroup);
  const cabGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.95, 0.85, 0.82), 1, 1),
  );
  const bedGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.92, 0.38, 1.15), 1, 1),
  );
  const wheelGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 10), 3, 1),
  );
  wheelGeo.rotateZ(Math.PI / 2);

  addMeshWithOutline(keiTruckGroup, cabGeo, propsMat, [0, 0.58, 0.45], [0, 0, 0], [1, 1, 1], false);
  addMeshWithOutline(keiTruckGroup, bedGeo, propsMat, [0, 0.36, -0.52], [0, 0, 0], [1, 1, 1], false);
  addMeshWithOutline(keiTruckGroup, crateGeo, propsMat, [0, 0.55, -0.5], [0, 0, 0], [1, 1, 1], false);
  for (const [wx, wz] of [
    [-0.45, 0.52],
    [0.45, 0.52],
    [-0.45, -0.58],
    [0.45, -0.58],
  ]) {
    addMeshWithOutline(keiTruckGroup, wheelGeo, propsMat, [wx, 0.18, wz], [0, 0, 0], [1, 1, 1], false);
  }

  // 5B. Composite Delivery Scooter
  const scooterGroup = new THREE.Group();
  rootGroup.add(scooterGroup);
  const scooterBodyGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.38, 0.48, 0.85), 1, 1),
  );
  addMeshWithOutline(scooterGroup, scooterBodyGeo, propsMat, [0, 0.34, 0], [0, 0, 0], [1, 1, 1], false);
  addMeshWithOutline(scooterGroup, crateGeo, propsMat, [0, 0.62, -0.25], [0, 0, 0], [0.8, 0.8, 0.8], false);

  // 5C. Vintage Elevated Streetcar Tram (gliding along the northern viaduct)
  const tramGroup = new THREE.Group();
  tramGroup.position.set(0, 3.05, -8.2);
  rootGroup.add(tramGroup);
  const tramHullGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(3.8, 1.35, 1.35), 2, 1),
  );
  const tramRoofGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(3.5, 0.22, 1.15), 3, 1),
  );
  addMeshWithOutline(tramGroup, tramHullGeo, propsMat, [0, 0.68, 0], [0, 0, 0], [1, 1, 1], false);
  addMeshWithOutline(tramGroup, tramRoofGeo, propsMat, [0, 1.45, 0], [0, 0, 0], [1, 1, 1], false);

  // ============================================================================
  // 5D. 14 TINY ANIME CHIBI CHARACTERS & 12 CUTE PETS (Shiba Inu, Neko, Kitsune)
  // ============================================================================
  type AnimeArchetype = 'swordsman' | 'kimono-girl' | 'zen-thunder' | 'miko-lantern';
  interface AnimatedAnimeChibi {
    group: THREE.Group;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
    walkAxis: 'x' | 'z';
    walkRange: number;
    phase: number;
    speed: number;
  }

  type PetArchetype = 'shiba' | 'neko' | 'kitsune';
  interface AnimatedPet {
    group: THREE.Group;
    tail: THREE.Mesh;
    frontPaws: THREE.Mesh;
    backPaws: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
    walkAxis: 'x' | 'z';
    walkRange: number;
    phase: number;
    speed: number;
  }

  const chibiGroupList: AnimatedAnimeChibi[] = [];
  const petGroupList: AnimatedPet[] = [];

  // Shared low-poly geometries for Anime Chibi Characters
  const animeHeadGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.SphereGeometry(0.165, 10, 8), 0, 3),
  );
  const animeEyeGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.042, 0.055, 0.025), 3, 6, 4, 8),
  );
  const haoriCheckeredGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.11, 0.195, 0.34, 8), 3, 2),
  );
  const haoriKimonoPinkGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.105, 0.185, 0.34, 8), 1, 3),
  );
  const haoriGoldenGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.11, 0.195, 0.34, 8), 2, 3),
  );
  const haoriMikoRedGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.11, 0.19, 0.34, 8), 2, 0),
  );
  const animeLegGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CapsuleGeometry(0.048, 0.12, 4, 6), 3, 2),
  );
  const sleeveCheckeredGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.072, 0.22, 6), 3, 2),
  );
  const sleevePinkGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.072, 0.22, 6), 1, 3),
  );
  const sleeveGoldGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.072, 0.22, 6), 2, 3),
  );
  const hairDarkCapGeo = trackGeo(
    mapGeometryToAtlasCell(
      new THREE.SphereGeometry(0.174, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.62),
      3,
      6,
      4,
      8,
    ),
  );
  const hairGoldCapGeo = trackGeo(
    mapGeometryToAtlasCell(
      new THREE.SphereGeometry(0.174, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.62),
      2,
      2,
    ),
  );
  const hairSpikeDarkGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.068, 0.17, 5), 3, 6, 4, 8),
  );
  const hairSpikeGoldGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.068, 0.17, 5), 2, 2),
  );
  const hairBunPinkGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.SphereGeometry(0.072, 7, 6), 1, 3),
  );
  const woodBoxBackpackGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.18, 0.26, 0.13), 0, 2),
  );
  const katanaScabbardGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), 3, 6, 4, 8),
  );
  const handLanternGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.065, 0.055, 0.15, 7), 0, 1),
  );

  const createAnimeCharacter = (
    archetype: AnimeArchetype,
    x: number,
    y: number,
    z: number,
    walkAxis: 'x' | 'z',
    walkRange: number,
    phase: number,
    speed: number,
  ) => {
    const cg = new THREE.Group();
    cg.position.set(x, y, z);
    cg.scale.setScalar(1.08);

    // Legs (with pivot at hip)
    const leftLeg = new THREE.Mesh(animeLegGeo, propsMat);
    leftLeg.position.set(-0.065, 0.11, 0);
    const rightLeg = new THREE.Mesh(animeLegGeo, propsMat);
    rightLeg.position.set(0.065, 0.11, 0);
    cg.add(leftLeg, rightLeg);

    // Haori / Kimono Torso + Outline
    const torsoGeo =
      archetype === 'swordsman'
        ? haoriCheckeredGeo
        : archetype === 'kimono-girl'
          ? haoriKimonoPinkGeo
          : archetype === 'zen-thunder'
            ? haoriGoldenGeo
            : haoriMikoRedGeo;
    addMeshWithOutline(cg, torsoGeo, propsMat, [0, 0.31, 0], [0, 0, 0], [1, 1, 1], false);

    // Haori Sleeves / Arms
    const armGeo =
      archetype === 'swordsman'
        ? sleeveCheckeredGeo
        : archetype === 'kimono-girl' || archetype === 'miko-lantern'
          ? sleevePinkGeo
          : sleeveGoldGeo;
    const leftArm = new THREE.Mesh(armGeo, propsMat);
    leftArm.position.set(-0.165, 0.33, 0);
    leftArm.rotation.z = 0.24;
    const rightArm = new THREE.Mesh(armGeo, propsMat);
    rightArm.position.set(0.165, 0.33, 0);
    rightArm.rotation.z = -0.24;
    cg.add(leftArm, rightArm);

    // Head + Kawaii Eyes (+Z is front of character)
    addMeshWithOutline(cg, animeHeadGeo, propsMat, [0, 0.59, 0], [0, 0, 0], [1, 1, 1], false);
    const leftEye = new THREE.Mesh(animeEyeGeo, propsMat);
    leftEye.position.set(-0.06, 0.59, 0.148);
    const rightEye = new THREE.Mesh(animeEyeGeo, propsMat);
    rightEye.position.set(0.06, 0.59, 0.148);
    cg.add(leftEye, rightEye);

    // Hair & Signature Accessories
    const isGoldHair = archetype === 'zen-thunder';
    const capGeo = isGoldHair ? hairGoldCapGeo : hairDarkCapGeo;
    const spikeGeo = isGoldHair ? hairSpikeGoldGeo : hairSpikeDarkGeo;
    const hairCap = new THREE.Mesh(capGeo, propsMat);
    hairCap.position.set(0, 0.61, -0.01);
    cg.add(hairCap);

    if (archetype === 'swordsman' || archetype === 'zen-thunder') {
      // Spiky anime hero hair crown
      const spikeOffsets: Array<[number, number, number, number, number]> = [
        [0, 0.77, -0.04, -0.35, 0],
        [-0.12, 0.73, -0.02, -0.2, 0.55],
        [0.12, 0.73, -0.02, -0.2, -0.55],
        [-0.09, 0.69, 0.11, 0.45, 0.3],
        [0.09, 0.69, 0.11, 0.45, -0.3],
      ];
      for (const [sx, sy, sz, rx, rz] of spikeOffsets) {
        const sp = new THREE.Mesh(spikeGeo, propsMat);
        sp.position.set(sx, sy, sz);
        sp.rotation.set(rx, 0, rz);
        cg.add(sp);
      }

      // Nichirin Katana Scabbard at left hip
      const katana = new THREE.Mesh(katanaScabbardGeo, propsMat);
      katana.position.set(-0.15, 0.25, -0.04);
      katana.rotation.set(0.85, 0, 0.18);
      cg.add(katana);

      // Wooden Companion Box on back for Checkered Haori Swordsman
      if (archetype === 'swordsman') {
        addMeshWithOutline(
          cg,
          woodBoxBackpackGeo,
          propsMat,
          [0, 0.35, -0.15],
          [0, 0, 0],
          [1, 1, 1],
          false,
        );
      }
    } else {
      // Twin Kawaii Hair Buns + Flowing Back Hair for Kimono Girl & Miko
      const bunL = new THREE.Mesh(hairBunPinkGeo, propsMat);
      bunL.position.set(-0.155, 0.68, -0.02);
      const bunR = new THREE.Mesh(hairBunPinkGeo, propsMat);
      bunR.position.set(0.155, 0.68, -0.02);
      cg.add(bunL, bunR);

      if (archetype === 'miko-lantern') {
        // Glowing Hand-Held Chochin Paper Lantern
        const heldLantern = new THREE.Mesh(handLanternGeo, propsMat);
        heldLantern.position.set(0.2, 0.36, 0.16);
        cg.add(heldLantern);
      }
    }

    rootGroup.add(cg);
    chibiGroupList.push({
      group: cg,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      baseX: x,
      baseY: y,
      baseZ: z,
      walkAxis,
      walkRange,
      phase,
      speed,
    });
  };

  // Shared low-poly geometries for Cute Pets (Shiba Inu, Calico/White Neko, Kitsune Fox Pup)
  const shibaBodyGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.17, 0.16, 0.29), 2, 3),
  );
  const shibaHeadGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.SphereGeometry(0.115, 9, 7), 2, 3),
  );
  const kitsuneBodyGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.16, 0.15, 0.28), 3, 7, 4, 8),
  );
  const kitsuneHeadGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.SphereGeometry(0.11, 9, 7), 3, 7, 4, 8),
  );
  const petSnoutGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.052, 0.1, 6), 0, 3),
  );
  const shibaEarGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.044, 0.1, 5), 2, 3),
  );
  const kitsuneEarGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.048, 0.13, 5), 2, 0),
  );
  const shibaTailGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.TorusGeometry(0.055, 0.026, 6, 10, Math.PI * 1.35), 2, 3),
  );
  const nekoTailGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.022, 0.018, 0.22, 6), 2, 3),
  );
  const kitsuneTailGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.ConeGeometry(0.068, 0.24, 7), 3, 7, 4, 8),
  );
  const petPawPairGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(0.15, 0.08, 0.065), 0, 3),
  );

  const createCutePet = (
    petType: PetArchetype,
    x: number,
    y: number,
    z: number,
    walkAxis: 'x' | 'z',
    walkRange: number,
    phase: number,
    speed: number,
  ) => {
    const pg = new THREE.Group();
    pg.position.set(x, y, z);
    pg.scale.setScalar(1.08);

    const bodyGeo = petType === 'shiba' ? shibaBodyGeo : kitsuneBodyGeo;
    const headGeo = petType === 'shiba' ? shibaHeadGeo : kitsuneHeadGeo;
    const earGeo = petType === 'kitsune' ? kitsuneEarGeo : shibaEarGeo;

    // Plump Pet Body + Head
    addMeshWithOutline(pg, bodyGeo, propsMat, [0, 0.14, 0], [0, 0, 0], [1, 1, 1], false);
    addMeshWithOutline(pg, headGeo, propsMat, [0, 0.24, 0.15], [0, 0, 0], [1, 1, 1], false);

    // Cute Snout + Dark Eyes
    const snout = new THREE.Mesh(petSnoutGeo, propsMat);
    snout.position.set(0, 0.22, 0.255);
    snout.rotation.x = Math.PI / 2;
    const eyeL = new THREE.Mesh(animeEyeGeo, propsMat);
    eyeL.position.set(-0.048, 0.255, 0.24);
    eyeL.scale.setScalar(0.65);
    const eyeR = new THREE.Mesh(animeEyeGeo, propsMat);
    eyeR.position.set(0.048, 0.255, 0.24);
    eyeR.scale.setScalar(0.65);
    pg.add(snout, eyeL, eyeR);

    // Perky Pointed Ears
    const earL = new THREE.Mesh(earGeo, propsMat);
    earL.position.set(-0.065, 0.34, 0.14);
    earL.rotation.z = 0.22;
    const earR = new THREE.Mesh(earGeo, propsMat);
    earR.position.set(0.065, 0.34, 0.14);
    earR.rotation.z = -0.22;
    pg.add(earL, earR);

    // Front & Back Animated Paws
    const frontPaws = new THREE.Mesh(petPawPairGeo, propsMat);
    frontPaws.position.set(0, 0.045, 0.095);
    const backPaws = new THREE.Mesh(petPawPairGeo, propsMat);
    backPaws.position.set(0, 0.045, -0.095);
    pg.add(frontPaws, backPaws);

    // Expressive Wagging Tail (Shiba curled donut tail, Neko upright tail, Kitsune fluffy tail)
    const tail = new THREE.Mesh(
      petType === 'shiba'
        ? shibaTailGeo
        : petType === 'neko'
          ? nekoTailGeo
          : kitsuneTailGeo,
      propsMat,
    );
    tail.position.set(0, 0.22, -0.155);
    if (petType === 'kitsune') {
      tail.rotation.x = -0.65;
    } else if (petType === 'neko') {
      tail.rotation.x = -0.25;
    }
    pg.add(tail);

    rootGroup.add(pg);
    petGroupList.push({
      group: pg,
      tail,
      frontPaws,
      backPaws,
      baseX: x,
      baseY: y,
      baseZ: z,
      walkAxis,
      walkRange,
      phase,
      speed,
    });
  };

  // Populate 14 Anime Characters across Central Yokocho & the 4 Cardinal Infinity Bridges
  const animeRoster: Array<
    [AnimeArchetype, number, number, number, 'x' | 'z', number, number, number]
  > = [
    // Central Yokocho Street & Shrine Plaza (framed head-to-toe in front of POV spawn!)
    ['swordsman', 0.72, 0.08, 4.1, 'z', 1.0, 2.2, 1.05],
    ['kimono-girl', -0.35, 0.08, 3.85, 'z', 1.0, 2.4, 1.05],
    ['zen-thunder', -1.45, 0.08, 2.7, 'z', 0.95, 1.4, 1.25],
    ['miko-lantern', 1.45, 0.08, 2.5, 'z', 0.95, 2.2, 0.95],
    ['swordsman', -2.1, 0.08, -1.8, 'z', 1.2, 3.1, 1.1],
    ['kimono-girl', 2.15, 0.08, -2.4, 'z', 1.2, 4.0, 1.05],
    ['miko-lantern', 0.2, 0.42, 1.15, 'x', 0.85, 1.8, 0.85], // Shrine terrace miko
    ['zen-thunder', -0.9, 0.08, -5.1, 'x', 1.4, 2.7, 1.25], // North tram crossing
    ['kimono-girl', -4.2, 0.08, 6.1, 'x', 1.3, 0.8, 1.0], // Ramen front street
    ['swordsman', 4.2, 0.08, 6.1, 'x', 1.3, 3.6, 1.1], // Koban front street
    // 4 Cardinal Infinity Bridges (framed head-to-toe on each themed bridge!)
    ['swordsman', 0.58, 0.08, -18.2, 'z', 1.2, 2.2, 1.05], // North Crimson-Gold Bridge
    ['kimono-girl', 18.2, 0.08, 1.32, 'x', 1.2, 2.2, 1.05], // East Cyber-Jade Bridge
    ['miko-lantern', -0.55, 0.08, 18.2, 'z', 1.2, 2.2, 1.05], // South Matcha-Tea Bridge
    ['zen-thunder', -18.2, 0.08, 2.28, 'x', 1.2, 2.2, 1.15], // West Wisteria-Onsen Bridge
  ];
  for (const args of animeRoster) {
    createAnimeCharacter(...args);
  }

  // Populate 12 Cute Pets (Shiba Inu Dogs, Calico/White Cats, Kitsune Spirit Fox Pups)
  const petRoster: Array<
    [PetArchetype, number, number, number, 'x' | 'z', number, number, number]
  > = [
    // Central Yokocho Street & Shrine Pets
    ['shiba', 1.22, 0.08, 4.35, 'z', 1.0, 2.1, 1.05], // Loyal Shiba trotting beside Swordsman
    ['neko', -0.88, 0.08, 4.15, 'z', 0.9, 2.5, 1.05], // Cute Neko cat on main alley
    ['kitsune', -0.85, 0.42, 0.95, 'x', 0.65, 1.5, 1.2], // Spirit Fox pup on Inari Shrine terrace
    ['kitsune', 1.15, 0.42, 0.95, 'x', 0.65, 3.2, 1.2], // Twin Spirit Fox pup at Shrine
    ['neko', -2.25, 0.08, 3.4, 'z', 0.75, 2.1, 1.1], // Ramen shop lucky cat
    ['shiba', 2.05, 0.08, 5.7, 'x', 1.1, 2.8, 1.3], // Koban patrol Shiba Inu
    ['neko', 2.65, 0.08, -1.9, 'z', 0.85, 3.9, 1.05], // Konbini cat
    ['shiba', -1.5, 0.08, -2.2, 'z', 1.0, 4.7, 1.25], // Taiyaki stand Shiba pup
    // 4 Cardinal Infinity Bridge Pets
    ['kitsune', -0.48, 0.08, -17.8, 'z', 1.2, 2.4, 1.05], // North Crimson-Gold Bridge Fox Pup
    ['shiba', 17.8, 0.08, 2.28, 'x', 1.2, 2.4, 1.05], // East Cyber-Jade Bridge Shiba Inu
    ['neko', 0.48, 0.08, 17.8, 'z', 1.2, 2.4, 1.05], // South Matcha-Tea Bridge Lucky Cat
    ['kitsune', -17.8, 0.08, 1.32, 'x', 1.2, 2.4, 1.15], // West Wisteria-Onsen Bridge Fox Pup
  ];
  for (const args of petRoster) {
    createCutePet(...args);
  }

  // 5E. Drifting Steam Puffs & Low-Poly Fluffy Clouds
  const steamGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.DodecahedronGeometry(0.24, 0), 0, 3),
  );
  const steamPuffs: Array<{ mesh: THREE.Mesh; origin: [number, number, number]; offset: number }> = [];
  const steamOrigins: Array<[number, number, number]> = [
    [-6.0, 4.9, 4.4], // Ramen shop steam
    [-6.0, 5.2, 4.4],
    [-6.9, 5.9, -7.2], // Sento bathhouse chimney steam
    [-6.9, 6.3, -7.2],
  ];
  steamOrigins.forEach((origin, idx) => {
    const puff = new THREE.Mesh(steamGeo, propsMat);
    puff.position.set(origin[0], origin[1], origin[2]);
    rootGroup.add(puff);
    steamPuffs.push({ mesh: puff, origin, offset: idx * 1.5 });
  });

  // 4 Warm PointLights for Yokocho Lantern Ambience (within 4-6 PointLight budget)
  const lanternLights: THREE.PointLight[] = [];
  const lightCoords: Array<[number, number, number, string]> = [
    [0.2, 2.8, 0.8, '#F59E0B'], // Shrine warm glow
    [-4.2, 2.6, 4.2, '#FB7185'], // Ramen yokocho corner
    [4.2, 2.8, -1.0, '#EC4899'], // Arcade neon alley
    [0.0, 2.5, -4.5, '#38BDF8'], // North tram/konbini crossing
  ];
  for (const [lx, ly, lz, hex] of lightCoords) {
    const pl = new THREE.PointLight(new THREE.Color(hex), 0.75, 8.5, 1.8);
    pl.position.set(lx, ly, lz);
    rootGroup.add(pl);
    lanternLights.push(pl);
  }

  onProgress?.(97, 'Instantiating Multi-Hotaru-Yokocho Infinity Castle Megastructure...');

  // ============================================================================
  // 6. MULTI-THEMED YOKOCHO INFINITY CASTLE (4 Distinct Architectural Archetypes!)
  // ============================================================================
  const infinityGroup = new THREE.Group();
  rootGroup.add(infinityGroup);

  const mugenjoLayout = generateInfinityCastleLayout();

  // Helper to construct 4 distinct architectural district archetypes so every theme has its own silhouette & layout
  const buildArchetypeGeos = (
    archetype: 'pagoda' | 'cyber' | 'matcha' | 'onsen',
  ): { buildingsGeo: THREE.BufferGeometry; propsGeo: THREE.BufferGeometry } => {
    const bParts: THREE.BufferGeometry[] = [];
    const pParts: THREE.BufferGeometry[] = [];

    const addBox = (
      target: THREE.BufferGeometry[],
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      col: number,
      row: number,
    ) => {
      const g = mapGeometryToAtlasCell(new THREE.BoxGeometry(w, h, d), col, row);
      g.translate(x, y + h / 2, z);
      target.push(g);
    };

    const addRoof = (
      target: THREE.BufferGeometry[],
      radius: number,
      h: number,
      x: number,
      y: number,
      z: number,
      col: number,
      row: number,
    ) => {
      const g = mapGeometryToAtlasCell(new THREE.ConeGeometry(radius, h, 4), col, row);
      g.rotateY(Math.PI / 4);
      g.translate(x, y + h / 2, z);
      target.push(g);
    };

    const addTree = (x: number, z: number, scale: number, isSakura: boolean) => {
      const crown = mapGeometryToAtlasCell(
        new THREE.SphereGeometry(0.95 * scale, 7, 5),
        isSakura ? 0 : 1,
        0,
      );
      crown.translate(x, 1.8 * scale, z);
      pParts.push(crown);
    };

    if (archetype === 'pagoda') {
      // ARCHETYPE A: IMPERIAL 5-STORY PAGODA & TORII COLONNADE (Crimson-Gold Theme)
      for (let tier = 0; tier < 5; tier++) {
        const w = 4.4 - tier * 0.58;
        const y = 0.4 + tier * 2.05;
        addBox(bParts, w, 1.65, w, 0, y, -1.2, 2, 3);
        addBox(bParts, w + 0.9, 0.25, w + 0.9, 0, y + 1.65, -1.2, 2, 2);
      }
      addRoof(bParts, 1.9, 1.8, 0, 10.65, -1.2, 2, 2);

      // Symmetrical flanking Shoji Lantern Halls
      for (const sx of [-6.2, 6.2]) {
        addBox(bParts, 3.8, 3.2, 4.2, sx, 0, -1.0, 0, 0);
        addBox(bParts, 3.2, 2.4, 3.6, sx, 3.2, -1.0, 2, 3);
        addRoof(bParts, 2.8, 1.4, sx, 5.6, -1.0, 2, 2);
        addBox(bParts, 3.6, 2.8, 3.4, sx, 0, 4.8, 1, 0);
        addRoof(bParts, 2.5, 1.2, sx, 2.8, 4.8, 2, 2);
      }

      // Avenue of 5 Vermilion Torii Gates leading to the Pagoda
      for (let i = 0; i < 5; i++) {
        const tz = 2.2 + i * 1.45;
        addBox(pParts, 0.22, 2.6, 0.22, -1.1, 0, tz, 2, 0);
        addBox(pParts, 0.22, 2.6, 0.22, 1.1, 0, tz, 2, 0);
        addBox(pParts, 2.8, 0.24, 0.3, 0, 2.45, tz, 2, 0);
      }
      addTree(-3.2, 2.5, 1.2, false);
      addTree(3.2, 2.5, 1.2, false);
      addTree(-8.4, -5.5, 1.3, true);
      addTree(8.4, -5.5, 1.3, true);
    } else if (archetype === 'cyber') {
      // ARCHETYPE B: DENKI CYBER-NEON SKYSCRAPER TOWERS & SKYBRIDGE (Cyber-Jade Theme)
      // Twin High-Rise Arcade Pencil Towers connected by an overhead Neon Skybridge
      for (const tx of [-4.6, 4.6]) {
        addBox(bParts, 4.0, 5.2, 4.0, tx, 0, -0.8, 3, 0);
        addBox(bParts, 3.4, 4.4, 3.4, tx, 5.2, -0.8, 3, 1);
        addBox(bParts, 2.6, 2.4, 2.6, tx, 9.6, -0.8, 3, 3);
        // Vertical Neon Blade Signs on both sides
        addBox(bParts, 0.28, 7.5, 0.95, tx + (tx > 0 ? -2.2 : 2.2), 2.2, 0.5, 3, 3);
      }
      // Elevated Skybridge linking the twin towers at y = 6.2
      addBox(bParts, 5.6, 1.3, 2.2, 0, 6.2, -0.8, 3, 1);
      addBox(pParts, 5.8, 0.4, 2.4, 0, 7.5, -0.8, 3, 0);

      // Front & Rear Cyber Kiosks & Vending Plazas
      for (const fx of [-6.4, 6.4]) {
        addBox(bParts, 3.4, 4.8, 3.4, fx, 0, 4.8, 3, 1);
        addBox(bParts, 3.6, 5.8, 3.4, fx, 0, -6.2, 3, 0);
        addBox(pParts, 1.8, 1.5, 0.6, fx * 0.55, 0, 5.5, 3, 0);
      }
      // Northern Elevated Double-Deck Metro Viaduct
      addBox(bParts, 17.6, 0.8, 2.6, 0, 3.4, -8.2, 1, 2);
      addBox(pParts, 5.2, 1.4, 1.4, 0, 4.2, -8.2, 2, 1);
      addTree(-8.5, 2.0, 1.1, false);
      addTree(8.5, 2.0, 1.1, false);
    } else if (archetype === 'matcha') {
      // ARCHETYPE C: UJI MATCHA TEA HOUSE TERRACES & BAMBOO GARDEN (Matcha-Emerald Theme)
      // Central Elevated Octagonal-Style Tea Pavilion
      addBox(bParts, 4.6, 2.2, 4.6, 0, 0.4, 0, 2, 0);
      addRoof(bParts, 3.8, 1.6, 0, 2.6, 0, 3, 2);
      addBox(bParts, 2.8, 1.8, 2.8, 0, 3.8, 0, 2, 1);
      addRoof(bParts, 2.5, 1.4, 0, 5.6, 0, 3, 2);

      // 6 Stepped Low-Slung Wooden Roasteries with Copper-Green Hipped Roofs
      const chayaCoords: Array<[number, number, number]> = [
        [-6.0, 4.4, 3.2],
        [6.0, 4.4, 3.2],
        [-6.2, -0.8, 3.8],
        [6.2, -0.8, 3.8],
        [-5.6, -6.0, 4.2],
        [5.6, -6.0, 4.2],
      ];
      for (const [cx, cz, ch] of chayaCoords) {
        addBox(bParts, 3.8, ch, 3.6, cx, 0, cz, 2, 0);
        addRoof(bParts, 2.9, 1.35, cx, ch, cz, 3, 2);
        addBox(bParts, 3.4, 0.22, 0.9, cx, ch * 0.55, cz + 2.0, 0, 3);
      }
      // Lush Matcha Foliage Grove (8 Trees)
      for (const [tx, tz] of [
        [-2.8, 3.2],
        [2.8, 3.2],
        [-2.8, -3.2],
        [2.8, -3.2],
        [-8.4, 1.8],
        [8.4, 1.8],
        [0, -5.8],
        [0, 5.8],
      ]) {
        addTree(tx, tz, 1.25, false);
      }
    } else {
      // ARCHETYPE D: FUJI WISTERIA ONSEN CASTLE & SAKURA ARBOR SANCTUM (Wisteria & Rose Themes)
      // Monumental Multi-Gabled Sento Bathhouse Keep in the center-north
      addBox(bParts, 7.2, 3.6, 4.8, 0, 0, -2.2, 0, 1);
      addBox(bParts, 5.4, 2.8, 3.8, 0, 3.6, -2.2, 2, 3);
      addRoof(bParts, 4.2, 1.8, 0, 6.4, -2.2, 2, 2);
      addBox(bParts, 3.2, 2.2, 2.8, 0, 7.6, -2.2, 0, 1);
      addRoof(bParts, 2.6, 1.5, 0, 9.8, -2.2, 2, 2);

      // Twin Tall Bathhouse Smokestacks
      for (const sx of [-4.2, 4.2]) {
        const stack = mapGeometryToAtlasCell(
          new THREE.CylinderGeometry(0.32, 0.48, 8.5, 8),
          1,
          2,
        );
        stack.translate(sx, 4.25, -4.2);
        bParts.push(stack);
      }

      // Flanking Wisteria Ryokan Inns
      for (const rx of [-6.0, 6.0]) {
        addBox(bParts, 3.6, 4.6, 4.0, rx, 0, 3.8, 0, 1);
        addRoof(bParts, 2.8, 1.4, rx, 4.6, 3.8, 2, 2);
        addBox(bParts, 0.26, 3.8, 0.85, rx + (rx > 0 ? -2.0 : 2.0), 1.8, 4.2, 3, 3);
      }

      // Lush Wisteria & Sakura Blossom Canopy Ring (8 Blossom Trees)
      for (const [tx, tz] of [
        [-2.6, 2.2],
        [2.6, 2.2],
        [-2.8, 5.8],
        [2.8, 5.8],
        [-8.2, -1.5],
        [8.2, -1.5],
        [-5.8, -6.5],
        [5.8, -6.5],
      ]) {
        addTree(tx, tz, 1.3, true);
      }
    }

    const buildingsGeo = trackGeo(mergeGeometries(bParts, false)!);
    bParts.forEach((g) => g.dispose());
    const propsGeo = trackGeo(mergeGeometries(pParts, false)!);
    pParts.forEach((g) => g.dispose());

    return { buildingsGeo, propsGeo };
  };

  const pagodaArchetype = buildArchetypeGeos('pagoda');
  const cyberArchetype = buildArchetypeGeos('cyber');
  const matchaArchetype = buildArchetypeGeos('matcha');
  const onsenArchetype = buildArchetypeGeos('onsen');

  const instColor = new THREE.Color();
  const groundInstColor = new THREE.Color();

  // Shared Ground Base InstancedMesh for all 26 Multi-Yokocho District Blocks
  const blockCount = mugenjoLayout.yokochoBlocks.length;
  const yokochoGroundInstanced = new THREE.InstancedMesh(mergedBaseGeo, groundMat, blockCount);
  mugenjoLayout.yokochoBlocks.forEach((blk, idx) => {
    dummy.position.set(blk.position[0], blk.position[1], blk.position[2]);
    dummy.rotation.set(blk.rotation[0], blk.rotation[1], blk.rotation[2]);
    dummy.scale.set(blk.scale[0], blk.scale[1], blk.scale[2]);
    dummy.updateMatrix();
    yokochoGroundInstanced.setMatrixAt(idx, dummy.matrix);
    groundInstColor.set(blk.groundTintHex);
    yokochoGroundInstanced.setColorAt(idx, groundInstColor);
  });
  yokochoGroundInstanced.instanceMatrix.needsUpdate = true;
  if (yokochoGroundInstanced.instanceColor) yokochoGroundInstanced.instanceColor.needsUpdate = true;
  yokochoGroundInstanced.computeBoundingSphere();
  infinityGroup.add(yokochoGroundInstanced);

  // Group blocks by their architectural archetype and create instanced meshes per archetype
  const archetypeGroups: Array<{
    geos: { buildingsGeo: THREE.BufferGeometry; propsGeo: THREE.BufferGeometry };
    blocks: typeof mugenjoLayout.yokochoBlocks;
  }> = [
    {
      geos: pagodaArchetype,
      blocks: mugenjoLayout.yokochoBlocks.filter((b) => b.themeId === 'amber-shrine'),
    },
    {
      geos: cyberArchetype,
      blocks: mugenjoLayout.yokochoBlocks.filter((b) => b.themeId === 'cyan-arcade'),
    },
    {
      geos: matchaArchetype,
      blocks: mugenjoLayout.yokochoBlocks.filter((b) => b.themeId === 'matcha-canal'),
    },
    {
      geos: onsenArchetype,
      blocks: mugenjoLayout.yokochoBlocks.filter(
        (b) => b.themeId === 'wisteria-onsen' || b.themeId === 'rose-sky',
      ),
    },
  ];

  for (const group of archetypeGroups) {
    if (group.blocks.length === 0) continue;
    const bInst = new THREE.InstancedMesh(
      group.geos.buildingsGeo,
      buildingsMat,
      group.blocks.length,
    );
    const pInst = new THREE.InstancedMesh(group.geos.propsGeo, propsMat, group.blocks.length);

    group.blocks.forEach((blk, idx) => {
      dummy.position.set(blk.position[0], blk.position[1], blk.position[2]);
      dummy.rotation.set(blk.rotation[0], blk.rotation[1], blk.rotation[2]);
      dummy.scale.set(blk.scale[0], blk.scale[1], blk.scale[2]);
      dummy.updateMatrix();
      bInst.setMatrixAt(idx, dummy.matrix);
      pInst.setMatrixAt(idx, dummy.matrix);

      instColor.set(blk.tintHex);
      bInst.setColorAt(idx, instColor);
      pInst.setColorAt(idx, instColor);
    });

    bInst.instanceMatrix.needsUpdate = true;
    pInst.instanceMatrix.needsUpdate = true;
    if (bInst.instanceColor) bInst.instanceColor.needsUpdate = true;
    if (pInst.instanceColor) pInst.instanceColor.needsUpdate = true;
    bInst.computeBoundingSphere();
    pInst.computeBoundingSphere();
    infinityGroup.add(bInst, pInst);
  }

  // 6B. Composite Vermilion & Hinoki Bridges (including 4 Walkable Cardinal Bridges linking Yokocho blocks)
  const bridgeParts: THREE.BufferGeometry[] = [];
  const bridgeDeck = mapGeometryToAtlasCell(new THREE.BoxGeometry(2.8, 0.28, 9.2), 2, 3);
  bridgeParts.push(bridgeDeck);

  const railLeft = mapGeometryToAtlasCell(new THREE.BoxGeometry(0.18, 0.65, 9.2), 2, 0);
  railLeft.translate(-1.3, 0.42, 0);
  bridgeParts.push(railLeft);

  const railRight = mapGeometryToAtlasCell(new THREE.BoxGeometry(0.18, 0.65, 9.2), 2, 0);
  railRight.translate(1.3, 0.42, 0);
  bridgeParts.push(railRight);

  const mergedBridgeGeo = trackGeo(mergeGeometries(bridgeParts, false)!);
  bridgeParts.forEach((g) => g.dispose());

  const bridgesInstanced = new THREE.InstancedMesh(
    mergedBridgeGeo,
    propsMat,
    mugenjoLayout.bridges.length,
  );
  mugenjoLayout.bridges.forEach((b, idx) => {
    dummy.position.set(b.position[0], b.position[1], b.position[2]);
    dummy.rotation.set(b.rotation[0], b.rotation[1], b.rotation[2]);
    dummy.scale.set(b.scale[0], b.scale[1], b.scale[2]);
    dummy.updateMatrix();
    bridgesInstanced.setMatrixAt(idx, dummy.matrix);
    instColor.set(b.tintHex);
    bridgesInstanced.setColorAt(idx, instColor);
  });
  bridgesInstanced.instanceMatrix.needsUpdate = true;
  if (bridgesInstanced.instanceColor) bridgesInstanced.instanceColor.needsUpdate = true;
  bridgesInstanced.computeBoundingSphere();
  infinityGroup.add(bridgesInstanced);

  // 6C. Colossal Vertical Megastructure Hinoki Pillars spanning the Multi-Yokocho Abyss
  const pillarGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.BoxGeometry(1.15, 76.0, 1.15), 2, 3),
  );
  const pillarsInstanced = new THREE.InstancedMesh(
    pillarGeo,
    buildingsMat,
    mugenjoLayout.pillars.length,
  );
  mugenjoLayout.pillars.forEach((p, idx) => {
    dummy.position.set(p.position[0], p.position[1], p.position[2]);
    dummy.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2]);
    dummy.scale.set(p.scale[0], p.scale[1], p.scale[2]);
    dummy.updateMatrix();
    pillarsInstanced.setMatrixAt(idx, dummy.matrix);
    instColor.set(p.tintHex);
    pillarsInstanced.setColorAt(idx, instColor);
  });
  pillarsInstanced.instanceMatrix.needsUpdate = true;
  if (pillarsInstanced.instanceColor) pillarsInstanced.instanceColor.needsUpdate = true;
  pillarsInstanced.computeBoundingSphere();
  infinityGroup.add(pillarsInstanced);

  // 6D. Floating Warm Biwa-Amber Paper Lanterns Drifting in the Abyss
  const abyssLanternGeo = trackGeo(
    mapGeometryToAtlasCell(new THREE.CylinderGeometry(0.28, 0.24, 0.68, 8), 0, 1),
  );
  const abyssLanternsInstanced = new THREE.InstancedMesh(
    abyssLanternGeo,
    propsMat,
    mugenjoLayout.floatingLanterns.length,
  );
  mugenjoLayout.floatingLanterns.forEach((fl, idx) => {
    dummy.position.set(fl.basePos[0], fl.basePos[1], fl.basePos[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrix();
    abyssLanternsInstanced.setMatrixAt(idx, dummy.matrix);
    instColor.set(fl.tintHex);
    abyssLanternsInstanced.setColorAt(idx, instColor);
  });
  abyssLanternsInstanced.instanceMatrix.needsUpdate = true;
  if (abyssLanternsInstanced.instanceColor) abyssLanternsInstanced.instanceColor.needsUpdate = true;
  abyssLanternsInstanced.computeBoundingSphere();
  infinityGroup.add(abyssLanternsInstanced);

  const triCounts = countGroupTriangles(rootGroup);

  const setOutlineVisible = (visible: boolean) => {
    for (let i = 0; i < outlineMeshes.length; i++) {
      outlineMeshes[i].visible = visible;
    }
  };

  const setInfinityCastleVisible = (visible: boolean) => {
    infinityGroup.visible = visible;
  };

  // ============================================================================
  // 7. CHEAP PER-FRAME ANIMATION TICK (Zero GC Allocations)
  // ============================================================================
  const updateAnimation = (elapsed: number, _delta: number, isNight: boolean) => {
    // 1. Kei Truck loop
    const truckPos: WaypointSample = sampleLoopPath(KEI_TRUCK_LOOP, elapsed * 0.045, 0.08);
    keiTruckGroup.position.set(truckPos.x, truckPos.y, truckPos.z);
    keiTruckGroup.rotation.y = truckPos.rotationY;

    // 2. Delivery Scooter loop
    const scooterPos: WaypointSample = sampleLoopPath(
      SCOOTER_LOOP,
      (elapsed * 0.068 + 0.35) % 1,
      0.08,
    );
    scooterGroup.position.set(scooterPos.x, scooterPos.y, scooterPos.z);
    scooterGroup.rotation.y = scooterPos.rotationY;

    // 3. Elevated Vintage Streetcar gliding back and forth
    tramGroup.position.x = Math.sin(elapsed * 0.45) * 5.6;

    // 4. Swaying Sakura & Ginkgo Trees
    for (let i = 0; i < treeGroups.length; i++) {
      const tg = treeGroups[i];
      tg.rotation.z = Math.sin(elapsed * 1.6 + i * 1.1) * 0.035;
      tg.rotation.x = Math.cos(elapsed * 1.3 + i * 0.9) * 0.025;
    }

    // 5. Tiny Anime Chibi Characters & Cute Pets strolling, swinging limbs, and wagging tails
    for (let i = 0; i < chibiGroupList.length; i++) {
      const c = chibiGroupList[i];
      const t = elapsed * c.speed + c.phase;
      const offset = Math.sin(t) * c.walkRange;
      const dir = Math.cos(t) >= 0 ? 1 : -1;

      if (c.walkAxis === 'z') {
        c.group.position.z = c.baseZ + offset;
        c.group.rotation.y = dir >= 0 ? 0 : Math.PI;
      } else {
        c.group.position.x = c.baseX + offset;
        c.group.rotation.y = dir >= 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      const stride = Math.sin(elapsed * 7.5 + c.phase);
      c.group.position.y = c.baseY + Math.abs(stride) * 0.045;
      c.leftLeg.rotation.x = stride * 0.52;
      c.rightLeg.rotation.x = -stride * 0.52;
      c.leftArm.rotation.x = -stride * 0.38;
      c.rightArm.rotation.x = stride * 0.38;
    }

    for (let i = 0; i < petGroupList.length; i++) {
      const p = petGroupList[i];
      const t = elapsed * p.speed + p.phase;
      const offset = Math.sin(t) * p.walkRange;
      const dir = Math.cos(t) >= 0 ? 1 : -1;

      if (p.walkAxis === 'z') {
        p.group.position.z = p.baseZ + offset;
        p.group.rotation.y = dir >= 0 ? 0 : Math.PI;
      } else {
        p.group.position.x = p.baseX + offset;
        p.group.rotation.y = dir >= 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      const trot = Math.sin(elapsed * 10.5 + p.phase);
      p.group.position.y = p.baseY + Math.abs(trot) * 0.055;
      p.frontPaws.rotation.x = trot * 0.48;
      p.backPaws.rotation.x = -trot * 0.48;
      p.tail.rotation.z = Math.sin(elapsed * 14.0 + i) * 0.42;
    }

    // 6. Rising Steam Puffs
    for (let i = 0; i < steamPuffs.length; i++) {
      const sp = steamPuffs[i];
      const cycle = (elapsed * 0.65 + sp.offset) % 1;
      sp.mesh.position.y = sp.origin[1] + cycle * 1.4;
      sp.mesh.position.x = sp.origin[0] + Math.sin(elapsed * 2 + sp.offset) * 0.14;
      const s = 0.5 + Math.sin(cycle * Math.PI) * 0.85;
      sp.mesh.scale.setScalar(s);
    }

    // 7. Floating Infinity Castle Lanterns gently bobbing in the abyss
    if (infinityGroup.visible) {
      for (let i = 0; i < mugenjoLayout.floatingLanterns.length; i++) {
        const fl = mugenjoLayout.floatingLanterns[i];
        const yBob = Math.sin(elapsed * fl.speed + fl.phase) * 0.85;
        dummy.position.set(fl.basePos[0], fl.basePos[1] + yBob, fl.basePos[2]);
        dummy.rotation.set(0, elapsed * 0.25 + fl.phase, 0);
        dummy.scale.setScalar(1.0);
        dummy.updateMatrix();
        abyssLanternsInstanced.setMatrixAt(i, dummy.matrix);
      }
      abyssLanternsInstanced.instanceMatrix.needsUpdate = true;
    }

    // 8. Flickering Neon Signs (Night / Infinity Castle Mode)
    if (isNight) {
      neonSignsMat.emissiveIntensity = 1.0 * computeNeonFlicker(elapsed, 2);
    } else {
      neonSignsMat.emissiveIntensity = 0.0;
    }

    // 9. Selection ring subtle pulse
    if (highlightRingMat.opacity > 0.01) {
      const s = 1 + Math.sin(elapsed * 4.0) * 0.04;
      highlightRing.scale.set(s, 1, s);
    }
  };

  return {
    rootGroup,
    infinityGroup,
    setOutlineVisible,
    setInfinityCastleVisible,
    raycastTargets,
    buildingGroups,
    materials: {
      buildingsMat,
      propsMat,
      groundMat,
      neonSignsMat,
      outlineMat,
      highlightRingMat,
    },
    highlightRing,
    lanternLights,
    stats: {
      baseTriangles: triCounts.base,
      outlineTriangles: triCounts.outline,
    },
    updateAnimation,
    dispose: () => {
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
    },
  };
}
