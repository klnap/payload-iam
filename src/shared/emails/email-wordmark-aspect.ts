/** Stolbek wordmark SVG viewBox width / height (824×173). */
export const EMAIL_WORDMARK_ASPECT = 824 / 173

export const DEFAULT_EMAIL_WORDMARK_WIDTH = 240

export function emailWordmarkHeight(width: number): number {
  return Math.round(width / EMAIL_WORDMARK_ASPECT)
}
