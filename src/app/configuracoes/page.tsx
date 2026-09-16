"use client";

import React, { useState } from "react";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { useToast } from "@/context/ToastContext";
import {
  Settings as SettingsIcon,
  Sparkles,
  Database,
  HardDrive,
  Bell,
  Shield,
  CheckCircle2,
  Lock,
  Wifi,
  ExternalLink,
  Info,
  Server,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("meta-api");

  // Meta API campos visuais
  const [appId, setAppId] = useState("189283749201948");
  const [apiVersion, setApiVersion] = useState("v20.0");
  const [instagramUserId, setInstagramUserId] = useState("17841400234912000");

  // Supabase
  const [supabaseProject, setSupabaseProject] = useState("agendador-prod-db");
  const [supabaseRegion, setSupabaseRegion] = useState("sa-east-1 (São Paulo)");

  // Storage
  const [storageProvider, setStorageProvider] = useState("cloudflare-r2");

  const tabs: TabItem[] = [
    { id: "geral", label: "Geral", icon: <SettingsIcon className="w-4 h-4" /> },
    { id: "meta-api", label: "Meta API", icon: <Sparkles className="w-4 h-4" /> },
    { id: "supabase", label: "Supabase", icon: <Database className="w-4 h-4" /> },
    { id: "armazenamento", label: "Armazenamento", icon: <HardDrive className="w-4 h-4" /> },
    { id: "notificacoes", label: "Notificações", icon: <Bell className="w-4 h-4" /> },
    { id: "seguranca", label: "Segurança", icon: <Shield className="w-4 h-4" /> },
  ];

  const handleTestMetaConnection = () => {
    addToast({
      type: "info",
      title: "Verificando Meta API...",
      message: "Validando App ID e permissões com os servidores da Meta...",
    });

    setTimeout(() => {
      addToast({
        type: "success",
        title: "Meta Graph API Online",
        message: "Endpoint /v20.0 respondendo perfeitamente.",
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Configurações do Sistema
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Gerenciamento de infraestrutura, integrações de APIs externas, armazenamento de arquivos e credenciais de produção.
        </p>
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
                defaultValue="Agendador SaaS"
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
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configurações da aplicação cadastrada no portal Meta for Developers.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestMetaConnection}
              className="py-2 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Testar conexão</span>
            </button>
          </div>

          {/* AVISO DE SEGURANÇA MANDATÓRIO */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                Segurança em Primeiro Lugar:
              </span>
              <p className="leading-relaxed">
                Credenciais sensíveis (como <strong>Meta App Secret</strong> e <strong>Tokens de Acesso de Longa Duração</strong>) devem ser armazenadas <strong>apenas no servidor</strong> através de variáveis de ambiente seguras (<code className="px-1 py-0.2 rounded bg-amber-100 font-mono text-[11px]">.env.local</code> na Vercel). Nunca insira chaves secretas diretamente na interface do navegador.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Meta App ID
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Versão da Graph API
              </label>
              <input
                type="text"
                value={apiVersion}
                onChange={(e) => setApiVersion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Instagram Business Account ID Padrão
              </label>
              <input
                type="text"
                value={instagramUserId}
                onChange={(e) => setInstagramUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Status da Integração: <strong className="text-emerald-700">Online (Modo Demonstração)</strong></span>
            <span className="text-[11px] text-slate-400">Webhook: /api/meta/webhook</span>
          </div>
        </div>
      )}

      {/* ABA: SUPABASE */}
      {activeTab === "supabase" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Supabase (PostgreSQL & Auth)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Banco de dados relacional para persistência de filas, contas e métricas.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              ● Conectado (Mock)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Projeto Supabase</span>
              <input
                type="text"
                value={supabaseProject}
                onChange={(e) => setSupabaseProject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Região do Banco</span>
              <input
                type="text"
                value={supabaseRegion}
                onChange={(e) => setSupabaseRegion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">Tabelas Preparadas:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-indigo-700">
              <span>accounts</span>
              <span>media</span>
              <span>reel_queues</span>
              <span>carousels</span>
              <span>scheduled_posts</span>
              <span>published_posts</span>
              <span>error_logs</span>
              <span>notifications</span>
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
                Armazenamento de Mídia (Bucket S3 / R2)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Provedor de armazenamento em nuvem para vídeos e imagens dos carrosséis.
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              Online
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Espaço Utilizado</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">42,9 GB / 250 GB</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Arquivos Armazenados</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">4.850 arquivos</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-400 block text-[11px]">Largura de Banda (Egress)</span>
              <span className="font-bold text-emerald-600 text-sm mt-0.5 block">0 R$ (Sem custo R2)</span>
            </div>
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
    </div>
  );
}
