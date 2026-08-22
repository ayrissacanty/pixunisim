import type * as THREE_NS from "three";
import { PROP_MODELS, SHELL_MODELS, propsForRoom } from "@/lib/props3d";

/**
 * Shared 3D asset cache.
 *
 * Every GLB/FBX the campus uses is fetched at most once per session and kept
 * as a parsed `Group`; stages clone from the cached original instead of
 * re-downloading and re-parsing, which is what used to cause the frame drop
 * when a student walked from one room into another. Rooms can also be
 * prefetched (see `prefetchRoomAssets`) while the student is still walking
 * down the corridor, so the classroom stage has nothing left to download by
 * the time the beat opens.
 */

const cache = new Map<string, Promise<THREE_NS.Group>>();

/** Fetch (or reuse) a parsed model. Loaders are imported on first use only. */
export function loadModel(url: string): Promise<THREE_NS.Group> {
  const hit = cache.get(url);
  if (hit) return hit;
  const p = url.endsWith(".glb")
    ? import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) =>
        new GLTFLoader().loadAsync(url).then((gltf) => gltf.scene as unknown as THREE_NS.Group),
      )
    : import("three/examples/jsm/loaders/FBXLoader.js").then(({ FBXLoader }) =>
        new FBXLoader().loadAsync(url).then((g) => g as unknown as THREE_NS.Group),
      );
  // A failed fetch must not poison the cache: a later visit should retry.
  p.catch(() => cache.delete(url));
  cache.set(url, p);
  return p;
}

export function isModelCached(url: string) {
  return cache.has(url);
}

/** Every model URL a given room needs, shell pieces first. */
export function roomModelUrls(roomName?: string): string[] {
  const urls = new Set<string>(Object.values(SHELL_MODELS));
  for (const placement of propsForRoom(roomName)) urls.add(PROP_MODELS[placement.model]);
  return [...urls];
}

const inFlight = new Set<string>();
const queue: string[] = [];
let active = 0;
const MAX_PARALLEL = 3;

function pump() {
  while (active < MAX_PARALLEL && queue.length) {
    const url = queue.shift()!;
    active += 1;
    void loadModel(url)
      .catch(() => undefined)
      .finally(() => {
        active -= 1;
        inFlight.delete(url);
        pump();
      });
  }
}

/**
 * Warm a room's models in the background, a few at a time, without ever
 * blocking the Phaser loop. Safe to call repeatedly — cached and queued URLs
 * are skipped.
 */
export function prefetchRoomAssets(roomName?: string) {
  if (typeof window === "undefined") return;
  const schedule = (fn: () => void) => {
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (idle) idle(fn);
    else window.setTimeout(fn, 120);
  };
  schedule(() => {
    for (const url of roomModelUrls(roomName)) {
      if (isModelCached(url) || inFlight.has(url)) continue;
      inFlight.add(url);
      queue.push(url);
    }
    pump();
  });
}
