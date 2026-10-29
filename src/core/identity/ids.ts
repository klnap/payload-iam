import { v7 as uuidv7 } from 'uuid'

/**
 * Shared identity + provisioning markers: UUIDv7 ONLY.
 * Never crypto.randomUUID() (v4). Never BA advanced.database.generateId: 'uuid' (v4).
 */
export function newId(): string {
  return uuidv7()
}

export function assertUuidV7(id: string): void {
  // version nibble is 7 at character index 14 (8-4-4-4-12 form)
  if (id.length !== 36 || id[14] !== '7') {
    throw new Error(`expected UUIDv7, got: ${id}`)
  }
}
