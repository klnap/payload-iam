import type { Field } from 'payload'

/** Recurse tabs/groups — lock Columns/Filters to allowlist. */
export function lockListColumns(fields: Field[], allow: Set<string>): Field[] {
  return fields.map((f) => {
    if ('tabs' in f && Array.isArray(f.tabs)) {
      return {
        ...f,
        tabs: f.tabs.map((tab) => ({
          ...tab,
          fields: lockListColumns(tab.fields ?? [], allow),
        })),
      } as Field
    }
    if ('fields' in f && Array.isArray(f.fields) && !('name' in f && f.name)) {
      return {
        ...f,
        fields: lockListColumns(f.fields, allow),
      } as Field
    }
    if ('fields' in f && Array.isArray(f.fields) && 'name' in f && f.name) {
      const nested = lockListColumns(f.fields, allow)
      if (allow.has(f.name)) return { ...f, fields: nested } as Field
      return {
        ...f,
        fields: nested,
        admin: {
          ...('admin' in f && f.admin && typeof f.admin === 'object' ? f.admin : {}),
          disableListColumn: true,
          disableListFilter: true,
        },
      } as Field
    }
    if (!('name' in f) || typeof f.name !== 'string') return f
    if (allow.has(f.name)) return f
    return {
      ...f,
      admin: {
        ...('admin' in f && f.admin && typeof f.admin === 'object' ? f.admin : {}),
        disableListColumn: true,
        disableListFilter: true,
      },
    } as Field
  })
}

/** Declare timestamps so sanitize skips defaults — picker can lock createdAt/deletedAt. */
export function withOwnedTimestamps(fields: Field[], opts?: { trash?: boolean }): Field[] {
  const has = (name: string) => fields.some((f) => 'name' in f && f.name === name)
  const next = [...fields]
  if (!has('updatedAt')) {
    next.push({
      name: 'updatedAt',
      type: 'date',
      index: true,
      admin: { disableBulkEdit: true, hidden: true },
    })
  }
  if (!has('createdAt')) {
    next.push({
      name: 'createdAt',
      type: 'date',
      index: true,
      admin: { disableBulkEdit: true, hidden: true },
    })
  }
  if (opts?.trash && !has('deletedAt')) {
    next.push({
      name: 'deletedAt',
      type: 'date',
      index: true,
      admin: { disableBulkEdit: true, hidden: true },
    })
  }
  return next
}
