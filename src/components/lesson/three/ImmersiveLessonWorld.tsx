import { lazy, Suspense, useEffect, useState } from "react";
import { useMotionStore } from "@/lib/a11y/motion";
import type { SubjectWorldProps } from "./SubjectWorld";

const SubjectWorld = lazy(() => import("./SubjectWorld").then((module) => ({ default: module.SubjectWorld })));

type ImmersiveLessonWorldProps = Omit<SubjectWorldProps, "reducedMotion">;

const BOX = "mb-5 grid h-[20rem] place-items-center border-4 border-secondary bg-sidebar text-sidebar-foreground sm:h-[26rem]";

export function ImmersiveLessonWorld(props: ImmersiveLessonWorldProps) {
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const motion = useMotionStore((state) => state.setting);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={BOX}>
        <p className="font-display text-sm text-accent">Opening subject world…</p>
      </div>
    );
  }

  if (!webgl) {
    return (
      <div className={`${BOX} px-6 text-center`}>
        <div>
          <p className="font-display text-sm text-accent">Subject world unavailable</p>
          <p className="mt-2 text-sm text-sidebar-foreground/75">The lesson text and knowledge check remain ready below.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className={BOX}>
          <p className="font-display text-sm text-accent">Building your lesson world…</p>
        </div>
      }
    >
      <SubjectWorld {...props} reducedMotion={motion !== "full"} />
    </Suspense>
  );
}
