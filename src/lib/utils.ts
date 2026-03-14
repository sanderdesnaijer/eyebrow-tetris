/**
 * Formats a date string into a human-readable form.
 * Defaults to short month format (e.g. "Jan 1, 2025").
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  return new Date(dateString).toLocaleDateString("en-US", options);
}
