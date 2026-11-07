/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Sun,
  Moon,
  Sparkles,
  Footprints,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Compass,
  PenTool,
  Layers,
  Play,
  Pause,
  X,
} from 'lucide-react';
import {
  BUILDINGS,
  BuildingSpec,
  TimeOfDay,
  CameraMode,
  PlayerPovState,
  POV_SPAWN_PRESETS,
  PovSpawnPreset,
  AUTO_WALK_WAYPOINTS,
  getAtmospherePreset,
  evaluateSceneBudget,
  BudgetReport,
  stepWalkthroughPov,
  sampleLoopPath,
} from './diorama/dioramaLogic';
import { createDioramaAtlases } from './diorama/textureAtlases';
import { buildDioramaScene } from './diorama/buildDioramaScene';
import { AtlasPipelineModal } from './components/AtlasPipelineModal';

const OVERVIEW_CAMERA_POS = new THREE.Vector3(27.5, 16.5, 29.5);
const OVERVIEW_TARGET_POS = new THREE.Vector3(0, 2.5, 0);

// Reusable module-scope math objects (Zero GC in animation loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  // Loading & initialization state
  const [loadingProgress, setLoadingProgress] = useState<number>(10);
  const [loadingLabel, setLoadingLabel] = useState<string>('Initializing WebGL Studio & Atlases...');
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('autostart') === '1';
    }
    return false;
  });

  // Interactive Diorama & Infinity Castle States
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('infinity');
  const [infinityCastleEnabled, setInfinityCastleEnabled] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [autoWalkPov, setAutoWalkPov] = useState<boolean>(false);
  const [activePovPresetId, setActivePovPresetId] = useState<string>(POV_SPAWN_PRESETS[0].id);

  const [showOutline, setShowOutline] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingSpec | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<{
    spec: BuildingSpec;
    x: number;
    y: number;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const [atlasPreviews, setAtlasPreviews] = useState<{
    buildingsDataUrl: string;
    propsDataUrl: string;
    groundDataUrl: string;
  } | null>(null);

  const [budgetReport, setBudgetReport] = useState<BudgetReport>(() =>
    evaluateSceneBudget(40680, 14200, 3, 1024),
  );

  // Mutable refs for the WebGL loop so React state updates never recreate the scene
  const stateRef = useRef({
    timeOfDay: 'infinity' as TimeOfDay,
    infinityCastleEnabled: true,
    cameraMode: 'orbit' as CameraMode,
    autoWalkPov: false,
    autoWalkProgress: 0,
    showOutline: true,
    autoRotate: true,
    selectedBuilding: null as BuildingSpec | null,
    hoveredBuildingId: null as string | null,
    cameraTransitionActive: false,
    desiredCamPos: OVERVIEW_CAMERA_POS.clone(),
    desiredTarget: OVERVIEW_TARGET_POS.clone(),
    povState: {
      x: POV_SPAWN_PRESETS[0].x,
      y: POV_SPAWN_PRESETS[0].y,
      z: POV_SPAWN_PRESETS[0].z,
      eyeY: POV_SPAWN_PRESETS[0].y + 0.92,
      yaw: POV_SPAWN_PRESETS[0].yaw,
      pitch: POV_SPAWN_PRESETS[0].pitch,
      walkCycle: 0,
    } as PlayerPovState,
    heldKeys: new Set<string>(),
    virtualInput: {
      forward: 0,
      right: 0,
      turnYaw: 0,
    },
    lookDragDelta: {
      yaw: 0,
      pitch: 0,
    },
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (timeOfDay === 'night' || timeOfDay === 'infinity') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    stateRef.current.timeOfDay = timeOfDay;
  }, [timeOfDay]);

  useEffect(() => {
    stateRef.current.infinityCastleEnabled = infinityCastleEnabled;
  }, [infinityCastleEnabled]);

  useEffect(() => {
    stateRef.current.cameraMode = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    stateRef.current.autoWalkPov = autoWalkPov;
  }, [autoWalkPov]);

  useEffect(() => {
    stateRef.current.showOutline = showOutline;
  }, [showOutline]);

  useEffect(() => {
    stateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  const teleportPov = useCallback((preset: PovSpawnPreset) => {
    setActivePovPresetId(preset.id);
    setAutoWalkPov(false);
    stateRef.current.autoWalkPov = false;
    stateRef.current.povState = {
      x: preset.x,
      y: preset.y,
      z: preset.z,
      eyeY: preset.y + 0.92,
      yaw: preset.yaw,
      pitch: preset.pitch,
      walkCycle: 0,
    };
  }, []);

  const toggleWalkingPovMode = useCallback(
    (forceMode?: CameraMode) => {
      const nextMode = forceMode ?? (cameraMode === 'orbit' ? 'pov' : 'orbit');
      setCameraMode(nextMode);
      stateRef.current.cameraMode = nextMode;

      if (nextMode === 'pov') {
        setSelectedBuilding(null);
        stateRef.current.selectedBuilding = null;
        setHoveredBuilding(null);
        stateRef.current.hoveredBuildingId = null;
        stateRef.current.cameraTransitionActive = false;
        const preset =
          POV_SPAWN_PRESETS.find((p) => p.id === activePovPresetId) ?? POV_SPAWN_PRESETS[0];
        stateRef.current.povState = {
          x: preset.x,
          y: preset.y,
          z: preset.z,
          eyeY: preset.y + 0.92,
          yaw: preset.yaw,
          pitch: preset.pitch,
          walkCycle: 0,
        };
      } else {
        setAutoWalkPov(false);
        stateRef.current.autoWalkPov = false;
        stateRef.current.desiredCamPos.copy(OVERVIEW_CAMERA_POS);
        stateRef.current.desiredTarget.copy(OVERVIEW_TARGET_POS);
        stateRef.current.cameraTransitionActive = true;
      }
    },
    [cameraMode, activePovPresetId],
  );

  const focusBuilding = useCallback((spec: BuildingSpec | null) => {
    setCameraMode('orbit');
    stateRef.current.cameraMode = 'orbit';
    setAutoWalkPov(false);
    stateRef.current.autoWalkPov = false;
    setSelectedBuilding(spec);
    stateRef.current.selectedBuilding = spec;
    stateRef.current.cameraTransitionActive = true;

    if (spec) {
      stateRef.current.desiredCamPos.set(
        spec.position[0] + spec.cameraOffset[0],
        spec.position[1] + spec.cameraOffset[1],
        spec.position[2] + spec.cameraOffset[2],
      );
      stateRef.current.desiredTarget.set(
        spec.position[0] + spec.lookAtOffset[0],
        spec.position[1] + spec.lookAtOffset[1],
        spec.position[2] + spec.lookAtOffset[2],
      );
      setAutoRotate(false);
      stateRef.current.autoRotate = false;
    } else {
      stateRef.current.desiredCamPos.copy(OVERVIEW_CAMERA_POS);
      stateRef.current.desiredTarget.copy(OVERVIEW_TARGET_POS);
    }
  }, []);

  const stepBuildingTour = useCallback(
    (direction: 1 | -1) => {
      if (!selectedBuilding) {
        focusBuilding(BUILDINGS[0]);
        return;
      }
      const idx = BUILDINGS.findIndex((b) => b.id === selectedBuilding.id);
      const nextIdx = (idx + direction + BUILDINGS.length) % BUILDINGS.length;
      focusBuilding(BUILDINGS[nextIdx]);
    },
    [selectedBuilding, focusBuilding],
  );

  const cycleAtmosphereMode = useCallback(() => {
    setTimeOfDay((prev) => {
      if (prev === 'infinity') return 'night';
      if (prev === 'night') return 'day';
      return 'infinity';
    });
  }, []);

  // Keyboard listeners for both Orbit shortcuts & First-Person Walking POV (WASD / Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      stateRef.current.heldKeys.add(e.code);

      if (
        stateRef.current.cameraMode === 'pov' &&
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          e.code,
        )
      ) {
        if (stateRef.current.autoWalkPov) {
          setAutoWalkPov(false);
          stateRef.current.autoWalkPov = false;
        }
      }

      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        toggleWalkingPovMode();
      } else if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
        } else if (stateRef.current.cameraMode === 'pov') {
          toggleWalkingPovMode('orbit');
        } else {
          focusBuilding(null);
        }
      } else if (stateRef.current.cameraMode === 'orbit') {
        if (e.key === 'ArrowRight') {
          stepBuildingTour(1);
        } else if (e.key === 'ArrowLeft') {
          stepBuildingTour(-1);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.heldKeys.delete(e.code);
    };

    const clearHeldKeys = () => {
      stateRef.current.heldKeys.clear();
      stateRef.current.virtualInput.forward = 0;
      stateRef.current.virtualInput.right = 0;
      stateRef.current.virtualInput.turnYaw = 0;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearHeldKeys);
    document.addEventListener('visibilitychange', clearHeldKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearHeldKeys);
      document.removeEventListener('visibilitychange', clearHeldKeys);
    };
  }, [focusBuilding, isModalOpen, stepBuildingTour, toggleWalkingPovMode]);

  // Initialize Three.js Scene & WebGLRenderer once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL Detection (SwiftShader / llvmpipe / headless browser guard)
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.96;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialAtmos = getAtmospherePreset('infinity');
    scene.background = new THREE.Color(initialAtmos.fogHex);
    scene.fog = new THREE.FogExp2(initialAtmos.fogHex, initialAtmos.fogDensity);

    // Studio Reflection Environment (RoomEnvironment + PMREMGenerator, attenuated so matte paint stays crisp)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.2;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.25, 185);
    camera.position.copy(OVERVIEW_CAMERA_POS);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(OVERVIEW_TARGET_POS);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6.5;
    controls.maxDistance = 68;
    controls.minPolarAngle = 0.15;
    // Polar-angle limit in Orbit mode so the main block isn't viewed from flat underneath
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.autoRotate = !isSoftwareGl;
    controls.autoRotateSpeed = 0.55;
    controls.update();

    const onControlStart = () => {
      if (stateRef.current.cameraMode === 'orbit') {
        stateRef.current.cameraTransitionActive = false;
        setAutoRotate(false);
        stateRef.current.autoRotate = false;
      }
    };
    controls.addEventListener('start', onControlStart);

    // 3-Point Baked-Feel Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      new THREE.Color(initialAtmos.hemiSkyHex),
      new THREE.Color(initialAtmos.hemiGroundHex),
      initialAtmos.hemiIntensity,
    );
    hemiLight.position.set(0, 28, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(
      new THREE.Color(initialAtmos.keyLightHex),
      initialAtmos.keyLightIntensity,
    );
    keyLight.position.set(14, 24, 16);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 55;
    const d = 14;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(
      new THREE.Color(initialAtmos.rimLightHex),
      initialAtmos.rimLightIntensity,
    );
    rimLight.position.set(-16, 12, -14);
    scene.add(rimLight);

    // Build the 3 Hand-Painted 1024px Texture Atlases & Procedural Diorama + Infinity Castle Meshes
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const atlases = createDioramaAtlases(maxAnisotropy, (step, label) => {
      setLoadingProgress(step);
      setLoadingLabel(label);
    });
    setAtlasPreviews(atlases.previews);

    const builtDiorama = buildDioramaScene(atlases, (step, label) => {
      setLoadingProgress(step);
      setLoadingLabel(label);
    });
    scene.add(builtDiorama.rootGroup);

    const report = evaluateSceneBudget(
      builtDiorama.stats.baseTriangles,
      builtDiorama.stats.outlineTriangles,
      3,
      1024,
    );
    setBudgetReport(report);
    setLoadingProgress(100);
    setLoadingLabel('Hotaru Yokocho & Infinity Castle Ready');
    const readyTimer = window.setTimeout(() => setIsLoaded(true), 180);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on Layer 1 (Orbit Mode) & Pointer Drag Look (Walking POV Mode)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastRaycastTime = 0;
    let pointerDownPos = { x: 0, y: 0 };
    let lastDragPos = { x: 0, y: 0 };
    let isDraggingLook = false;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      lastDragPos = { x: e.clientX, y: e.clientY };
      if (stateRef.current.cameraMode === 'pov') {
        isDraggingLook = true;
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (stateRef.current.cameraMode === 'pov') {
        if (isDraggingLook) {
          const dx = e.clientX - lastDragPos.x;
          const dy = e.clientY - lastDragPos.y;
          lastDragPos = { x: e.clientX, y: e.clientY };
          stateRef.current.lookDragDelta.yaw += dx * 0.0042;
          stateRef.current.lookDragDelta.pitch += dy * 0.0038;
        }
        return;
      }

      const now = performance.now();
      if (now - lastRaycastTime < 45) return;
      lastRaycastTime = now;

      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObjects(builtDiorama.raycastTargets, false);

      if (hits.length > 0) {
        const spec = hits[0].object.userData.buildingSpec as BuildingSpec | undefined;
        if (spec) {
          stateRef.current.hoveredBuildingId = spec.id;
          renderer.domElement.style.cursor = 'pointer';
          setHoveredBuilding({
            spec,
            x: e.clientX,
            y: e.clientY,
          });
          return;
        }
      }

      if (stateRef.current.hoveredBuildingId !== null) {
        stateRef.current.hoveredBuildingId = null;
        renderer.domElement.style.cursor = 'grab';
        setHoveredBuilding(null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (stateRef.current.cameraMode === 'pov') {
        isDraggingLook = false;
        renderer.domElement.style.cursor = 'grab';
        return;
      }

      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // Dragged camera, not a click

      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObjects(builtDiorama.raycastTargets, false);
      if (hits.length > 0) {
        const spec = hits[0].object.userData.buildingSpec as BuildingSpec | undefined;
        if (spec) {
          focusBuilding(spec);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Software WebGL fenceSync pacing helper
    let frameId = 0;
    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const clock = new THREE.Clock();

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // 1. Update Outline & Infinity Castle Expanse visibility
      builtDiorama.setOutlineVisible(st.showOutline);
      builtDiorama.setInfinityCastleVisible(st.infinityCastleEnabled);

      // 2. Smoothly interpolate Infinity / Night / Day Atmosphere & Emissive Intensity
      const targetAtmos = getAtmospherePreset(st.timeOfDay);
      const lerpFactor = 1 - Math.exp(-5.0 * delta);

      (scene.background as THREE.Color).lerp(new THREE.Color(targetAtmos.fogHex), lerpFactor);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.lerp(new THREE.Color(targetAtmos.fogHex), lerpFactor);
        scene.fog.density = THREE.MathUtils.lerp(
          scene.fog.density,
          targetAtmos.fogDensity,
          lerpFactor,
        );
      }

      keyLight.color.lerp(new THREE.Color(targetAtmos.keyLightHex), lerpFactor);
      keyLight.intensity = THREE.MathUtils.lerp(
        keyLight.intensity,
        targetAtmos.keyLightIntensity,
        lerpFactor,
      );
      hemiLight.color.lerp(new THREE.Color(targetAtmos.hemiSkyHex), lerpFactor);
      hemiLight.groundColor.lerp(new THREE.Color(targetAtmos.hemiGroundHex), lerpFactor);
      hemiLight.intensity = THREE.MathUtils.lerp(
        hemiLight.intensity,
        targetAtmos.hemiIntensity,
        lerpFactor,
      );
      rimLight.color.lerp(new THREE.Color(targetAtmos.rimLightHex), lerpFactor);
      rimLight.intensity = THREE.MathUtils.lerp(
        rimLight.intensity,
        targetAtmos.rimLightIntensity,
        lerpFactor,
      );

      builtDiorama.materials.buildingsMat.emissiveIntensity = THREE.MathUtils.lerp(
        builtDiorama.materials.buildingsMat.emissiveIntensity,
        targetAtmos.emissiveIntensity,
        lerpFactor,
      );
      builtDiorama.materials.propsMat.emissiveIntensity = THREE.MathUtils.lerp(
        builtDiorama.materials.propsMat.emissiveIntensity,
        targetAtmos.emissiveIntensity * 0.92,
        lerpFactor,
      );
      builtDiorama.materials.outlineMat.color.lerp(
        new THREE.Color(targetAtmos.outlineHex),
        lerpFactor,
      );

      for (const pl of builtDiorama.lanternLights) {
        pl.intensity = THREE.MathUtils.lerp(
          pl.intensity,
          targetAtmos.lanternLightIntensity,
          lerpFactor,
        );
      }

      // 3. Hover & Selection Building Bounce + Ground Ring Highlight
      const activeSpec =
        st.cameraMode === 'orbit'
          ? st.selectedBuilding ||
            (st.hoveredBuildingId
              ? BUILDINGS.find((b) => b.id === st.hoveredBuildingId) ?? null
              : null)
          : null;

      if (activeSpec) {
        builtDiorama.highlightRing.position.set(
          activeSpec.position[0],
          activeSpec.position[1] + 0.12,
          activeSpec.position[2],
        );
        builtDiorama.materials.highlightRingMat.color.set(activeSpec.accentHex);
        builtDiorama.materials.highlightRingMat.opacity = THREE.MathUtils.lerp(
          builtDiorama.materials.highlightRingMat.opacity,
          0.75,
          lerpFactor * 2,
        );
      } else {
        builtDiorama.materials.highlightRingMat.opacity = THREE.MathUtils.lerp(
          builtDiorama.materials.highlightRingMat.opacity,
          0.0,
          lerpFactor * 2,
        );
      }

      builtDiorama.buildingGroups.forEach((group, id) => {
        const spec = group.userData.buildingSpec as BuildingSpec;
        const isHoveredOrSelected =
          st.cameraMode === 'orbit' &&
          (id === st.hoveredBuildingId || id === st.selectedBuilding?.id);
        const targetY = spec.position[1] + (isHoveredOrSelected ? 0.16 : 0);
        group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 10, delta);
      });

      // 4. Camera Mode Handling: First-Person Walking POV vs Orbit Diorama View
      const targetFov = st.cameraMode === 'pov' ? 62 : 38;
      if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, lerpFactor * 1.5);
        camera.updateProjectionMatrix();
      }

      if (st.cameraMode === 'pov') {
        controls.enabled = false;

        if (st.autoWalkPov) {
          // Smooth Guided First-Person Auto-Walk Tour along Yokocho & Infinity Bridges
          st.autoWalkProgress = (st.autoWalkProgress + delta * 0.022) % 1;
          const sample = sampleLoopPath(AUTO_WALK_WAYPOINTS, st.autoWalkProgress, 0.08);
          const bob = Math.sin(elapsed * 7.2) * 0.034;
          st.povState.x = sample.x;
          st.povState.z = sample.z;
          st.povState.eyeY = 1.0 + bob;
          // sampleLoopPath rotationY is atan2(dx, dz), convert to Three.js camera -Z forward yaw
          const desiredYaw = Math.PI - sample.rotationY;
          st.povState.yaw = desiredYaw - st.lookDragDelta.yaw;
          st.povState.pitch = Math.max(
            -1.1,
            Math.min(1.1, 0.12 + Math.sin(elapsed * 0.45) * 0.14 - st.lookDragDelta.pitch),
          );
        } else {
          // Manual First-Person Walking POV (WASD / Arrow Keys / On-Screen D-Pad)
          const keys = st.heldKeys;
          const keyFwd =
            (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
            (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
          const keyRight = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
          const keyTurn =
            (keys.has('KeyE') || keys.has('ArrowRight') ? 1 : 0) -
            (keys.has('KeyQ') || keys.has('ArrowLeft') ? 1 : 0);
          const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');

          st.povState = stepWalkthroughPov(
            st.povState,
            {
              forward: Math.max(-1, Math.min(1, keyFwd + st.virtualInput.forward)),
              right: Math.max(-1, Math.min(1, keyRight + st.virtualInput.right)),
              turnYaw: Math.max(-1, Math.min(1, keyTurn + st.virtualInput.turnYaw)),
              lookYawDelta: st.lookDragDelta.yaw,
              lookPitchDelta: st.lookDragDelta.pitch,
              sprint,
            },
            delta,
          );
          st.lookDragDelta.yaw = 0;
          st.lookDragDelta.pitch = 0;
        }

        camera.position.set(st.povState.x, st.povState.eyeY, st.povState.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = st.povState.yaw;
        camera.rotation.x = st.povState.pitch;
        camera.rotation.z = 0;
      } else {
        controls.enabled = true;
        st.lookDragDelta.yaw = 0;
        st.lookDragDelta.pitch = 0;

        if (st.cameraTransitionActive) {
          _targetCamPos.copy(st.desiredCamPos);
          _targetLookAt.copy(st.desiredTarget);
          const camDamp = 1 - Math.exp(-4.5 * delta);
          camera.position.lerp(_targetCamPos, camDamp);
          controls.target.lerp(_targetLookAt, camDamp);

          if (
            camera.position.distanceTo(_targetCamPos) < 0.08 &&
            controls.target.distanceTo(_targetLookAt) < 0.08
          ) {
            st.cameraTransitionActive = false;
          }
        }

        controls.autoRotate = !isSoftwareGl && st.autoRotate && !st.cameraTransitionActive;
        controls.update();
      }

      // 5. Advance Diorama & Infinity Castle Animations
      builtDiorama.updateAnimation(
        elapsed,
        delta,
        st.timeOfDay === 'night' || st.timeOfDay === 'infinity',
      );

      // 6. Render Frame directly at native pixel ratio (prevents full-screen bloom washout)
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      window.clearTimeout(readyTimer);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      envTarget.dispose();
      builtDiorama.dispose();
      atlases.dispose();
      renderer.dispose();
    };
  }, [focusBuilding]);

  const quickNavLandmarks = [
    { label: 'Inari Shrine', id: 'inari-shrine' },
    { label: 'Menya Ramen', id: 'menya-hotaru' },
    { label: 'Retro Arcade', id: 'hoshizora-arcade' },
    { label: 'Sakura Sento', id: 'sakura-sento' },
    { label: 'Tram Viaduct', id: 'tram-viaduct' },
  ];

  const setVirtualHold = (axis: 'forward' | 'right' | 'turnYaw', value: number) => {
    if (value !== 0 && stateRef.current.autoWalkPov) {
      setAutoWalkPov(false);
      stateRef.current.autoWalkPov = false;
    }
    stateRef.current.virtualInput[axis] = value;
  };

  return (
    <div
      data-state={isLoaded ? 'ready' : 'loading'}
      className="relative w-screen h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none"
    >
      {/* Dedicated Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="diorama-canvas-container"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* Loading Overlay with Progress Bar */}
      {!isLoaded && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100"
        >
          <div className="w-full max-w-md space-y-4 text-center">
            <p className="text-xs font-mono text-amber-400">
              HOTARU YOKOCHO × INFINITY CASTLE 無限城
            </p>
            <h1 className="text-3xl font-bold tracking-tight font-display">
              Summoning Mugenjo Diorama...
            </h1>
            <p className="text-xs text-slate-400">{loadingLabel}</p>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-200"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-xs font-mono tabular-nums text-slate-400">
              {loadingProgress}% · 3 Procedural 1024px Texture Atlases
            </p>
          </div>
        </div>
      )}

      {/* Top Bar Contract: 3 Zones Separated by gap-8 */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Single Text Element Wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            focusBuilding(null);
          }}
          className="text-lg font-bold tracking-tight font-display text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          Hotaru Yokocho × 無限城
        </a>

        {/* Zone 2: 5 Concise Single-Line Landmark Navigation Links */}
        <nav
          aria-label="Diorama Landmarks"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {quickNavLandmarks.map((item) => {
            const isSelected = selectedBuilding?.id === item.id && cameraMode === 'orbit';
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const target = BUILDINGS.find((b) => b.id === item.id) ?? null;
                  focusBuilding(target);
                }}
                className={`hover:text-amber-600 dark:hover:text-amber-400 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                  isSelected ? 'text-amber-600 dark:text-amber-400 font-semibold underline' : ''
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            3 Atlases &amp; GLB Guide
          </button>
        </div>
      </header>

      {/* Hover Building Floating Tooltip (Orbit Mode) */}
      {hoveredBuilding && !selectedBuilding && cameraMode === 'orbit' && (
        <div
          role="tooltip"
          style={{
            transform: `translate3d(${Math.min(
              hoveredBuilding.x + 16,
              (typeof window !== 'undefined' ? window.innerWidth : 1200) - 240,
            )}px, ${Math.max(hoveredBuilding.y - 68, 72)}px, 0)`,
          }}
          className="fixed top-0 left-0 z-30 pointer-events-none px-3.5 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-lg"
        >
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            <span>{hoveredBuilding.spec.nameJp}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{hoveredBuilding.spec.category}</span>
          </div>
          <div className="text-sm font-bold font-display mt-0.5">
            {hoveredBuilding.spec.number}. {hoveredBuilding.spec.nameEn}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Click to zoom camera &amp; inspect details
          </div>
        </div>
      )}

      {/* Selected Building Inspector Card (Orbit Mode) */}
      {selectedBuilding && cameraMode === 'orbit' && (
        <aside
          aria-label="Selected Building Inspector"
          className="fixed top-20 left-6 z-20 w-80 max-w-[calc(100vw-3rem)] rounded-2xl p-5 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                <span>{selectedBuilding.nameJp}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{selectedBuilding.category}</span>
              </div>
              <h2 className="text-lg font-bold font-display mt-0.5">
                {selectedBuilding.number}. {selectedBuilding.nameEn}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => focusBuilding(null)}
              aria-label="Close Building Details and Reset Camera"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {selectedBuilding.story}
          </p>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Hand-Painted Miniature Details
            </div>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              {selectedBuilding.details.map((detail, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold" aria-hidden="true">·</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => stepBuildingTour(-1)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => focusBuilding(null)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset View</span>
            </button>
            <button
              type="button"
              onClick={() => stepBuildingTour(1)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* First-Person Walking POV Navigator Card (Top-Left when in POV Mode) */}
      {cameraMode === 'pov' && (
        <aside
          aria-label="First-Person Walking POV Controls"
          className="fixed top-20 left-6 z-20 w-[356px] max-w-[calc(100vw-3rem)] rounded-2xl p-4 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                FIRST-PERSON WALKTHROUGH POV
              </div>
              <h2 className="text-base font-bold font-display">
                Street &amp; Infinity Bridge Explorer
              </h2>
            </div>
            <button
              type="button"
              onClick={() => toggleWalkingPovMode('orbit')}
              aria-label="Exit Walking POV Mode"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Use <span className="font-mono font-semibold">WASD</span> /{' '}
            <span className="font-mono font-semibold">Arrows</span> to walk,{' '}
            <span className="font-mono font-semibold">Drag Canvas</span> or{' '}
            <span className="font-mono font-semibold">Q/E</span> to look up at inverted Mugenjo
            castles, or use the pad below.
          </p>

          {/* Teleport Vantage Spots across the 5 Themed Yokocho Districts */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Jump to Themed Yokocho District
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {POV_SPAWN_PRESETS.map((preset) => {
                const isCurr = activePovPresetId === preset.id && !autoWalkPov;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => teleportPov(preset)}
                    className={`flex items-center justify-between gap-3 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isCurr
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: preset.accentHex }}
                      />
                      <span>{preset.label}</span>
                    </span>
                    <span
                      className={`text-[10px] ${
                        isCurr ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {preset.themeBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* On-Screen Walk D-Pad + Auto-Walk Toggle */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="grid grid-cols-3 gap-1 w-32">
              <button
                type="button"
                onPointerDown={() => setVirtualHold('turnYaw', -1)}
                onPointerUp={() => setVirtualHold('turnYaw', 0)}
                onPointerLeave={() => setVirtualHold('turnYaw', 0)}
                className="px-2 py-1.5 text-[11px] font-mono font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 transition-colors"
                title="Turn Left (Q)"
              >
                ↺ Q
              </button>
              <button
                type="button"
                onPointerDown={() => setVirtualHold('forward', 1)}
                onPointerUp={() => setVirtualHold('forward', 0)}
                onPointerLeave={() => setVirtualHold('forward', 0)}
                className="px-2 py-1.5 text-[11px] font-mono font-bold rounded bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors"
                title="Walk Forward (W)"
              >
                ▲ W
              </button>
              <button
                type="button"
                onPointerDown={() => setVirtualHold('turnYaw', 1)}
                onPointerUp={() => setVirtualHold('turnYaw', 0)}
                onPointerLeave={() => setVirtualHold('turnYaw', 0)}
                className="px-2 py-1.5 text-[11px] font-mono font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 transition-colors"
                title="Turn Right (E)"
              >
                E ↻
              </button>
              <button
                type="button"
                onPointerDown={() => setVirtualHold('right', -1)}
                onPointerUp={() => setVirtualHold('right', 0)}
                onPointerLeave={() => setVirtualHold('right', 0)}
                className="px-2 py-1.5 text-[11px] font-mono font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 transition-colors"
                title="Strafe Left (A)"
              >
                ◀ A
              </button>
              <button
                type="button"
                onPointerDown={() => setVirtualHold('forward', -1)}
                onPointerUp={() => setVirtualHold('forward', 0)}
                onPointerLeave={() => setVirtualHold('forward', 0)}
                className="px-2 py-1.5 text-[11px] font-mono font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 transition-colors"
                title="Walk Backward (S)"
              >
                ▼ S
              </button>
              <button
                type="button"
                onPointerDown={() => setVirtualHold('right', 1)}
                onPointerUp={() => setVirtualHold('right', 0)}
                onPointerLeave={() => setVirtualHold('right', 0)}
                className="px-2 py-1.5 text-[11px] font-mono font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 transition-colors"
                title="Strafe Right (D)"
              >
                D ▶
              </button>
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => setAutoWalkPov((prev) => !prev)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                  autoWalkPov
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {autoWalkPov ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{autoWalkPov ? 'Auto-Walk: On' : 'Auto-Walk Tour'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWalkingPovMode('orbit')}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return to Orbit</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-[min(980px,95vw)] flex flex-col items-center pointer-events-none">
        {/* Collapse / Expand Drawer Toggle Pill */}
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          aria-expanded={!dockCollapsed}
          aria-label={dockCollapsed ? 'Show Controls Dock' : 'Hide Controls Dock'}
          className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1 mb-1.5 text-xs font-medium rounded-t-xl rounded-b-md bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-md hover:text-amber-600 dark:hover:text-amber-400 transition-colors whitespace-nowrap"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        {/* Main Dock Panel */}
        <div
          className={`pointer-events-auto w-full rounded-2xl px-4 py-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-200 ${
            dockCollapsed
              ? 'opacity-0 translate-y-8 pointer-events-none h-0 py-0 overflow-hidden border-0'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left Group: Walking POV Toggle + Infinity Castle Realm + Lighting Mode + Ink Outline */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="toggle-walking-pov"
                onClick={() => toggleWalkingPovMode()}
                aria-pressed={cameraMode === 'pov'}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  cameraMode === 'pov'
                    ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>{cameraMode === 'pov' ? 'Walking POV: Active' : 'Walking POV (V)'}</span>
              </button>

              <button
                type="button"
                onClick={cycleAtmosphereMode}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-colors whitespace-nowrap shrink-0"
              >
                {timeOfDay === 'infinity' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mugenjo Abyss</span>
                  </>
                ) : timeOfDay === 'night' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Night Yokocho</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Golden Hour Day</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInfinityCastleEnabled((prev) => !prev)}
                aria-pressed={infinityCastleEnabled}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                  infinityCastleEnabled
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>Infinity Castle: {infinityCastleEnabled ? 'On' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOutline((prev) => !prev)}
                aria-pressed={showOutline}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                  showOutline
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Outline: {showOutline ? 'On' : 'Off'}</span>
              </button>

              {cameraMode === 'orbit' && (
                <button
                  type="button"
                  onClick={() => setAutoRotate((prev) => !prev)}
                  aria-pressed={autoRotate}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                    autoRotate
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Auto-Orbit: {autoRotate ? 'On' : 'Off'}</span>
                </button>
              )}
            </div>

            {/* Center Group: Building Tour Stepper & Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepBuildingTour(-1)}
                aria-label="Previous Building"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedBuilding ? focusBuilding(null) : focusBuilding(BUILDINGS[0])
                }
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
              >
                {selectedBuilding
                  ? `${selectedBuilding.number}. ${selectedBuilding.nameEn}`
                  : 'Tour 10 Buildings'}
              </button>
              <button
                type="button"
                onClick={() => stepBuildingTour(1)}
                aria-label="Next Building"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => focusBuilding(null)}
                aria-label="Reset Overview Camera"
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
            </div>

            {/* Right Group: Unboxed Budget Telemetry & Atlas Trigger */}
            <div className="hidden xl:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="font-mono tabular-nums">
                <span>{budgetReport.baseTriangles.toLocaleString()} tris</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>3 Atlases (1024px)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label="Inspect 3 Texture Atlases"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Texture Atlases & Custom GLB Swap Guide Modal */}
      <AtlasPipelineModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        previews={atlasPreviews}
        budget={budgetReport}
      />
    </div>
  );
}
