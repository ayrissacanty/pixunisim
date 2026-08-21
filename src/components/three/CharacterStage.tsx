import { useEffect, useRef, useState } from "react";
import { characterOf, CHARACTER_IDS, type CharacterId } from "@/lib/characters";
import { PROP_MODELS, PROP_PALETTE_URL, type PropPlacement } from "@/lib/props3d";

export interface StageActor {
  character: CharacterId;
  /** Horizontal position in world units; 0 is centre. */
  x?: number;
  /** Depth; negative is further from the camera. */
  z?: number;
  /** Y rotation in radians. */
  rotation?: number;
  scale?: number;
  label?: string;
}

interface Props {
  actors: StageActor[];
  height?: number;
  /** Background colour of the stage (hex number). */
  background?: number;
  className?: string;
  /** Slow idle turntable on the whole cast — used by the avatar picker. */
  turntable?: boolean;
  /** Fires once every actor is on stage. */
  onReady?: () => void;
  /** Low-poly furniture placed around the cast. */
  props?: PropPlacement[];
  /** Pull the camera back / raise it for furnished rooms. */
  camera?: { x?: number; y?: number; z?: number; lookY?: number; fov?: number };
  floorColor?: number;
}

/** Cache loaded FBX groups + textures so revisiting a classroom is instant. */
const modelCache = new Map<string, Promise<unknown>>();

/**
 * Warm the character cache ahead of time so the Layer 3 classroom beat does not
 * stall on a cold FBX download when the student walks through the door.
 */
export async function prefetchCharacters(ids: CharacterId[] = CHARACTER_IDS) {
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  for (const id of ids) {
    const url = characterOf(id).model;
    if (!modelCache.has(url)) modelCache.set(url, new FBXLoader().loadAsync(url));
  }
}

/**
 * Shared Three.js stage that renders the uploaded FBX characters. Used by the
 * Layer 3 classroom beat, the Layer 4 lesson stage and the avatar picker.
 */
