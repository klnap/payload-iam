import type { LabelFunction } from 'payload'
import type { IamTranslationKey } from './t-iam'

/** Payload admin label/tab resolver — use instead of hardcoded strings in collection config. */
export function i18n(key: IamTranslationKey): LabelFunction {
  return ({ t }) => t(key as never)
}

/** Resolve collection `labels` / field `label` for server components (incl. `i18n()` functions). */
export function resolvePayloadLabel(label: unknown, args: Parameters<LabelFunction>[0]): string {
  if (!label) return ''
  if (typeof label === 'string') return label
  if (typeof label === 'function') return (label as LabelFunction)(args)
  if (typeof label === 'object') {
    const rec = label as Record<string, string>
    const language = args.i18n.language
    const fallback = args.i18n.fallbackLanguage
    return rec[language] ?? rec[fallback] ?? Object.values(rec)[0] ?? ''
  }
  return ''
}
