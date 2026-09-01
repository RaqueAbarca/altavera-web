import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export const runtime="nodejs";

export async function POST(request:Request){

  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{

    const body=await request.json();
    const pendingId=Number(body.pendingId);

    if(
      !Number.isInteger(pendingId)||
      pendingId<=0
    ){
      return NextResponse.json(
        {
          error:"ID de producto pendiente inválido"
        },
        {
          status:400
        }
      );
    }

    /*
     * No confiamos en que el navegador nos mande
     * correctamente el nombre.
     *
     * Lo recuperamos directamente de Supabase
     * usando únicamente el ID.
     */
    const {
      data:pending,
      error:pendingError
    }=await supabaseAdmin
      .from("cenada_pending_matches")
      .select(`
        id,
        product_name,
        status
      `)
      .eq("id",pendingId)
      .maybeSingle();

    if(pendingError){
      throw pendingError;
    }

    if(!pending){
      return NextResponse.json(
        {
          error:"El producto pendiente no existe"
        },
        {
          status:404
        }
      );
    }

    const cenadaName=
      pending.product_name.trim();

    const normalizedName=
      cenadaName.toLowerCase();

    /*
     * Buscar si ya existe una decisión para
     * este nombre CENADA.
     */
    const {
      data:existingMapping,
      error:mappingSearchError
    }=await supabaseAdmin
      .from("cenada_product_mappings")
      .select(`
        id,
        action
      `)
      .eq(
        "normalized_name",
        normalizedName
      )
      .maybeSingle();

    if(mappingSearchError){
      throw mappingSearchError;
    }

    /*
     * Si ya existía un mapping, lo convertimos
     * explícitamente en "ignore".
     */
    if(existingMapping){

      const {error:updateMappingError}=
        await supabaseAdmin
          .from("cenada_product_mappings")
          .update({
            product_id:null,
            action:"ignore",
            priority:1,
            notes:"Ignorado manualmente desde panel CENADA",
            updated_at:new Date().toISOString()
          })
          .eq(
            "id",
            existingMapping.id
          );

      if(updateMappingError){
        throw updateMappingError;
      }

    }else{

      const {error:insertMappingError}=
        await supabaseAdmin
          .from("cenada_product_mappings")
          .insert({
            cenada_name:cenadaName,
            product_id:null,
            action:"ignore",
            priority:1,
            notes:"Ignorado manualmente desde panel CENADA"
          });

      if(insertMappingError){
        throw insertMappingError;
      }
    }

    /*
     * Marcar como ignoradas TODAS las filas
     * pendientes con exactamente el mismo
     * nombre CENADA.
     *
     * Esto evita que tengas que ignorar
     * el mismo producto varias veces si
     * apareció en más de una importación.
     */
    const {error:updatePendingError}=
      await supabaseAdmin
        .from("cenada_pending_matches")
        .update({
          status:"ignored"
        })
        .eq(
          "product_name",
          pending.product_name
        )
        .eq(
          "status",
          "pending"
        );

    if(updatePendingError){
      throw updatePendingError;
    }

    return NextResponse.json({
      success:true,
      cenadaName
    });

  }catch(error){

    console.error(
      "ERROR IGNORANDO PRODUCTO CENADA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error ignorando producto CENADA"
      },
      {
        status:500
      }
    );
  }
}