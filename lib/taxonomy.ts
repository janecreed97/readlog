import type { SupabaseClient } from '@supabase/supabase-js'

export type Taxonomy = Record<string, string[]>

/** Fetch the distinct categories + subcategories a user already has. */
export async function getUserTaxonomy(
  supabase: SupabaseClient,
  userId: string,
): Promise<Taxonomy> {
  const { data } = await supabase
    .from('articles')
    .select('category, subcategory')
    .eq('user_id', userId)
    .neq('category', '')

  const taxonomy: Taxonomy = {}
  for (const row of (data ?? []) as { category: string; subcategory: string }[]) {
    if (!row.category) continue
    if (!taxonomy[row.category]) taxonomy[row.category] = []
    if (row.subcategory && !taxonomy[row.category].includes(row.subcategory)) {
      taxonomy[row.category].push(row.subcategory)
    }
  }
  return taxonomy
}

/**
 * Formats the taxonomy as a prompt clause.
 * Returns an empty string if the user has no categories yet
 * (first article — let the model pick freely).
 */
export function buildCategoryPromptSection(taxonomy: Taxonomy): string {
  const entries = Object.entries(taxonomy)
  if (!entries.length) return ''

  const list = entries
    .map(([cat, subs]) => (subs.length ? `${cat} (${subs.join(', ')})` : cat))
    .join('; ')

  return `
Existing categories in this user's library (use one of these if it fits well — only create a new category or subcategory if none are a reasonable match):
${list}`
}
