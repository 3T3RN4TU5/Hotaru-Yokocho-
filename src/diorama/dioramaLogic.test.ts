import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILDINGS,
  getAtlasUvRect,
  getAtmospherePreset,
  evaluateSceneBudget,
  sampleLoopPath,
  computeNeonFlicker,
} from './dioramaLogic';

test('BUILDINGS catalog contains 10 distinct Tokyo diorama buildings within 8-12 target range', () => {
  assert.equal(BUILDINGS.length, 10);
  const ids = new Set(BUILDINGS.map((b) => b.id));
  assert.equal(ids.size, 10);
  // Check that Inari Shrine focal point is present
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

test('getAtmospherePreset switches emissive and sky palette between night and day', () => {
  const night = getAtmospherePreset('night');
  const day = getAtmospherePreset('day');

  assert.ok(night.emissiveIntensity >= 0.7, 'Night mode should have strong emissive windows/neon');
  assert.ok(day.emissiveIntensity < 0.2, 'Day mode should dim emissive windows');
  assert.ok(day.keyLightIntensity > night.keyLightIntensity, 'Day key light should be brighter than night');
  assert.notEqual(night.skyTopHex, day.skyTopHex);
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
