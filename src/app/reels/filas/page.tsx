"use client";

import React from "react";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Film,
  Plus,
  Play,
  Pause,
  Edit,
  XCircle,
  ExternalLink,
  Calendar,
  Clock,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatDate, formatTime } from "@/lib/utils";

export default function FilasReelsPage() {
  const { reelQueues, selectedAccountId, toggleQueuePause } = useAppState();
  const { addToast } = useToast();

  const filteredQueues = selectedAccountId === "all"
    ? reelQueues
    : reelQueues.filter((q) => q.accountId === selectedAccountId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Filas de Reels
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              {filteredQueues.length} ativas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe o andamento de todas as filas de postagem automática de vídeos.
          </p>
        </div>

        <Link
          href="/reels/nova-fila"
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Criar nova fila</span>
        </Link>
      </div>

      {/* Lista de Filas */}
      {filteredQueues.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <Film className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma fila encontrada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Não há filas ativas para a conta selecionada. Crie uma nova fila para começar a automação.
          </p>
          <Link
            href="/reels/nova-fila"
            className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Fila Agora</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQueues.map((queue) => {
            const percent = Math.round(
              (queue.publishedCount / (queue.totalVideos || 1)) * 100
            );

            return (
              <div
                key={queue.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all space-y-4"
              >
                {/* Linha 1: Perfil, Nome da Fila e Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <Image
                        src={queue.accountAvatar}
                        alt={queue.accountUsername}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {queue.name}
                        </h3>
                        <StatusBadge status={queue.status} />
                      </div>
                      <span className="text-xs text-indigo-600 font-semibold">
                        @{queue.accountUsername}
                      </span>
                    </div>
                  </div>

                  {/* Informações de datas */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                        Criada em
                      </span>
                      <span>{formatDate(queue.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                        Término estimado
                      </span>
                      <span>{queue.estimatedFinishAt ? formatDate(queue.estimatedFinishAt) : "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Linha 2: Barra de Progresso */}
                <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      {queue.publishedCount} / {queue.totalVideos} publicados ({percent}%)
                    </span>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>Restantes: <strong className="text-slate-800">{queue.remainingCount}</strong></span>
                      {queue.errorCount > 0 && (
                        <span className="text-rose-600 font-bold">
                          {queue.errorCount} erros
                        </span>
                      )}
                      <span>Próxima: <strong className="text-indigo-600">{queue.nextScheduledAt ? formatTime(queue.nextScheduledAt) : "—"}</strong></span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Linha 3: Ações */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleQueuePause(queue.id, "reel")}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      queue.status === "paused"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {queue.status === "paused" ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Reativar fila</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar fila</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      addToast({
                        type: "info",
                        title: "Modo de Edição",
                        message: "Abrindo configurações da fila...",
                      });
                    }}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      addToast({
                        type: "warning",
                        title: "Fila Cancelada",
                        message: "A fila foi interrompida e arquivada.",
                      });
                    }}
                    className="py-1.5 px-3 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
