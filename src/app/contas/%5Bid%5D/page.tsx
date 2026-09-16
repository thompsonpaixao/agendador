"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricCard } from "@/components/ui/MetricCard";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import {
  Wifi,
  Pause,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Clock,
  Shuffle,
  Shield,
  FileText,
  Calendar,
  Film,
  Layers,
  BarChart3,
  Settings,
  History,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, formatPercent } from "@/lib/utils";

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;

  const {
    accounts,
    toggleAccountPause,
    reconnectAccount,
    reelQueues,
    carouselQueues,
  } = useAppState();

  const { addToast } = useToast();

  const account = accounts.find((a) => a.id === accountId);

  const [activeTab, setActiveTab] = useState("visao-geral");

  // Configurações do formulário da conta
  const [defaultReelCaption, setDefaultReelCaption] = useState(
    account?.defaultReelCaption || ""
  );
  const [defaultCarouselCaption, setDefaultCarouselCaption] = useState(
    account?.defaultCarouselCaption || ""
  );
  const [reelsPerDay, setReelsPerDay] = useState(account?.defaultReelsPerDay || 5);
  const [carouselsPerDay, setCarouselsPerDay] = useState(
    account?.defaultCarouselsPerDay || 1
  );
  const [times, setTimes] = useState<string[]>(
    account?.defaultTimes || ["09:00", "12:00", "15:00", "18:00", "21:00"]
  );
  const [useRandomVariation, setUseRandomVariation] = useState(
    account?.useRandomTimeVariation ?? true
  );
  const [variationMinutes, setVariationMinutes] = useState(
    account?.randomVariationMinutes || 5
  );

  if (!account) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
        <h3 className="text-base font-bold text-slate-800">Conta não encontrada</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          A conta solicitada não existe ou foi removida.
        </p>
        <button
          type="button"
          onClick={() => router.push("/contas")}
          className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
        >
          Voltar para Contas
        </button>
      </div>
    );
  }

  const handleAddTime = () => {
    setTimes((prev) => [...prev, "16:00"]);
    addToast({
      type: "info",
      title: "Horário Adicionado",
      message: "Novo slot inserido na programação diária.",
    });
  };

  const handleRemoveTime = (index: number) => {
    setTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: "success",
      title: "Configurações Atualizadas",
      message: `As preferências de @${account.username} foram salvas.`,
    });
  };

  const handleTestConnection = () => {
    addToast({
      type: "info",
      title: "Testando Conexão...",
      message: `Enviando ping de teste para a Meta Graph API...`,
    });
    setTimeout(() => {
      if (account.status === "expired") {
        addToast({
          type: "error",
          title: "Token Expirado",
          message: "Renove o acesso clicando em Reconectar.",
        });
      } else {
        addToast({
          type: "success",
          title: "Conexão Bem-Sucedida!",
          message: "API da Meta operacional para este perfil.",
        });
      }
    }, 1000);
  };

  const tabs: TabItem[] = [
    { id: "visao-geral", label: "Visão Geral", icon: <Calendar className="w-4 h-4" /> },
    { id: "programacao", label: "Programação & Horários", icon: <Clock className="w-4 h-4" /> },
    { id: "reels", label: "Reels", icon: <Film className="w-4 h-4" /> },
    { id: "carrosseis", label: "Carrosséis", icon: <Layers className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "configuracoes", label: "Configurações", icon: <Settings className="w-4 h-4" /> },
    { id: "logs", label: "Logs", icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Botão Voltar */}
      <Link
        href="/contas"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para todas as contas</span>
      </Link>

      {/* Topo do Perfil */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
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
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                @{account.username}
              </h1>
              <StatusBadge status={account.status} />
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{account.name}</p>
          </div>
        </div>

        {/* Botões de Ação do Topo */}
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
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
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

      {/* Grade de Métricas da Conta */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Seguidores"
          value={formatNumber(account.followers)}
          subtitle="Audiência total"
        />
        <MetricCard
          title="Novos Hoje"
          value={`+${account.newFollowersToday}`}
          subtitle="Crescimento diário"
          variant="success"
        />
        <MetricCard
          title="Posts Hoje"
          value={account.postsToday}
          subtitle="Publicações concluídas"
        />
        <MetricCard
          title="Posts 7 Dias"
          value={account.postsLast7Days}
          subtitle="Volume semanal"
        />
        <MetricCard
          title="Taxa Sucesso"
          value={formatPercent(account.successRate)}
          subtitle="Sem falhas de envio"
          variant="success"
        />
        <MetricCard
          title="Erros"
          value={account.errorsCount}
          subtitle="Falhas registradas"
          variant={account.errorsCount > 0 ? "error" : "default"}
        />
      </div>

      {/* Abas */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Conteúdo das Abas */}
      {activeTab === "visao-geral" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Resumo Operacional
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Esta conta está programada para publicar até <strong>{reelsPerDay} Reels</strong> e <strong>{carouselsPerDay} Carrossel</strong> por dia, respeitando os horários padrão configurados.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block">Horários ativos</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">
                  {times.join(" • ")}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block">Variação de horário</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">
                  {useRandomVariation ? `Ativa (± ${variationMinutes} min)` : "Desativada"}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block">Conteúdo na fila</span>
                <span className="text-sm font-bold text-indigo-600 mt-1 block">
                  {account.postsInQueue} mídias agendadas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {(activeTab === "programacao" || activeTab === "configuracoes") && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6"
        >
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Configurações Padrão de Publicação
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Valores pré-carregados automaticamente ao criar novas filas de Reels e Carrosséis para este perfil.
            </p>
          </div>

          {/* Legenda padrão de Reels */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Legenda padrão de Reels
            </label>
            <textarea
              rows={3}
              value={defaultReelCaption}
              onChange={(e) => setDefaultReelCaption(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Legenda padrão de Carrossel */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Legenda padrão de Carrossel
            </label>
            <textarea
              rows={3}
              value={defaultCarouselCaption}
              onChange={(e) => setDefaultCarouselCaption(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Quantidade padrão por dia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Quantidade padrão de Reels por dia
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={reelsPerDay}
                onChange={(e) => setReelsPerDay(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Quantidade padrão de Carrosséis por dia
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={carouselsPerDay}
                onChange={(e) => setCarouselsPerDay(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Horários padrão */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">
                  Horários padrão diários
                </label>
                <span className="text-[11px] text-slate-400">
                  Defina os momentos exatos em que as publicações devem ser disparadas.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddTime}
                className="py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar horário</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {times.map((time, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const newTimes = [...times];
                      newTimes[index] = e.target.value;
                      setTimes(newTimes);
                    }}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(index)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                      title="Remover horário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Variação de Horário (Configuração Futura VISUALMENTE Pronta) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-indigo-600" />
                  Variação Aleatória de Horário (Anti-Detecção)
                </span>
                <span className="text-[11px] text-slate-500">
                  Adiciona uma variação randômica nos minutos de postagem para simular atividade humana orgânica.
                </span>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => setUseRandomVariation(!useRandomVariation)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  useRandomVariation ? "bg-indigo-600" : "bg-slate-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    useRandomVariation ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {useRandomVariation && (
              <div className="pt-2 flex items-center gap-3 animate-in fade-in">
                <span className="text-xs text-slate-600">Janela de variação:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={variationMinutes}
                    onChange={(e) => setVariationMinutes(parseInt(e.target.value) || 1)}
                    className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 text-center font-bold"
                  />
                  <span className="text-xs text-slate-500">minutos (± {variationMinutes} min)</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === "reels" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Filas de Reels para @{account.username}
            </h3>
            <Link
              href="/reels/nova-fila"
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              + Criar nova fila de Reels
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {reelQueues
              .filter((q) => q.accountId === account.id)
              .map((queue) => (
                <div key={queue.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">{queue.name}</span>
                    <span className="text-slate-500 text-[11px]">
                      {queue.publishedCount} de {queue.totalVideos} publicados
                    </span>
                  </div>
                  <StatusBadge status={queue.status} />
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === "carrosseis" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Carrosséis para @{account.username}
            </h3>
            <Link
              href="/carrosseis/novo"
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              + Criar novo carrossel
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Nenhum carrossel pendente de processamento no momento.
          </p>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">
            Histórico e Logs de Comunicação da Meta API
          </h3>
          <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-2">
            <div>[2026-09-15 21:00:02] POST /media?media_type=REELS status=200 container_id=178923091</div>
            <div>[2026-09-15 21:00:45] GET /178923091 status_code=FINISHED</div>
            <div>[2026-09-15 21:01:00] POST /media_publish creation_id=178923091 id=ig_1792039401</div>
            <div className="text-emerald-400">✓ Publicação confirmada via webhook da Meta.</div>
          </div>
        </div>
      )}
    </div>
  );
}
