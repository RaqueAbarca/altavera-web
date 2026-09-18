import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateWalmartConversion } from "./calculateWalmartConversion";

type MatchRow={
  id:number;
  competitor_product_id:number;
  product_id:number;
  competitor_products:{
    name:string;
    measurement_unit:string|null;
    quantity_text:string|null;
    validation_status:string|null;
    current_price:number|null;
  }|null;
  products:{
    unit:string|null;
  }|null;
};

export async function autoVerifyWalmartConversions(){
  const {data,error}=
    await supabaseAdmin
      .from("competitor_product_matches")
      .select(`
        id,
        competitor_product_id,
        product_id,
        competitor_products(
          name,
          measurement_unit,
          quantity_text,
          validation_status,
          current_price
        ),
        products(
          unit
        )
      `)
      .eq("action","use")
      .eq("verified",false);

  if(error){
    throw error;
  }

  const matches=
    (data??[]) as unknown as MatchRow[];

  let verified=0;
  let pending=0;

  for(const match of matches){
    const walmart=match.competitor_products;
    const altavera=match.products;

    if(!walmart||!altavera){
      pending++;
      continue;
    }

    const result=calculateWalmartConversion({
      walmartName:walmart.name,
      measurementUnit:walmart.measurement_unit,
      quantityText:walmart.quantity_text,
      altaveraUnit:altavera.unit
    });

    if(!result){
      pending++;
      continue;
    }

    const now=new Date().toISOString();

    const {error:updateError}=
      await supabaseAdmin
        .from("competitor_product_matches")
        .update({
          conversion_factor:result.factor,
          verified:true,
          confidence:"exact",
          notes:`Conversión automática exacta. ${result.reason}`,
          updated_at:now
        })
        .eq("id",match.id);

    if(updateError){
      throw updateError;
    }

    /*
     * Si Walmart cambió la presentación pero la nueva equivalencia se
     * pudo demostrar exactamente, la observación vuelve a ser apta.
     */
    if(walmart.validation_status==="presentation_changed"){
      const {error:productError}=await supabaseAdmin
        .from("competitor_products")
        .update({
          validation_status:"valid",
          validation_warning:null,
          last_valid_current_price:walmart.current_price,
          validation_reviewed_at:now,
          updated_at:now
        })
        .eq("id",match.competitor_product_id);

      if(productError){
        throw productError;
      }
    }

    verified++;
  }

  return{
    analyzed:matches.length,
    verified,
    pending
  };
}
