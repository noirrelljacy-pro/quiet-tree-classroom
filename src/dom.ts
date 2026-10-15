// Equality checks avoid repeat mutations. These reads do not measure layout.
export function setText(node: Element, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}
export function setStyle(node: HTMLElement | SVGElement, key: string, value: string): void {
  if (node.style.getPropertyValue(key) !== value) node.style.setProperty(key, value);
}
export function setAttribute(node: Element, key: string, value: string): void {
  if (node.getAttribute(key) !== value) node.setAttribute(key, value);
}
export function createVolumeView(fill: HTMLElement, number: HTMLElement, meter: HTMLElement) {
  let lastRounded: number | null | undefined;
  let lastScale = '';
  return (level: number | null) => {
    const bounded =
      level === null ? 0 : Math.min(100, Math.max(0, Number.isFinite(level) ? level : 0));
    const rounded = level === null ? null : Math.round(bounded);
    const scale = `scaleX(${(Math.round(bounded * 2) / 200).toFixed(3)})`;
    if (scale !== lastScale) {
      setStyle(fill, 'transform', scale);
      lastScale = scale;
    }
    if (rounded !== lastRounded) {
      setText(number, rounded === null ? '—' : String(rounded));
      setAttribute(meter, 'aria-valuenow', String(rounded ?? 0));
      lastRounded = rounded;
    }
  };
}
