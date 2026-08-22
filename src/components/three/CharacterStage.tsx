import { useEffect, useRef, useState } from "react";
import { characterOf, type CharacterId } from "@/lib/characters";
import { buildCharacter, type LowPolyCharacter } from "@/lib/lowpoly";
import { PROP_MODELS, PROP_PALETTE_URL, SHELL_MODELS, type PropPlacement } from "@/lib/props3d";
import { loadModel } from "@/lib/room-assets";

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

/** Styloo-style room shell: tiled floor with walls on three sides. */
export interface RoomShell {
  width: number;
  depth: number;
  /** Wall height in metres. */
  height?: number;
  /** Put a door segment in the middle of the back wall. */
  door?: boolean;
  /** Put window segments along the right-hand wall. */
  windows?: boolean;
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
  /** Build Styloo walls and a tiled floor around the set. */
  shell?: RoomShell;
}

/** Texture cache; models are cached centrally in `@/lib/room-assets`. */
const textureCache = new Map<string, Promise<import("three").Texture>>();

/**
 * Characters are generated at runtime, so there is nothing to download. The
 * export is kept so callers can warm the heavy Three.js chunk early.
 */
export async function prefetchCharacters() {
  await import("three");
}

/**
 * Shared Three.js stage: a Styloo-style room shell, low-poly furniture from the
 * Styloo packs and the procedurally built cast. Used by the Layer 3 classroom
 * beat, the Layer 4 lesson stage and the avatar picker.
 */
