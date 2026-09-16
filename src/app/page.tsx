"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SimpleLineChart } from "@/components/charts/SimpleLineChart";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import {
  Users,
  Send,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Film,
  Layers,
  Clock,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Eye,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const {
    accounts,
    selectedAccountId,
    selectedAccount,
    setSelectedAccountId,
    errors,
    scheduledPosts,
    publishedPosts,
    reconnectAccount,
    reelQueues,
    carouselQueues,
  } = useAppState();

  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "30d" | "custom">("today");

  // Filtragem com base na conta selecionada
  const filteredAccounts = selectedAccountId === "all"
    ? accounts
    : accounts.filter((a) => a.id === selectedAccountId);

  const filteredErrors = selectedAccountId === "all"
    ? errors.filter((e) => e.status === "pending")
    : errors.filter((e) => e.status === "pending" && e.accountId === selectedAccountId);

  const filteredScheduled = selectedAccountId === "all"
    ? scheduledPosts
    : scheduledPosts.filter((p) => p.accountId === selectedAccountId);

  const filteredPublished = selectedAccountId === "all"
    ? publishedPosts
    : publishedPosts.filter((p) => p.accountId === selectedAccountId);

  // Cálculos de métricas
  const totalFollowers = filteredAccounts.reduce((acc, a) => acc + a.followers, 0);
  const postsToday = selectedAccount ? selectedAccount.postsToday : 214;
  const targetToday = selectedAccount ? selectedAccount.defaultReelsPerDay + selectedAccount.defaultCarouselsPerDay : 250;
  const progressTodayPercent = Math.min(Math.round((postsToday / targetToday) * 100), 100);

  const postsScheduled = selectedAccount ? selectedAccount.postsInQueue : 1842;
  const postsWithErrors = filteredErrors.length;
  const successRate = selectedAccount ? selectedAccount.successRate : 98.4;
  const reelsInQueue = selectedAccount
    ? reelQueues.filter((q) => q.accountId === selectedAccount.id).reduce((acc, q) => acc + q.remainingCount, 0) || 42
    : 4327;
  const carouselsInQueue = selectedAccount
    ? carouselQueues.filter((q) => q.accountId === selectedAccount.id).reduce((acc, q) => acc + q.remainingCount, 0) || 12
    : 386;

  // Dados para os gráficos
  const chartDays = [
    { label: "10/09", value: 180 },
    { label: "11/09", value: 205 },
    { label: "12/09", value: 220 },
    { label: "13/09", value: 198 },
    { label: "14/09", value: 235 },
    { label: "15/09", value: 242 },
    { label: "Hoje", value: postsToday },
  ];

  const successVsErrorData = [
    { label: "Seg", value1: 220, value2: 2 },
    { label: "Ter", value1: 235, value2: 4 },
    { label: "Qua", value1: 218, value2: 1 },
    { label: "Qui", value1: 240, value2: 3 },
    { label: "Sex", value1: 250, value2: 2 },
    { label: "Sáb", value1: 210, value2: 5 },
    { label: "Hoje", value1: postsToday, value2: postsWithErrors },
  ];

  // Perfis com problema
  const accountsWithIssues = accounts.filter(
    (a) => a.status === "expired" || a.status === "error" || a.status === "paused"
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Topo: Título e Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            {selectedAccount && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                @{selectedAccount.username}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {selectedAccount
              ? `Métricas operacionais e fila de publicação para ${selectedAccount.name}.`
              : "Visão consolidada de todas as contas conectadas, filas e taxa de entrega."}
          </p>
        </div>

        {/* Filtros Temporais */}
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-2xs">
            {(
              [
                { id: "today", label: "Hoje" },
                { id: "7d", label: "7 dias" },
                { id: "30d", label: "30 dias" },
                { id: "custom", label: "Personalizado" },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTimeFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeFilter === filter.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grade de Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Contas Conectadas"
          value={selectedAccount ? "1 / 1" : `${accounts.filter((a) => a.status === "connected").length} / ${accounts.length}`}
          subtitle={selectedAccount ? "Perfil ativo" : `${formatNumber(totalFollowers)} seguidores totais`}
          icon={<Users className="w-4 h-4 text-indigo-600" />}
          trend={{ value: "+2 contas", isPositive: true }}
        />

        <MetricCard
          title="Posts Publicados Hoje"
          value={formatNumber(postsToday)}
          subtitle={`Meta diária: ${targetToday} posts`}
          icon={<Send className="w-4 h-4 text-emerald-600" />}
          variant="success"
          trend={{ value: `${progressTodayPercent}% da meta`, isPositive: true }}
        />

        <MetricCard
          title="Posts Agendados"
          value={formatNumber(postsScheduled)}
          subtitle="Programados nas filas"
          icon={<Calendar className="w-4 h-4 text-indigo-600" />}
          trend={{ value: "Próx: 09:00", isPositive: true }}
        />

        <MetricCard
          title="Posts com Erro"
          value={formatNumber(postsWithErrors)}
          subtitle={postsWithErrors > 0 ? "Ação necessária na central" : "Nenhum erro ativo"}
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          variant={postsWithErrors > 0 ? "error" : "default"}
        />
      </div>

      {/* Linha 2 de Cards Secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Taxa de Sucesso"
          value={formatPercent(successRate)}
          subtitle="Entregas concluídas sem falhas"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          variant="success"
        />

        <MetricCard
          title="Reels na Fila"
          value={formatNumber(reelsInQueue)}
          subtitle="Vídeos prontos para publicação"
          icon={<Film className="w-4 h-4 text-rose-600" />}
        />

        <MetricCard
          title="Carrosséis na Fila"
          value={formatNumber(carouselsInQueue)}
          subtitle="Postagens com múltiplos slides"
          icon={<Layers className="w-4 h-4 text-purple-600" />}
        />
      </div>

      {/* Seção: Publicações de Hoje (Barra de Progresso) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Publicações de hoje
            </h3>
            <p className="text-xs text-slate-500">
              Ritmo de publicação automático das filas programadas
            </p>
          </div>
          <span className="text-sm font-bold text-indigo-600">
            {postsToday} de {targetToday} publicações concluídas ({progressTodayPercent}%)
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressTodayPercent}%` }}
          />
        </div>
      </div>

      {/* Gráficos: Publicações por dia & Sucesso x Erros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Publicações por dia
              </h3>
              <p className="text-xs text-slate-500">
                Volume de entregas nos últimos 7 dias
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+14.2%</span>
            </div>
          </div>
          <SimpleLineChart data={chartDays} height={180} valueSuffix=" posts" />
        </div>

        {/* Gráfico 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Sucesso x Erros
              </h3>
              <p className="text-xs text-slate-500">
                Relação diária de posts publicados com sucesso vs rejeições
              </p>
            </div>
          </div>
          <SimpleBarChart
            data={successVsErrorData}
            height={180}
            label1="Sucesso"
            label2="Erros"
          />
        </div>
      </div>

      {/* Duas Colunas: Próximas Publicações & Perfis com Problema */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Próximas Publicações (7 colunas) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Próximas publicações
              </h3>
              <p className="text-xs text-slate-500">
                Conteúdos na fila imediata de disparo
              </p>
            </div>
            <Link
              href="/agenda"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
            >
              Ver agenda completa →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredScheduled.slice(0, 5).map((post) => (
              <div
                key={post.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0 relative">
                    <Image
                      src={post.thumbnailUrl}
                      alt={post.title}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {new Date(post.scheduledAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs font-medium text-indigo-600 truncate">
                        @{post.accountUsername}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {post.type === "reel" ? "Reel" : "Carrossel"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate max-w-sm mt-0.5">
                      {post.title}
                    </p>
                  </div>
                </div>

                <StatusBadge status="scheduled" />
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Perfis com Problema (5 colunas) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Perfis com problema</span>
                  {accountsWithIssues.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Requerem atenção ou reconexão de credencial
                </p>
              </div>
              <Link
                href="/erros"
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Ver todos ({errors.filter((e) => e.status === "pending").length})
              </Link>
            </div>

            <div className="space-y-3">
              {accountsWithIssues.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <Image
                        src={acc.profilePicture}
                        alt={acc.username}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        @{acc.username}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {acc.status === "expired"
                          ? "Token expirado"
                          : acc.status === "error"
                          ? `${acc.errorsCount} publicações com erro`
                          : "Publicação pausada"}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {acc.status === "expired" ? (
                      <button
                        type="button"
                        onClick={() => reconnectAccount(acc.id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reconectar</span>
                      </button>
                    ) : acc.status === "error" ? (
                      <Link
                        href="/erros"
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all inline-block"
                      >
                        Ver erros
                      </Link>
                    ) : (
                      <Link
                        href={`/contas/${acc.id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-all inline-block"
                      >
                        Ver perfil
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Contas com tokens expirados têm a fila congelada automaticamente para evitar punições da Meta.
            </span>
          </div>
        </div>
      </div>

      {/* Seção: Top Conteúdos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Top conteúdos recentes
            </h3>
            <p className="text-xs text-slate-500">
              Mídias com maior volume de visualizações, alcance e novos seguidores
            </p>
          </div>
          <Link
            href="/analytics/conteudo"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Ver ranking completo →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {filteredPublished.slice(0, 5).map((post) => (
            <div
              key={post.id}
              className="group rounded-xl border border-slate-200 overflow-hidden bg-white hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="relative aspect-[9/12] w-full overflow-hidden bg-slate-100">
                <Image
                  src={post.thumbnailUrl}
                  alt={post.caption}
                  width={300}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                  {post.type}
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs font-semibold drop-shadow-md">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {formatNumber(post.views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    +{post.followersGained}
                  </span>
                </div>
              </div>

              <div className="p-3">
                <div className="text-xs font-bold text-indigo-600 truncate">
                  @{post.accountUsername}
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-snug">
                  {post.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
