import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { fetchWalmartProducts } from "@/lib/pricing/walmart/fetchWalmart";
import { normalizeWalmartProduct } from "@/lib/pricing/walmart/normalizeWalmart";
import { saveWalmartProducts } from "@/lib/pricing/walmart/saveWalmartProducts";
import { autoVerifyWalmartConversions } from "@/lib/pricing/walmart/autoVerifyWalmartConversions";
import { syncWalmartPrices } from "@/lib/pricing/walmart/syncWalmartPrices";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(){
  const auth=await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    console.log(
      "INICIANDO ACTUALIZACIÓN WALMART"
    );

    const rawProducts=
      await fetchWalmartProducts();

    const products=
      rawProducts
        .map(normalizeWalmartProduct)
        .filter(product=>
          product.externalId&&
          product.name
        );

    const saveResult=
      await saveWalmartProducts(
        products
      );

    console.log(
      `WALMART GUARDADO: ${saveResult.saved} productos`
    );

    const conversionResult=
      await autoVerifyWalmartConversions();

      const priceResult=
        await syncWalmartPrices();

        console.log(
        `PRECIOS WALMART: ${priceResult.saved} productos sincronizados`
        );

    console.log(
      `CONVERSIONES WALMART: ${conversionResult.verified} verificadas, ${conversionResult.pending} pendientes`
    );



    return NextResponse.json({
      success:true,

      downloaded:
        rawProducts.length,

      saved:
        saveResult.saved,
        
    prices:{
        analyzed:
            priceResult.analyzed,

        products:
            priceResult.products,

        saved:
            priceResult.saved,

        skipped:
            priceResult.skipped
        },

      conversions:{
        analyzed:
          conversionResult.analyzed,

        verified:
          conversionResult.verified,

        pending:
          conversionResult.pending
      },

      updatedAt:
        new Date().toISOString()
    });

  }catch(error){

    console.error(
      "ERROR ACTUALIZANDO WALMART:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error actualizando Walmart"
      },
      {
        status:500
      }
    );
  }
}