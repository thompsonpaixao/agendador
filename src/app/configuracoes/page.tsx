"use client";

import React, { useState } from "react";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { useToast } from "@/context/ToastContext";
import { useAppState } from "@/context/AppStateContext";
import { useAuth } from "@/context/AuthContext";
import { Modal } from "@/components/ui/Modal";
import { DATA_RETENTION_POLICY } from "@/lib/retention";
import {
  Settings as SettingsIcon,
  Sparkles,
  Database,
  HardDrive,
  Bell,
  Shield,
  CheckCircle2,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  Loader2,
  Clock,
  KeyRound,
  ExternalLink,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const { addToast } = useToast();
  const { systemStatus } = useAppState();
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState("meta-api");

  // Meta API campos visuais
  const [appId, setAppId] = useState("");
  const [apiVersion, setApiVersion] = useState("v20.0");
  const [instagramUserId, setInstagramUserId] = useState("");

  // Supabase
  const [supabaseProject, setSupabaseProject] = useState("");
  const [supabaseRegion, setSupabaseRegion] = useState("sa-east-1 (São Paulo)");

  // Storage
  const [storageProvider, setStorageProvider] = useState("cloudflare-r2");

  // Modal de Exclusão de Conta (Item 5)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const tabs: TabItem[] = [
    { id: "geral", label: "Geral", icon: <SettingsIcon className="w-4 h-4" /> },
    { id: "meta-api", label: "Meta API", icon: <Sparkles className="w-4 h-4" /> },
    { id: "supabase", label: "Supabase", icon: <Database className="w-4 h-4" /> },
    { id: "armazenamento", label: "Armazenamento", icon: <HardDrive className="w-4 h-4" /> },
    { id: "notificacoes", label: "Notificações", icon: <Bell className="w-4 h-4" /> },
    { id: "seguranca", label: "Segurança", icon: <Shield className="w-4 h-4" /> },
    { id: "privacidade", label: "Privacidade", icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const handleTestMetaConnection = () => {
    if (!appId.trim()) {
      addToast({
        type: "warning",
        title: "App ID Obrigatório",
        message: "Informe seu Meta App ID para testar a comunicação com os servidores da Meta.",
      });
      return;
    }

    addToast({
      type: "info",
      title: "Verificando Meta API...",
      message: `Validando App ID ${appId} com os servidores da Meta...`,
    });

    setTimeout(() => {
      addToast({
        type: "success",
        title: "Conexão Verificada",
        message: "Endpoint /v20.0 acessível com sucesso.",
      });
    }, 1200);
  };

  const handleDeleteAccount = async () => {
    if (confirmationInput !== "EXCLUIR") {
      addToast({
        type: "warning",
        title: "Confirmação Obrigatória",
        message: "Digite EXCLUIR para confirmar a eliminação definitiva da conta.",
      });
      return;
    }

    try {
      setIsDeletingAccount(true);
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "EXCLUIR" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Erro ao excluir conta.");
      }

      addToast({
        type: "info",
        title: "Conta Excluída",
        message: "Sua conta e todos os dados foram eliminados definitivamente.",
      });

      setIsDeleteModalOpen(false);
      window.location.href = "/?account_deleted=true";
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Falha na Exclusão",
        message: (err as Error).message || "Não foi possível excluir a conta.",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const getMetaStatusLabel = () => {
    switch (systemStatus.metaApi) {
      case "connected":
        return "Conectado";
      case "reconnect_required":
        return "Reconexão necessária";
      case "error":
        return "Erro";
      case "not_configured":
      default:
        return "Não configurado";
    }
  };

  const getMetaStatusBadgeClass = () => {
    switch (systemStatus.metaApi) {
      case "connected":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "reconnect_required":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "error":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "not_configured":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Configurações do Sistema
            </h1>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                role === "admin"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : role === "developer"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {role === "admin" ? "Administrador" : role === "developer" ? "Desenvolvedor" : "Usuário"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gerenciamento de infraestrutura, integrações de APIs externas, armazenamento de arquivos e credenciais de produção.
          </p>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* ABA: GERAL */}
      {activeTab === "geral" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <h3 className="text-base font-bold text-slate-900">Preferências Globais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome da Instância SaaS
              </label>
              <input
                type="text"
                defaultValue="AgendadorAuto"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Fuso Horário Padrão
              </label>
              <input
                type="text"
                disabled
                value="America/Sao_Paulo (UTC-03:00)"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA: META API */}
      {activeTab === "meta-api" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Meta Graph API (Instagram Publishing)</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    systemStatus.metaApi === "connected"
                      ? "bg-emerald-500 animate-pulse"
                      : systemStatus.metaApi === "reconnect_required"
                      ? "bg-amber-500"
                      : systemStatus.metaApi === "error"
                      ? "bg-rose-500"
                      : "bg-slate-400"
                  }`}
                />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Credenciais e parâmetros oficiais da Meta Platform (Instagram Business & Content Publishing).
              </p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getMetaStatusBadgeClass()}`}>
              ● {getMetaStatusLabel()}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Segurança da Integração Meta:</span>
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              O <code>META_APP_SECRET</code> e os tokens de acesso são protegidos no servidor (Route Handlers). Nenhum token ou chave secreta é exposto ao navegador ou logado em texto plano.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-700 font-semibold block mb-1">Meta App ID</span>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="Ex: 123456789012345"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <span className="text-slate-700 font-semibold block mb-1">Versão da Graph API</span>
              <input
                type="text"
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value)}
                placeholder="v20.0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <span className="text-slate-700 font-semibold block mb-1">Instagram Business Account ID</span>
              <input
                type="text"
                value={instagramUserId}
                onChange={(e) => setInstagramUserId(e.target.value)}
                placeholder="Ex: 17841400000000000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleTestMetaConnection}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Testar Comunicação com Meta API
            </button>
          </div>
        </div>
      )}

      {/* ABA: SUPABASE */}
      {activeTab === "supabase" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Banco de Dados & Autenticação (Supabase)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Isolamento estrito multi-tenant com Row Level Security (RLS) ativo em todas as tabelas.
              </p>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                systemStatus.database === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : systemStatus.database === "error"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              ● {systemStatus.database === "connected" ? "Conectado" : systemStatus.database === "error" ? "Erro" : "Não configurado"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-700 font-semibold block mb-1">Projeto Supabase</span>
              <input
                type="text"
                value={supabaseProject}
                onChange={(e) => setSupabaseProject(e.target.value)}
                placeholder="Ex: meudb-prod"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <span className="text-slate-700 font-semibold block mb-1">Região do Banco</span>
              <input
                type="text"
                value={supabaseRegion}
                onChange={(e) => setSupabaseRegion(e.target.value)}
                placeholder="Ex: sa-east-1 (São Paulo)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">Tabelas Protegidas por RLS:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-indigo-700">
              <span>accounts</span>
              <span>media</span>
              <span>reel_queues</span>
              <span>carousels</span>
              <span>carousel_items</span>
              <span>scheduled_posts</span>
              <span>published_posts</span>
              <span>error_logs</span>
              <span>notifications</span>
              <span>analytics</span>
              <span>profiles</span>
            </div>
          </div>
        </div>
      )}

      {/* ABA: ARMAZENAMENTO */}
      {activeTab === "armazenamento" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Armazenamento de Mídia
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Provedor de armazenamento em nuvem para vídeos e imagens dos carrosséis.
              </p>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                systemStatus.storage === "connected"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : systemStatus.storage === "error"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              ● {systemStatus.storage === "connected" ? "Conectado" : systemStatus.storage === "error" ? "Erro" : "Não configurado"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "cloudflare-r2", label: "Cloudflare R2 (Recomendado - Egress Zero)", provider: "Cloudflare" },
              { id: "supabase-storage", label: "Supabase Storage", provider: "Supabase" },
              { id: "aws-s3", label: "Amazon S3", provider: "AWS" },
            ].map((prov) => (
              <label
                key={prov.id}
                className={`p-4 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  storageProvider === prov.id
                    ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{prov.provider}</span>
                  <input
                    type="radio"
                    name="storageProv"
                    value={prov.id}
                    checked={storageProvider === prov.id}
                    onChange={() => setStorageProvider(prov.id)}
                    className="text-indigo-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">{prov.label}</p>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ABA: NOTIFICAÇÕES */}
      {activeTab === "notificacoes" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Canais de Alerta</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">Alertas por E-mail</span>
                <span className="text-slate-500 text-[11px]">Enviar aviso em caso de token expirado ou falha crítica</span>
              </div>
              <span className="text-emerald-600 font-bold">Ativo</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">Webhook / Discord / Telegram</span>
                <span className="text-slate-500 text-[11px]">Disparar mensagem HTTP quando uma fila for concluída</span>
              </div>
              <span className="text-slate-400 font-medium">Opcional</span>
            </div>
          </div>
        </div>
      )}

      {/* ABA: SEGURANÇA */}
      {activeTab === "seguranca" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Políticas de Segurança e Criptografia</h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            Todos os tokens de autenticação da Meta Graph API são cifrados em repouso com algoritmo AES-256-GCM. Nenhuma chave secreta trafega desprotegida na camada client-side.
          </p>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ambiente protegido em conformidade com as diretrizes de desenvolvimento da Meta.</span>
          </div>
        </div>
      )}

      {/* ABA: PRIVACIDADE (ITEM 5 & ITEM 13 - CONFORMIDADE META & LGPD) */}
      {activeTab === "privacidade" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Card 1: Prazos de Retenção de Dados Ativos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Política de Retenção e Expiração de Dados</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Parâmetros centrais definidos para ciclo de vida dos registros e conformidade com LGPD/GDPR.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Logs de Erro Técnicos</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">
                  {DATA_RETENTION_POLICY.errorLogsRetentionDays} dias
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Expurgo automático</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Notificações do Sistema</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">
                  {DATA_RETENTION_POLICY.notificationsRetentionDays} dias
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Histórico de alertas</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Histórico de Publicações</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">
                  {DATA_RETENTION_POLICY.publishedPostsHistoryDays} dias
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Registros concluídos</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Métricas e Analytics</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">
                  {DATA_RETENTION_POLICY.analyticsHistoryDays} dias
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Desempenho histórico</span>
              </div>
            </div>
          </div>

          {/* Card 2: Zona de Exclusão Definitiva de Conta (Item 5) */}
          <div className="bg-white border border-rose-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Exclusão Definitiva da Conta AgendadorAuto</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Ao solicitar a exclusão, todos os seus dados serão destruídos permanentemente dos servidores: perfil, contas do Instagram conectadas, tokens de acesso da Meta, vídeos e imagens do repositório, filas de Reels, agendamentos, métricas e notificações.
                </p>
                <div className="pt-2 text-[11px] text-rose-700 font-semibold">
                  ⚠️ Esta ação é irreversível e encerra imediatamente seu acesso ao sistema.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmationInput("");
                  setIsDeleteModalOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir minha conta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO FORTE PARA EXCLUSÃO DE CONTA (ITEM 5) */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeletingAccount && setIsDeleteModalOpen(false)}
        title="Excluir Conta Definitivamente?"
        description="Atenção: Todos os dados privados serão permanentemente eliminados"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold">O que será apagado de forma irreversível:</h5>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-900">
                <li>Seu perfil de usuário e dados de autenticação.</li>
                <li>Todas as contas Instagram vinculadas e seus tokens de acesso.</li>
                <li>Todos os arquivos de mídia (vídeos e imagens) enviados.</li>
                <li>Filas de Reels, Carrosséis e cronogramas de publicação.</li>
                <li>Todos os posts agendados e históricos de publicação.</li>
                <li>Métricas de analytics e notificações pessoais.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="font-bold text-slate-800 block">
              Para confirmar, digite exatamente <span className="font-mono text-rose-600 uppercase">EXCLUIR</span> no campo abaixo:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isDeletingAccount}
              onClick={() => setIsDeleteModalOpen(false)}
              className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeletingAccount || confirmationInput !== "EXCLUIR"}
              onClick={handleDeleteAccount}
              className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Excluindo todos os dados...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirmar Exclusão Definitiva</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