export function CharacterStage({
  actors,
  height = 220,
  background = 0x2b2118,
  className,
  turntable = false,
  onReady,
  props: sceneProps,
  camera: cameraOpts,
  floorColor = 0x6b4a2f,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const key = actors.map((a) => `${a.character}:${a.x ?? 0}:${a.z ?? 0}`).join("|");
  const propKey = (sceneProps ?? []).map((p) => `${p.model}:${p.x ?? 0}:${p.z ?? 0}`).join("|");
  const camKey = JSON.stringify(cameraOpts ?? {});

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      try {
        const THREE = await import("three");
        const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
        const { clone: cloneSkinned } = await import("three/examples/jsm/utils/SkeletonUtils.js");
        const host = hostRef.current;
        if (disposed || !host) return;

        const width = host.clientWidth || 480;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(background);
        const camera = new THREE.PerspectiveCamera(cameraOpts?.fov ?? 38, width / height, 0.1, 200);
        camera.position.set(
          cameraOpts?.x ?? 0,
          cameraOpts?.y ?? 1.55,
          cameraOpts?.z ?? 4.4,
        );
        camera.lookAt(0, cameraOpts?.lookY ?? 1, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        host.replaceChildren(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xfff3e0, 1.1));
        const keyLight = new THREE.DirectionalLight(0xffe6bd, 1.5);
        keyLight.position.set(2.5, 5, 4);
        scene.add(keyLight);
        const rim = new THREE.DirectionalLight(0x9fb08a, 0.6);
        rim.position.set(-3, 2, -3);
        scene.add(rim);

        const root = new THREE.Group();
        scene.add(root);

        const texLoader = new THREE.TextureLoader();
        const load = (url: string) => {
          let p = modelCache.get(url);
          if (!p) {
            p = url.endsWith(".glb")
              ? import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) =>
                  new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene),
                )
              : new FBXLoader().loadAsync(url);
            modelCache.set(url, p);
          }
          return p as Promise<import("three").Group>;
        };

        await Promise.all(
          actors.map(async (actor) => {
            const def = characterOf(actor.character);
            const [fbx, map] = await Promise.all([
              load(def.model),
              texLoader.loadAsync(def.texture),
            ]);
            if (disposed) return;
            map.colorSpace = THREE.SRGBColorSpace;
            // FBX UVs expect the default (flipped) orientation.
            map.flipY = true;
            const model = cloneSkinned(fbx) as import("three").Group;

            model.traverse((child) => {
              const mesh = child as import("three").Mesh;
              if (!mesh.isMesh) return;
              mesh.frustumCulled = false;
              mesh.material = new THREE.MeshStandardMaterial({
                map,
                roughness: 0.8,
                metalness: 0,
              });
            });

            // Normalise: models are authored in centimetres and off-origin.
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const unit = size.y > 0 ? 1.7 / size.y : 1;
            model.scale.setScalar(unit * (actor.scale ?? 1));

            const scaled = new THREE.Box3().setFromObject(model);
            const centre = new THREE.Vector3();
            scaled.getCenter(centre);
            model.position.x += (actor.x ?? 0) - centre.x;
            model.position.z += (actor.z ?? 0) - centre.z;
            model.position.y -= scaled.min.y;
            // Source models face away from the camera by default.
            model.rotation.y = Math.PI + (actor.rotation ?? 0);
            root.add(model);
          }),
        );

        // Furniture lives outside `root` so it stays still while the cast breathes.
        if (sceneProps?.length) {
          const paletteTex = await texLoader.loadAsync(PROP_PALETTE_URL);
          paletteTex.colorSpace = THREE.SRGBColorSpace;
          paletteTex.flipY = true;
          const set = new THREE.Group();
          scene.add(set);
          await Promise.all(
            sceneProps.map(async (placement) => {
              try {
                const url = PROP_MODELS[placement.model];
                const isGltf = url.endsWith(".glb");
                const source = await load(url);
                if (disposed) return;
                const model = source.clone(true);
                // glTF props ship their own baked materials; the FBX set all
                // samples the shared low-poly palette texture.
                if (!isGltf) {
                  model.traverse((child) => {
                    const mesh = child as import("three").Mesh;
                    if (!mesh.isMesh) return;
                    mesh.material = new THREE.MeshStandardMaterial({
                      map: paletteTex,
                      roughness: 0.85,
                      metalness: 0,
                    });
                  });
                }
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                // FBX props are authored in centimetres; glTF props in metres.
                const unit = !isGltf && Math.max(size.x, size.y, size.z) > 12 ? 0.01 : 1;
                model.scale.setScalar(unit * (placement.scale ?? 1));

                const scaled = new THREE.Box3().setFromObject(model);
                const centre = new THREE.Vector3();
                scaled.getCenter(centre);
                model.position.x += (placement.x ?? 0) - centre.x;
                model.position.z += (placement.z ?? 0) - centre.z;
                model.position.y += (placement.y ?? 0) - scaled.min.y;
                model.rotation.y = placement.rotation ?? 0;
                set.add(model);
              } catch (err) {
                console.error("Failed to load prop:", placement.model, err);
              }
            }),
          );
        }

        if (disposed) return;
        setReady(true);
        onReadyRef.current?.();

        // Simple floor so the cast is grounded rather than floating.
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(40, 40),
          new THREE.MeshStandardMaterial({ color: floorColor, roughness: 1 }),
        );
        floor.rotation.x = -Math.PI / 2;
        scene.add(floor);

        let frame = 0;
        const start = Date.now();
        const tick = () => {
          const t = (Date.now() - start) / 1000;
          if (turntable) root.rotation.y = t * 0.5;
          else root.rotation.y = Math.sin(t * 0.4) * 0.05;
          root.position.y = Math.sin(t * 1.6) * 0.01;
          renderer.render(scene, camera);
          frame = requestAnimationFrame(tick);
        };
        tick();

        const onResize = () => {
          const w = host.clientWidth || width;
          camera.aspect = w / height;
          camera.updateProjectionMatrix();
          renderer.setSize(w, height);
        };
        window.addEventListener("resize", onResize);

        cleanup = () => {
          cancelAnimationFrame(frame);
          window.removeEventListener("resize", onResize);
          renderer.dispose();
          host.replaceChildren();
        };
      } catch {
        if (!disposed) setFailed(true);
      }
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, propKey, camKey, height, background, turntable, floorColor]);

  return (
    <div
      data-testid="character-stage"
      data-ready={ready ? "true" : "false"}
      className={className ?? "relative overflow-hidden rounded-md border border-border"}
    >
      <div ref={hostRef} style={{ height }} className="w-full" />
      {!ready && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {failed ? "Characters unavailable" : "Loading characters…"}
        </p>
      )}
    </div>
  );
}
