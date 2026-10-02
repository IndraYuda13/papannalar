/** Preserve all characters, preferring word boundaries; fits measures the real font. */
export function paginateDisplayText(
  text: string,
  fits: (candidate: string) => boolean,
): string[] {
  if (!text) return [""];
  const pages: string[] = [];
  let remaining = Array.from(text);
  while (remaining.length) {
    if (fits(remaining.join(""))) {
      pages.push(remaining.join(""));
      break;
    }
    let low = 1,
      high = remaining.length,
      count = 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (fits(remaining.slice(0, middle).join(""))) {
        count = middle;
        low = middle + 1;
      } else high = middle - 1;
    }
    // Oversized words still progress without splitting a Unicode code point.
    for (let boundary = count; boundary > count / 2; boundary--) {
      if (/\s/u.test(remaining[boundary - 1])) {
        count = boundary;
        break;
      }
    }
    pages.push(remaining.slice(0, count).join(""));
    remaining = remaining.slice(count);
  }
  return pages;
}
