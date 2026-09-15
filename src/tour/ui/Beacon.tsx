/**
 * `Attention beacon` — marks the control that opens an available tour.
 *
 * Decorative and `aria-hidden`: a pulsing dot is not an affordance for a
 * screen-reader or low-vision reader, so the offer it stands for also exists as
 * real text in the help menu. Under reduced motion `--beacon-period` is 0 and
 * the halo simply never runs.
 */
export function Beacon({ show }: { show: boolean }) {
  if (!show) return null;
  return <span aria-hidden className="tour-beacon" />;
}
