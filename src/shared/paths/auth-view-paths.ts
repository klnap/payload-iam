/**
 * Admin auth view paths (avoid Payload stock `oneSegmentMeta` keys `logout` / `logout-inactivity`).
 * Configured via the IAM plugin (`admin.routes` + `components.views`). Use `/sign-out` and `/session-ended` only.
 */
export const IAM_SIGN_OUT_PATH = '/sign-out' as const
export const IAM_SESSION_ENDED_PATH = '/session-ended' as const
