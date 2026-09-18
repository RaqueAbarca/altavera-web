import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateWalmartConversion } from "./calculateWalmartConversion";

type MatchRow={
  id:number;
  conversion_factor:number|null;
  verified:boolean;
  notes:string|null;
  competitor_products:{
    name:string;
    measurement_unit:string|null;
    quantity_text:string|null;
  }|null;
  products:{
    unit:string|null;
  }|null;
};

export async function revalidateAutomaticWalmartConversions(){
  const {data,error}=await supabaseAdmin
    .from("competitor_product_matches")
    .select(`
      id,
      conversion_factor,
      verified,
      notes,
      competitor_products(
        name,
        measurement_unit,
        quantity_text
      ),
      products(unit)
    `)
    .eq("action","use")
    .eq("verified",true);

  if(error){
    throw error;
  }

  const matches=(data??[]) as unknown as MatchRow[];
  let checked=0;
  let invalidated=0;

  for(const match of matches){
    /*
     * Solo tocamos conversiones que el sistema marcó automáticamente.
     * Las verificaciones manuales pertenecen al criterio del administrador.
     */
    if(!match.notes?.startsWith("Conversión automática exacta.")){
      continue;
    }

    checked++;

    const walmart=match.competitor_products;
    const altavera=match.products;

    if(!walmart||!altavera){
      continue;
    }

    const recalculated=calculateWalmartConversion({
      walmartName:walmart.name,
      measurementUnit:walmart.measurement_unit,
      quantityText:walmart.quantity_text,
      altaveraUnit:altavera.unit
    });

    const previousFactor=Number(match.conversion_factor);
    const sameFactor=
      recalculated!==null&&
      Number.isFinite(previousFactor)&&
      Math.abs(recalculated.factor-previousFactor)<0.000001;

    if(sameFactor){
      continue;
    }

    const {error:updateError}=await supabaseAdmin
      .from("competitor_product_matches")
      .update({
        conversion_factor:null,
        verified:false,
        confidence:null,
        notes:"La conversión automática anterior dejó de ser demostrable con la presentación actual de Walmart. Requiere revisión manual.",
        updated_at:new Date().toISOString()
      })
      .eq("id",match.id);

    if(updateError){
      throw updateError;
    }

    invalidated++;
  }

  return{
    checked,
    invalidated
  };
}
