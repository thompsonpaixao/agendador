import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/status
 * 
 * Rota server-side para validação do status real do Storage:
 * 1. Valida se STORAGE_PROVIDER está definido
 * 2. Se STORAGE_PROVIDER === "supabase", valida via createAdminClient() se o bucket "media" existe e está acessível
 * 3. Retorna apenas status seguro sem vazar chaves, segredos ou URLs internas
 */
export async function GET() {
  try {
    const storageProvider = process.env.STORAGE_PROVIDER;

    // 1. Validar se STORAGE_PROVIDER existe
    if (!storageProvider) {
      return NextResponse.json({ status: "not_configured" });
    }

    // 2. Validação para provedor Supabase Storage
    if (storageProvider.trim().toLowerCase() === "supabase") {
      const supabaseAdmin = createAdminClient();

      if (!supabaseAdmin) {
        return NextResponse.json({ status: "error" });
      }

      // Verifica se o bucket privado "media" existe e está acessível pelo service_role
      const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket("media");

      if (!bucketError && bucket && (bucket.id === "media" || bucket.name === "media")) {
        return NextResponse.json({
          status: "connected",
          provider: "supabase",
        });
      }

      // Verificação complementar através de listagem de buckets
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      if (!listError && buckets && buckets.some((b) => b.name === "media" || b.id === "media")) {
        return NextResponse.json({
          status: "connected",
          provider: "supabase",
        });
      }

      // Bucket inexistente ou inacessível
      return NextResponse.json({ status: "error" });
    }

    // Caso não seja "supabase" ou outro provedor não configurado
    return NextResponse.json({ status: "not_configured" });
  } catch (error) {
    console.error("[Storage Status API] Erro ao verificar status do storage:", error);
    return NextResponse.json({ status: "error" });
  }
}
