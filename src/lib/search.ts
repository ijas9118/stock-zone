// Splits a free-text search query into individual words for a "contains
// every word, any order" search (e.g. "grinding turbo" matches "100mm
// Diamond Grinding Cup Wheel Turbo ULTRA CUT" even though the words aren't
// adjacent or in that order in the product name).
//
// Escapes SQL LIKE wildcards (% _ \) so a literal one of those characters in
// a search term isn't treated as a wildcard by Postgres.
export function splitSearchWords(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[\\%_]/g, "\\$&"));
}
