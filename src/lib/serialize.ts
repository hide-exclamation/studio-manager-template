/**
 * Utilitaire de sérialisation pour les objets Prisma
 * Convertit les Decimal en strings et les Date en ISO strings
 */

export function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj

  // Gérer les Decimal de Prisma
  if (obj && typeof obj === 'object' && obj.constructor?.name === 'Decimal') {
    return (obj as any).toString() as T
  }

  // Gérer les Date
  if (obj instanceof Date) {
    return obj.toISOString() as T
  }

  // Gérer les tableaux
  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal) as T
  }

  // Gérer les objets simples
  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, serializeDecimal(v)])
    ) as T
  }

  return obj
}

/**
 * Sérialise un objet Prisma pour le passer à un composant client
 * Alias plus explicite pour serializeDecimal
 */
export function serializeForClient<T>(obj: T): T {
  return serializeDecimal(obj)
}
