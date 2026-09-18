"use client";

import React, { useState, useMemo } from "react";
import { Account, CarouselPost, CarouselSlide, CarouselQueue, MediaItem } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { formatDate, formatTime } from "@/lib/utils";
import {
  Layers,
  Plus,
  Shuffle,
  Trash2,
  Copy,
  Edit,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  FileText,
  UploadCloud,
  CheckCircle2,
  FolderOpen,
  Image as ImageIcon,
  Play,
  Pause,
  Send,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";

interface ProfileCarouselsTabProps {
  account: Account;
  accountCarousels: CarouselPost[];
  accountQueues: CarouselQueue[];
}

export function ProfileCarouselsTab({
  account,
  accountCarousels,
  accountQueues,
}: ProfileCarouselsTabProps) {
  const {
    saveProfileCarousel,
    deleteProfileCarousel,
    publishCarouselNow,
    scheduleCarousel,
    shuffleProfileCarousels,
    toggleQueuePause,
    profileMedia,
  } = useAppState();
  const { addToast } = useToast();

  const [subTab, setSubTab] = useState<"repositorio" | "novo" | "filas">("repositorio");

  // Filtros do Repositório de Carrosséis
  const [repoFilter, setRepoFilter] = useState<"todos" | "disponiveis" | "em_fila" | "agendados" | "publicados" | "erro">("todos");
  const [repoSearch, setRepoSearch] = useState("");

  // Estado do Construtor de Carrossel
  const [editingId, setEditingId] = useState<string | null>(null);
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [captionOption, setCaptionOption] = useState<"profile_default" | "custom" | "none">("profile_default");
  const [customCaption, setCustomCaption] = useState("");
  const [isSavingCarousel, setIsSavingCarousel] = useState(false);
  const [uploadingSlideIndex, setUploadingSlideIndex] = useState<number | null>(null);

  // Modais de Ação
  const [carouselToDelete, setCarouselToDelete] = useState<CarouselPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [carouselToPublish, setCarouselToPublish] = useState<CarouselPost | null>(null);
  const [isPublishingNow, setIsPublishingNow] = useState(false);

  const [carouselToSchedule, setCarouselToSchedule] = useState<CarouselPost | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  // Upload REAL de Slides para o Supabase Storage
  const handleUploadSlides = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = "";

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setUploadingSlideIndex(slides.length + i + 1);

      try {
        // 1. Solicita URL assinada para upload da imagem
        const res = await fetch("/api/media/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: account.id,
            filename: file.name,
            mediaType: "image",
            folder: "carousels",
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || `Erro ao preparar envio de ${file.name}`);
        }

        // 2. Upload binário no Storage
        const uploadRes = await fetch(data.media.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "image/jpeg" },
          body: file,
        });

        if (!uploadRes.ok) {
          throw new Error(`Falha no upload para o Storage (código ${uploadRes.status})`);
        }

        // 3. Confirmação e registro em public.media
        const confirmRes = await fetch("/api/media/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: account.id,
            originalName: file.name,
            storagePath: data.media.storagePath,
            mediaType: "image",
            sizeBytes: file.size,
          }),
        });

        const confirmData = await confirmRes.json();
        if (!confirmRes.ok || !confirmData.success) {
          throw new Error(confirmData.message || "Erro ao registrar slide no banco.");
        }

        const savedMedia = confirmData.media;
        const newSlide: CarouselSlide = {
          id: savedMedia.id,
          mediaId: savedMedia.id,
          position: slides.length + 1,
          url: URL.createObjectURL(file), // Prévia local imediata
          type: "image",
          name: file.name,
          sizeBytes: file.size,
        };

        setSlides((prev) => [...prev, newSlide].map((s, idx) => ({ ...s, position: idx + 1 })));
      } catch (err) {
        console.error("Erro no upload do slide:", err);
        addToast({
          type: "error",
          title: "Falha no Envio do Slide",
          message: err instanceof Error ? err.message : `Não foi possível enviar ${file.name}`,
        });
      } finally {
        setUploadingSlideIndex(null);
      }
    }
  };

  // Reorganizar Slides: mover para a esquerda
  const handleMoveSlideLeft = (index: number) => {
    if (index === 0) return;
    setSlides((prev) => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return arr.map((s, i) => ({ ...s, position: i + 1 }));
    });
  };

  // Reorganizar Slides: mover para a direita
  const handleMoveSlideRight = (index: number) => {
    if (index === slides.length - 1) return;
    setSlides((prev) => {
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return arr.map((s, i) => ({ ...s, position: i + 1 }));
    });
  };

  // Remover Slide individual
  const handleRemoveSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i + 1 })));
  };

  // Iniciar criação de novo carrossel limpo
  const handleStartNew = () => {
    setEditingId(null);
    setCarouselTitle(`Carrossel #${accountCarousels.length + 1}`);
    setSlides([]);
    setCaptionOption("profile_default");
    setCustomCaption("");
    setSubTab("novo");
  };

  // Editar carrossel existente
  const handleEdit = (c: CarouselPost) => {
    setEditingId(c.id);
    setCarouselTitle(c.title);
    setSlides(c.slides);
    setCaptionOption(c.caption ? "custom" : "profile_default");
    setCustomCaption(c.caption || "");
    setSubTab("novo");
  };

  // Salvar Carrossel REAL no Supabase
  const handleSaveCarousel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slides.length === 0) {
      addToast({
        type: "error",
        title: "Carrossel Sem Imagens",
        message: "Adicione ao menos um slide para salvar o carrossel.",
      });
      return;
    }

    setIsSavingCarousel(true);
    try {
      const captionToSave =
        captionOption === "profile_default"
          ? account.defaultCarouselCaption
          : captionOption === "custom"
          ? customCaption
          : "";

      const slidesPayload = slides.map((s, idx) => ({
        mediaId: s.mediaId || s.id,
        position: idx + 1,
      }));

      const success = await saveProfileCarousel(account.id, {
        id: editingId || undefined,
        title: carouselTitle || `Carrossel #${accountCarousels.length + 1}`,
        caption: captionToSave,
        slides: slidesPayload,
      });

      if (success) {
        setSubTab("repositorio");
      }
    } finally {
      setIsSavingCarousel(false);
    }
  };

  // Executar "Postar Agora"
  const handleExecutePublishNow = async () => {
    if (!carouselToPublish) return;
    setIsPublishingNow(true);
    try {
      await publishCarouselNow(account.id, carouselToPublish.id);
      setCarouselToPublish(null);
    } finally {
      setIsPublishingNow(false);
    }
  };

  // Executar "Agendar Carrossel"
  const handleExecuteSchedule = async () => {
    if (!carouselToSchedule || !scheduleDate || !scheduleTime) {
      addToast({
        type: "warning",
        title: "Campos Obrigatórios",
        message: "Selecione a data e o horário para programar a publicação.",
      });
      return;
    }

    setIsScheduling(true);
    try {
      const scheduledAtIso = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      const success = await scheduleCarousel(account.id, carouselToSchedule.id, scheduledAtIso);
      if (success) {
        setCarouselToSchedule(null);
      }
    } finally {
      setIsScheduling(false);
    }
  };

  // Filtragem de carrosséis
  const filteredCarousels = useMemo(() => {
    return accountCarousels.filter((c) => {
      // Filtro por busca
      if (repoSearch.trim()) {
        const query = repoSearch.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(query);
        const matchesCaption = c.caption?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCaption) return false;
      }

      // Filtro por status
      if (repoFilter === "todos") return true;
      if (repoFilter === "disponiveis") return c.status === "ready" || c.status === "draft";
      if (repoFilter === "em_fila") return c.status === "draft"; // em fila futura
      if (repoFilter === "agendados") return c.status === "scheduled";
      if (repoFilter === "publicados") return c.status === "published";
      if (repoFilter === "erro") return c.status === "error";

      return true;
    });
  }, [accountCarousels, repoFilter, repoSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Sub-navegação interna de Carrosséis */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("repositorio")}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === "repositorio"
                ? "bg-white text-purple-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Repositório ({accountCarousels.length})</span>
          </button>

          <button
            type="button"
            onClick={handleStartNew}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === "novo"
                ? "bg-white text-purple-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingId ? "Editar Carrossel" : "Novo Carrossel"}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("filas")}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === "filas"
                ? "bg-white text-purple-600 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Filas ({accountQueues.length})</span>
          </button>
        </div>

        {subTab === "repositorio" && accountCarousels.length > 1 && (
          <button
            type="button"
            onClick={() => shuffleProfileCarousels(account.id)}
            className="py-1.5 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-purple-600" />
            <span>Embaralhar Ordem</span>
          </button>
        )}
      </div>

      {/* SUB-ABA 1: REPOSITÓRIO DE CARROSSÉIS */}
      {subTab === "repositorio" && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setRepoFilter("todos")}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  repoFilter === "todos"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                Todos ({accountCarousels.length})
              </button>
              <button
                type="button"
                onClick={() => setRepoFilter("disponiveis")}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  repoFilter === "disponiveis"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                }`}
              >
                Disponíveis ({accountCarousels.filter((c) => c.status === "ready" || c.status === "draft").length})
              </button>
              <button
                type="button"
                onClick={() => setRepoFilter("agendados")}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  repoFilter === "agendados"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                }`}
              >
                Agendados ({accountCarousels.filter((c) => c.status === "scheduled").length})
              </button>
              <button
                type="button"
                onClick={() => setRepoFilter("publicados")}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  repoFilter === "publicados"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-teal-50 hover:bg-teal-100 text-teal-700"
                }`}
              >
                Publicados ({accountCarousels.filter((c) => c.status === "published").length})
              </button>
              <button
                type="button"
                onClick={() => setRepoFilter("erro")}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  repoFilter === "erro"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-700"
                }`}
              >
                Com erro ({accountCarousels.filter((c) => c.status === "error").length})
              </button>
            </div>

            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                placeholder="Buscar por título ou legenda..."
                className="w-full py-1.5 pl-3 pr-8 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
              {repoSearch && (
                <button
                  type="button"
                  onClick={() => setRepoSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {filteredCarousels.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Nenhum carrossel encontrado
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {accountCarousels.length === 0
                  ? "Crie carrosséis com múltiplos slides (imagens), organize a ordem e agende publicações automáticas."
                  : "Nenhum carrossel corresponde aos filtros selecionados."}
              </p>
              <button
                type="button"
                onClick={handleStartNew}
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Novo Carrossel</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCarousels.map((c, idx) => {
                const coverSlide = c.slides[0];
                return (
                  <div
                    key={c.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3 hover:shadow-md transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        {coverSlide ? (
                          <Image
                            src={coverSlide.url}
                            alt={c.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300">
                            <ImageIcon className="w-12 h-12" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold">
                          #{idx + 1}
                        </span>
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {c.slides.length} slides
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {c.title}
                          </h4>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {c.caption || "Sem legenda associada"}
                        </p>
                        {c.scheduledAt && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 pt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Programado para {formatDate(c.scheduledAt)} às {formatTime(c.scheduledAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      {/* Ações de Publicação */}
                      <div className="flex items-center gap-1.5">
                        {c.status !== "published" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setCarouselToPublish(c)}
                              className="py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Publicar agora no Instagram oficial"
                            >
                              <Send className="w-3 h-3" />
                              <span>Postar agora</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCarouselToSchedule(c);
                                setScheduleDate(new Date().toISOString().split("T")[0]);
                                setScheduleTime("18:00");
                              }}
                              className="py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Agendar publicação"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Agendar</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Ações de Edição e Remoção */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Editar carrossel"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCarouselToDelete(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Excluir carrossel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 2: NOVO CARROSSEL / CONSTRUTOR */}
      {subTab === "novo" && (
        <form onSubmit={handleSaveCarousel} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingId ? "Editar Carrossel" : "Novo Carrossel"} para @{account.username}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adicione slides de imagens, organize a ordem de exibição e configure a legenda antes de salvar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubTab("repositorio")}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Voltar ao repositório
              </button>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Título de referência interna
              </label>
              <input
                type="text"
                value={carouselTitle}
                onChange={(e) => setCarouselTitle(e.target.value)}
                placeholder="Ex: 5 Dicas para Alavancar no Instagram"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
                required
              />
            </div>

            {/* Slides / Imagens com Ordenação Interna */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Slides do Carrossel ({slides.length} imagens)
                </span>
                <label
                  htmlFor="carouselUploadInput"
                  className="text-xs text-purple-600 hover:text-purple-700 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar slides</span>
                  <input
                    id="carouselUploadInput"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadSlides}
                    className="hidden"
                  />
                </label>
              </div>

              {slides.length === 0 ? (
                <label
                  htmlFor="carouselUploadEmpty"
                  className="p-8 text-center border-2 border-dashed border-purple-200 hover:border-purple-300 rounded-2xl bg-purple-50/20 hover:bg-purple-50/40 cursor-pointer block transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Nenhuma imagem adicionada a este carrossel
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Clique aqui para selecionar os slides do seu computador.
                  </p>
                  <input
                    id="carouselUploadEmpty"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadSlides}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {slides.map((slide, index) => (
                    <div
                      key={slide.id || index}
                      className="relative bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col justify-between space-y-2 group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900">
                        <Image
                          src={slide.url}
                          alt={`Slide ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <span className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveSlideLeft(index)}
                            className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                            title="Mover para esquerda"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === slides.length - 1}
                            onClick={() => handleMoveSlideRight(index)}
                            className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                            title="Mover para direita"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSlide(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remover slide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {uploadingSlideIndex !== null && (
                    <div className="relative aspect-square rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/30 flex flex-col items-center justify-center p-3 text-center">
                      <Loader2 className="w-6 h-6 text-purple-600 animate-spin mb-1.5" />
                      <span className="text-[11px] font-semibold text-purple-700">
                        Enviando slide...
                      </span>
                    </div>
                  )}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: "profile_default", label: "Usar legenda padrão do perfil" },
                  { id: "custom", label: "Digitar legenda personalizada" },
                  { id: "none", label: "Sem legenda" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-start gap-2 ${
                      captionOption === opt.id
                        ? "border-purple-600 bg-purple-50/50 text-purple-900 font-bold"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="carouselCaptionOption"
                      checked={captionOption === opt.id}
                      onChange={() => setCaptionOption(opt.id as any)}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>

              {captionOption === "profile_default" && (
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs space-y-1">
                  <span className="font-bold text-purple-900 block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Prévia da Legenda Padrão de Carrosséis de @{account.username}:
                  </span>
                  <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-purple-100 leading-relaxed">
                    {account.defaultCarouselCaption || "Nenhuma legenda de carrossel configurada ainda neste perfil. Acesse a aba Configurações para definir."}
                  </p>
                </div>
              )}

              {captionOption === "custom" && (
                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="Digite a legenda exclusiva para este carrossel..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSavingCarousel}
                onClick={() => setSubTab("repositorio")}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={slides.length === 0 || isSavingCarousel}
                className="py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-purple-500/20 cursor-pointer"
              >
                {isSavingCarousel ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Carrossel...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Carrossel no Perfil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-ABA 3: FILAS DE CARROSSÉIS */}
      {subTab === "filas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Filas de Carrosséis de @{account.username}
            </h3>
          </div>

          {accountQueues.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">
                Nenhuma fila de carrosséis ativa
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Crie um carrossel no repositório para iniciar sua programação.
              </p>
              <button
                type="button"
                onClick={handleStartNew}
                className="py-1.5 px-3.5 rounded-xl bg-purple-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Carrossel</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {accountQueues.map((queue) => {
                const percent = Math.round((queue.publishedCount / (queue.totalCarousels || 1)) * 100);
                return (
                  <div
                    key={queue.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{queue.name}</h4>
                        <StatusBadge status={queue.status} />
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDate(queue.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          {queue.publishedCount} de {queue.totalCarousels} publicados ({percent}%)
                        </span>
                        <span className="text-slate-500">
                          Restantes: <strong className="text-slate-800">{queue.remainingCount}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => toggleQueuePause(queue.id, "carousel")}
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

      {/* Modal de Confirmação para Excluir Carrossel */}
      {carouselToDelete && (
        <Modal
          isOpen={Boolean(carouselToDelete)}
          onClose={() => !isDeleting && setCarouselToDelete(null)}
          title="Excluir Carrossel"
          description={`Carrossel: ${carouselToDelete.title}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Aviso sobre a exclusão:
              </p>
              <p>
                O carrossel será excluído. Suas imagens originais continuarão salvas com segurança no repositório de mídias e no Storage.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCarouselToDelete(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (carouselToDelete) {
                    setIsDeleting(true);
                    try {
                      await deleteProfileCarousel(account.id, carouselToDelete.id);
                      setCarouselToDelete(null);
                    } finally {
                      setIsDeleting(false);
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? "Excluindo..." : "Sim, excluir carrossel"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Confirmação para Postar Agora */}
      {carouselToPublish && (
        <Modal
          isOpen={Boolean(carouselToPublish)}
          onClose={() => !isPublishingNow && setCarouselToPublish(null)}
          title="Publicar Carrossel Imediatamente"
          description={`Conta: @${account.username}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja publicar o carrossel <strong>&ldquo;{carouselToPublish.title}&rdquo;</strong> ({carouselToPublish.slides.length} slides) agora na sua conta oficial do Instagram?
            </p>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
              <span className="font-bold block">Pipeline oficial da Meta API:</span>
              <span>1. Criação de containers individuais para cada slide.</span><br />
              <span>2. Agrupamento no container pai CAROUSEL.</span><br />
              <span>3. Publicação oficial no feed.</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPublishingNow}
                onClick={() => setCarouselToPublish(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPublishingNow}
                onClick={handleExecutePublishNow}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPublishingNow && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isPublishingNow ? "Publicando no Instagram..." : "Confirmar e Publicar Agora"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Agendamento de Carrossel */}
      {carouselToSchedule && (
        <Modal
          isOpen={Boolean(carouselToSchedule)}
          onClose={() => !isScheduling && setCarouselToSchedule(null)}
          title="Agendar Publicação de Carrossel"
          description={`Carrossel: ${carouselToSchedule.title}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Data de Publicação
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Horário (São Paulo)
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isScheduling}
                onClick={() => setCarouselToSchedule(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isScheduling || !scheduleDate || !scheduleTime}
                onClick={handleExecuteSchedule}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isScheduling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isScheduling ? "Agendando..." : "Confirmar Agendamento"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
