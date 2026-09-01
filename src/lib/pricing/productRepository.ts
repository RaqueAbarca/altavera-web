import { supabase } from "@/lib/supabase"

export async function findProductByName(name: string) {

  const { data, error } = await supabase
    .from("products")
    .select("id, name, category")
    .ilike("name", name)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function findAlias(alias: string) {

  const { data, error } = await supabase
    .from("product_aliases")
    .select(`
      product_id,
      products (
        id,
        name,
        category
      )
    `)
    .eq("alias", alias)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}