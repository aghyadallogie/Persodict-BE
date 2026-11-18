/**
 * The canonical form of an email address: trimmed and lower-cased.
 *
 * Emails are stored and looked up in this form so that `Ada@Example.com` and `ada@example.com`
 * are the same account. MongoDB's unique index on `email` is case-sensitive, and Prisma's
 * `mode: 'insensitive'` is not a safe alternative there: it builds a regular expression from the
 * value without escaping it, so a `.` in an email matches any character.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
