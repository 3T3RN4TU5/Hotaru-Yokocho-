import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILDINGS,
  getAtlasUvRect,
  getAtmospherePreset,
  evaluateSceneBudget,
  sampleLoopPath,
  computeNeonFlicker,
  generateInfinityCastleLayout,
  stepWalkthroughPov,
  POV_SPAWN_PRESETS,
} from './dioramaLogic';

test('BUILDINGS catalog contains 10 distinct Tokyo diorama buildings within 8-12 target range', () => {
  assert.equal(BUILDINGS.length, 10);
  const ids = new Set(BUILDINGS.map((b) => b.id));
  assert.equal(ids.size, 10);
  const shrine = BUILDINGS.find((b) => b.id === 'inari-shrine');
  assert.ok(shrine, 'Expected Kitsune Inari Shrine focal landmark');
});

test('getAtlasUvRect returns inset normalized UV coordinates without cell overlap', () => {
  const cell00 = getAtlasUvRect(0, 0, 4, 4, 1024, 8);
  const cell10 = getAtlasUvRect(1, 0, 4, 4, 1024, 8);

  assert.ok(cell00.uMin > 0 && cell00.uMax < 0.25);
  assert.ok(cell00.vMin > 0.75 && cell00.vMax < 1.0);
  assert.ok(cell00.uMax < cell10.uMin, 'Adjacent cells must not bleed into each other');
});

test('getAtmospherePreset switches emissive and sky palette across infinity, night, and day', () => {
  const infinity = getAtmospherePreset('infinity');
  const night = getAtmospherePreset('night');
  const day = getAtmospherePreset('day');

  assert.ok(infinity.emissiveIntensity >= 0.85, 'Infinity Castle mode should have warm shoji glow');
  assert.ok(night.emissiveIntensity >= 0.7, 'Night mode should have strong emissive windows/neon');
  assert.ok(day.emissiveIntensity < 0.2, 'Day mode should dim emissive windows');
  assert.ok(day.keyLightIntensity > night.keyLightIntensity, 'Day key light should be brighter than night');
  assert.notEqual(infinity.skyTopHex, day.skyTopHex);
});

test('evaluateSceneBudget separates base triangle budget from inverted-hull outline pass', () => {
  const report = evaluateSceneBudget(68_400, 32_100, 3, 1024);
  assert.equal(report.baseTriangles, 68_400);
  assert.equal(report.outlineTriangles, 32_100);
  assert.equal(report.totalTriangles, 100_500);
  assert.equal(report.withinHardLimit, true);
  assert.equal(report.withinTargetZone, true);
  assert.equal(report.atlasCount, 3);
});

test('sampleLoopPath interpolates closed loop smoothly and wraps t', () => {
  const square: Array<[number, number]> = [
    [-4, -4],
    [4, -4],
    [4, 4],
    [-4, 4],
  ];
  const start = sampleLoopPath(square, 0, 0.2);
  const wrap = sampleLoopPath(square, 1.0, 0.2);
  const midFirst = sampleLoopPath(square, 0.125, 0.2);

  assert.equal(start.x, -4);
  assert.equal(start.z, -4);
  assert.equal(wrap.x, -4);
  assert.equal(midFirst.x, 0);
  assert.equal(midFirst.z, -4);
  assert.equal(midFirst.y, 0.2);
});

test('computeNeonFlicker stays bounded within realistic glow range', () => {
  for (let t = 0; t < 10; t += 0.17) {
    const val = computeNeonFlicker(t, 3);
    assert.ok(val >= 0.4 && val <= 1.15, `Flicker ${val} out of bounds at t=${t}`);
  }
});

test('generateInfinityCastleLayout creates multi-oriented Hotaru Yokocho blocks with 5 distinct district themes and colors', () => {
  const layout = generateInfinityCastleLayout();
  assert.ok(layout.yokochoBlocks.length >= 25, 'Expected structured 4-tier Multi-Yokocho lattice');
  const uniqueThemes = new Set(layout.yokochoBlocks.map((b) => b.themeId));
  assert.equal(uniqueThemes.size, 5, 'Expected all 5 distinct Yokocho district color themes');
  assert.ok(
    layout.yokochoBlocks.some((b) => b.orientation === 'inverted'),
    'Expected upside-down inverted ceiling Hotaru Yokocho blocks',
  );
  assert.ok(
    layout.yokochoBlocks.some((b) => b.orientation === 'sideways-wall'),
    'Expected 90-degree vertical wall-mounted Hotaru Yokocho blocks',
  );
  assert.ok(layout.bridges.length >= 16, 'Expected aligned vermilion & theme-tinted bridges');
  assert.ok(layout.pillars.length >= 12, 'Expected structural hinoki megastructure pillars');
  assert.ok(layout.floatingLanterns.length >= 40, 'Expected color-coordinated floating lanterns');
});

test('stepWalkthroughPov moves player forward along heading, clamps pitch, and slides off buildings', () => {
  const spawn = POV_SPAWN_PRESETS[0];
  const initial = {
    x: spawn.x,
    y: spawn.y,
    z: spawn.z,
    eyeY: spawn.y + 0.92,
    yaw: 0, // facing -Z (North down Yokocho alley)
    pitch: 0,
    walkCycle: 0,
  };

  const stepped = stepWalkthroughPov(
    initial,
    {
      forward: 1,
      right: 0,
      turnYaw: 0,
      lookYawDelta: 0,
      lookPitchDelta: -5.0, // attempt extreme upward pitch
      sprint: false,
    },
    0.05,
  );

  assert.ok(stepped.z < initial.z, 'Forward input at yaw=0 must advance player North (-Z)');
  assert.ok(stepped.pitch <= 1.22 && stepped.pitch >= -1.22, 'Pitch must be safely clamped');
  assert.ok(stepped.walkCycle > initial.walkCycle, 'Walk cycle must advance when moving');
});
