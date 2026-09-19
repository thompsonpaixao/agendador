"use client";

import React, { useState } from "react";
import { Account, ScheduledPost } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import { MetricCard } from "@/components/ui/MetricCard";
import { formatNumber, formatPercent, formatDate, formatTime, formatBytes } from "@/lib/utils";
import {
  Film,
  Layers,
  Calendar,
  Clock,
  Shuffle,
  AlertTriangle,
  ArrowRight,
  Plus,
  Filter,
  HardDrive,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";

interface ProfileOverviewTabProps {
  account: Account;
  accountVideosCount: number;
  accountCarouselsCount: number;
  scheduledPosts: ScheduledPost[];
  errorsCount: number;
  onNavigateTab: (tabId: string) => void;
}

export function ProfileOverviewTab({
  account,
  accountVideosCount,
  accountCarouselsCount,
  scheduledPosts,
  errorsCount,
  onNavigateTab,
}: ProfileOverviewTabProps) {
  const { publishedPosts, profileMedia } = useAppState();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Publicados Hoje no fuso de São Paulo
  const todaySP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const publishedTodayCount = publishedPosts.filter((p) => {
    if (p.accountId !== account.id || !p.publishedAt) return false;
    const pDateSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(p.publishedAt));
    return pDateSP === todaySP;
  }).length;

  // Armazenamento Real do Perfil
  const accountMediaList = profileMedia.filter((m) => m.accountId === account.id);
  const totalAccountBytes = accountMediaList.reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
  const videoAccountBytes = accountMediaList.filter((m) => m.type === "video").reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
  const imageAccountBytes = accountMediaList.filter((m) => m.type === "image").reduce((acc, m) => acc + (m.sizeBytes || 0), 0);

  const upcomingPosts = scheduledPosts
    .filter((p) => p.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const nextPostText = upcomingPosts.length > 0
    ? `${formatDate(upcomingPosts[0].scheduledAt)} às ${formatTime(upcomingPosts[0].scheduledAt)}`
    : "Nenhuma agendada";

  const successRateText = account.successRate != null
    ? formatPercent(account.successRate)
    : "—";

  return (
    <div className="space-y-6">
      {/* Seletor de Período Temporal (Padrão: Últimos 30 dias) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">Período de Análise:</span>
          <span className="text-xs text-slate-500 font-medium">
            {timeRange === "30d"
              ? "Últimos 30 dias (padrão)"
              : timeRange === "7d"
              ? "Últimos 7 dias"
              : "Período personalizado"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTimeRange("7d")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timeRange === "7d"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("30d")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timeRange === "30d"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("custom")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              timeRange === "custom"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Personalizado
          </button>
        </div>
      </div>

      {/* Formulário de Período Personalizado */}
      {timeRange === "custom" && (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">De:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800"
          />
          <span className="font-semibold text-slate-700">Até:</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-800"
          />
        </div>
      )}
      {/* 8 Cards de Métricas Obrigatórios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard
          title="Seguidores"
          value={formatNumber(account.followers)}
          subtitle="Audiência total"
        />
        <MetricCard
          title="Publicados Hoje"
          value={publishedTodayCount}
          subtitle="Disparados hoje"
          variant="success"
        />
        <MetricCard
          title="Agendados"
          value={scheduledPosts.filter((p) => p.status === "scheduled").length}
          subtitle="Na programação"
        />
        <MetricCard
          title="Reels Disp."
          value={accountVideosCount}
          subtitle="No repositório"
          variant="primary"
        />
        <MetricCard
          title="Carrosséis Disp."
          value={accountCarouselsCount}
          subtitle="No construtor"
          variant="primary"
        />
        <MetricCard
          title="Erros"
          value={errorsCount}
          subtitle="Falhas pendentes"
          variant={errorsCount > 0 ? "error" : "default"}
        />
        <MetricCard
          title="Próxima"
          value={upcomingPosts.length > 0 ? formatTime(upcomingPosts[0].scheduledAt) : "—"}
          subtitle={upcomingPosts.length > 0 ? formatDate(upcomingPosts[0].scheduledAt) : "Sem fila"}
        />
        <MetricCard
          title="Taxa Sucesso"
          value={successRateText}
          subtitle="Envios concluídos"
          variant="success"
        />
      </div>

      {/* Armazenamento Real deste Perfil */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900">Armazenamento deste Perfil</h4>
              <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {formatBytes(totalAccountBytes)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Film className="w-3 h-3 text-rose-500" /> Reels: <strong>{formatBytes(videoAccountBytes)}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-purple-500" /> Carrosséis: <strong>{formatBytes(imageAccountBytes)}</strong>
              </span>
              <span>•</span>
              <span>Total: {accountMediaList.length} arquivos</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab("uploads")}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          Gerenciar mídias →
        </button>
      </div>

      {/* Ações Rápidas em Destaque */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab("reels")}
          className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-200 hover:border-rose-300 text-left transition-all group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-sm">
              <Film className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Abrir Reels <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <h4 className="font-bold text-slate-900 mt-3 text-sm">Gerenciar Reels</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {accountVideosCount} vídeos no repositório desta conta.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("carrosseis")}
          className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-200 hover:border-purple-300 text-left transition-all group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-purple-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Abrir Carrosséis <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <h4 className="font-bold text-slate-900 mt-3 text-sm">Gerenciar Carrosséis</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {accountCarouselsCount} carrosséis prontos no construtor.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab("agenda")}
          className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-200 hover:border-indigo-300 text-left transition-all group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Ver Agenda <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <h4 className="font-bold text-slate-900 mt-3 text-sm">Calendário de Publicações</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualize a grade diária, semanal e mensal deste perfil.
          </p>
        </button>
      </div>

      {/* Grade com Resumo Operacional e Próximas Publicações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumo Operacional */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Resumo Operacional</h3>
            <button
              type="button"
              onClick={() => onNavigateTab("configuracoes")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Editar
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[11px]">Horários Padrão Diários</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {account.defaultTimes.length > 0 ? account.defaultTimes.join(" • ") : "Nenhum definido"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">Variação Anti-Detecção</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {account.useRandomTimeVariation
                    ? `Ativa (± ${account.randomVariationMinutes} min)`
                    : "Desativada"}
                </span>
              </div>
              <Shuffle className="w-4 h-4 text-slate-400" />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[11px]">Meta de Reels por Dia</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {account.defaultReelsPerDay} Reels / dia
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 block text-[11px]">Meta de Carrosséis por Dia</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {account.defaultCarouselsPerDay} Carrosséis / dia
              </span>
            </div>
          </div>
        </div>

        {/* Próximas Publicações */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Próximas Publicações Agendadas
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("agenda")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Ver todas na agenda →
            </button>
          </div>

          {upcomingPosts.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">
                Nenhuma publicação agendada para @{account.username}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                Crie uma fila de Reels ou programe um carrossel para preencher a programação.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab("reels")}
                  className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Criar Fila de Reels</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("carrosseis")}
                  className="py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Criar Carrossel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingPosts.map((post) => (
                <div
                  key={post.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <Image
                        src={post.thumbnailUrl}
                        alt={post.caption}
                        width={40}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          post.type === "reel" ? "bg-rose-100 text-rose-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {post.type === "reel" ? "Reel" : "Carrossel"}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{post.title || post.caption}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                        {post.caption}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-indigo-600 block">
                      {formatTime(post.scheduledAt)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(post.scheduledAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
