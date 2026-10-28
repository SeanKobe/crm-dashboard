export type ClassValue = string | false | null | undefined | 0

export const cn = (...parts: ClassValue[]): string => parts.filter(Boolean).join(' ')
