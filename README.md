# Hotaru Yokocho (蛍横丁) — 3D Kawaii Tokyo Miniature Diorama

An original, interactive 3D miniature city block diorama inspired by hand-painted, low-poly kawaii Tokyo streets. Built with **Vite + Vanilla Three.js** (mounted inside a lightweight React HUD shell) and deployed as a static site ready for Vercel or Netlify.

---

## Stack & Asset Pipeline Path Chosen

- **Stack**: **Vite + Vanilla Three.js** (`three`) inside a React TypeScript shell (`src/App.tsx`).
- **Asset Strategy Chosen**: **Procedural Composite 3D Primitives + 3 Hand-Painted HTML5 Canvas Texture Atlases (1024×1024px)**, paired with a documented **Blender / Substance Painter `.glb` swap workflow** (available both in this README and inside the in-app **"3 Atlases & GLB Guide"** modal).
- **Triangle & Texture Budget**:
  - **Base Scene**: ~18,000–25,000 triangles (well under the 80,000 target and 150,000 hard limit).
  - **Inverted-Hull Outline Pass**: Toggleable `THREE.BackSide` normal-extruded ink outline pass tracked separately from the base budget.
  - **3 Texture Atlases (1024×1024px)**:
    1. `Atlas 01 — Buildings & Signage`: Hand-painted vertical facade gradients, baked bottom ambient occlusion, timber slats, Kawara roof tiles, wave noren curtains, shoji window grids, and Japanese neon signage (+ matching emissive map).
    2. `Atlas 02 — Props, Foliage & Vehicles`: Sakura blossom & Ginkgo canopy brushwork, vermilion Torii lacquer, beverage vending machines, chochin paper lanterns, Kei truck, delivery scooter, streetcar tram, and chibi characters (+ matching emissive map).
    3. `Atlas 03 — Ground & Cross-Section`: Rain-sheen asphalt with crosswalk stripes, yokocho cobblestone flagstones, mossy shrine gravel, terracotta curb rim, sienna soil stratum with pebbles, and basalt bedrock underside (+ micro-relief bump map).

---

## Every File Created / Modified

| File Path | Purpose |
| :--- | :--- |
| `/index.html` | HTML entry point with SEO/OpenGraph metadata and `Fredoka`, `Plus Jakarta Sans`, and `JetBrains Mono` fonts. |
| `/metadata.json` | Application title and description metadata. |
| `/src/index.css` | Tailwind CSS v4 configuration with `@custom-variant dark` and typography variables. |
| `/src/diorama/dioramaLogic.ts` | Pure logic module: `BUILDINGS` catalog (10 original Tokyo structures), `getAtlasUvRect` UV cell mapper, `getAtmospherePreset` (Night/Day palettes), `evaluateSceneBudget`, `sampleLoopPath`, and `computeNeonFlicker`. |
| `/src/diorama/dioramaLogic.test.ts` | Fast deterministic unit tests (`node:test`) covering building count, UV cell isolation, Day/Night transitions, triangle budget math, and loop kinematics. |
| `/src/diorama/textureAtlases.ts` | Procedural 2D canvas painter generating the 3 hand-painted 1024×1024 texture atlases (plus emissive & bump maps) and `mapGeometryToAtlasCell()` UV remapper. |
| `/src/diorama/buildDioramaScene.ts` | Constructs the chunky floating city block cross-section, 10 composite multi-part buildings, `THREE.InstancedMesh` street props, inverted-hull outline group, and per-frame animations. |
| `/src/components/AtlasPipelineModal.tsx` | In-app modal allowing you to inspect and download the 3 generated 1024px PNG texture atlases and read the `.glb` swap instructions. |
| `/src/App.tsx` | Main WebGL viewport lifecycle, `OrbitControls` with damping and polar-angle clamping, Layer-1 raycast hover tooltips, click-to-zoom camera transitions, and collapsible bottom dock. |
| `/README.md` | Run/deploy instructions, architecture overview, and custom model/texture swap guide. |

---

## Run & Deploy Steps (Vercel / Netlify Ready)

### 1. Local Development
```bash
npm install
npm run dev
```
Open `http://localhost:3000` (append `?autostart=1` to skip the progress bar transition during automated testing).

### 2. Run Unit Tests
```bash
npx --yes tsx --test src/diorama/dioramaLogic.test.ts
```

### 3. Production Static Build
```bash
npm run build
```
This outputs a static bundle to `dist/`.

### 4. Deploy to Vercel or Netlify
- **Vercel**: Run `npx vercel` or connect your repository in the Vercel dashboard (Framework Preset: **Vite**, Build Command: `npm run build`, Output Directory: `dist`).
- **Netlify**: Drag and drop the `dist/` folder into Netlify Drop, or set Build Command to `npm run build` and Publish Directory to `dist`.

---

## Where to Swap in Your Own Models & Textures

1. **Swap the 3 Texture Atlases (`src/diorama/textureAtlases.ts`)**:
   - Replace the `THREE.CanvasTexture` instances inside `createDioramaAtlases()` with `new THREE.TextureLoader().load('/assets/your_atlas.png')` (or `KTX2Loader` for `.ktx2` compressed textures). Ensure `texture.colorSpace = THREE.SRGBColorSpace` is set on albedo and emissive maps.
2. **Swap Individual Buildings or Full Block `.glb` (`src/diorama/buildDioramaScene.ts`)**:
   - Inside `buildSingleStructure(spec)`, replace the procedural `addMeshWithOutline(...)` calls with `GLTFLoader` + `DRACOLoader` loading your exported `.glb` building mesh. Keep the invisible `proxyMesh` on Layer 1 (`proxyMesh.layers.enable(1)`) so hover highlights, tooltips, and click-to-zoom camera framing continue working automatically.
3. **Edit Building Names, Positions, and Camera Targets (`src/diorama/dioramaLogic.ts`)**:
   - Modify the `BUILDINGS` array to update English/Japanese titles, lore descriptions, `[x, y, z]` world coordinates, or `cameraOffset` vectors.
