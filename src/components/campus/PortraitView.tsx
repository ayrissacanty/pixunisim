import { portraitUrls, type Portrait } from "@/lib/portrait";
import { cn } from "@/lib/utils";

/**
 * Layered paper-doll portrait. Layers stack in skin → clothes → eyes → hair
 * order, so a selection change only swaps one image.
 */
export function PortraitView({
  portrait,
  className,
  alt = "Student portrait",
}: {
  portrait: Portrait;
  className?: string;
  alt?: string;
}) {
  const urls = portraitUrls(portrait);
  return (
    <div
      data-testid="portrait"
      className={cn("relative aspect-[47/103] w-full overflow-hidden", className)}
      role="img"
      aria-label={alt}
    >
      {urls.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 size-full object-contain"
          style={{ zIndex: i }}
        />
      ))}
    </div>
  );
}
