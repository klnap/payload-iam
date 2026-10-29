import {
  defineRbacModel,
  type NormalizedRbacRegisterItem,
  normalizeRbacRegisterItem,
  type RbacPermissionModel,
} from '#iam/core/rbac/register-model'
import type { IamOptions, RbacRegisterTab } from '#iam/types/config'
import type { ResolvedRbacModules } from '#iam/types/modules'
import { enabledModuleDescriptors } from './runtime/module-registry'

export type RbacRegisterTabResolved = {
  tab: string
  items: NormalizedRbacRegisterItem[]
}

function pushTab(
  map: Map<string, NormalizedRbacRegisterItem[]>,
  tab: string,
  item: NormalizedRbacRegisterItem
): void {
  const list = map.get(tab) ?? []
  list.push(item)
  map.set(tab, list)
}

/** Merge host `register`, `models`, and module contributions into Role matrix tabs. */
export function resolveRbacRegisterConfig(
  options: Pick<IamOptions, 'register' | 'models' | 'registerExtensions'>,
  modules: ResolvedRbacModules
): RbacRegisterTabResolved[] {
  const byTab = new Map<string, NormalizedRbacRegisterItem[]>()
  const seenIds = new Set<string>()

  const addItem = (tab: string, raw: RbacPermissionModel) => {
    const normalized = normalizeRbacRegisterItem(raw, tab)
    if (seenIds.has(normalized.id)) {
      throw new Error(`rbac: duplicate register model id "${normalized.id}"`)
    }
    seenIds.add(normalized.id)
    pushTab(byTab, tab, normalized)
  }

  for (const tab of options.register ?? []) {
    if (!tab?.tab?.trim()) {
      throw new Error('rbac: register[].tab required')
    }
    if (!Array.isArray(tab.items) || tab.items.length === 0) {
      throw new Error(`rbac: register tab "${tab.tab}" needs items`)
    }
    for (const item of tab.items) {
      addItem(tab.tab, item)
    }
  }

  for (const model of options.models ?? []) {
    const defined = defineRbacModel(model)
    const tab = defined.tab?.trim() || 'Custom'
    addItem(tab, defined)
  }

  const ctx = { register: options.register }
  for (const descriptor of enabledModuleDescriptors(modules)) {
    const tabs = descriptor.contributeRegister?.(ctx) ?? []
    for (const tab of tabs) {
      if (!tab?.tab?.trim()) continue
      for (const item of tab.items ?? []) {
        addItem(tab.tab, item)
      }
    }
  }

  for (const extend of options.registerExtensions ?? []) {
    const tabs = extend()
    if (!Array.isArray(tabs)) {
      throw new Error('rbac: registerExtensions entries must return RbacRegisterTab[]')
    }
    for (const tab of tabs) {
      if (!tab?.tab?.trim()) {
        throw new Error('rbac: registerExtensions tab label required')
      }
      for (const item of tab.items ?? []) {
        addItem(tab.tab, item)
      }
    }
  }

  return [...byTab.entries()].map(([tab, items]) => ({ tab, items }))
}

/** Legacy shape for admin custom + docs (normalized items). */
export function toRbacRegisterTabs(resolved: RbacRegisterTabResolved[]): RbacRegisterTab[] {
  return resolved.map((t) => ({
    tab: t.tab,
    items: t.items.map((i) => ({
      id: i.id,
      label: i.label,
      path: i.path,
      ops: i.ops,
      fieldOps: i.fieldOps,
      fields: i.fields.map((f) => ({
        path: f.path,
        label: f.label,
        allowUpdate: f.allowUpdate,
        ops: f.ops,
      })),
    })),
  }))
}
