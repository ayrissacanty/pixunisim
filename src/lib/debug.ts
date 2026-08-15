import { useEffect, useState } from "react";

/** Dev tools are only for local runs or an explicit ?debug=1 opt-in. */
export function debugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug") === "1") return true;
    if (params.get("debug") === "0") return false;
  } catch {
    /* ignore */
  }
  return import.meta.env.DEV === true;
}

/** Hydration-safe accessor: always false on the server / first paint. */
export function useDebugMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(debugEnabled()), []);
  return on;
}
