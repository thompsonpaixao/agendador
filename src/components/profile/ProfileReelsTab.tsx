"use client";

import React, { useState, useMemo } from "react";
import { Account, MediaItem, ReelQueue } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBytes, formatDate, formatTime } from "@/lib/utils";
import {
  Film,
  Plus,
  Shuffle,
  RotateCcw,
  Trash2,
  Play,
  Pause,
  Clock,
  Calendar,
  Check,
  FileText,
  UploadCloud,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  Layers,
} from "lucide-react";
import Image from "next/image";

interface ProfileReelsTabProps {
  account: Account;
  accountMedia: MediaItem[];
  accountQueues: ReelQueue[];
}

export function ProfileReelsTab({
  account,
  accountMedia,
  accountQueues,
}: ProfileReelsTabProps) {
  const { addProfileMedia, deleteProfileMedia, addReelQueue, toggleQueuePause } = useAppState();
  const { addToast } = useToast();

  const [subTab, setSubTab] = useState<"repositorio" | "nova-fila" | "filas">("repositorio");

  // Filtra apenas vídeos da conta
  const videosInRepo = useMemo(() => {
    return accountMedia.filter((m) => m.type === "video");
  }, [accountMedia]);

  // Estado da Nova Fila
  const [queueName, setQueueName] = useState(`Fila de Reels - ${new Date().toLocaleDateString("pt-BR")}`);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [queueVideos, setQueueVideos] = useState<MediaItem[]>([]);
  const [originalOrder, setOriginalOrder] = useState<MediaItem[]>([]);
  const [postsPerDay, setPostsPerDay] = useState<number>(account.defaultReelsPerDay || 5);
  const [useCustomTimes, setUseCustomTimes] = useState<boolean>(false);
  const [dailyTimes, setDailyTimes] = useState<string[]>(
    account.defaultTimes.length > 0 ? account.defaultTimes : ["09:00", "12:00", "15:00", "18:00", "21:00"]
  );
  const [captionMode, setCaptionMode] = useState<"profile_default" | "custom_all" | "individual" | "none">("profile_default");
  const [customCaption, setCustomCaption] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Upload no Repositório do Perfil
  const handleUploadToRepo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMedia: Omit<MediaItem, "id" | "accountId">[] = Array.from(files).map((file, idx) => ({
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file),
      thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
      type: "video",
      sizeBytes: file.size,
      durationSeconds: Math.floor(Math.random() * 45) + 15,
      position: idx + 1,
      status: "ready",
    }));

    addProfileMedia(account.id, newMedia);
    e.target.value = "";
  };

  // Upload direto na criação da fila
  const handleUploadToQueue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newMedia: MediaItem[] = Array.from(files).map((file, idx) => ({
      id: `q_temp_${Date.now()}_${idx}`,
      accountId: account.id,
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file),
      thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
      type: "video",
      sizeBytes: file.size,
      durationSeconds: Math.floor(Math.random() * 45) + 15,
      position: queueVideos.length + idx + 1,
      status: "ready",
      createdAt: new Date().toISOString(),
    }));

    const updated = [...queueVideos, ...newMedia];
    setQueueVideos(updated);
    setOriginalOrder(updated);
    // Também adiciona ao repositório
    addProfileMedia(
      account.id,
      newMedia.map((m) => ({
        name: m.name,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        type: "video",
        sizeBytes: m.sizeBytes,
        durationSeconds: m.durationSeconds,
        position: m.position,
        status: "ready",
      }))
    );
    e.target.value = "";
  };

  // Carregar vídeos selecionados do repositório para a fila
  const handleLoadSelectedToQueue = () => {
    const selected = videosInRepo.filter((v) => selectedVideoIds.includes(v.id));
    if (selected.length === 0) {
      addToast({
        type: "warning",
        title: "Nenhum Vídeo Selecionado",
        message: "Marque os vídeos que deseja incluir na nova fila.",
      });
      return;
    }
    setQueueVideos(selected);
    setOriginalOrder(selected);
    setSubTab("nova-fila");
    addToast({
      type: "success",
      title: "Vídeos Carregados na Fila",
      message: `${selected.length} vídeos foram transferidos para o assistente de fila.`,
    });
  };

  // Embaralhar ordem
  const handleShuffle = () => {
    if (queueVideos.length <= 1) return;
    const shuffled = [...queueVideos].sort(() => Math.random() - 0.5);
    setQueueVideos(shuffled);
    addToast({
      type: "info",
      title: "Ordem Embaralhada!",
      message: `${queueVideos.length} vídeos foram reorganizados aleatoriamente.`,
    });
  };

  // Restaurar ordem
  const handleRestore = () => {
    setQueueVideos([...originalOrder]);
    addToast({
      type: "info",
      title: "Ordem Restaurada",
      message: "Sequência original recuperada.",
    });
  };

  // Usar horários padrão do perfil
  const handleApplyProfileTimes = () => {
    setDailyTimes(account.defaultTimes.length > 0 ? account.defaultTimes : ["09:00", "12:00", "15:00", "18:00", "21:00"]);
    setUseCustomTimes(false);
    addToast({
      type: "success",
      title: "Horários do Perfil Aplicados",
      message: `Carregados ${account.defaultTimes.length} horários configurados em @${account.username}.`,
    });
  };

  // Estimativa de dias
  const totalDays = Math.max(1, Math.ceil((queueVideos.length || 1) / (postsPerDay || 1)));
  const estimatedDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + totalDays);
    return d.toLocaleDateString("pt-BR");
  }, [startDate, totalDays]);

  // Criar Fila
  const handleCreateQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (queueVideos.length === 0) {
      addToast({
        type: "error",
        title: "Fila Vazia",
        message: "Adicione ou selecione ao menos um vídeo para a fila.",
      });
      return;
    }

    addReelQueue({
      accountId: account.id,
      accountUsername: account.username,
      accountAvatar: account.profilePicture,
      name: queueName,
      totalVideos: queueVideos.length,
      publishedCount: 0,
      remainingCount: queueVideos.length,
      errorCount: 0,
      nextScheduledAt: new Date(Date.now() + 3600000).toISOString(),
      estimatedFinishAt: new Date(Date.now() + totalDays * 86400000).toISOString(),
      status: "active",
      videos: queueVideos,
      captionMode,
      customCaption: captionMode === "custom_all" ? customCaption : undefined,
      postsPerDay,
      dailyTimes,
      distributeUntilEmpty: true,
      startDate,
    });

    setQueueVideos([]);
    setSelectedVideoIds([]);
    setSubTab("filas");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Sub-navegação interna de Reels */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("repositorio")}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === "repositorio"
                ? "bg-white text-rose-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Repositório ({videosInRepo.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("nova-fila")}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === "nova-fila"
                ? "bg-white text-rose-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Fila {queueVideos.length > 0 && `(${queueVideos.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("filas")}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === "filas"
                ? "bg-white text-rose-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Filas Ativas ({accountQueues.length})</span>
          </button>
        </div>

        {subTab === "repositorio" && (
          <label
            htmlFor="repoUploadInput"
            className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Adicionar Reels a @{account.username}</span>
            <input
              id="repoUploadInput"
              type="file"
              multiple
              accept="video/*"
              onChange={handleUploadToRepo}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* SUB-ABA 1: REPOSITÓRIO DE REELS DO PERFIL */}
      {subTab === "repositorio" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Repositório de Reels de @{account.username}
              </h3>
              <p className="text-xs text-slate-500">
                Todos os arquivos abaixo pertencem exclusivamente a este perfil e nunca se misturam com outras contas.
              </p>
            </div>

            {selectedVideoIds.length > 0 && (
              <button
                type="button"
                onClick={handleLoadSelectedToQueue}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Fila com {selectedVideoIds.length} Vídeos Selecionados</span>
              </button>
            )}
          </div>

          {videosInRepo.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Nenhum vídeo no repositório de @{account.username}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Faça upload de vídeos MP4/MOV para criar o banco de Reels desta conta. Ao subir, os vídeos são salvos automaticamente para este perfil.
              </p>
              <label
                htmlFor="emptyRepoUpload"
                className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs cursor-pointer transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Fazer Upload de Vídeos</span>
                <input
                  id="emptyRepoUpload"
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={handleUploadToRepo}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>{videosInRepo.length} vídeos disponíveis</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedVideoIds.length === videosInRepo.length) {
                      setSelectedVideoIds([]);
                    } else {
                      setSelectedVideoIds(videosInRepo.map((v) => v.id));
                    }
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  {selectedVideoIds.length === videosInRepo.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {videosInRepo.map((video) => {
                  const isSelected = selectedVideoIds.includes(video.id);
                  return (
                    <div
                      key={video.id}
                      className={`relative bg-white border rounded-2xl p-2.5 flex flex-col justify-between transition-all group ${
                        isSelected ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20" : "border-slate-200"
                      }`}
                    >
                      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-900 mb-2">
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.name}
                          fill
                          className="object-cover opacity-85 group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedVideoIds((prev) =>
                              prev.includes(video.id)
                                ? prev.filter((id) => id !== video.id)
                                : [...prev, video.id]
                            );
                          }}
                          className="absolute top-2 left-2 rounded border-white text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4 z-10"
                        />
                        <span className="absolute bottom-2 right-2 text-[10px] bg-slate-900/80 text-white px-1.5 py-0.5 rounded font-mono">
                          {video.durationSeconds}s
                        </span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {video.name}
                        </span>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{formatBytes(video.sizeBytes)}</span>
                          <button
                            type="button"
                            onClick={() => deleteProfileMedia(account.id, video.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Excluir do repositório"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: NOVA FILA DE REELS */}
      {subTab === "nova-fila" && (
        <form onSubmit={handleCreateQueue} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Nova Fila de Reels para @{account.username}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure vídeos, legendas, horários e distribuição automatizada.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={queueVideos.length <= 1}
                  onClick={handleShuffle}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Embaralhar Ordem</span>
                </button>

                <button
                  type="button"
                  disabled={queueVideos.length <= 1}
                  onClick={handleRestore}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar</span>
                </button>
              </div>
            </div>

            {/* Nome da Fila */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Nome de identificação da fila
              </label>
              <input
                type="text"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold"
              />
            </div>

            {/* Grade de Vídeos da Fila com Dropzone */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Vídeos na Fila ({queueVideos.length})
                </span>
                <label
                  htmlFor="queueUploadInput"
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Fazer upload de mais vídeos</span>
                  <input
                    id="queueUploadInput"
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={handleUploadToQueue}
                    className="hidden"
                  />
                </label>
              </div>

              {queueVideos.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Film className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Nenhum vídeo adicionado a esta fila
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                    Você pode selecionar vídeos do repositório ou fazer upload agora mesmo.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubTab("repositorio")}
                    className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Selecionar do Repositório ({videosInRepo.length})</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {queueVideos.map((video, idx) => (
                    <div
                      key={video.id}
                      className="relative bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col justify-between group"
                    >
                      <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-slate-900 mb-1.5">
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="absolute bottom-1.5 right-1.5 text-[9px] bg-slate-900/80 text-white px-1 rounded font-mono">
                          {video.durationSeconds}s
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800 truncate block max-w-[80px]">
                          {video.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQueueVideos((prev) => prev.filter((v) => v.id !== video.id))}
                          className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Configuração de Legenda */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Configuração de Legenda
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  { id: "profile_default", label: "Usar legenda padrão do perfil" },
                  { id: "custom_all", label: "Legenda personalizada para toda a fila" },
                  { id: "individual", label: "Usar legendas individuais" },
                  { id: "none", label: "Sem legenda" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-start gap-2 ${
                      captionMode === opt.id
                        ? "border-purple-600 bg-purple-50/50 text-purple-900 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="captionMode"
                      checked={captionMode === opt.id}
                      onChange={() => setCaptionMode(opt.id as any)}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Prévia da Legenda Padrão do Perfil */}
              {captionMode === "profile_default" && (
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs space-y-1">
                  <span className="font-bold text-purple-900 block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Prévia da Legenda Padrão de @{account.username}:
                  </span>
                  <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-purple-100 leading-relaxed">
                    {account.defaultReelCaption || "Nenhuma legenda padrão configurada ainda neste perfil. Acesse a aba Configurações para definir."}
                  </p>
                </div>
              )}

              {captionMode === "custom_all" && (
                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="Digite a legenda que será aplicada a todos os vídeos desta fila..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Horários e Distribuição Diária */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Frequência e Horários Diários
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleApplyProfileTimes}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      !useCustomTimes
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Usar horários padrão do perfil
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomTimes(true)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      useCustomTimes
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Personalizar horários
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Reels por dia
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(parseInt(e.target.value) || 1)}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Data de início
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-1">
                  <span className="text-[11px] font-semibold text-indigo-700 block">
                    Estimativa de Conclusão
                  </span>
                  <span className="text-xs font-bold text-indigo-900 block pt-1">
                    {totalDays} dia(s) • término em {estimatedDate}
                  </span>
                </div>
              </div>

              {/* Lista de Horários */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 block">
                  Slots diários ({dailyTimes.length} horários)
                </span>
                <div className="flex flex-wrap gap-2">
                  {dailyTimes.map((time, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 font-mono"
                    >
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSubTab("repositorio")}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={queueVideos.length === 0}
                className="py-2.5 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-rose-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Criar e Ativar Fila de Reels</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-ABA 3: FILAS ATIVAS */}
      {subTab === "filas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Filas de Reels em Execução para @{account.username}
            </h3>
            <button
              type="button"
              onClick={() => setSubTab("nova-fila")}
              className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Nova Fila</span>
            </button>
          </div>

          {accountQueues.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
              <Film className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">
                Nenhuma fila ativa no momento
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Crie sua primeira fila para programar a publicação contínua dos vídeos.
              </p>
              <button
                type="button"
                onClick={() => setSubTab("nova-fila")}
                className="py-1.5 px-3.5 rounded-xl bg-rose-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Iniciar Fila Agora</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {accountQueues.map((queue) => {
                const percent = Math.round((queue.publishedCount / (queue.totalVideos || 1)) * 100);
                return (
                  <div
                    key={queue.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-bold text-slate-900 text-sm">{queue.name}</h4>
                        <StatusBadge status={queue.status} />
                      </div>
                      <span className="text-xs text-slate-400">
                        Criada em {formatDate(queue.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          {queue.publishedCount} de {queue.totalVideos} vídeos publicados ({percent}%)
                        </span>
                        <span className="text-slate-500">
                          Restantes: <strong className="text-slate-800">{queue.remainingCount}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-600 h-full rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-500">
                        Próxima: <strong className="text-rose-600">{queue.nextScheduledAt ? formatTime(queue.nextScheduledAt) : "—"}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleQueuePause(queue.id, "reel")}
                        className="py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        {queue.status === "paused" ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        <span>{queue.status === "paused" ? "Reativar" : "Pausar"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
