"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Film,
  Calendar,
  Clock,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Play,
} from "lucide-react";
import Image from "next/image";
import { formatDate, formatTime } from "@/lib/utils";
import { VideoPreviewModal } from "@/components/media/VideoPreviewModal";
import { MediaItem } from "@/types";

interface QueueItemDetail {
  id: string;
  position: number;
  mediaId: string;
  name: string;
  thumbnailUrl: string;
  videoUrl: string;
  status: string;
  statusCode: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  instagramPermalink: string | null;
  errorMessage: string | null;
}

interface QueueDetailData {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  startDate: string | null;
  postsPerDay: number;
  dailyTimes: string[];
  useRandomVariation: boolean;
  summary: {
    total: number;
    published: number;
    failed: number;
    scheduled: number;
    waiting: number;
    cancelled: number;
    completionRate: number;
    period: {
      firstScheduledAt: string | null;
      lastScheduledAt: string | null;
    };
  };
  items: QueueItemDetail[];
}

interface QueueDetailsModalProps {
  queueId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QueueDetailsModal({
  queueId,
  isOpen,
  onClose,
}: QueueDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueData, setQueueData] = useState<QueueDetailData | null>(null);
  const [previewVideo, setPreviewVideo] = useState<MediaItem | null>(null);

  const fetchQueueDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reel-queues/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Erro ao carregar detalhes da fila.");
      }
      setQueueData(data.queue);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && queueId) {
      void fetchQueueDetails(queueId);
    } else {
      setQueueData(null);
      setError(null);
    }
  }, [isOpen, queueId]);

  const getItemBadgeClass = (statusCode: string) => {
    switch (statusCode) {
      case "published":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "processing":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 animate-pulse";
      case "scheduled":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "failed":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "cancelled":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "pending":
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={queueData ? `Relatório da Fila: ${queueData.name}` : "Detalhes da Fila"}
        description="Acompanhe o status individual de cada vídeo, horários previstos e publicações realizadas no Instagram."
        maxWidth="3xl"
      >
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Buscando cronograma e histórico da fila no Supabase...
            </p>
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-slate-800">Falha ao obter detalhes</p>
            <p className="text-xs text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => queueId && fetchQueueDetails(queueId)}
              className="py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar novamente</span>
            </button>
          </div>
        ) : queueData ? (
          <div className="space-y-5">
            {/* Header com Status e Período */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Status da Fila:</span>
                  <StatusBadge status={queueData.status} />
                </div>
                <div className="text-xs text-slate-500">
                  Criada em: <strong className="text-slate-700">{formatDate(queueData.createdAt)}</strong>
                </div>
              </div>

              {/* Período da Fila */}
              {queueData.summary.period.firstScheduledAt && (
                <div className="flex items-center gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Período programado:{" "}
                    <strong>
                      {formatDate(queueData.summary.period.firstScheduledAt)}
                      {queueData.summary.period.lastScheduledAt &&
                        queueData.summary.period.lastScheduledAt !== queueData.summary.period.firstScheduledAt &&
                        ` até ${formatDate(queueData.summary.period.lastScheduledAt)}`}
                    </strong>
                  </span>
                </div>
              )}

              {/* Barra de Progresso e Métricas */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Progresso: {queueData.summary.completionRate}%
                  </span>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="text-emerald-700 font-semibold">
                      {queueData.summary.published} publicado{queueData.summary.published !== 1 ? "s" : ""}
                    </span>
                    <span className="text-indigo-700 font-semibold">
                      {queueData.summary.scheduled} agendado{queueData.summary.scheduled !== 1 ? "s" : ""}
                    </span>
                    <span className="text-amber-700 font-semibold">
                      {queueData.summary.waiting} aguardando
                    </span>
                    {queueData.summary.failed > 0 && (
                      <span className="text-rose-600 font-bold">
                        {queueData.summary.failed} falha{queueData.summary.failed !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      queueData.status === "completed"
                        ? "bg-emerald-600"
                        : "bg-gradient-to-r from-indigo-500 to-purple-600"
                    }`}
                    style={{ width: `${queueData.summary.completionRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Lista dos Itens da Fila */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Itens da Fila ({queueData.items.length} vídeos)
              </h4>

              {queueData.items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum item associado a esta fila.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {queueData.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Lado Esquerdo: Posição, Thumbnail e Nome */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-center text-xs font-mono font-bold text-slate-400 shrink-0">
                          #{item.position}
                        </span>

                        {/* Thumbnail Vertical 9:16 */}
                        <div
                          onClick={() => {
                            setPreviewVideo({
                              id: item.mediaId,
                              accountId: "",
                              name: item.name,
                              url: item.videoUrl,
                              thumbnailUrl: item.thumbnailUrl,
                              type: "video",
                              sizeBytes: 0,
                              position: item.position,
                              status: "ready",
                            });
                          }}
                          className="relative w-11 h-16 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-200 cursor-pointer group"
                        >
                          {item.thumbnailUrl ? (
                            <Image
                              src={item.thumbnailUrl}
                              alt={item.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-4 h-4 text-slate-500" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-3 h-3 text-white fill-white" />
                          </div>
                        </div>

                        {/* Nome do Arquivo */}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getItemBadgeClass(
                                item.statusCode
                              )}`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Horários, Permalink ou Erro */}
                      <div className="flex flex-col sm:items-end gap-1 text-xs shrink-0 pl-9 sm:pl-0">
                        {item.scheduledAt && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Previsto:{" "}
                              <strong className="text-slate-700">
                                {formatDate(item.scheduledAt)} às {formatTime(item.scheduledAt)}
                              </strong>
                            </span>
                          </div>
                        )}

                        {item.publishedAt && (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              Publicado em:{" "}
                              <strong>
                                {formatDate(item.publishedAt)} às {formatTime(item.publishedAt)}
                              </strong>
                            </span>
                          </div>
                        )}

                        {item.instagramPermalink && (
                          <a
                            href={item.instagramPermalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline pt-0.5"
                          >
                            <span>Ver Reel no Instagram</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {item.errorMessage && (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] max-w-sm mt-1">
                            <strong>Motivo da falha: </strong>
                            <span>{item.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Pré-visualização do Vídeo */}
      <VideoPreviewModal
        video={previewVideo}
        isOpen={Boolean(previewVideo)}
        onClose={() => setPreviewVideo(null)}
      />
    </>
  );
}
