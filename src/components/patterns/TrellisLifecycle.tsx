import { cn } from '@/lib/cn';
import { PRODUCTION_STAGES, PRODUCTION_STAGES_SHORT } from '@/lib/enums';

/**
 * `Trellis lifecycle` — the project's one signature moment, and a working
 * component. Doc 03 section 3 is the grammar entry; this file implements it.
 *
 *  - three wires, seven posts, one vine path grown to the current stage
 *  - `animated`: the vine's draw is bound to scroll position with
 *    `animation-timeline: view()`, entry 10% to cover 45%, linear, because the
 *    animation *is* the scroll position and easing would fight the input
 *  - `static`: renders at its final state on paint; used everywhere in /app
 *  - the DOM is an ordered list; the SVG is decorative. Under reduced motion the
 *    animated variant renders identically to the static one, so content is never
 *    gated on the animation firing
 *
 * Geometry notes, both learned from getting them wrong first:
 *
 *  - the dash length is measured from the curve itself at module load, by
 *    sampling the Bézier chain. `pathLength` normalisation behaved differently
 *    between the two orientations, and a signature moment cannot depend on that.
 *  - both viewBoxes are 1:1 with their rendered box in the axis that carries the
 *    stages, so the wave keeps its shape instead of being squashed.
 *
 * The component takes a stage index straight from `LotView.production` and maps
 * it through the stage table — never a pre-computed percentage.
 */

const STAGE_COUNT = PRODUCTION_STAGES.length; // 7
const LAST = STAGE_COUNT - 1;

/** Horizontal: a 1200-unit track, stretched to the container width. */
const H = { width: 1200, height: 44, wires: [10, 20, 30], postTop: 6, postBottom: 34 };
/** Vertical: one 44 px row per stage, rendered 1:1 so nothing is squashed. */
const V = { width: 44, row: 44, wires: [12, 22, 32], postLeft: 8, postRight: 36 };
const V_HEIGHT = V.row * STAGE_COUNT;

/** Stage centres line up with the label cells: one cell per stage, centred. */
function postX(index: number): number {
  return (H.width / STAGE_COUNT) * (index + 0.5);
}
function postY(index: number): number {
  return V.row * (index + 0.5);
}

interface Point {
  x: number;
  y: number;
}

/** One full wave between each pair of posts, crossing the middle wire at both. */
function buildPath(vertical: boolean): { d: string; cuts: number[] } {
  const commands: string[] = [];
  const anchors: Point[][] = [];

  const at = vertical ? postY : postX;
  const mid = vertical ? V.wires[1] : H.wires[1];
  const low = vertical ? V.wires[0] - 6 : H.wires[0] - 4;
  const high = vertical ? V.wires[2] + 6 : H.wires[2] + 4;

  const point = (along: number, across: number): Point =>
    vertical ? { x: across, y: along } : { x: along, y: across };

  const start = point(at(0), mid);
  commands.push(`M ${start.x} ${start.y}`);

  for (let i = 0; i < LAST; i += 1) {
    const from = at(i);
    const to = at(i + 1);
    const half = (from + to) / 2;

    const c1 = point(from + (half - from) * 0.55, low);
    const c2 = point(half - (half - from) * 0.55, low);
    const p1 = point(half, mid);
    const c3 = point(half + (to - half) * 0.55, high);
    const c4 = point(to - (to - half) * 0.55, high);
    const p2 = point(to, mid);

    commands.push(`C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p1.x} ${p1.y}`);
    commands.push(`C ${c3.x} ${c3.y}, ${c4.x} ${c4.y}, ${p2.x} ${p2.y}`);
    anchors.push([c1, c2, p1], [c3, c4, p2]);
  }

  // Arc length by sampling, so the dash maths needs no layout read and no
  // browser-specific pathLength behaviour.
  const cuts: number[] = [0];
  let total = 0;
  let cursor = start;
  anchors.forEach((curve, index) => {
    const [c1, c2, end] = curve;
    const steps = 24;
    let previous = cursor;
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      const u = 1 - t;
      const x =
        u * u * u * cursor.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * end.x;
      const y =
        u * u * u * cursor.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * end.y;
      total += Math.hypot(x - previous.x, y - previous.y);
      previous = { x, y };
    }
    cursor = end;
    // Every second curve completes a segment between two posts.
    if (index % 2 === 1) cuts.push(total);
  });

  return { d: commands.join(' '), cuts };
}

const H_PATH = buildPath(false);
const V_PATH = buildPath(true);

export interface TrellisLifecycleProps {
  /** LotView.production, 0–6. */
  stage: number;
  variant?: 'animated' | 'static';
  /** Dates under completed stages, optional per the grammar entry. */
  dates?: Partial<Record<number, string>>;
  className?: string;
  /** Accessible name for the list. */
  label?: string;
}

