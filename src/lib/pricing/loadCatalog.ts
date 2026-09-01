import { supabase } from "@/lib/supabase";

export async function loadCatalog() {

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      category
    `);


  if (productsError) {
    throw productsError;
  }


  const { data: aliases, error: aliasesError } = await supabase
    .from("product_aliases")
    .select(`
      id,
      alias,
      source,
      product_id
    `);


  if (aliasesError) {
    throw aliasesError;
  }


  return {
    products: products ?? [],
    aliases: aliases ?? []
  };

}