import { consultar } from "@/lib/servidor/db";

export const dynamic = "force-dynamic";

// Para el healthcheck de Docker: responde 200 solo si la base contesta.
export async function GET() {
  try {
    await consultar("select 1");
    return Response.json({ ok: true, version: process.env.GIT_SHA ?? "local" });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
