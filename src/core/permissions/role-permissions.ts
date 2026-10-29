export type RolePermissions = {
  collections?: Record<
    string,
    Partial<
      Record<
        'create' | 'read' | 'update' | 'delete' | 'publish' | 'unlock' | 'readVersions',
        boolean
      >
    > & {
      fields?: Record<string, Partial<Record<'create' | 'read' | 'update', boolean>>>
    }
  >
  globals?: Record<
    string,
    Partial<Record<'read' | 'update' | 'publish' | 'readVersions', boolean>> & {
      fields?: Record<string, Partial<Record<'create' | 'read' | 'update', boolean>>>
    }
  >
  /** Registered custom admin models — arbitrary entity ops + field matrix. */
  register?: Record<
    string,
    Partial<Record<string, boolean>> & {
      fields?: Record<string, Partial<Record<'create' | 'read' | 'update', boolean>>>
    }
  >
}
