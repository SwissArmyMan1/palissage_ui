import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

/**
 * Brand handling per doc 08 §1.
 *
 * The vine mark is the primary symbol. The header wordmark is set in the type
 * system — Fraunces, SOFT 0 WONK 0, 600, −0.02em — never the ornate lettering,
 * which is beautiful at 400 px and unreadable at 32 px.
 *
 * The mark ships as the two alpha rasters that exist today. BR-01 (`mark.svg`,
 * single path, currentColor) is still outstanding; when it lands, only this file
 * changes.
 */
function markSrc(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? '/img/brand/mark-on-dark.png' : '/img/brand/mark-on-light.png';
}

export function BrandMark({ className, size = 26 }: { className?: string; size?: number }) {
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

/** Mark plus wordmark. The link home on every public page. */
export function Logo({
  to = '/',
  className,
  size = 26,
}: {
  to?: string;
  className?: string;
  size?: number;
}) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark size={size} />
      <span
        className="font-display font-semibold tracking-[-0.02em] text-ink"
        style={{ fontSize: size * 0.85, fontVariationSettings: "'SOFT' 0, 'WONK' 0" }}
      >
        Palissage
      </span>
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