export function TrellisLifecycle({
  stage,
  variant = 'static',
  dates,
  className,
  label = 'Production stage',
}: TrellisLifecycleProps) {
  const current = Math.min(Math.max(stage, 0), LAST);

  return (
    <div className={cn('lifecycle', variant === 'animated' && 'vine-animated', className)}>
      {/* ---- Horizontal presentation --------------------------------------- */}
      <div
        className="lifecycle-h"
        style={vineVars(H_PATH, current)}
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${H.width} ${H.height}`}
          preserveAspectRatio="none"
          className="block h-11 w-full"
        >
          <g stroke="var(--color-border-strong)" fill="none">
            {H.wires.map((y) => (
              <line key={y} x1="0" y1={y} x2={H.width} y2={y} vectorEffect="non-scaling-stroke" />
            ))}
            {PRODUCTION_STAGES.map((_, index) => (
              <line
                key={index}
                x1={postX(index)}
                y1={H.postTop}
                x2={postX(index)}
                y2={H.postBottom}
                vectorEffect="non-scaling-stroke"
                strokeWidth={index <= current ? 1.5 : 1}
              />
            ))}
          </g>

          {/* No `non-scaling-stroke` on the vine: it moves the dash pattern into
              screen space, and the dash is what decides where the vine stops.
              The wires keep it, because a hairline has no dash to get wrong. */}
          <path
            className="vine-path"
            d={H_PATH.d}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* The boundary is marked by the post and the marker, never by colour
              alone. */}
          <circle
            className="vine-marker"
            cx={postX(current)}
            cy={H.wires[1]}
            r="4.5"
            fill="var(--color-accent)"
          />
        </svg>

        <ol
          className="mt-3 grid list-none gap-1 p-0"
          style={{ gridTemplateColumns: `repeat(${STAGE_COUNT}, minmax(0, 1fr))` }}
          aria-label={label}
        >
          {PRODUCTION_STAGES.map((name, index) => (
            <li
              key={name}
              aria-current={index === current ? 'step' : undefined}
              className={cn(
                'min-w-0 text-center text-body-sm',
                index < current && 'text-ink',
                index === current && 'font-semibold text-ink',
                index > current && 'text-ink-secondary',
              )}
            >
              <span className="block">{name}</span>
              <span className="sr-only">
                {index < current ? ' — complete' : index === current ? ' — current stage' : ' — upcoming'}
              </span>
              {dates?.[index] ? (
                <span className="block truncate text-caption text-ink-secondary">{dates[index]}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {/* ---- Vertical presentation, below 520 px of container -------------- */}
      <div className="lifecycle-v" style={vineVars(V_PATH, current)}>
        <div className="flex gap-4">
          <svg
            aria-hidden
            viewBox={`0 0 ${V.width} ${V_HEIGHT}`}
            width={V.width}
            height={V_HEIGHT}
            className="block shrink-0"
          >
            <g stroke="var(--color-border-strong)" fill="none">
              {V.wires.map((x) => (
                <line key={x} x1={x} y1="0" x2={x} y2={V_HEIGHT} vectorEffect="non-scaling-stroke" />
              ))}
              {PRODUCTION_STAGES.map((_, index) => (
                <line
                  key={index}
                  x1={V.postLeft}
                  y1={postY(index)}
                  x2={V.postRight}
                  y2={postY(index)}
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={index <= current ? 1.5 : 1}
                />
              ))}
            </g>
            <path
              className="vine-path"
              d={V_PATH.d}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              className="vine-marker"
              cx={V.wires[1]}
              cy={postY(current)}
              r="4.5"
              fill="var(--color-accent)"
            />
          </svg>

          <ol
            className="grid min-w-0 flex-1 list-none p-0"
            style={{ gridTemplateRows: `repeat(${STAGE_COUNT}, ${V.row}px)` }}
            aria-label={label}
          >
            {PRODUCTION_STAGES.map((name, index) => (
              <li
                key={name}
                aria-current={index === current ? 'step' : undefined}
                className={cn(
                  'flex items-center text-body-sm',
                  index < current && 'text-ink',
                  index === current && 'font-semibold text-ink',
                  index > current && 'text-ink-secondary',
                )}
              >
                <span aria-hidden>{PRODUCTION_STAGES_SHORT[index]}</span>
                {/* The full label always stays in the accessible name. */}
                <span className="sr-only">
                  {name}
                  {index < current ? ' — complete' : index === current ? ' — current stage' : ' — upcoming'}
                </span>
                {dates?.[index] ? (
                  <span className="ml-2 text-caption text-ink-secondary">{dates[index]}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** Dash length and the offset that stops the vine at the current post. */
function vineVars(path: { cuts: number[] }, current: number): React.CSSProperties {
  const total = path.cuts[path.cuts.length - 1];
  // Stage 0 still shows a short nub, so the trellis never reads as empty.
  const grown = current === 0 ? total * 0.02 : path.cuts[current];
  return {
    ['--vine-len' as string]: String(total),
    ['--vine-draw-to' as string]: String(total - grown),
  } as React.CSSProperties;
}
