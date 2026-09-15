import type { SandboxEventName } from '@/sandbox/events';
import type { RoleKey } from '@/chain/roles';
import type { TargetId } from './targets';

/**
 * A tour is data. The engine knows how to point at a thing and how to notice
 * that something happened; it knows nothing about wine.
 */

export type TourMode = 'sim' | 'live';

export type TourId = 'entry' | 'winery' | 'shop' | 'admin' | 'collector';

export type Placement =
  | 'bottom-start'
  | 'bottom-end'
  | 'bottom'
  | 'top-start'
  | 'top-end'
  | 'top'
  | 'right'
  | 'left'
  | 'center';

/**
 * What ends a step.
 *
 * `click` and `route` are cheap but they lie: a button can be pressed and the
 * write can fail. `event` is the honest one — it waits for the record to exist.
 */
export type AdvanceRule =
  | { kind: 'next' }
  | { kind: 'click' }
  | { kind: 'route'; path: string; exact?: boolean }
  | { kind: 'event'; event: SandboxEventName }
  | { kind: 'predicate'; check: () => boolean; pollMs?: number };

export interface TourStep {
  id: string;
  /** Symbolic anchor, or `center` for a step with nothing to point at. */
  anchor: TargetId | 'center';
  /**
   * How this step differs on a phone.
   *
   * Not only which element to point at. Some steps describe something the
   * product deliberately does not offer on a small screen — verifying a lot is
   * kept to a larger one on purpose — and a tour that told the reader to press
   * a control that is not there would be teaching a lie. Those steps carry
   * their own body and their own way of ending here.
   */
  mobile?: {
    anchor?: TargetId;
    body?: string;
    advance?: AdvanceRule;
  };
  title: string;
  body: string;
  placement?: Placement;
  /** The engine navigates here on entering the step, if not already there. */
  route?: string;
  /**
   * How `route` is matched against the location.
   *
   * `prefix` (the default) treats `/app/admin/lots/4` as still being on
   * `/app/admin/lots` — a row opened on the same screen. `exact` is for a route
   * whose children are *different* screens rather than detail views of it:
   * `/app/winery/lots/new` is the create wizard, not the lots table, and a step
   * about the table must move the reader off it.
   */
  routeMatch?: 'exact' | 'prefix';
  /**
   * Where the step lives when that is **not** somewhere the tour can navigate.
   *
   * `/app/shop/reserve/:offerId` belongs to one offer, so there is no path the
   * engine could send a reader to — but the step still has to know that being
   * there is not "walking away". With only `route` to work from, the step
   * inherited the previous screen and navigated the reader off the very page it
   * was describing, one step after they opened it.
   *
   * Prefix-matched, and never navigated to.
   */
  routeScope?: string;
  /** Steps that only make sense in one mode. Omitted means both. */
  modes?: TourMode[];
  /**
   * `element` and `region` dim the page and block everything outside the ring.
   * `passive` dims and rings but blocks nothing — the mode for a step that asks
   * the reader to fill in a form, where blocking the fields would make the
   * instruction impossible to follow. `none` dims nothing and just talks.
   */
  spotlight?: 'element' | 'region' | 'passive' | 'none';
  advance: AdvanceRule;
  /**
   * What the card says while the step waits.
   *
   * The default is read from the rule, because the two kinds of waiting are not
   * the same thing. A `click` or `route` step waits for the reader and says so.
   * An `event` or `predicate` step waits for the *world* — a write to land, an
   * operator to look at a lot — and telling the reader to press the highlighted
   * control there is a plain lie: there is nothing to press, and the ring is
   * around a region rather than a button. Override it to name what is awaited.
   */
  waitLabel?: string;
  /**
   * How long this step may wait before it offers a way past itself.
   *
   * The default suits a step whose condition is seconds away. A step that
   * brackets real work — four wizard panes, a signature, a confirmation — needs
   * longer, or the escape hatch appears while the reader is still working and
   * skipping it strands the steps that depend on what they were doing.
   */
  stallAfterMs?: number;
  /** Side effects needed before the anchor can exist — opening a drawer, say. */
  onEnter?: () => void;
}

export interface TourCompletion {
  title: string;
  /** Three at most. What the reader now knows, in their words, not ours. */
  learned: string[];
  next: { label: string; to: string };
}

export interface TourDefinition {
  id: TourId;
  /** The cabinet this tour runs in, or null for the entry tour. */
  role: RoleKey | null;
  title: string;
  summary: string;
  stepsLabel: string;
  modes: TourMode[];
  steps: TourStep[];
  completion: TourCompletion;
}

export type TourStatus = 'idle' | 'running' | 'paused' | 'completed' | 'abandoned';

export interface TourState {
  status: TourStatus;
  tourId: TourId | null;
  stepIndex: number;
  /** Steps visible in this mode. Held in state so the reducer stays pure. */
  stepCount: number;
  /**
   * The furthest step this run has reached. A step behind it has been completed
   * once already, which is how the interface knows a revisited act step may
   * never be able to satisfy itself again.
   */
  furthest: number;
  mode: TourMode;
  startedAt: number | null;
}

export type TourAction =
  | { type: 'start'; tourId: TourId; mode: TourMode; stepCount: number; stepIndex?: number }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; index: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'complete' }
  | { type: 'exit' };

/** Steps are filtered by mode before the reducer ever sees an index. */
export function visibleSteps(definition: TourDefinition, mode: TourMode): TourStep[] {
  return definition.steps.filter((step) => !step.modes || step.modes.includes(mode));
}
