import { lazy, Suspense, useEffect, useState } from "react";
import { useMotionStore } from "@/lib/a11y/motion";

const SubjectWorld = lazy(() => import("./SubjectWorld").then((module) => ({ default: module.SubjectWorld })));

interface ImmersiveLessonWorldProps {
  subject?: string | null | undefined;
  title: string;
  sectionHeading?: string | undefined;
}

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
      <div className="mb-5 grid h-[19rem] place-items-center border-4 border-secondary bg-sidebar text-sidebar-foreground sm:h-[24rem]">
        <p className="font-display text-xs text-accent">Opening subject world…</p>
      </div>
    );
  }

  if (!webgl) {
    return (
      <div className="mb-5 grid h-[19rem] place-items-center border-4 border-secondary bg-sidebar px-6 text-center text-sidebar-foreground sm:h-[24rem]">
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
        <div className="mb-5 grid h-[19rem] place-items-center border-4 border-secondary bg-sidebar text-sidebar-foreground sm:h-[24rem]">
          <p className="font-display text-xs text-accent">Building your lesson world…</p>
        </div>
      }
    >
      <SubjectWorld {...props} reducedMotion={motion !== "full"} />
    </Suspense>
  );
}
