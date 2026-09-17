"use client";

import React, { useState } from "react";
import { MonitoringFolder, MonitoredProfile } from "@/types";
import {
  FolderPlus,
  UserPlus,
  Folder,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Info,
  Trash2,
} from "lucide-react";
import { InstagramIcon } from "@/components/icons/InstagramIcon";

export default function MonitoramentoPage() {
  // Estado local para pastas/nichos
  const [folders, setFolders] = useState<MonitoringFolder[]>([
    {
      id: "folder_1",
      userId: "user_1",
      name: "Fitness & Saúde",
      description: "Perfis de referência em treinos e nutrição",
      color: "#10B981",
      createdAt: new Date().toISOString(),
      profilesCount: 2,
    },
    {
      id: "folder_2",
      userId: "user_1",
      name: "Motos & Velocidade",
      description: "Criadores de conteúdo e oficinas de motociclismo",
      color: "#6366F1",
      createdAt: new Date().toISOString(),
      profilesCount: 1,
    },
  ]);

  // Estado local para perfis monitorados (sem token, sem scraping)
  const [profiles, setProfiles] = useState<MonitoredProfile[]>([
    {
      id: "mon_1",
      userId: "user_1",
      folderId: "folder_1",
      folderName: "Fitness & Saúde",
      username: "atleta_pro",
      displayName: "Treinos Diários",
      profileUrl: "https://www.instagram.com/atleta_pro/",
      platform: "instagram",
      status: "pending_setup",
      notes: "Referência em formato de reels curtos",
      createdAt: new Date().toISOString(),
      followersCount: 0,
      mediaCount: 0,
    },
    {
      id: "mon_2",
      userId: "user_1",
      folderId: "folder_1",
      folderName: "Fitness & Saúde",
      username: "nutricao_vida",
      displayName: "Nutrição e Vida",
      profileUrl: "https://www.instagram.com/nutricao_vida/",
      platform: "instagram",
      status: "pending_setup",
      notes: "Ideias de carrosséis educativos",
      createdAt: new Date().toISOString(),
      followersCount: 0,
      mediaCount: 0,
    },
    {
      id: "mon_3",
      userId: "user_1",
      folderId: "folder_2",
      folderName: "Motos & Velocidade",
      username: "custom_garage_br",
      displayName: "Custom Garage BR",
      profileUrl: "https://www.instagram.com/custom_garage_br/",
      platform: "instagram",
      status: "pending_setup",
      notes: "Vídeos dinâmicos de montagem",
      createdAt: new Date().toISOString(),
      followersCount: 0,
      mediaCount: 0,
    },
  ]);

  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [isAddProfileModalOpen, setIsAddProfileModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newFolderId, setNewFolderId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filteredProfiles = selectedFolderId === "all"
    ? profiles
    : profiles.filter((p) => p.folderId === selectedFolderId);

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const cleanUsername = newUsername.replace("@", "").trim();
    const targetFolder = folders.find((f) => f.id === newFolderId);

    const newProfile: MonitoredProfile = {
      id: `mon_${Date.now()}`,
      userId: "current_user",
      folderId: newFolderId || undefined,
      folderName: targetFolder?.name,
      username: cleanUsername,
      displayName: newDisplayName.trim() || cleanUsername,
      profileUrl: `https://www.instagram.com/${cleanUsername}/`,
      platform: "instagram",
      status: "pending_setup",
      notes: newNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    setProfiles((prev) => [newProfile, ...prev]);
    setIsAddProfileModalOpen(false);
    setNewUsername("");
    setNewDisplayName("");
    setNewNotes("");
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Topo: Título & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Perfis Monitorados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Acompanhe contas públicas de referência organizadas por nichos e pastas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddProfileModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Adicionar perfil para monitorar</span>
        </button>
      </div>

      {/* Banner de Conformidade Técnica Meta */}
      <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex items-start gap-3.5 text-xs text-indigo-900">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Política Oficial de Monitoramento (Sem Scraping)</div>
          <p className="text-indigo-800/90 leading-relaxed">
            O AgendadorAuto não utiliza automação de navegador, Selenium ou scraping não autorizado.
            A sincronização de métricas e conteúdo público utilizará a API oficial Business Discovery da Meta.
            Histórico retido em até 30 dias de snapshots sem armazenamento de arquivos de mídia de terceiros.
          </p>
        </div>
      </div>

      {/* Seletor de Pastas / Nichos */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
        <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-slate-400" />
          Nichos:
        </span>

        <button
          type="button"
          onClick={() => setSelectedFolderId("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            selectedFolderId === "all"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Todos os Nichos ({profiles.length})
        </button>

        {folders.map((folder) => {
          const count = profiles.filter((p) => p.folderId === folder.id).length;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedFolderId(folder.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedFolderId === folder.id
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: folder.color || "#6366F1" }}
              />
              <span>{folder.name}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid de Perfis Monitorados */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs">
          <InstagramIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Nenhum perfil cadastrado neste nicho</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Cadastre perfis públicos do Instagram para acompanhar referências e tendências.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/10 to-indigo-500/10 border border-pink-200/60 flex items-center justify-center shrink-0">
                      <InstagramIcon className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">@{item.username}</h4>
                      <p className="text-xs text-slate-500">{item.displayName}</p>
                    </div>
                  </div>

                  <a
                    href={item.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Abrir perfil oficial no Instagram"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Pasta / Nicho */}
                {item.folderName && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      <Folder className="w-3 h-3 text-slate-400" />
                      {item.folderName}
                    </span>
                  </div>
                )}

                {/* Notas de Acompanhamento */}
                {item.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl mt-3">
                    {item.notes}
                  </p>
                )}
              </div>

              {/* Status de Sincronização & Informações */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Requer configuração futura da API de descoberta
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDeleteProfile(item.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remover monitoramento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Retenção prevista: 30 dias</span>
                  <span>Sem cópia de mídia</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro de Perfil Monitorado */}
      {isAddProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Adicionar Perfil para Monitorar
              </h3>
              <button
                type="button"
                onClick={() => setIsAddProfileModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nome de Usuário (@ do Instagram) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">@</span>
                  <input
                    type="text"
                    required
                    placeholder="ex: criador_digital"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nome ou Descritivo de Exibição
                </label>
                <input
                  type="text"
                  placeholder="ex: Canal de Motos Oficial"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Pasta / Nicho
                </label>
                <select
                  value={newFolderId}
                  onChange={(e) => setNewFolderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">Sem pasta (Geral)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Notas / Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Por que você deseja acompanhar este perfil?"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                >
                  Cadastrar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
