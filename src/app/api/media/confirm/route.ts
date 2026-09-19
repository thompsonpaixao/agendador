import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/confirm
 * 
 * Confirma o upload realizado no Supabase Storage e persiste o registro correspondente
 * em public.media com as colunas e relacionamentos oficiais.
 * 
 * Rollback Atômico: Caso a inserção no banco falhe, remove os arquivos órfãos do Storage.
 */
export async function POST(request: Request) {
  let uploadedStoragePath: string | null = null;
  let uploadedThumbPath: string | null = null;
  let supabaseAdminClient: ReturnType<typeof createAdminClient> | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountId,
      originalName,
      storagePath,
      thumbnailStoragePath,
      sizeBytes,
      durationSeconds,
      width,
      height,
      mediaType,
    } = body;

    if (!accountId || !originalName || !storagePath) {
      return NextResponse.json(
        { success: false, message: "Campos obrigatórios ausentes (accountId, originalName, storagePath)." },
        { status: 400 }
      );
    }

    uploadedStoragePath = storagePath;
    uploadedThumbPath = thumbnailStoragePath || null;

    const supabaseAdmin = createAdminClient();
    supabaseAdminClient = supabaseAdmin;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Servidor administrativo não configurado." },
        { status: 500 }
      );
    }

    // 1. Valida se a conta pertence ao usuário
    const { data: account, error: accountError } = await supabaseAdmin
      .from("instagram_accounts")
      .select("id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, message: "Conta não autorizada para este usuário." },
        { status: 403 }
      );
    }

    // 2. Insere o registro em public.media usando as colunas REAIS do schema
    const resolvedMediaType = mediaType === "image" ? "image" : "video";
    const { data: mediaRecord, error: insertError } = await supabaseAdmin
      .from("media")
      .insert({
        user_id: user.id,
        instagram_account_id: accountId,
        original_name: originalName,
        storage_path: storagePath,
        thumbnail_url: thumbnailStoragePath || null,
        media_type: resolvedMediaType,
        size_bytes: typeof sizeBytes === "number" ? sizeBytes : 0,
        duration_seconds: durationSeconds ? Number(durationSeconds) : null,
        width: width ? Number(width) : null,
        height: height ? Number(height) : null,
        status: "ready",
        retention_status: "active",
      })
      .select("*")
      .single();

    if (insertError || !mediaRecord) {
      console.error("[Media Confirm] Erro ao inserir na tabela media:", insertError);

      // ROLLBACK: Remove arquivos órfãos do Storage
      const filesToRemove = [storagePath];
      if (thumbnailStoragePath) filesToRemove.push(thumbnailStoragePath);
      await supabaseAdmin.storage.from("media").remove(filesToRemove);

      return NextResponse.json(
        { success: false, message: `Falha ao registrar mídia no banco de dados: ${insertError?.message}` },
        { status: 500 }
      );
    }

    // 3. Gera Signed URLs para visualização segura no cliente (1 hora de validade)
    const { data: videoSigned } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrl(storagePath, 3600);

    let thumbSignedUrl = "";
    if (thumbnailStoragePath) {
      const { data: thumbSigned } = await supabaseAdmin.storage
        .from("media")
        .createSignedUrl(thumbnailStoragePath, 3600);
      thumbSignedUrl = thumbSigned?.signedUrl || "";
    }

    const clientMedia = {
      id: mediaRecord.id,
      userId: mediaRecord.user_id,
      accountId: mediaRecord.instagram_account_id,
      name: mediaRecord.original_name,
      url: videoSigned?.signedUrl || "",
      thumbnailUrl: thumbSignedUrl || videoSigned?.signedUrl || "",
      type: mediaRecord.media_type as "video" | "image",
      sizeBytes: Number(mediaRecord.size_bytes),
      durationSeconds: mediaRecord.duration_seconds ? Number(mediaRecord.duration_seconds) : undefined,
      position: mediaRecord.position,
      status: mediaRecord.status,
      retentionStatus: mediaRecord.retention_status,
      createdAt: mediaRecord.created_at,
      deleteAfter: mediaRecord.delete_after,
      publishedAt: mediaRecord.published_at,
    };

    return NextResponse.json({
      success: true,
      media: clientMedia,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Media Confirm API] Exceção:", errorMsg);

    // Rollback de segurança se houve falha após upload
    if (supabaseAdminClient && uploadedStoragePath) {
      const filesToRemove = [uploadedStoragePath];
      if (uploadedThumbPath) filesToRemove.push(uploadedThumbPath);
      await supabaseAdminClient.storage.from("media").remove(filesToRemove).catch(() => {});
    }

    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
