import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser SpeechSynthesis playback for the Family News briefing.
 *
 * Zero-cost and key-free by design (v1). If voice quality ever needs to
 * improve, this hook is the single seam to swap for a cloud TTS backend —
 * the component only uses { speak, stop, speaking, lineIndex, supported }.
 */

const MUTE_KEY = "unify.familyNews.muted";

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function useBriefingSpeech(lines: string[]) {
  const [speaking, setSpeaking] = useState(false);
  const [lineIndex, setLineIndex] = useState(-1);
  const [muted, setMutedState] = useState(false);
  const [supported, setSupported] = useState(false);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const cancelled = useRef(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    setMutedState(readMuted());
  }, []);

  const stop = useCallback(() => {
    cancelled.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setLineIndex(-1);
  }, []);

  const speak = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    cancelled.current = false;
    const queue = linesRef.current;
    if (queue.length === 0) return;
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

  return { speak, stop, speaking, lineIndex, muted, setMuted, supported };
}
