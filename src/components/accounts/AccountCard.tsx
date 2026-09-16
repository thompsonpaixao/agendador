"use client";

import React from "react";
import { Account } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import {
  Users,
  Send,
  Calendar,
  Clock,
  TrendingUp,
  Settings,
  RefreshCw,
  Pause,
  Play,
  ExternalLink,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, formatPercent } from "@/lib/utils";

interface AccountCardProps {
  account: Account;
}

export function AccountCard({ account }: AccountCardProps) {
  const { toggleAccountPause, reconnectAccount } = useAppState();
  const { addToast } = useToast();

  const handleTestConnection = () => {
    addToast({
      type: "info",
      title: "Testando Conexão...",
      message: `Verificando credenciais e escopos da Meta Graph API para @${account.username}...`,
    });

    setTimeout(() => {
      if (account.status === "expired") {
        addToast({
          type: "error",
          title: "Falha no Teste de Conexão",
          message: "O token desta conta expirou na Meta. Clique em Reconectar.",
        });
      } else {
        addToast({
          type: "success",
          title: "Conexão Verificada!",
          message: `A API da Meta respondeu com status 200 OK para @${account.username}.`,
        });
      }
    }, 1200);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Topo do Card: Avatar, @username e Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
              <Image
                src={account.profilePicture}
                alt={account.username}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <Link
                href={`/contas/${account.id}`}
                className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate block"
              >
                @{account.username}
              </Link>
              <p className="text-xs text-slate-500 truncate">{account.name}</p>
            </div>
          </div>

          <StatusBadge status={account.status} />
        </div>

        {/* Mensagem de alerta se houver */}
        {account.statusMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
            {account.statusMessage}
          </div>
        )}

        {/* Informações e Métricas */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Seguidores</span>
            <span className="font-bold text-slate-800">
              {formatNumber(account.followers)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Posts hoje</span>
            <span className="font-bold text-slate-800">{account.postsToday}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Posts na fila</span>
            <span className="font-bold text-indigo-600">
              {account.postsInQueue}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Taxa de sucesso</span>
            <span className="font-bold text-emerald-600">
              {formatPercent(account.successRate)}
            </span>
          </div>
        </div>

        <div className="py-2 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Última publicação: Hoje às 21:00</span>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <Link
          href={`/contas/${account.id}`}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold text-center transition-colors"
        >
          Abrir conta
        </Link>

        <button
          type="button"
          onClick={handleTestConnection}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Testar conexão com a Meta"
        >
          <Wifi className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => toggleAccountPause(account.id)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title={account.status === "paused" ? "Reativar publicações" : "Pausar publicações"}
        >
          {account.status === "paused" ? (
            <Play className="w-4 h-4 text-emerald-600" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </button>

        {account.status === "expired" && (
          <button
            type="button"
            onClick={() => reconnectAccount(account.id)}
            className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
            title="Reconectar Token Meta"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        <Link
          href={`/contas/${account.id}#configuracoes`}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Configurações da conta"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
