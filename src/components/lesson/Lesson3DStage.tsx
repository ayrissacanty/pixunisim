import { useEffect, useRef } from "react";

/**
 * Layer 4 (3D mode) — a lightweight Three.js teaching aid, not a game
 * environment. Geometry is deliberately simple: a manipulative the student can
 * watch rotate while reading the lesson.
 */
export function Lesson3DStage({
  shape = "polyhedron",
  label,
}: {
  shape?: "polyhedron" | "cell" | "cube";
  label: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import("three");
      const host = hostRef.current;
      if (disposed || !host) return;

      const width = host.clientWidth || 480;
      const height = 220;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1d2a24);
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 1.2, 4.2);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const key = new THREE.DirectionalLight(0xffe6bd, 1.1);
      key.position.set(3, 4, 5);
      scene.add(key);

      const geometry =
        shape === "cell"
          ? new THREE.SphereGeometry(1.3, 28, 20)
          : shape === "cube"
            ? new THREE.BoxGeometry(1.8, 1.8, 1.8)
            : new THREE.IcosahedronGeometry(1.4, 0);
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: 0xc4703f, roughness: 0.55, metalness: 0.05 }),
      );
      scene.add(mesh);
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0xf1e6d0 }),
      );
      mesh.add(wire);

      let frame = 0;
      const tick = () => {
        mesh.rotation.y += 0.006;
        mesh.rotation.x = Math.sin(Date.now() / 3000) * 0.25;
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
        geometry.dispose();
        host.replaceChildren();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [shape]);

  return (
    <figure
      data-testid="lesson-3d-stage"
      className="overflow-hidden rounded-md border border-border bg-card"
    >
      <div ref={hostRef} className="h-[220px] w-full" />
      <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}
