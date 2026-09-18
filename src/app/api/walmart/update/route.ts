import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { fetchWalmartProducts } from "@/lib/pricing/walmart/fetchWalmart";
import { normalizeWalmartProduct } from "@/lib/pricing/walmart/normalizeWalmart";
import { saveWalmartProducts } from "@/lib/pricing/walmart/saveWalmartProducts";
import { autoVerifyWalmartConversions } from "@/lib/pricing/walmart/autoVerifyWalmartConversions";
import { revalidateAutomaticWalmartConversions } from "@/lib/pricing/walmart/revalidateWalmartConversions";
import { syncWalmartPrices } from "@/lib/pricing/walmart/syncWalmartPrices";
import {
  failWalmartUpdateRun,
  finishWalmartUpdateRun,
  startWalmartUpdateRun
} from "@/lib/pricing/walmart/walmartUpdateRun";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(){
  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  let updateRunId:string|null=null;

  try{
    console.log("INICIANDO ACTUALIZACIÓN WALMART");

    const updateRun=await startWalmartUpdateRun();
    updateRunId=updateRun.id;

    const {
      products:rawProducts,
      reference
    }=await fetchWalmartProducts();

    const configuredMinProducts=Number(
      process.env.WALMART_MIN_PRODUCTS??"50"
    );
    const minProducts=
      Number.isFinite(configuredMinProducts)&&configuredMinProducts>0
        ?Math.floor(configuredMinProducts)
        :50;

    const configuredCatalogRatio=Number(
      process.env.WALMART_MIN_CATALOG_RATIO??"0.5"
    );
    const minCatalogRatio=
      Number.isFinite(configuredCatalogRatio)&&
      configuredCatalogRatio>0&&
      configuredCatalogRatio<=1
        ?configuredCatalogRatio
        :0.5;

    const {count:existingCatalogCount,error:catalogCountError}=
      await supabaseAdmin
        .from("competitor_products")
        .select("id",{count:"exact",head:true})
        .eq("competitor_id",updateRun.competitorId);

    if(catalogCountError){
      throw catalogCountError;
    }

    const baselineCount=Number(existingCatalogCount??0);
    const minimumExpected=Math.max(
      minProducts,
      baselineCount>0
        ?Math.floor(baselineCount*minCatalogRatio)
        :0
    );

    if(rawProducts.length<minimumExpected){
      throw new Error(
        `Walmart devolvió solo ${rawProducts.length} productos. Se esperaban al menos ${minimumExpected} según el catálogo conocido (${baselineCount}). Se detuvo la actualización para evitar usar una respuesta parcial.`
      );
    }

    const products=rawProducts
      .map(product=>normalizeWalmartProduct(product,reference))
      .filter(product=>product.externalId&&product.name);

    if(products.length===0){
      throw new Error(
        `Walmart no devolvió productos utilizables para ${reference.label}. No se modificaron precios.`
      );
    }

    const saveResult=await saveWalmartProducts(
      products,
      reference,
      updateRun.id
    );

    if(saveResult.saved===0){
      throw new Error(
        `Walmart devolvió productos, pero no se guardó ninguno para ${reference.label}. Se detuvo la sincronización.`
      );
    }

    console.log(`WALMART GUARDADO: ${saveResult.saved} productos`);

    const revalidationResult=
      await revalidateAutomaticWalmartConversions();

    const conversionResult=
      await autoVerifyWalmartConversions();

    const priceResult=await syncWalmartPrices({
      updateRunId:updateRun.id
    });

    if(priceResult.analyzed>0&&priceResult.saved===0){
      throw new Error(
        "Walmart se descargó, pero ninguna referencia verificada pudo sincronizarse. Se detuvo la actualización para evitar generar precios sin comparación válida."
      );
    }

    await finishWalmartUpdateRun({
      id:updateRun.id,
      reference,
      counts:{
        downloaded:rawProducts.length,
        saved:saveResult.saved,
        valid:saveResult.valid,
        suspicious:saveResult.suspicious,
        presentationChanged:saveResult.presentationChanged,
        noPrice:saveResult.noPrice,
        pricesSaved:priceResult.saved
      }
    });

    console.log(
      `PRECIOS WALMART: ${priceResult.saved} productos sincronizados, ${priceResult.blocked} bloqueados por seguridad`
    );

    return NextResponse.json({
      success:true,
      updateRunId:updateRun.id,
      downloaded:rawProducts.length,
      catalogBaseline:baselineCount,
      catalogMinimum:minimumExpected,
      saved:saveResult.saved,
      reference:{
        label:reference.label,
        regionId:reference.regionId,
        sellers:reference.sellers,
        latitude:reference.latitude,
        longitude:reference.longitude
      },
      validation:{
        valid:saveResult.valid,
        suspicious:saveResult.suspicious,
        presentationChanged:saveResult.presentationChanged,
        noPrice:saveResult.noPrice
      },
      prices:{
        analyzed:priceResult.analyzed,
        products:priceResult.products,
        saved:priceResult.saved,
        skipped:priceResult.skipped,
        blocked:priceResult.blocked
      },
      conversions:{
        analyzed:conversionResult.analyzed,
        verified:conversionResult.verified,
        pending:conversionResult.pending,
        revalidated:revalidationResult.checked,
        invalidated:revalidationResult.invalidated
      },
      updatedAt:new Date().toISOString()
    });
  }catch(error){
    const message=
      error instanceof Error
        ?error.message
        :"Error actualizando Walmart";

    if(updateRunId){
      await failWalmartUpdateRun(updateRunId,message)
        .catch(runError=>{
          console.error("No se pudo registrar el fallo Walmart:",runError);
        });
    }

    console.error("ERROR ACTUALIZANDO WALMART:",error);

    return NextResponse.json(
      {error:message},
      {status:500}
    );
  }
}
