/** Synthetic Payload user for verified service-token requests (pre-Payload auth). */
export type ServicePrincipal = {
  id: string
  collection: 'users'
  type: 'service'
  email: string
  emailVerified: boolean
  isActive: true
  canAccessAdmin: false
  createdAt: Date
  updatedAt: Date
}
