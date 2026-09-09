import { useEffect, useState } from "react";
import * as THREE from "three";
import { getBuildingIcon, getBuildingView } from "../data/buildingIcons";

type Asset = { texture: THREE.Texture; pixels: Uint8ClampedArray; width: number; height: number };
const assets = new Map<string, Promise<Asset | null>>();
const readyAssets = new Map<string, Asset | null>();
function loadAsset(url: string) {
  if (!assets.has(url)) {
    assets.set(url, new THREE.TextureLoader().loadAsync(url).then(texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const canvas = document.createElement("canvas");
      canvas.width = texture.image.width;
      canvas.height = texture.image.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(texture.image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const bg = data.data.slice(0, 3);
      if (bg[0] > 200 && bg[1] > 190 && bg[2] > 170) {
        for (let i = 0; i < data.data.length; i += 4) {
          const dr = data.data[i] - bg[0], dg = data.data[i + 1] - bg[1], db = data.data[i + 2] - bg[2];
          const distance = Math.sqrt(dr * dr + dg * dg + db * db);
          const r = data.data[i], g = data.data[i + 1], b = data.data[i + 2];
          const paleBackdrop = r > 178 && g > 172 && b > 155 && Math.max(r, g, b) - Math.min(r, g, b) < 48;
          data.data[i + 3] = paleBackdrop ? 0 : Math.min(data.data[i + 3], Math.max(0, Math.min(255, (distance - 18) * 15)));
        }
        ctx.putImageData(data, 0, 0);
        texture.dispose();
        texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
      }
      texture.premultiplyAlpha = false;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      return { texture, pixels: data.data, width: canvas.width, height: canvas.height };
    }).catch(() => null).then(asset => { readyAssets.set(url, asset); return asset; }));
  }
  return assets.get(url)!;
}
export async function preloadBuildingAssets(types: string[]) {
  await Promise.all([...new Set(types)].flatMap(type => {
    const urls = [getBuildingIcon(type, 512), ...[0,1,2,3].map(turn => getBuildingView(type, turn))];
    return [...new Set(urls.filter((url): url is string => !!url))].map(loadAsset);
  }));
}

// A camera-facing cutout keeps the supplied isometric artwork intact as the map moves.
// Cached textures are shared across buildings and retained for world switching.
export function IconBuilding({ type, night = false, ghost, rotation = 0, fallback }: {
  type: string;
  night?: boolean;
  ghost?: boolean;
  rotation?: number;
  fallback: React.ReactNode;
}) {
  const url = getBuildingView(type, rotation) ?? getBuildingIcon(type, 512);
  const [loaded, setLoaded] = useState<{ url: string; asset: Asset | null }>();
  useEffect(() => {
    let live = true;
    for (let turn = 0; turn < 4; turn++) {
      const view = getBuildingView(type, turn);
      if (view) void loadAsset(view);
    }
    if (url) void loadAsset(url).then(asset => { if (live) setLoaded({ url, asset }); });
    return () => { live = false; };
  }, [url, type]);
  const asset = (url ? readyAssets.get(url) : null) ?? loaded?.asset;
  // Never flash the legacy model while a replacement texture is downloading.
  if (!asset) return url && !readyAssets.has(url) ? null : <>{fallback}</>;
  const scale = type === "scenery_grass" ? .42 : type === "scenery_lake" ? 1.35 : type === "bench" ? 0.95 : ["farm", "flowerbed", "lumber"].includes(type) ? 1.3 : 1.55;
  return (
    <sprite
      name={`building-icon:${type}`}
      renderOrder={1}
      position={[0, 0.06, 0]}
      center={[0.5, ["farm","flowerbed"].includes(type) ? .34 : ["bakery","lumber","windmill"].includes(type) ? .30 : .27]}
      scale={[scale, type.startsWith("scenery_") ? scale * asset.height / asset.width : scale, 1]}
      raycast={function (this: THREE.Sprite, raycaster, intersections) {
        if (ghost !== undefined) return;
        const hits: THREE.Intersection[] = [];
        THREE.Sprite.prototype.raycast.call(this, raycaster, hits);
        for (const hit of hits) {
          if (!hit.uv) continue;
          const x = Math.max(0, Math.min(asset.width - 1, Math.floor(hit.uv.x * asset.width)));
          const y = Math.max(0, Math.min(asset.height - 1, Math.floor((1 - hit.uv.y) * asset.height)));
          // Transparent margins must not intercept clicks on ground or neighbors.
          if (asset.pixels[(y * asset.width + x) * 4 + 3] > 64) intersections.push(hit);
        }
      }}
    >
      <spriteMaterial
        map={asset.texture}
        transparent
        alphaTest={0.22}
        depthWrite={false}
        depthTest={false}
        opacity={ghost === undefined ? 1 : 0.55}
        color={ghost === undefined ? (night ? "#9caeb5" : "#ffffff") : ghost ? "#b7efa0" : "#ef8c7a"}
        toneMapped={false}
      />
    </sprite>
  );
}
