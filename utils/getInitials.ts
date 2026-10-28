/** First name initial, regardless of casing or extra spaces. */
export function getInitials(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "U";
  return Array.from(trimmed)[0].toUpperCase();
}