import { NextResponse } from "next/server";
import { saveCenadaPrice } from "@/lib/pricing/cenada/saveCenadaPrice";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function POST(request: Request) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();

    const result = await saveCenadaPrice(
      body.productId,
      body.row
    );

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error(
      "ERROR GUARDANDO CENADA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error guardando precio CENADA"
      },
      {
        status: 500
      }
    );
  }
}