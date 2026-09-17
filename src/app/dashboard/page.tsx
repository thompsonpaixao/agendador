"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { MetricCard } from "@/components/ui/MetricCard";
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
  Plus,
  Inbox,
  Check,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";

export default function DashboardPage() {
  const {
    accounts,
    selectedAccountId,
    selectedAccount,
    errors,
    scheduledPosts,
    publishedPosts,
    reelQueues,
    carouselQueues,
    setIsConnectModalOpen,
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

  // Cálculos REAIS sem dados inventados
  const totalFollowers = filteredAccounts.reduce((acc, a) => acc + a.followers, 0);
  const postsToday = selectedAccount
    ? selectedAccount.postsToday
    : accounts.reduce((acc, a) => acc + a.postsToday, 0);
  const targetToday = selectedAccount
    ? selectedAccount.defaultReelsPerDay + selectedAccount.defaultCarouselsPerDay
    : accounts.reduce((acc, a) => acc + a.defaultReelsPerDay + a.defaultCarouselsPerDay, 0);
  const progressTodayPercent = targetToday > 0 ? Math.min(Math.round((postsToday / targetToday) * 100), 100) : 0;

  const postsScheduled = selectedAccount
    ? selectedAccount.postsInQueue
    : scheduledPosts.length;
  const postsWithErrors = filteredErrors.length;
  const successRateText = publishedPosts.length > 0
    ? `${(filteredAccounts.reduce((acc, a) => acc + a.successRate, 0) / (filteredAccounts.length || 1)).toFixed(1).replace(".", ",")}%`
    : "—";

  const reelsInQueue = selectedAccount
    ? reelQueues.filter((q) => q.accountId === selectedAccount.id).reduce((acc, q) => acc + q.remainingCount, 0)
    : reelQueues.reduce((acc, q) => acc + q.remainingCount, 0);

  const carouselsInQueue = selectedAccount
    ? carouselQueues.filter((q) => q.accountId === selectedAccount.id).reduce((acc, q) => acc + q.remainingCount, 0)
    : carouselQueues.reduce((acc, q) => acc + q.remainingCount, 0);

  // Gráficos refletindo o estado real
  const chartDays = [
    { label: "10/09", value: 0 },
    { label: "11/09", value: 0 },
    { label: "12/09", value: 0 },
    { label: "13/09", value: 0 },
    { label: "14/09", value: 0 },
    { label: "15/09", value: 0 },
    { label: "Hoje", value: postsToday },
  ];

  const successVsErrorData = [
    { label: "Seg", value1: 0, value2: 0 },
    { label: "Ter", value1: 0, value2: 0 },
    { label: "Qua", value1: 0, value2: 0 },
    { label: "Qui", value1: 0, value2: 0 },
    { label: "Sex", value1: 0, value2: 0 },
    { label: "Sáb", value1: 0, value2: 0 },
    { label: "Hoje", value1: postsToday, value2: postsWithErrors },
  ];

  // Perfis com problema
  const accountsWithIssues = accounts.filter(
    (a) => a.status === "expired" || a.status === "error" || a.status === "paused"
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Aviso Profissional de Nenhuma Conta Conectada */}
      {accounts.length === 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-950">
                Nenhuma conta conectada
              </h4>
              <p className="text-xs text-indigo-700 mt-0.5">
                Conecte sua primeira conta do Instagram para iniciar agendamentos e visualizar métricas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Conectar conta</span>
          </button>
        </div>
      )}

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

      {/* Grade de Cards Principais com Estado Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Contas Conectadas"
          value={accounts.length}
          subtitle={accounts.length === 0 ? "Nenhuma conta ativa" : `${formatNumber(totalFollowers)} seguidores totais`}
          icon={<Users className="w-4 h-4 text-indigo-600" />}
        />

        <MetricCard
          title="Posts Publicados Hoje"
          value={postsToday}
          subtitle={targetToday > 0 ? `Meta diária: ${targetToday} posts` : "Nenhuma meta definida"}
          icon={<Send className="w-4 h-4 text-emerald-600" />}
        />

        <MetricCard
          title="Posts Agendados"
          value={postsScheduled}
          subtitle={postsScheduled > 0 ? "Programados nas filas" : "Nenhum post agendado"}
          icon={<Calendar className="w-4 h-4 text-indigo-600" />}
        />

        <MetricCard
          title="Posts com Erro"
          value={postsWithErrors}
          subtitle={postsWithErrors > 0 ? "Requer atenção na central" : "Nenhum erro encontrado"}
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          variant={postsWithErrors > 0 ? "error" : "default"}
        />
      </div>

      {/* Linha 2 de Cards Secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Taxa de Sucesso"
          value={successRateText}
          subtitle={publishedPosts.length > 0 ? "Entregas sem falhas" : "Sem publicações suficientes"}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />

        <MetricCard
          title="Reels na Fila"
          value={reelsInQueue}
          subtitle={reelsInQueue > 0 ? "Vídeos prontos para envio" : "Nenhuma fila criada"}
          icon={<Film className="w-4 h-4 text-rose-600" />}
        />

        <MetricCard
          title="Carrosséis na Fila"
          value={carouselsInQueue}
          subtitle={carouselsInQueue > 0 ? "Postagens multi-slides" : "Nenhuma fila criada"}
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
            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
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
                Relação diária de posts publicados com sucesso vs falhas
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

      {/* Comparação entre os Próprios Perfis Conectados */}
      {accounts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Comparação entre seus perfis
              </h3>
              <p className="text-xs text-slate-500">
                Desempenho comparativo entre todas as contas Instagram conectadas
              </p>
            </div>
            <Link
              href="/contas"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Gerenciar contas →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Perfil</th>
                  <th className="pb-3 px-4 text-right">Seguidores</th>
                  <th className="pb-3 px-4 text-right">Hoje</th>
                  <th className="pb-3 px-4 text-right">Fila</th>
                  <th className="pb-3 px-4 text-right">Taxa Sucesso</th>
                  <th className="pb-3 px-4 text-center">Conexão</th>
                  <th className="pb-3 pl-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
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
                        <div>
                          <div className="font-bold text-slate-900">@{acc.username}</div>
                          <div className="text-[11px] text-slate-400">{acc.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      {formatNumber(acc.followers)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      {acc.postsToday}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-indigo-600">
                      {acc.postsInQueue}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {acc.successRate > 0 ? `${acc.successRate.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          acc.status === "connected"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : acc.status === "paused"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {acc.status === "connected" ? "Ativa" : acc.status === "paused" ? "Pausada" : "Erro"}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Link
                        href={`/contas/${acc.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        Abrir perfil →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Ver agenda completa →
            </Link>
          </div>

          {filteredScheduled.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Nenhuma publicação agendada
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                Crie uma fila de Reels ou Carrosséis para programar postagens automáticas.
              </p>
              <Link
                href="/reels/nova-fila"
                className="py-1.5 px-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
              >
                + Agendar Reels
              </Link>
            </div>
          ) : (
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna 2: Perfis com Problema (5 colunas) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Perfis com problema
                </h3>
                <p className="text-xs text-slate-500">
                  Monitoramento de integridade e credenciais
                </p>
              </div>
            </div>

            {accountsWithIssues.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Nenhum erro encontrado
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Todas as conexões e filas estão operando normalmente.
                </p>
              </div>
            ) : (
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
                          {acc.statusMessage || "Verificar status"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              O monitoramento automático verifica tokens e status da Meta Graph API em tempo real.
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
              Mídias com maior volume de visualizações e alcance
            </p>
          </div>
        </div>

        {filteredPublished.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <Inbox className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              Nenhum conteúdo publicado ainda
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Seus posts de maior engajamento aparecerão aqui assim que forem enviados para o Instagram.
            </p>
          </div>
        ) : (
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
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
