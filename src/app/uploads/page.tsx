"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { MediaItem, RetentionStatus } from "@/types";
import {
  UploadCloud,
  Film,
  Image as ImageIcon,
  Clock,
  Trash2,
  Calendar,
  ShieldAlert,
  CheckCircle,
  Filter,
  Info,
  Play,
} from "lucide-react";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import Image from "next/image";
import Link from "next/link";
import { VideoPreviewModal } from "@/components/media/VideoPreviewModal";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils";

function getRetentionBadge(status?: RetentionStatus, deleteAfter?: string) {
  switch (status) {
    case "eligible_for_deletion":
    case "deletion_scheduled": {
      const daysRemaining = deleteAfter
        ? Math.max(0, Math.ceil((new Date(deleteAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 7;
      return {
        label: `Exclusão em ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""}`,
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
      };
    }
    case "preserved_due_to_error":
      return {
        label: "Preservado por erro",
        bg: "bg-rose-50 text-rose-700 border-rose-200",
        icon: ShieldAlert,
      };
    case "waiting_publication":
      return {
        label: "Aguardando publicação",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Calendar,
      };
    case "deleted":
      return {
        label: "Excluído",
        bg: "bg-slate-100 text-slate-500 border-slate-200",
        icon: Trash2,
      };
    case "active":
    default:
      return {
        label: "Ativo no repositório",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle,
      };
  }
}

export default function UploadsPage() {
  const { accounts, profileMedia, deleteProfileMedia } = useAppState();
  const { addToast } = useToast();

  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "video" | "image">("all");
  const [filterRetention, setFilterRetention] = useState<string>("all");
  const [previewVideo, setPreviewVideo] = useState<MediaItem | null>(null);

  const filteredMedia = profileMedia.filter((m) => {
    if (selectedAccountId !== "all" && m.accountId !== selectedAccountId) return false;
    if (filterType !== "all" && m.type !== filterType) return false;
    if (filterRetention !== "all" && (m.retentionStatus || "active") !== filterRetention) return false;
    return true;
  });

  // Cálculo global de arquivos elegíveis para exclusão nos próximos 7 dias
  const expiringNext7Days = profileMedia.filter((m) => {
    if (!m.deleteAfter) return false;
    const diff = new Date(m.deleteAfter).getTime() - Date.now();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  const preservedErrorsCount = profileMedia.filter(
    (m) => m.retentionStatus === "preserved_due_to_error"
  ).length;

  const handleManualDelete = async (media: MediaItem) => {
    if (media.retentionStatus === "waiting_publication") {
      addToast({
        type: "error",
        title: "Exclusão Bloqueada",
        message: "Esta mídia está vinculada a uma fila ou post programado futuro.",
      });
      return;
    }

    try {
      await deleteProfileMedia(media.accountId, media.id);
      addToast({
        type: "info",
        title: "Mídia Removida",
        message: `O arquivo "${media.name}" foi removido do storage com segurança.`,
      });
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Erro ao Excluir",
        message: err.message || "Falha ao remover arquivo.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Título & Descrição */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Repositório Geral de Uploads
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Visão consolidada de todas as mídias, controle de armazenamento e ciclo de retenção por perfil.
        </p>
      </div>

      {/* Cards de Métricas de Armazenamento e Retenção */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total de Uploads</div>
            <div className="text-lg font-bold text-slate-900">{profileMedia.length} arquivos</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Exclusão em 7 Dias</div>
            <div className="text-lg font-bold text-slate-900">
              {expiringNext7Days} arquivo{expiringNext7Days !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Preservados por Erro</div>
            <div className="text-lg font-bold text-slate-900">{preservedErrorsCount} arquivos</div>
          </div>
        </div>
      </div>

      {/* Alerta de Retenção */}
      {expiringNext7Days > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 text-xs text-amber-800">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Política de Retenção Ativa: </span>
            {expiringNext7Days} arquivo{expiringNext7Days !== 1 ? "s serão removidos" : " será removido"} automaticamente nos próximos 7 dias por já terem sido publicados e não possuírem mais dependências futuras.
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Filtro por Perfil */}
        <div className="flex items-center gap-2">
          <InstagramIcon className="w-4 h-4 text-pink-600" />
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Perfis ({accounts.length})</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                @{acc.username}
              </option>
            ))}
          </select>
        </div>

        {/* Filtros por Tipo e Retenção */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === "all" ? "bg-white text-slate-800 shadow-2xs font-semibold" : "text-slate-500"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterType("video")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === "video" ? "bg-white text-slate-800 shadow-2xs font-semibold" : "text-slate-500"
              }`}
            >
              Vídeos
            </button>
            <button
              type="button"
              onClick={() => setFilterType("image")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === "image" ? "bg-white text-slate-800 shadow-2xs font-semibold" : "text-slate-500"
              }`}
            >
              Imagens
            </button>
          </div>

          <select
            value={filterRetention}
            onChange={(e) => setFilterRetention(e.target.value)}
            className="text-xs font-medium border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todas as Retenções</option>
            <option value="active">Ativos</option>
            <option value="waiting_publication">Aguardando Publicação</option>
            <option value="eligible_for_deletion">Elegíveis para Exclusão</option>
            <option value="preserved_due_to_error">Preservados por Erro</option>
          </select>
        </div>
      </div>

      {/* Grid Geral de Arquivos */}
      {filteredMedia.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs">
          <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Nenhuma mídia encontrada</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Nenhum arquivo corresponde aos filtros de perfil, tipo ou retenção selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredMedia.map((item) => {
            const acc = accounts.find((a) => a.id === item.accountId);
            const badge = getRetentionBadge(item.retentionStatus, item.deleteAfter);
            const BadgeIcon = badge.icon;
            const isVideo =
              item.type === "video" ||
              item.durationSeconds !== undefined ||
              Boolean(item.thumbnailUrl && item.thumbnailUrl !== item.url);

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col hover:border-slate-300 transition-all group"
              >
                {/* Thumbnail: Proporção vertical 9:16 para vídeo, quadrada para imagem */}
                <div
                  onClick={() => {
                    if (isVideo) setPreviewVideo(item);
                  }}
                  className={`relative ${
                    isVideo ? "aspect-[9/16] cursor-pointer" : "aspect-square"
                  } bg-slate-950 flex items-center justify-center overflow-hidden group/thumb`}
                >
                  {item.thumbnailUrl || item.url ? (
                    <Image
                      src={item.thumbnailUrl || item.url}
                      alt={item.name}
                      fill
                      className="object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <Film className="w-8 h-8 text-slate-600" />
                  )}

                  {/* Play overlay se for vídeo */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                      <div className="w-9 h-9 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md transform group-hover/thumb:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-slate-900 ml-0.5" />
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    {acc && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                        <InstagramIcon className="w-2.5 h-2.5 text-pink-400" />
                        @{acc.username}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
                    {isVideo && item.durationSeconds !== undefined && item.durationSeconds > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] text-white font-mono">
                        {formatDuration(item.durationSeconds)}
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] text-white font-mono">
                      {formatBytes(item.sizeBytes)}
                    </span>
                  </div>
                </div>

                {/* Dados do Arquivo */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>

                  {/* Badge de Retenção */}
                  <div className="space-y-1">
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${badge.bg}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </div>

                    {item.deleteAfter && item.retentionStatus === "eligible_for_deletion" && (
                      <p className="text-[10px] text-slate-400">
                        Previsto: {formatDate(item.deleteAfter)}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    {acc ? (
                      <Link
                        href={`/contas/${acc.id}?tab=uploads`}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Ver no perfil →
                      </Link>
                    ) : (
                      <span className="text-[10px] text-slate-400">Conta desconectada</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleManualDelete(item)}
                      disabled={item.retentionStatus === "waiting_publication"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 cursor-pointer"
                      title={
                        item.retentionStatus === "waiting_publication"
                          ? "Não é seguro excluir: em fila futura"
                          : "Excluir manualmente"
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Pré-visualização do Vídeo Reutilizável */}
      <VideoPreviewModal
        video={previewVideo}
        isOpen={Boolean(previewVideo)}
        onClose={() => setPreviewVideo(null)}
      />
    </div>
  );
}