export function CharacterStage({
  actors,
  height = 220,
  background = 0xdfe6ea,
  className,
  turntable = false,
  onReady,
  props: sceneProps,
  camera: cameraOpts,
  floorColor = 0xc9b18d,
  shell,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const key = actors.map((a) => `${a.character}:${a.x ?? 0}:${a.z ?? 0}`).join("|");
  const propKey = (sceneProps ?? []).map((p) => `${p.model}:${p.x ?? 0}:${p.z ?? 0}`).join("|");
  const camKey = JSON.stringify(cameraOpts ?? {});
  const shellKey = JSON.stringify(shell ?? null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      try {
        const THREE = await import("three");
        const host = hostRef.current;
        if (disposed || !host) return;

        const width = host.clientWidth || 480;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(background);
        const camera = new THREE.PerspectiveCamera(cameraOpts?.fov ?? 38, width / height, 0.1, 200);
        camera.position.set(cameraOpts?.x ?? 0, cameraOpts?.y ?? 1.55, cameraOpts?.z ?? 4.4);
        camera.lookAt(0, cameraOpts?.lookY ?? 1, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        host.replaceChildren(renderer.domElement);

        // Flat, bright, even lighting to match the pack's baked look.
        scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6b5a44, 1.5));
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
        keyLight.position.set(3, 6, 4);
        scene.add(keyLight);
        const fill = new THREE.DirectionalLight(0xd9e6f2, 0.5);
        fill.position.set(-4, 3, -3);
        scene.add(fill);

        const root = new THREE.Group();
        scene.add(root);

        const texLoader = new THREE.TextureLoader();
        // Models come from the shared session cache, so a room the student has
        // already visited (or that was prefetched from the corridor) is built
        // from memory with no network work and no parse hitch.
        const load = (url: string) => loadModel(url) as Promise<import("three").Group>;
        const loadTexture = (url: string) => {
          let p = textureCache.get(url);
          if (!p) {
            p = texLoader.loadAsync(url);
            textureCache.set(url, p);
          }
          return p;
        };

        // ---- Cast ------------------------------------------------------
        const built: LowPolyCharacter[] = [];
        for (const actor of actors) {
          const person = buildCharacter(THREE, characterOf(actor.character));
          person.group.scale.setScalar(actor.scale ?? 1);
          person.group.position.set(actor.x ?? 0, 0, actor.z ?? 0);
          person.group.rotation.y = actor.rotation ?? 0;
          root.add(person.group);
          built.push(person);
        }

        // ---- Room shell ------------------------------------------------
        if (shell) {
          const wallHeight = shell.height ?? 2.7;
          const shellGroup = new THREE.Group();
          scene.add(shellGroup);

          /** Normalise a Styloo piece: upright, centred, feet on the floor. */
          const prep = (source: import("three").Group, targetH: number) => {
            const piece = source.clone(true);
            const wrap = new THREE.Group();
            wrap.add(piece);
            let bb = new THREE.Box3().setFromObject(wrap);
            const size = new THREE.Vector3();
            bb.getSize(size);
            // Z-up authoring shows up as a piece that is deeper than it is tall.
            if (size.z > size.y * 1.4 && size.z > size.x * 0.8) {
              piece.rotation.x = -Math.PI / 2;
              bb = new THREE.Box3().setFromObject(wrap);
              bb.getSize(size);
            }
            const s = size.y > 0 ? targetH / size.y : 1;
            wrap.scale.setScalar(s);
            const scaled = new THREE.Box3().setFromObject(wrap);
            const centre = new THREE.Vector3();
            scaled.getCenter(centre);
            wrap.position.x -= centre.x;
            wrap.position.z -= centre.z;
            wrap.position.y -= scaled.min.y;
            const outSize = new THREE.Vector3();
            scaled.getSize(outSize);
            return { wrap, size: outSize };
          };

          try {
            const [wallSrc, windowSrc, doorSrc, floorSrc] = await Promise.all([
              load(SHELL_MODELS.wall),
              load(SHELL_MODELS.wallWindow),
              load(SHELL_MODELS.wallDoor),
              load(SHELL_MODELS.floorTile),
            ]);
            if (disposed) return;

            const probe = prep(wallSrc, wallHeight);
            const segW = Math.max(probe.size.x, 0.5);

            const placeWall = (
              src: import("three").Group,
              x: number,
              z: number,
              rotY: number,
            ) => {
              const { wrap } = prep(src, wallHeight);
              const holder = new THREE.Group();
              holder.add(wrap);
              holder.position.set(x, 0, z);
              holder.rotation.y = rotY;
              shellGroup.add(holder);
            };

            // Back wall (behind the teacher) and the two side walls; the front
            // is left open so the camera can look in.
            const backCount = Math.max(1, Math.ceil(shell.width / segW));
            const backSpan = backCount * segW;
            for (let i = 0; i < backCount; i += 1) {
              const x = -backSpan / 2 + segW / 2 + i * segW;
              const middle = i === Math.floor(backCount / 2);
              placeWall(shell.door && middle ? doorSrc : wallSrc, x, -shell.depth / 2, 0);
            }
            const sideCount = Math.max(1, Math.ceil(shell.depth / segW));
            const sideSpan = sideCount * segW;
            for (let i = 0; i < sideCount; i += 1) {
              const z = -sideSpan / 2 + segW / 2 + i * segW;
              placeWall(wallSrc, -shell.width / 2, z, Math.PI / 2);
              placeWall(
                shell.windows && i % 2 === 1 ? windowSrc : wallSrc,
                shell.width / 2,
                z,
                -Math.PI / 2,
              );
            }

            // Tiled floor.
            const floorProbe = prep(floorSrc, 0.06);
            const tileW = Math.max(floorProbe.size.x, 0.5);
            const cols = Math.ceil(shell.width / tileW);
            const rows = Math.ceil(shell.depth / tileW);
            for (let c = 0; c < cols; c += 1) {
              for (let r = 0; r < rows; r += 1) {
                const { wrap } = prep(floorSrc, 0.06);
                const holder = new THREE.Group();
                holder.add(wrap);
                holder.position.set(
                  -(cols * tileW) / 2 + tileW / 2 + c * tileW,
                  0,
                  -(rows * tileW) / 2 + tileW / 2 + r * tileW,
                );
                shellGroup.add(holder);
              }
            }
          } catch (err) {
            console.error("Room shell unavailable, using plain walls", err);
            const wallMat = new THREE.MeshLambertMaterial({ color: 0xe4dcc9 });
            const back = new THREE.Mesh(
              new THREE.BoxGeometry(shell.width, wallHeight, 0.12),
              wallMat,
            );
            back.position.set(0, wallHeight / 2, -shell.depth / 2);
            shellGroup.add(back);
            for (const side of [-1, 1]) {
              const w = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, wallHeight, shell.depth),
                wallMat,
              );
              w.position.set((side * shell.width) / 2, wallHeight / 2, 0);
              shellGroup.add(w);
            }
          }
        }

        // ---- Furniture --------------------------------------------------
        if (sceneProps?.length) {
          const paletteTex = await loadTexture(PROP_PALETTE_URL);
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
                const raw = source.clone(true);
                // Some glTF props are authored Z-up; tip them upright first so
                // the bounding-box normalisation below measures real height.
                const model = new THREE.Group();
                if (placement.upAxis === "z") raw.rotation.x = -Math.PI / 2;
                model.add(raw);
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
                const unit = placement.targetHeight
                  ? size.y > 0
                    ? placement.targetHeight / size.y
                    : 1
                  : !isGltf && Math.max(size.x, size.y, size.z) > 12
                    ? 0.01
                    : 1;
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

        // Ground plane under everything so nothing floats over the void.
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(60, 60),
          new THREE.MeshLambertMaterial({ color: floorColor }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        scene.add(floor);

        let frame = 0;
        const start = Date.now();
        const tick = () => {
          const t = (Date.now() - start) / 1000;
          if (turntable) root.rotation.y = t * 0.5;
          for (const person of built) person.animate(t);
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
  }, [key, propKey, camKey, shellKey, height, background, turntable, floorColor]);

  return (
    <div
      data-testid="character-stage"
      data-ready={ready ? "true" : "false"}
      className={className ?? "relative overflow-hidden rounded-md border border-border"}
    >
      <div ref={hostRef} style={{ height }} className="w-full" />
      {!ready && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {failed ? "Characters unavailable" : "Loading room…"}
        </p>
      )}
    </div>
  );
}
