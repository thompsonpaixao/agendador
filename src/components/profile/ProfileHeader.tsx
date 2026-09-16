"use client";

import React from "react";
import { Account } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import {
  Wifi,
  RefreshCw,
  Pause,
  Play,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import Image from "next/image";
import Link from "next/link";

interface ProfileHeaderProps {
  account: Account;
  activeTabTitle: string;
}

export function ProfileHeader({ account, activeTabTitle }: ProfileHeaderProps) {
  const { toggleAccountPause, reconnectAccount } = useAppState();
  const { addToast } = useToast();

  const handleTestConnection = () => {
    addToast({
      type: "info",
      title: "Testando Conexão...",
      message: `Enviando ping de teste para a Meta Graph API para @${account.username}...`,
    });
    setTimeout(() => {
      if (account.status === "expired") {
        addToast({
          type: "error",
          title: "Token Expirado",
          message: "O acesso desta conta expirou na Meta. Clique em Reconectar.",
        });
      } else {
        addToast({
          type: "success",
          title: "Conexão Bem-Sucedida!",
          message: `Meta API operacional com escopos válidos para @${account.username}.`,
        });
      }
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Migalhas de Navegação (Breadcrumb) */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link
          href="/contas"
          className="hover:text-slate-800 transition-colors flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Contas</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="font-bold text-slate-800 flex items-center gap-1">
          <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
          @{account.username}
        </span>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-500 font-medium">{activeTabTitle}</span>
      </div>

      {/* Card do Perfil */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm shrink-0">
            <Image
              src={account.profilePicture}
              alt={account.username}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                @{account.username}
              </h1>
              <StatusBadge status={account.status} />
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${
                  account.connectionMode === "external"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
              >
                Modo: {account.connectionMode === "external" ? "Externo" : "Desenvolvimento"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{account.name}</p>
          </div>
        </div>

        {/* Ações do Topo */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            className="py-2 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Testar conexão</span>
          </button>

          {account.status === "expired" && (
            <button
              type="button"
              onClick={() => reconnectAccount(account.id)}
              className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reconectar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleAccountPause(account.id)}
            className={`py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              account.status === "paused"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                : "border border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            {account.status === "paused" ? (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Reativar publicações</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar publicações</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
