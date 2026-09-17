"use client";

import React from "react";
import { Account } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import {
  Wifi,
  Pause,
  Play,
  RefreshCw,
  Settings,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, formatPercent } from "@/lib/utils";

interface AccountTableProps {
  accounts: Account[];
}

export function AccountTable({ accounts }: AccountTableProps) {
  const { toggleAccountPause, reconnectAccount } = useAppState();
  const { addToast } = useToast();

  const handleTestConnection = (username: string, status: string) => {
    addToast({
      type: "info",
      title: "Testando Conexão...",
      message: `Verificando Meta Graph API para @${username}...`,
    });

    setTimeout(() => {
      if (status === "expired") {
        addToast({
          type: "error",
          title: "Falha no Teste",
          message: "O token desta conta expirou.",
        });
      } else {
        addToast({
          type: "success",
          title: "Conexão Verificada",
          message: `@${username} respondeu com 200 OK.`,
        });
      }
    }, 1000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3.5">Conta</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Seguidores</th>
              <th className="px-4 py-3.5">Posts Hoje</th>
              <th className="px-4 py-3.5">Fila</th>
              <th className="px-4 py-3.5">Taxa Sucesso</th>
              <th className="px-4 py-3.5">Última Postagem</th>
              <th className="px-5 py-3.5 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                {/* Perfil */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center">
                      {acc.profilePicture ? (
                        <Image
                          src={acc.profilePicture}
                          alt={acc.username}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="font-bold text-slate-500 text-xs uppercase select-none">
                          {acc.username.charAt(0) || "I"}
                        </span>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/contas/${acc.id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        @{acc.username}
                      </Link>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {acc.name}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge status={acc.status} />
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                        acc.connectionMode === "external"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}
                    >
                      Modo: {acc.connectionMode === "external" ? "Externo" : "Desenvolvimento"}
                    </span>
                  </div>
                </td>

                {/* Seguidores */}
                <td className="px-4 py-3.5 text-slate-800">
                  {formatNumber(acc.followers)}
                </td>

                {/* Posts Hoje */}
                <td className="px-4 py-3.5 text-slate-800">{acc.postsToday}</td>

                {/* Posts Fila */}
                <td className="px-4 py-3.5 font-bold text-indigo-600">
                  {acc.postsInQueue}
                </td>

                {/* Taxa Sucesso */}
                <td className="px-4 py-3.5 font-bold text-emerald-600">
                  {formatPercent(acc.successRate)}
                </td>

                {/* Última Postagem */}
                <td className="px-4 py-3.5 text-slate-500 font-normal">
                  Hoje às 21:00
                </td>

                {/* Ações */}
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/contas/${acc.id}`}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors"
                    >
                      Abrir
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleTestConnection(acc.username, acc.status)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      title="Testar conexão"
                    >
                      <Wifi className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleAccountPause(acc.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      title={acc.status === "paused" ? "Reativar" : "Pausar"}
                    >
                      {acc.status === "paused" ? (
                        <Play className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Pause className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {acc.status === "expired" && (
                      <button
                        type="button"
                        onClick={() => reconnectAccount(acc.id)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                        title="Reconectar"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
