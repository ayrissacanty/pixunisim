import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { speakBriefing } from "@/lib/family/tts.functions";

/**
 * Family News narration.
 *
 * Primary path: cloud TTS (Lovable AI gateway) rendered server-side to MP3 per
 * script line, so voice quality is identical in every browser. If the cloud
 * call fails (offline, no key, quota), we fall back to the browser's built-in
 * SpeechSynthesis so the briefing always has a voice.
 */

const MUTE_KEY = "unify.familyNews.muted";

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

function browserTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useBriefingSpeech(lines: string[]) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lineIndex, setLineIndex] = useState(-1);
  const [muted, setMutedState] = useState(false);
  const [supported, setSupported] = useState(true);
  const [usingCloud, setUsingCloud] = useState(true);

  const linesRef = useRef(lines);
  linesRef.current = lines;
  const cancelled = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<{ key: string; clips: string[] } | null>(null);

  const fetchClips = useServerFn(speakBriefing);

  useEffect(() => {
    setSupported(true);
    setMutedState(readMuted());
  }, []);

  const stop = useCallback(() => {
    cancelled.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (browserTtsSupported()) window.speechSynthesis.cancel();
    setSpeaking(false);
    setLoading(false);
    setLineIndex(-1);
  }, []);

  const speakWithBrowser = useCallback((queue: string[]) => {
    if (!browserTtsSupported()) {
      setSupported(false);
      setSpeaking(false);
      return;
    }
    setUsingCloud(false);
    const synth = window.speechSynthesis;
    synth.cancel();
    setSpeaking(true);
    queue.forEach((line, i) => {
      const utter = new SpeechSynthesisUtterance(line);
      utter.rate = 1;
      utter.pitch = 1.05;
      utter.onstart = () => {
        if (!cancelled.current) setLineIndex(i);
      };
      utter.onend = () => {
        if (i === queue.length - 1 && !cancelled.current) {
          setSpeaking(false);
          setLineIndex(-1);
        }
      };
      utter.onerror = () => {
        setSpeaking(false);
        setLineIndex(-1);
      };
      synth.speak(utter);
    });
  }, []);

  const playClips = useCallback(async (clips: string[]) => {
    setUsingCloud(true);
    setSpeaking(true);
    for (let i = 0; i < clips.length; i += 1) {
      if (cancelled.current) break;
      setLineIndex(i);
      const audio = new Audio(`data:audio/mpeg;base64,${clips[i]}`);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });
    }
    if (!cancelled.current) {
      setSpeaking(false);
      setLineIndex(-1);
    }
  }, []);

  const speak = useCallback(async () => {
    const queue = linesRef.current;
    if (queue.length === 0) return;
    cancelled.current = false;

    const key = queue.join("|");
    if (cacheRef.current?.key === key) {
      await playClips(cacheRef.current.clips);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchClips({ data: { lines: queue } });
      setLoading(false);
      if (cancelled.current) return;
      if (result.ok && result.clips.length > 0) {
        cacheRef.current = { key, clips: result.clips };
        await playClips(result.clips);
        return;
      }
    } catch {
      setLoading(false);
    }
    if (!cancelled.current) speakWithBrowser(queue);
  }, [fetchClips, playClips, speakWithBrowser]);

  const setMuted = useCallback(
    (next: boolean) => {
      setMutedState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      }
      if (next) stop();
    },
    [stop],
  );

  // Never leave a briefing talking after the page unmounts.
  useEffect(() => stop, [stop]);

  return { speak, stop, speaking, loading, lineIndex, muted, setMuted, supported, usingCloud };
}
