"use client";

import React, { useState } from "react";
import { Account, CarouselPost, CarouselSlide, CarouselQueue } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
    addProfileCarousel,
    deleteProfileCarousel,
    updateProfileCarousel,
    shuffleProfileCarousels,
    toggleQueuePause,
  } = useAppState();
  const { addToast } = useToast();

  const [subTab, setSubTab] = useState<"repositorio" | "novo" | "filas">("repositorio");

  // Estado do Construtor de Carrossel
  const [editingId, setEditingId] = useState<string | null>(null);
  const [carouselTitle, setCarouselTitle] = useState("");
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [captionOption, setCaptionOption] = useState<"profile_default" | "custom" | "none">("profile_default");
  const [customCaption, setCustomCaption] = useState("");

  // Upload de Slides no Construtor
  const handleUploadSlides = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newSlides: CarouselSlide[] = Array.from(files).map((file, idx) => ({
      id: `slide_${Date.now()}_${idx}`,
      position: slides.length + idx + 1,
      url: URL.createObjectURL(file),
      type: "image",
      name: file.name,
      sizeBytes: file.size,
    }));

    setSlides((prev) => [...prev, ...newSlides]);
    e.target.value = "";
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

  // Duplicar carrossel
  const handleDuplicate = (c: CarouselPost) => {
    addProfileCarousel(account.id, {
      title: `${c.title} (Cópia)`,
      position: accountCarousels.length + 1,
      slides: c.slides.map((s, idx) => ({ ...s, id: `slide_copy_${Date.now()}_${idx}` })),
      caption: c.caption,
      status: "draft",
    });
  };

  // Salvar Carrossel
  const handleSaveCarousel = (e: React.FormEvent) => {
    e.preventDefault();
    if (slides.length === 0) {
      addToast({
        type: "error",
        title: "Carrossel Sem Imagens",
        message: "Adicione ao menos um slide para salvar o carrossel.",
      });
      return;
    }

    const captionToSave = captionOption === "profile_default"
      ? account.defaultCarouselCaption
      : captionOption === "custom"
      ? customCaption
      : "";

    if (editingId) {
      updateProfileCarousel(account.id, {
        id: editingId,
        accountId: account.id,
        title: carouselTitle || `Carrossel #${accountCarousels.length}`,
        position: 1,
        slides,
        caption: captionToSave,
        status: "draft",
      });
    } else {
      addProfileCarousel(account.id, {
        title: carouselTitle || `Carrossel #${accountCarousels.length + 1}`,
        position: accountCarousels.length + 1,
        slides,
        caption: captionToSave,
        status: "draft",
      });
    }

    setSubTab("repositorio");
  };

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
            <span>Novo Carrossel</span>
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
            <span>Embaralhar Ordem dos Carrosséis</span>
          </button>
        )}
      </div>

      {/* SUB-ABA 1: REPOSITÓRIO DE CARROSSÉIS */}
      {subTab === "repositorio" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Carrosséis de @{account.username}
              </h3>
              <p className="text-xs text-slate-500">
                Cada carrossel possui sua própria sequência de slides e legenda associada.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartNew}
              className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Criar Carrossel</span>
            </button>
          </div>

          {accountCarousels.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Nenhum carrossel criado para @{account.username}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crie carrosséis com múltiplos slides (imagens/vídeos), organize a ordem de exibição e deixe pronto para agendamento.
              </p>
              <button
                type="button"
                onClick={handleStartNew}
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Carrossel</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accountCarousels.map((c, idx) => {
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

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {c.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {c.caption || "Sem legenda associada"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(c)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Duplicar carrossel"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProfileCarousel(account.id, c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
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
                  Adicione slides, organize a ordem de exibição com setas e configure a legenda.
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
                      key={slide.id}
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
                            className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600"
                            title="Mover para esquerda"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === slides.length - 1}
                            onClick={() => handleMoveSlideRight(index)}
                            className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600"
                            title="Mover para direita"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSlide(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remover slide"
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
                onClick={() => setSubTab("repositorio")}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={slides.length === 0}
                className="py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-purple-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar Carrossel no Perfil</span>
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
    </div>
  );
}
