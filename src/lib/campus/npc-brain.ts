import type { DayPhase } from "./daynight";
import type { NpcSpawn } from "./world";

/**
 * Autonomous NPC state machine.
 *
 * States: IDLE (standing, glancing around), WANDER (strolling to a nearby
 * point), AT_STATION (parked at the waypoint the schedule assigns for this
 * time of day) and IN_DIALOGUE (frozen while the player talks to them).
 *
 * The machine is deliberately pure: the scene feeds it a position and a delta
 * and gets back a desired target, so it stays unit-testable.
 */

export type NpcState = "IDLE" | "WANDER" | "AT_STATION" | "IN_DIALOGUE";

export interface NpcBrain {
  state: NpcState;
  /** Milliseconds left in the current state. */
  hold: number;
  target: { x: number; y: number } | null;
  /** Waypoint for the current schedule slot, in world px. */
  station: { x: number; y: number };
  phase: DayPhase | null;
}

/** Deterministic per-character jitter so a crowd never moves in lockstep. */
function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Radius (px) an NPC may drift from their scheduled waypoint. */
export const WANDER_RADIUS = 72;
export const ARRIVE_EPS = 6;

/**
 * Where this character should be at this time of day, as an offset from their
 * spawn tile. Mornings and middays park them at their post; dawn, dusk and
 * night let them roam or settle down.
 */
export function scheduleFor(
  spawn: NpcSpawn,
  phase: DayPhase,
): { mode: "station" | "wander" | "idle"; offset: { x: number; y: number } } {
  const h = hash(spawn.id);
  const spin = (h % 8) * (Math.PI / 4);
  const ring = (r: number) => ({ x: Math.cos(spin) * r, y: Math.sin(spin) * r });
  const stationary = spawn.behavior === "sit" || spawn.behavior === "read";
  switch (phase) {
    case "dawn":
      return { mode: stationary ? "idle" : "wander", offset: ring(56) };
    case "morning":
    case "midday":
      return { mode: "station", offset: { x: 0, y: 0 } };
    case "afternoon":
      return {
        mode: stationary ? "station" : "wander",
        offset: ring(48),
      };
    case "dusk":
      return { mode: stationary ? "idle" : "wander", offset: ring(64) };
    case "night":
    default:
      return { mode: "idle", offset: ring(24) };
  }
}

export function createBrain(spawn: NpcSpawn, homeX: number, homeY: number): NpcBrain {
  return {
    state: "IDLE",
    hold: hash(spawn.id) % 1200,
    target: null,
    station: { x: homeX, y: homeY },
    phase: null,
  };
}

export interface BrainContext {
  spawn: NpcSpawn;
  phase: DayPhase;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  delta: number;
  /** True while a dialogue with this NPC is open. */
  talking: boolean;
  /** Motion budget: 0 when reduced motion is on. */
  motion: number;
  /** Collision probe used to reject unreachable wander points. */
  canStand: (x: number, y: number) => boolean;
}

/** Advances the machine one frame and returns the point the NPC walks toward. */
export function stepBrain(brain: NpcBrain, ctx: BrainContext): { x: number; y: number } | null {
  if (ctx.talking) {
    brain.state = "IN_DIALOGUE";
    brain.target = null;
    return null;
  }
  if (brain.state === "IN_DIALOGUE") {
    brain.state = "IDLE";
    brain.hold = 600;
  }

  const plan = scheduleFor(ctx.spawn, ctx.phase);
  if (brain.phase !== ctx.phase) {
    brain.phase = ctx.phase;
    brain.station = { x: ctx.homeX + plan.offset.x, y: ctx.homeY + plan.offset.y };
    if (!ctx.canStand(brain.station.x, brain.station.y)) {
      brain.station = { x: ctx.homeX, y: ctx.homeY };
    }
    brain.state = plan.mode === "station" ? "AT_STATION" : "IDLE";
    brain.hold = 0;
    brain.target = brain.station;
  }

  brain.hold -= ctx.delta;
  const seed = hash(ctx.spawn.id + brain.state) % 1000;

  if (brain.target) {
    const dist = Math.hypot(brain.target.x - ctx.x, brain.target.y - ctx.y);
    if (dist <= ARRIVE_EPS) {
      brain.target = null;
      brain.state = plan.mode === "station" ? "AT_STATION" : "IDLE";
      brain.hold = 900 + (seed % 1800);
    }
    if (brain.target) return brain.target;
  }

  if (brain.hold > 0) return null;

  if (plan.mode === "station") {
    const drift = Math.hypot(brain.station.x - ctx.x, brain.station.y - ctx.y);
    brain.state = "AT_STATION";
    brain.hold = 1500 + (seed % 1500);
    if (drift > ARRIVE_EPS * 2) {
      brain.target = brain.station;
      return brain.target;
    }
    return null;
  }

  if (plan.mode === "idle" || ctx.motion <= 0) {
    brain.state = "IDLE";
    brain.hold = 1200 + (seed % 2400);
    return null;
  }

  // WANDER: pick a reachable point inside the wander ring around the station.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const angle = ((seed + attempt * 137) % 360) * (Math.PI / 180);
    const radius = WANDER_RADIUS * (0.4 + ((seed + attempt * 53) % 60) / 100);
    const tx = brain.station.x + Math.cos(angle) * radius;
    const ty = brain.station.y + Math.sin(angle) * radius;
    if (ctx.canStand(tx, ty)) {
      brain.state = "WANDER";
      brain.hold = 4000;
      brain.target = { x: tx, y: ty };
      return brain.target;
    }
  }
  brain.state = "IDLE";
  brain.hold = 1500;
  return null;
}
