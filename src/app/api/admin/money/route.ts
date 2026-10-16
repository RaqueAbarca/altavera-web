import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMoneySource } from "@/lib/money/server";
import { summarize, validateDocument, validDate, type MoneyRecord, type MoneyDocument } from "@/lib/money/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "Error de conexión.";
  console.error("money-control", message);
  return reply({ error: message.includes("MONEY_CONFLICT") ? "Otra persona guardó cambios. Recargá antes de continuar." : "No se pudo acceder a Dinero. Verificá la conexión y que se haya ejecutado el SQL del módulo." }, message.includes("MONEY_CONFLICT") ? 409 : 500);
}
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const cycle = url.searchParams.get("cycle");
    if (cycle) return reply({ source: await getMoneySource(cycle) });
    const history = url.searchParams.get("history");
    if (history) {
      const { data, error } = await supabaseAdmin.from("money_record_history").select("revision,created_at,snapshot").eq("record_key", history).order("revision", { ascending: false }).limit(30);
      if (error) throw error;
      return reply({ history: data });
    }
    const records: MoneyRecord[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabaseAdmin.from("money_records").select("key,kind,date,payload,closed,revision,updated_at").order("key").range(offset, offset + 499);
      if (error) throw error;
      records.push(...(data ?? []) as MoneyRecord[]);
      if ((data?.length ?? 0) < 500) break;
    }
    const cycles: { id: string; delivery_date: string }[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabaseAdmin.from("delivery_cycles").select("id,delivery_date").order("delivery_date", { ascending: false }).order("id").range(offset, offset + 499);
      if (error) throw error;
      cycles.push(...data ?? []);
      if ((data?.length ?? 0) < 500) break;
    }
    return reply({ records, cycles });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return reply({ error: "Origen no permitido." }, 403);
  let body: { record: MoneyRecord; action: "save" | "close" | "reopen" };
  try {
    const raw = await request.text();
    if (raw.length > 1_000_000) return reply({ error: "El cierre es demasiado grande." }, 413);
    body = JSON.parse(raw);
    const r = body.record;
    if (!r || !["delivery", "month"].includes(r.kind) || !validDate(r.date) || !Number.isInteger(r.revision) || r.revision < 0 || !["save", "close", "reopen"].includes(body.action) || typeof r.key !== "string" || r.key.length > 100) throw new Error("Datos inválidos.");
    if (r.kind === "month" && (r.key !== `month:${r.date.slice(0, 7)}` || !r.date.endsWith("-01"))) throw new Error("Mes inválido.");
    if (r.kind === "delivery" && !/^delivery:[0-9a-f-]{36}$/i.test(r.key)) throw new Error("Entrega inválida.");
    validateDocument(r.payload);
  } catch (error) { return reply({ error: error instanceof Error ? error.message : "Datos inválidos." }, 400); }
  try {
    const r = body.record;
    const { data: previous, error } = await supabaseAdmin.from("money_records").select("*").eq("key", r.key).maybeSingle();
    if (error) throw error;
    if ((previous?.revision ?? 0) !== r.revision) return reply({ error: "Hay una versión más reciente. Recargá para no sobrescribirla." }, 409);
    if (previous?.closed && body.action !== "reopen") return reply({ error: "Reabrí el cierre antes de modificarlo." }, 409);
    if (body.action === "reopen" && !previous?.closed) return reply({ error: "Este registro ya está abierto." }, 409);
    const payload: MoneyDocument = body.action === "reopen" ? previous.payload : r.payload;
    if (r.kind === "delivery") {
      const id = r.key.slice(9);
      const { data: cycle, error: cycleError } = await supabaseAdmin.from("delivery_cycles").select("delivery_date").eq("id", id).single();
      if (cycleError || cycle.delivery_date !== r.date) return reply({ error: "No coincide la fecha de entrega." }, 400);
      if (body.action !== "reopen") {
        const source = await getMoneySource(id);
        if (payload.source?.fingerprint !== source.fingerprint) return reply({ error: "Los pedidos cambiaron. Recargá la entrega y revisá las compras antes de guardar." }, 409);
        payload.source = source;
        if (source.products.some(p => !payload.expenses.some(e => e.id === `product:${p.key}`))) return reply({ error: "Faltan productos de la lista. Recargá la entrega." }, 400);
      }
    } else delete payload.source;
    if (body.action === "close") {
      const summary = summarize(payload);
      if (summary.missing.length || summary.estimated) return reply({ error: "Completá los datos pendientes y reemplazá las estimaciones antes de cerrar." }, 400);
    }
    const result = await supabaseAdmin.rpc("save_money_record", { p_key: r.key, p_kind: r.kind, p_date: r.date, p_payload: payload, p_closed: body.action === "close", p_revision: r.revision, p_actor: auth.user.id });
    if (result.error) throw result.error;
    return reply({ record: result.data });
  } catch (error) { return failure(error); }
}
