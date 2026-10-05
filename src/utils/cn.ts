/** Tiny classnames joiner — avoids pulling in `clsx` for a 3-line helper. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
