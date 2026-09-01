import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { saveCenadaPrice } from "./saveCenadaPrice";

import type {
  CenadaBulletinType,
  CenadaRow
} from "./types";

type PendingProduct={
  id:number;
  productName:string;
  unit:string;
  minimumPrice:number;
  maximumPrice:number;
  modePrice:number;
  averagePrice:number;
  bulletinDate:string;
  bulletinNumber:string;
  page:number;
  row:number;
};

function isCenadaBulletinType(
  value:string
):value is CenadaBulletinType{
  return(
    value==="plaza"||
    value==="fruta_importada"||
    value==="aromaticos_gourmet"
  );
}

export async function assignPendingProduct(
  item:PendingProduct,
  productId:number
){
  /*
   * A partir del sistema de ciclos,
   * bulletinNumber debe contener uno
   * de los tres tipos reales.
   */
  if(
    !isCenadaBulletinType(
      item.bulletinNumber
    )
  ){
    throw new Error(
      `Tipo de boletín CENADA no válido: ${item.bulletinNumber}`
    );
  }

  /*
   * 1. Crear alias si no existe.
   */
  const {
    data:existingAlias,
    error:aliasError
  }=await supabase
    .from("product_aliases")
    .select("id")
    .eq(
      "product_id",
      productId
    )
    .eq(
      "alias",
      item.productName
    )
    .maybeSingle();

  if(aliasError){
    throw aliasError;
  }

  if(!existingAlias){
    const {error}=await supabase
      .from("product_aliases")
      .insert({
        product_id:productId,
        alias:item.productName,
        source:"cenada"
      });

    if(error){
      throw error;
    }
  }

  /*
   * 2. Construir una fila CENADA válida.
   *
   * bulletinDate y plazaDate ahora son
   * strings ISO YYYY-MM-DD.
   */
  const row:CenadaRow={
    source:"cenada",

    bulletinType:
      item.bulletinNumber,

    bulletinDate:
      item.bulletinDate,

    plazaDate:
      item.bulletinDate,

    productName:
      item.productName,

    unit:
      item.unit,

    minimumPrice:
      item.minimumPrice,

    maximumPrice:
      item.maximumPrice,

    modePrice:
      item.modePrice,

    averagePrice:
      item.averagePrice,

    page:
      item.page,

    row:
      item.row
  };

  /*
   * 3. Guardar el precio.
   */
  await saveCenadaPrice(
    productId,
    row
  );

  /*
   * 4. Marcar el pendiente como asignado.
   */
  const {
    error:updateError
  }=await supabase
    .from("cenada_pending_matches")
    .update({
      status:"matched"
    })
    .eq(
      "id",
      item.id
    );

  if(updateError){
    throw updateError;
  }

  return true;
}