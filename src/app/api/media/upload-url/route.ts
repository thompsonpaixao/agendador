import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/upload-url
 * 
 * Gera URLs pré-assinadas para upload direto no Supabase Storage (bucket privado 'media').
 * Vantagens:
 * - Contorna o limite serverless de 4.5MB da Vercel.
 * - Suporta arquivos grandes de Reels com upload direto do browser.
 * - Permite monitoramento de progresso real (0% a 100%) via XHR.
 * - Garante a organização lógica: users/{user_id}/instagram/{instagram_account_id}/reels/{arquivo}
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, filename, hasThumbnail, mediaType, folder } = body;

    if (!accountId || !filename) {
      return NextResponse.json(
        { success: false, message: "ID da conta e nome do arquivo são obrigatórios." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Servidor administrativo não configurado." },
        { status: 500 }
      );
    }

    // Valida se a conta do Instagram pertence ao usuário autenticado
    const { data: account, error: accountError } = await supabaseAdmin
      .from("instagram_accounts")
      .select("id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, message: "Conta do Instagram não encontrada ou não pertence ao usuário." },
        { status: 403 }
      );
    }

    // Sanitiza e gera nome único para evitar colisão e caracteres inválidos
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniquePrefix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const targetFolder = folder || (mediaType === "image" ? "carousels" : "reels");
    const mainFileName = `${uniquePrefix}_${cleanName}`;
    const thumbFileName = `${uniquePrefix}_thumb.jpg`;

    // Organização estrita de pastas:
    // users/{user_id}/instagram/{instagram_account_id}/{folder}/{arquivo}
    const mainStoragePath = `users/${user.id}/instagram/${accountId}/${targetFolder}/${mainFileName}`;
    const thumbStoragePath = `users/${user.id}/instagram/${accountId}/${targetFolder}/thumbnails/${thumbFileName}`;

    // Gera Signed Upload URL para o arquivo principal (vídeo ou imagem de slide)
    const { data: fileUpload, error: fileUploadError } = await supabaseAdmin.storage
      .from("media")
      .createSignedUploadUrl(mainStoragePath, { upsert: true });

    if (fileUploadError || !fileUpload) {
      console.error("[Upload URL] Erro ao gerar URL para arquivo:", fileUploadError);
      return NextResponse.json(
        { success: false, message: `Falha ao preparar upload no storage: ${fileUploadError?.message}` },
        { status: 500 }
      );
    }

    // Gera Signed Upload URL para a thumbnail (se solicitada)
    let thumbnailUpload = null;
    if (hasThumbnail) {
      const { data: thumbUpload, error: thumbUploadError } = await supabaseAdmin.storage
        .from("media")
        .createSignedUploadUrl(thumbStoragePath, { upsert: true });

      if (!thumbUploadError && thumbUpload) {
        thumbnailUpload = {
          signedUrl: thumbUpload.signedUrl,
          token: thumbUpload.token,
          path: thumbUpload.path,
          storagePath: thumbStoragePath,
        };
      }
    }

    const payload = {
      signedUrl: fileUpload.signedUrl,
      token: fileUpload.token,
      path: fileUpload.path,
      storagePath: mainStoragePath,
    };

    return NextResponse.json({
      success: true,
      media: payload,
      video: payload, // compatibilidade com fluxo anterior de reels
      thumbnail: thumbnailUpload,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Upload URL API] Exceção:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
