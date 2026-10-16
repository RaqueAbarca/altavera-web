import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), source: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth/requireAdmin", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock("@/lib/money/server", () => ({ getMoneySource: mocks.source }));
import { GET, POST } from "../../app/api/admin/money/route";
import { newDocument, type MoneyRecord } from "./model";
const source = { fingerprint: "current", revenue: 30000, shipping: 1500, count: 1, products: [] };
function request(record: MoneyRecord, action = "save") {
  return new Request("http://localhost/api/admin/money", { method: "POST", headers: { origin: "http://localhost" }, body: JSON.stringify({ record, action }) });
}
function setup(previous: MoneyRecord | null = null) {
  mocks.from.mockImplementation((table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: previous, error: null }), single: async () => ({ data: table === "delivery_cycles" ? { delivery_date: "2026-10-17" } : null, error: null }) }) }) }));
}
describe("API Dinero", () => {
  let record: MoneyRecord;
  beforeEach(() => {
    vi.clearAllMocks(); mocks.auth.mockResolvedValue({ ok: true, user: { id: "admin" } }); mocks.source.mockResolvedValue(source); mocks.rpc.mockResolvedValue({ data: {}, error: null }); setup();
    record = { key: "delivery:11111111-1111-1111-1111-111111111111", kind: "delivery", date: "2026-10-17", revision: 0, closed: false, payload: { ...newDocument(), source } };
  });
  it("rechaza lectura y escritura sin sesión administrativa", async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response("No", { status: 403 }) });
    expect((await GET(new Request("http://localhost/api/admin/money"))).status).toBe(403);
    expect((await POST(request(record))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rechaza escritura desde otro origen", async () => {
    expect((await POST(new Request("http://localhost/api/admin/money", { method: "POST", headers: { origin: "https://other.example" }, body: "{}" }))).status).toBe(403);
  });
  it("no sobreescribe una revisión más nueva", async () => {
    setup({ ...record, revision: 2 });
    expect((await POST(request(record))).status).toBe(409); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("un cierre debe reabrirse explícitamente", async () => {
    setup({ ...record, revision: 0, closed: true });
    expect((await POST(request(record))).status).toBe(409);
  });
  it("rechaza pedidos cambiados y no confía en ingresos enviados por el navegador", async () => {
    record.payload.source = { ...source, fingerprint: "old" };
    expect((await POST(request(record))).status).toBe(409);
    record.payload.source = { ...source, revenue: 999999 };
    expect((await POST(request(record))).status).toBe(200);
    expect(mocks.rpc.mock.calls[0][1].p_payload.source.revenue).toBe(30000);
  });
  it("permite borradores y bloquea cierre sin revisión", async () => {
    expect((await POST(request(record, "close"))).status).toBe(400);
    expect((await POST(request(record, "save"))).status).toBe(200);
    record.payload.reviewed = true;
    expect((await POST(request(record, "close"))).status).toBe(200);
  });
});
