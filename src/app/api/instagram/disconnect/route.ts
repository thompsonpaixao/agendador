import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { accountId } = body;

    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json(
        { success: false, message: "ID da conta não fornecido ou inválido." },
        { status: 400 }
      );
    }

    // 1. Verifica se a conta pertence ao usuário autenticado (garantia RLS / backend)
    const { data: account, error: fetchError } = await supabase
      .from("accounts")
      .select("id, username, user_id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { success: false, message: "Conta não encontrada ou sem permissão para desconectar." },
        { status: 404 }
      );
    }

    // 2. Anula o token da Meta, desativa o status e atualiza a mensagem
    const { error: updateError } = await supabase
      .from("accounts")
      .update({
        access_token: null,
        status: "paused",
        status_message: "Conta desconectada pelo usuário em " + new Date().toLocaleDateString("pt-BR"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: "Falha ao desativar token da conta no banco de dados." },
        { status: 500 }
      );
    }

    // 3. Cancela quaisquer publicações agendadas pendentes para impedir novas postagens sem token
    await supabase
      .from("scheduled_posts")
      .update({
        status: "cancelled",
      })
      .eq("account_id", accountId)
      .eq("user_id", user.id)
      .eq("status", "scheduled");

    return NextResponse.json({
      success: true,
      message: `Conta @${account.username} desconectada com sucesso. Token da Meta removido e agendamentos futuros pausados.`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erro interno ao processar a desconexão." },
      { status: 500 }
    );
  }
}
