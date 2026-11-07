import React, { useState } from 'react';
import { X, Download, Layers, Box, FileCode } from 'lucide-react';
import { BudgetReport } from '../diorama/dioramaLogic';

interface AtlasPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  previews: {
    buildingsDataUrl: string;
    propsDataUrl: string;
    groundDataUrl: string;
  } | null;
  budget: BudgetReport;
}

export const AtlasPipelineModal: React.FC<AtlasPipelineModalProps> = ({
  isOpen,
  onClose,
  previews,
  budget,
}) => {
  const [activeTab, setActiveTab] = useState<'atlases' | 'swap' | 'blender'>('atlases');

  if (!isOpen) return null;

  const atlasItems = [
    {
      id: 'buildings',
      title: '01. Buildings & Signage Atlas',
      spec: '1024 × 1024px · sRGB Albedo + Emissive Mask · 4×4 UV Grid',
      description:
        'Hand-painted vertical facade gradients, baked bottom ambient occlusion, timber slats, Kawara roof tiles, wave noren curtains, shoji window grids, and Japanese neon signage.',
      url: previews?.buildingsDataUrl ?? '',
      filename: 'hotaru-yokocho-buildings-atlas.png',
    },
    {
      id: 'props',
      title: '02. Props, Foliage & Vehicles Atlas',
      spec: '1024 × 1024px · sRGB Albedo + Emissive Mask · 4×4 UV Grid',
      description:
        'Sakura pink & Ginkgo gold canopy brushwork, vermilion Torii lacquer, beverage vending machines, chochin paper lanterns, Kei truck, delivery scooter, streetcar tram, and chibi characters.',
      url: previews?.propsDataUrl ?? '',
      filename: 'hotaru-yokocho-props-atlas.png',
    },
    {
      id: 'ground',
      title: '03. Ground & Cross-Section Atlas',
      spec: '1024 × 1024px · sRGB Albedo + Micro-Relief Bump · 4×4 UV Grid',
      description:
        'Rain-sheen asphalt with crosswalk stripes, yokocho cobblestone flagstones, mossy shrine gravel, terracotta curb rim, sienna soil stratum with pebbles, and basalt bedrock underside.',
      url: previews?.groundDataUrl ?? '',
      filename: 'hotaru-yokocho-ground-atlas.png',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlas-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/80"
    >
      <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="atlas-modal-title" className="text-xl font-bold tracking-tight font-display">
              Diorama Texture Atlases & Custom Asset Swap Guide
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Vite + Vanilla Three.js Architecture</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Base Scene: {budget.baseTriangles.toLocaleString()} tris (Budget &lt; 80,000)
              </span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Outline Pass: {budget.outlineTriangles.toLocaleString()} tris
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Atlas and Pipeline Guide"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('atlases')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'atlases'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3 Live Texture Atlases (1024px)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('swap')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'swap'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Where to Swap Models & Textures</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blender')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'blender'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Blender / GLB Export Workflow</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {activeTab === 'atlases' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {atlasItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 overflow-hidden"
                >
                  <div className="aspect-square w-full bg-slate-900 relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                        Generating 1024×1024 Atlas...
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                        {item.title}
                      </h3>
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                        {item.spec}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        {item.description}
                      </p>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        download={item.filename}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 transition-colors whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download 1024px PNG</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'swap' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  1. Swapping the 3 Texture Atlases (`src/diorama/textureAtlases.ts`)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  All scene materials pull from three 1024–2048px textures returned by{' '}
                  <code className="font-mono text-amber-600 dark:text-amber-400">
                    createDioramaAtlases()
                  </code>
                  . To replace the procedural hand-painted canvases with external PNG/KTX2 files:
                </p>
                <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
{`// In src/diorama/textureAtlases.ts:
const loader = new THREE.TextureLoader();
const buildingsColor = loader.load('/assets/textures/buildings_atlas_2048.png');
buildingsColor.colorSpace = THREE.SRGBColorSpace;
buildingsColor.flipY = false; // Set false if UV-mapped for GLTF`}
                </pre>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  2. Swapping Individual Buildings or Full Scene `.glb` (`src/diorama/buildDioramaScene.ts`)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Each building is registered in <code className="font-mono">BUILDINGS</code> in{' '}
                  <code className="font-mono text-amber-600 dark:text-amber-400">
                    src/diorama/dioramaLogic.ts
                  </code>{' '}
                  and constructed inside <code className="font-mono">buildSingleStructure(spec)</code>.
                  To load a Draco/KTX2 compressed <code className="font-mono">.glb</code> model instead:
                </p>
                <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
{`import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const draco = new DRACOLoader().setDecoderPath('/draco/');
const gltfLoader = new GLTFLoader().setDRACOLoader(draco);
gltfLoader.load('/assets/models/ramen_shop.glb', (gltf) => {
  const model = gltf.scene;
  model.userData.buildingSpec = spec; // Preserves hover tooltip & click-to-zoom!
  buildingGroups.get('menya-hotaru')?.add(model);
});`}
                </pre>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  3. Editing Building Names, Lore, and Camera Focus Offsets (`src/diorama/dioramaLogic.ts`)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Update the <code className="font-mono">BUILDINGS</code> array in{' '}
                  <code className="font-mono text-amber-600 dark:text-amber-400">
                    src/diorama/dioramaLogic.ts
                  </code>{' '}
                  to change building titles, Japanese subtitles, position coordinates, bounding-box proxy sizes, or camera target offsets.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'blender' && (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-2">
                  Recommended Blender & Substance Painter Kawaii Diorama Pipeline
                </h3>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong className="text-slate-900 dark:text-white">Blockout & Bevel Silhouette:</strong>{' '}
                    Model on a <span className="font-mono">22m × 22m</span> square chunk with slightly exaggerated roof eaves and chunky bevels (<span className="font-mono">Bevel Modifier: 1–2 segments, width 0.04m, Harden Normals</span>). Keep total geometry under 80,000 triangles.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-white">3-Atlas UV Unwrapping:</strong>{' '}
                    Assign materials into 3 texture sets (<span className="font-mono">Atlas_Buildings</span>, <span className="font-mono">Atlas_Props</span>, <span className="font-mono">Atlas_Ground</span>) at 1024px or 2048px with at least <span className="font-mono">8px</span> island margin padding to prevent mipmap bleeding.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-white">Hand-Painted Baked Lighting:</strong>{' '}
                    Bake soft Cycles Ambient Occlusion and a top-down warm-to-cool vertical gradient into the base color map, then hand-paint warm edge highlights on roof tiles and timber beams in Blender Texture Paint or Substance Painter.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-white">Export with Draco / KTX2:</strong>{' '}
                    Export via <span className="font-mono">File → Export → glTF 2.0 (.glb)</span> with <span className="font-mono">Apply Modifiers</span> and <span className="font-mono">Compression (Draco mesh compression level 6)</span> enabled.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
