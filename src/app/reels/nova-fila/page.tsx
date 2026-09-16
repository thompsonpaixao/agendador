"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { QueueService } from "@/services/queueService";
import { MediaItem } from "@/types";
import {
  UploadCloud,
  Shuffle,
  RotateCcw,
  CheckSquare,
  Trash2,
  Calendar,
  Check,
  ArrowRight,
  Info,
  GripVertical,
  FileText,
} from "lucide-react";
import Image from "next/image";
import { formatBytes } from "@/lib/utils";

// 12 vídeos de demonstração pré-carregados para testar o embaralhamento e fila imediatamente
const INITIAL_DEMO_VIDEOS: MediaItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `vid_${i + 1}`,
  name: `Reel_Conteudo_Viral_${(i + 1).toString().padStart(2, "0")}.mp4`,
  url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  thumbnailUrl: `https://images.unsplash.com/photo-${1500000000000 + i * 500000}?w=300&auto=format&fit=crop&q=80`,
  type: "video",
  sizeBytes: 18_400_000 + i * 1_200_000,
  durationSeconds: 28 + (i % 30),
  position: i + 1,
  status: "ready",
}));

export default function NovaFilaReelsPage() {
  const { accounts, selectedAccountId, addReelQueue } = useAppState();
  const { addToast } = useToast();

  // Etapa 1: Perfil selecionado
  const [targetAccountId, setTargetAccountId] = useState(
    selectedAccountId !== "all" ? selectedAccountId : accounts[0]?.id || ""
  );

  const targetAccount = accounts.find((a) => a.id === targetAccountId) || accounts[0];

  // Etapa 2: Vídeos da Fila
  const [videos, setVideos] = useState<MediaItem[]>(INITIAL_DEMO_VIDEOS);
  const [originalOrder, setOriginalOrder] = useState<MediaItem[]>(INITIAL_DEMO_VIDEOS);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Configuração de Legenda
  const [captionMode, setCaptionMode] = useState<
    "profile_default" | "custom_all" | "individual" | "none"
  >("profile_default");
  const [customCaption, setCustomCaption] = useState(
    "Confira essa super dica imperdível! Salve o post para consultar mais tarde 🔥🚀 #reels #dicas #explore"
  );

  // Configuração de Programação
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reelsPerDay, setReelsPerDay] = useState(5);
  const [dailyTimes, setDailyTimes] = useState<string[]>([
    "09:00",
    "12:00",
    "15:00",
    "18:00",
    "21:00",
  ]);
  const [distributeUntilEmpty, setDistributeUntilEmpty] = useState(true);

  // Atualiza horários dinamicamente ao mudar a quantidade diária
  const handleQuantityChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(20, newCount));
    setReelsPerDay(validCount);
    setDailyTimes(QueueService.generateDefaultTimes(validCount));
  };

  // Usar horários padrão do perfil
  const handleUseAccountDefaults = () => {
    if (targetAccount) {
      setReelsPerDay(targetAccount.defaultReelsPerDay);
      setDailyTimes([...targetAccount.defaultTimes]);
      addToast({
        type: "info",
        title: "Horários Padrão Aplicados",
        message: `Carregados os ${targetAccount.defaultTimes.length} horários configurados em @${targetAccount.username}.`,
      });
    }
  };

  // Botão Embaralhar
  const handleShuffle = () => {
    const shuffled = QueueService.shuffleArray(videos).map((v, i) => ({
      ...v,
      position: i + 1,
    }));
    setVideos(shuffled);
    addToast({
      type: "success",
      title: "Ordem Embaralhada!",
      message: `A sequência de ${videos.length} vídeos foi aleatorizada com sucesso.`,
    });
  };

  // Restaurar Ordem
  const handleRestoreOrder = () => {
    setVideos(originalOrder.map((v, i) => ({ ...v, position: i + 1 })));
    addToast({
      type: "info",
      title: "Ordem Restaurada",
      message: "Os vídeos voltaram para a sequência inicial de upload.",
    });
  };

  // Selecionar Todos
  const handleSelectAll = () => {
    if (selectedVideoIds.length === videos.length) {
      setSelectedVideoIds([]);
    } else {
      setSelectedVideoIds(videos.map((v) => v.id));
    }
  };

  // Excluir Selecionados
  const handleDeleteSelected = () => {
    if (selectedVideoIds.length === 0) return;
    const remaining = videos.filter((v) => !selectedVideoIds.includes(v.id));
    setVideos(remaining.map((v, i) => ({ ...v, position: i + 1 })));
    setSelectedVideoIds([]);
    addToast({
      type: "warning",
      title: "Vídeos Removidos",
      message: `${selectedVideoIds.length} vídeos foram removidos da fila.`,
    });
  };

  // Upload simulado de múltiplos arquivos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: MediaItem[] = Array.from(files).map((file, idx) => ({
      id: `upload_${Date.now()}_${idx}`,
      name: file.name,
      url: URL.createObjectURL(file),
      thumbnailUrl:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80",
      type: "video",
      sizeBytes: file.size,
      durationSeconds: 30,
      position: videos.length + idx + 1,
      status: "ready",
    }));

    const updated = [...videos, ...newItems];
    setVideos(updated);
    setOriginalOrder(updated);

    addToast({
      type: "success",
      title: "Vídeos Adicionados",
      message: `${newItems.length} novos arquivos foram inseridos na fila.`,
    });
  };

  // Drag and Drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...videos];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setVideos(updated.map((v, i) => ({ ...v, position: i + 1 })));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Cálculo da estimativa final
  const { totalDays, formattedDate: estimatedEndDate } =
    QueueService.calculateEstimatedFinishDate(
      videos.length,
      reelsPerDay,
      startDate
    );

  const totalBytes = videos.reduce((acc, v) => acc + v.sizeBytes, 0);

  // Submissão da fila
  const handleCreateQueue = () => {
    if (videos.length === 0) {
      addToast({
        type: "error",
        title: "Fila Vazia",
        message: "Faça upload de pelo menos um vídeo para criar a fila.",
      });
      return;
    }

    addReelQueue({
      accountId: targetAccount.id,
      accountUsername: targetAccount.username,
      accountAvatar: targetAccount.profilePicture,
      name: `Fila Reels #${Date.now().toString().slice(-4)} - @${targetAccount.username}`,
      totalVideos: videos.length,
      publishedCount: 0,
      remainingCount: videos.length,
      errorCount: 0,
      nextScheduledAt: `${startDate}T${dailyTimes[0] || "09:00"}:00Z`,
      estimatedFinishAt: `${estimatedEndDate}T${dailyTimes[dailyTimes.length - 1] || "21:00"}:00Z`,
      status: "active",
      captionMode,
      customCaption: captionMode === "custom_all" ? customCaption : undefined,
      postsPerDay: reelsPerDay,
      dailyTimes,
      distributeUntilEmpty,
      startDate,
      videos,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Topo */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Nova fila de Reels
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200">
            Reels Automation
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Faça upload de dezenas ou centenas de vídeos, configure legendas, horários e deixe o sistema publicar automaticamente.
        </p>
      </div>

      {/* ETAPA 1: Selecionar Perfil */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
            1
          </span>
          <h3 className="text-base font-bold text-slate-900">
            Selecionar Conta de Destino
          </h3>
          <span className="text-rose-500 text-xs">*</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => {
            const isSelected = acc.id === targetAccountId;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setTargetAccountId(acc.id)}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <Image
                    src={acc.profilePicture}
                    alt={acc.username}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="truncate flex-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    @{acc.username}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{acc.name}</div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ETAPA 2: Upload de Vídeos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              2
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Upload de Vídeos para a Fila
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
            <span>Quantidade: <strong className="text-slate-900">{videos.length} vídeos</strong></span>
            <span>•</span>
            <span>Tamanho total: <strong className="text-slate-900">{formatBytes(totalBytes)}</strong></span>
          </div>
        </div>

        {/* Área Drag and Drop */}
        <label
          htmlFor="videoUploadInput"
          className="relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
        >
          <input
            id="videoUploadInput"
            type="file"
            multiple
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleFileUpload}
            className="sr-only"
          />

          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h4 className="text-sm font-bold text-slate-800">
            Arraste seus vídeos aqui
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            ou clique para selecionar do seu computador (Múltiplos arquivos aceitos)
          </p>
          <span className="text-[11px] text-slate-400 mt-2">
            Formatos recomendados pela Meta: MP4 (H.264), 1080x1920 (9:16), até 60s
          </span>
        </label>

        {/* Barra de Ações da Lista: Embaralhar, Restaurar, etc */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Indicador Numérico Grande */}
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold text-indigo-600 tracking-tight">
              {videos.length}
            </span>
            <div className="text-xs text-slate-500 leading-tight">
              <span className="font-bold text-slate-800 block">vídeos na fila</span>
              <span>arraste para reordenar individualmente</span>
            </div>
          </div>

          {/* Botões de Ordem */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShuffle}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              title="Embaralhar ordem de exibição dos vídeos"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Embaralhar</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreOrder}
              className="py-2 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Restaurar ordem</span>
            </button>

            <button
              type="button"
              onClick={handleSelectAll}
              className="py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {selectedVideoIds.length === videos.length ? "Desmarcar" : "Selecionar todos"}
              </span>
            </button>

            {selectedVideoIds.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir ({selectedVideoIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Grade de Vídeos em Cards com Drag & Drop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto p-1 scrollbar-thin">
          {videos.map((video, index) => {
            const isSelected = selectedVideoIds.includes(video.id);
            return (
              <div
                key={video.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`group p-3 rounded-xl border transition-all select-none flex items-center gap-3 cursor-grab active:cursor-grabbing ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                } ${draggedIndex === index ? "opacity-40 scale-95 border-dashed" : ""}`}
              >
                {/* Grip Handle */}
                <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0" />

                {/* Thumbnail */}
                <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.name}
                    width={48}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                  <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/70 text-white text-[9px] font-bold">
                    #{video.position}
                  </div>
                </div>

                {/* Informações */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {video.name}
                    </span>
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
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{video.durationSeconds}s</span>
                    <span>•</span>
                    <span>{formatBytes(video.sizeBytes)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Pronto na fila</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONFIGURAÇÃO DE LEGENDA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="text-base font-bold text-slate-900">
            Configuração de Legenda
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: "profile_default", label: "Usar legenda padrão do perfil" },
            { id: "custom_all", label: "Legenda personalizada para toda a fila" },
            { id: "individual", label: "Usar legendas individuais" },
            { id: "none", label: "Sem legenda" },
          ].map((opt) => (
            <label
              key={opt.id}
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                captionMode === opt.id
                  ? "border-indigo-600 bg-indigo-50/30 text-indigo-900 font-semibold"
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              <input
                type="radio"
                name="captionMode"
                value={opt.id}
                checked={captionMode === opt.id}
                onChange={() =>
                  setCaptionMode(
                    opt.id as "profile_default" | "custom_all" | "individual" | "none"
                  )
                }
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs leading-snug">{opt.label}</span>
            </label>
          ))}
        </div>

        {captionMode === "custom_all" && (
          <div className="pt-2 animate-in fade-in space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Texto da Legenda</span>
              <span className="text-slate-400">{customCaption.length} / 2.200 caracteres</span>
            </div>
            <textarea
              rows={4}
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="Digite a legenda que será aplicada a todos os Reels desta fila..."
              maxLength={2200}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>
        )}

        {captionMode === "profile_default" && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <span>
              Será usada a legenda configurada no perfil de <strong>@{targetAccount.username}</strong>:
              <br />
              <em className="text-slate-800 font-medium">
                &ldquo;{targetAccount.defaultReelCaption}&rdquo;
              </em>
            </span>
          </div>
        )}
      </div>

      {/* CONFIGURAÇÃO DE PUBLICAÇÃO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Programação da Fila
            </h3>
          </div>

          <button
            type="button"
            onClick={handleUseAccountDefaults}
            className="py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Usar horários padrão do perfil
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Data de início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Quantidade de Reels por dia
              </label>
              <span className="text-xs font-bold text-indigo-600">{reelsPerDay} por dia</span>
            </div>
            <input
              type="number"
              min={1}
              max={15}
              value={reelsPerDay}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Campos de horários gerados automaticamente */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Horários diários gerados ({dailyTimes.length} slots):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {dailyTimes.map((time, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
              >
                <span className="text-[10px] text-slate-400 font-semibold">
                  Horário {idx + 1}:
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const newTimes = [...dailyTimes];
                    newTimes[idx] = e.target.value;
                    setDailyTimes(newTimes);
                  }}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Toggle Distribuir até acabar a fila */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Distribuir até acabar a fila
            </span>
            <span className="text-[11px] text-slate-500">
              O sistema calcula automaticamente quantos dias serão necessários e preenche todos os horários.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDistributeUntilEmpty(!distributeUntilEmpty)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              distributeUntilEmpty ? "bg-indigo-600" : "bg-slate-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                distributeUntilEmpty ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Caixa de Estimativa Automática */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs">
              {totalDays} dias
            </div>
            <div className="text-xs">
              <span className="font-bold text-indigo-900 block text-sm">
                {videos.length} vídeos • {reelsPerDay} por dia
              </span>
              <span className="text-indigo-700 text-[11px]">
                {totalDays} dias de conteúdo garantido para @{targetAccount.username}
              </span>
            </div>
          </div>

          <div className="text-xs sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-indigo-200">
            <span className="text-[11px] text-indigo-600 block">Data inicial: <strong>{startDate}</strong></span>
            <span className="text-xs font-bold text-indigo-900">
              Data estimada final: {estimatedEndDate}
            </span>
          </div>
        </div>
      </div>

      {/* PRÉVIA DA FILA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Prévia da Programação
            </h3>
            <p className="text-xs text-slate-500">
              Simulação de publicação dos primeiros dias conforme a ordem atual
            </p>
          </div>
          <span className="text-xs text-indigo-600 font-semibold">
            Mostrando primeiros 2 dias
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dia 1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Dia 1 • {startDate}
            </span>
            <div className="space-y-1.5">
              {dailyTimes.map((time, idx) => {
                const vid = videos[idx];
                return (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <span className="font-bold text-indigo-600">{time}</span>
                    <span className="text-slate-700 truncate max-w-[200px]">
                      {vid ? vid.name : `Vídeo ${idx + 1}`}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Agendado</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dia 2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Dia 2 • Próximo Dia
            </span>
            <div className="space-y-1.5">
              {dailyTimes.map((time, idx) => {
                const vid = videos[dailyTimes.length + idx];
                return (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <span className="font-bold text-indigo-600">{time}</span>
                    <span className="text-slate-700 truncate max-w-[200px]">
                      {vid ? vid.name : `Vídeo ${dailyTimes.length + idx + 1}`}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Agendado</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação Finais */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={() => {
            addToast({
              type: "info",
              title: "Rascunho Salvo",
              message: "Configuração da fila armazenada localmente.",
            });
          }}
          className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          Salvar rascunho
        </button>

        <button
          type="button"
          onClick={handleCreateQueue}
          className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Agendar fila de Reels</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
