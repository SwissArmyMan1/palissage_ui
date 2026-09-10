import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

/**
 * Brand handling per doc 08 §1.
 *
 * The vine mark is the primary symbol. Doc 08 set the header wordmark in
 * Fraunces and reserved the ornate lettering for large surfaces, on the
 * argument that it is unreadable at 32 px. Measured rather than assumed, that
 * threshold is wrong for this artwork: the twig serifs resolve as texture, and
 * the silhouette stays distinctive down to about 18 px of cap height. The
 * header now carries the real lettering, cropped out of the seal, at 22 px in
 * the tall bar and 18 px in the condensed one.
 *
 * The mark and the wordmark ship as the alpha rasters that exist today. BR-01
 * (`mark.svg`, single path, currentColor) is still outstanding; when it lands,
 * only this file changes.
 */
function markSrc(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '/img/brand/mark-on-dark.png' : '/img/brand/mark-on-light.png';
}

function wordmarkSrc(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '/img/brand/wordmark-on-dark.webp' : '/img/brand/wordmark-on-light.webp';
}

export function BrandMark({
  className,
  size = 26,
}: {
  className?: string;
  /** A number of pixels, or any CSS length — including a custom property. */
  size?: number | string;
}) {
  const { resolved } = useTheme();
  return (
    <img
      src={markSrc(resolved)}
      alt=""
      aria-hidden
      width={374}
      height={275}
      className={cn('w-auto shrink-0', className)}
      style={{ height: size }}
    />
  );
}

/**
 * The horizontal lockup: one vine span, then the ornate lettering. The link
 * home on every public page.
 *
 * `size` is the mark's height; the wordmark is set at 0.68 of it, which puts
 * the cap height just under the mark's top wire and reads as one object rather
 * than two stacked images. The seal proper is the stacked arrangement with the
 * tagline — that one is `BrandSeal`, and it does not belong in a 66 px bar at
 * any size that leaves its lettering legible.
 */
export function Logo({
  to = '/',
  className,
  height = 'var(--logo-h, 26px)',
}: {
  to?: string;
  className?: string;
  /**
   * A CSS length. The public bar sets `--logo-h` per breakpoint and per
   * condensed state, so the lockup shrinks with the bar instead of snapping,
   * and nothing about its size depends on a media query read in JavaScript —
   * which would size it wrong on the first paint and shift the header.
   */
  height?: string;
}) {
  const { resolved } = useTheme();
  return (
    <Link
      to={to}
      className={cn('site-logo inline-flex shrink-0 items-center gap-2 sm:gap-3', className)}
    >
      <BrandMark size={height} />
      <img
        src={wordmarkSrc(resolved)}
        alt="Palissage"
        width={654}
        height={110}
        decoding="async"
        className="w-auto shrink-0"
        style={{ height: `calc(${height} * 0.68)` }}
      />
    </Link>
  );
}

/**
 * The ornate lockup. A seal, not a logo: footer, passport header, the top of a
 * standalone screen. Never at a small size — the vine detail and the ornate
 * lettering are the point, and both are mud below about 200 px.
 *
 * The two rasters are one alpha mask under two tints, `--stone-100` for a dark
 * ground and `--stone-900` for a light one. WebP rather than PNG because the
 * seal now sits above the fold on the readiness screen, where 262 KB of vine
 * would be the LCP element.
 *
 * `width` is a CSS length rather than a class: `cn` is plain clsx with no
 * tailwind-merge, so a width passed through `className` would collide with the
 * default instead of replacing it.
 */
export function BrandSeal({
  className,
  width = 'min(340px, 70%)',
  priority = false,
}: {
  className?: string;
  width?: string;
  /** Set this on the one instance that is a page's largest paint. */
  priority?: boolean;
}) {
  const { resolved } = useTheme();
  return (
    <img
      src={resolved === 'dark' ? '/img/brand/lockup-on-dark.webp' : '/img/brand/lockup-on-light.webp'}
      alt="Palissage"
      width={1100}
      height={433}
      fetchPriority={priority ? 'high' : undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={{ width }}
      className={cn('h-auto', className)}
    />
  );
}

/**
 * The trellis line — three wires and a post, drawn rather than traced (BR-04).
 * A system motif: section dividers, progress rails, the footer rule.
 */
export function TrellisRule({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 12"
      preserveAspectRatio="none"
      className={cn('h-3 w-full text-edge-strong', className)}
    >
      <g stroke="currentColor" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke">
        <line x1="0" y1="2" x2="240" y2="2" />
        <line x1="0" y1="6" x2="240" y2="6" />
        <line x1="0" y1="10" x2="240" y2="10" />
        <line x1="40" y1="0" x2="40" y2="12" />
        <line x1="120" y1="0" x2="120" y2="12" />
        <line x1="200" y1="0" x2="200" y2="12" />
      </g>
    </svg>
  );
}
