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
| `/src/diorama/dioramaLogic.ts` | Pure logic module: `BUILDINGS` catalog (10 original Tokyo structures), `generateInfinityCastleLayout` (4-Tier Multi-Yokocho Mugenjo lattice with 5 district themes & 4 architectural archetypes), `stepWalkthroughPov` first-person street & bridge physics, `getAtlasUvRect` UV cell mapper, `getAtmospherePreset` (`infinity`/`night`/`day`), `evaluateSceneBudget`, `sampleLoopPath`, and `computeNeonFlicker`. |
| `/src/diorama/dioramaLogic.test.ts` | Fast deterministic unit tests (`node:test`) covering building count, UV cell isolation, Mugenjo/Night/Day transitions, triangle budget math, loop kinematics, Multi-Yokocho district theme generation, and first-person POV physics. |
| `/src/diorama/textureAtlases.ts` | Procedural 2D canvas painter generating the 3 hand-painted 1024×1024 texture atlases (including Mugenjo Hinoki timber & golden shoji screens) and `mapGeometryToAtlasCell()` UV remapper. |
| `/src/diorama/buildDioramaScene.ts` | Constructs the central Hotaru Yokocho block, 4 distinct architectural district archetypes (`pagoda`, `cyber`, `matcha`, `onsen`) instanced across the 4-tier Multi-Yokocho Infinity Castle lattice with per-instance emissive shader tinting, `THREE.InstancedMesh` street props, inverted-hull outline group, and per-frame animations. |
| `/src/components/AtlasPipelineModal.tsx` | In-app modal allowing you to inspect and download the 3 generated 1024px PNG texture atlases and read the `.glb` swap instructions. |
| `/src/App.tsx` | Main WebGL viewport lifecycle, `OrbitControls` + First-Person `Walking POV (V)` mode (`WASD`/Arrows, drag-to-look, Auto-Walk Tour, and 6 district teleports), Layer-1 raycast hover tooltips, click-to-zoom camera transitions, and collapsible bottom dock. |
| `/README.md` | Run/deploy instructions, architecture overview, and custom model/texture swap guide. |

---

## Multi-Yokocho Infinity Castle (無限横丁城) & First-Person Walking POV

- **4-Tier Symmetrical Megastructure**:
  - **Tier 1 (Horizon Ring)**: 4 cardinal Yokocho blocks (`North`, `East`, `South`, `West`) connected by walkable vermilion lacquer bridges (`±15m` to `±28m`) and 4 diagonal corner floating Yokocho islands (`±36m`).
  - **Tier 2 (Vertical Wall-Mounted Chasm)**: 8 Yokocho city blocks rotated `90°` sideways so their streets, towers, and pagodas project horizontally into the central chasm.
  - **Tier 3 (Inverted Overhead Canopy)**: 9 upside-down Yokocho city blocks suspended at `Y = +35m` to `+44m` with buildings hanging downward and inter-canopy skybridges.
  - **Tier 4 (Deep Abyssal Underworld)**: 8 glowing Yokocho blocks descending into the bottomless chasm (`Y = -22m` to `-40m`), framed by 8 monumental Hinoki & Shoji pillars.
- **5 Color Themes & 4 Architectural Archetypes**:
  - **Kitsune Crimson-Gold (`pagoda`)**: 5-story vermilion pagoda & Torii colonnade.
  - **Denki Cyber-Jade (`cyber`)**: Twin high-rise neon arcade towers & overhead skybridge.
  - **Uji Matcha-Emerald (`matcha`)**: Octagonal wooden tea pavilion, machiya roasteries & bamboo grove.
  - **Fuji Wisteria-Violet (`onsen`)**: Monumental multi-gabled sento bathhouse keep & twin smokestacks.
  - **Sakura Rose-Quartet**: Inverted rose-gold canopy and deep abyssal sanctums.
- **First-Person Walking POV (`V`)**: Toggle **Walking POV (V)** in the top bar to walk at eye-level across the central alleys and out onto all 4 cardinal Infinity Bridges, look straight up at the upside-down overhead city blocks, or teleport directly to any of the 5 themed districts.

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
