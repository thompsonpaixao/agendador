"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { QueueService } from "@/services/queueService";
import { CarouselPost, CarouselSlide } from "@/types";
import {
  Plus,
  Shuffle,
  RotateCcw,
  Calendar,
  Trash2,
  GripVertical,
  FileText,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";

// Carrosséis de demonstração pré-carregados
const INITIAL_DEMO_CAROUSELS: CarouselPost[] = [
  {
    id: "c_1",
    title: "Carrossel 01 - Guia de Produtividade",
    position: 1,
    status: "draft",
    caption: "5 hábitos matinais que vão transformar sua clareza mental e energia! ☀️⚡ #produtividade #foco",
    slides: [
      { id: "s_1_1", position: 1, url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=300&auto=format&fit=crop&q=80", type: "image", name: "Capa_Habitos.jpg", sizeBytes: 1_200_000 },
      { id: "s_1_2", position: 2, url: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_01_AcordarCedo.jpg", sizeBytes: 1_100_000 },
      { id: "s_1_3", position: 3, url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_02_Planejamento.jpg", sizeBytes: 1_400_000 },
      { id: "s_1_4", position: 4, url: "https://images.unsplash.com/photo-1517842645767-c639042777db?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_03_Final.jpg", sizeBytes: 980_000 },
    ],
  },
  {
    id: "c_2",
    title: "Carrossel 02 - Dicas de Investimento",
    position: 2,
    status: "draft",
    caption: "Como montar uma reserva de emergência sem passar aperto no final do mês! 💰📈 #financas #investir",
    slides: [
      { id: "s_2_1", position: 1, url: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=300&auto=format&fit=crop&q=80", type: "image", name: "Capa_Reserva.jpg", sizeBytes: 1_300_000 },
      { id: "s_2_2", position: 2, url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_OndeColocar.jpg", sizeBytes: 1_250_000 },
      { id: "s_2_3", position: 3, url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_Checklist.jpg", sizeBytes: 1_180_000 },
    ],
  },
  {
    id: "c_3",
    title: "Carrossel 03 - Tendências de Design 2026",
    position: 3,
    status: "draft",
    caption: "Tipografia arrojada, glassmorphism sutil e cores de alto contraste: o que esperar do design moderno! 🎨✨ #design #ui #ux",
    slides: [
      { id: "s_3_1", position: 1, url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=300&auto=format&fit=crop&q=80", type: "image", name: "Capa_DesignTrends.jpg", sizeBytes: 1_500_000 },
      { id: "s_3_2", position: 2, url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_Tipografia.jpg", sizeBytes: 1_320_000 },
      { id: "s_3_3", position: 3, url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_MicroInteracoes.jpg", sizeBytes: 1_420_000 },
      { id: "s_3_4", position: 4, url: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_Conclusao.jpg", sizeBytes: 1_100_000 },
      { id: "s_3_5", position: 5, url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_CTA.jpg", sizeBytes: 950_000 },
    ],
  },
  {
    id: "c_4",
    title: "Carrossel 04 - Framework de Vendas",
    position: 4,
    status: "draft",
    caption: "A estrutura de 4 passos para transformar seguidores em clientes fiéis. Salve o post! 📊🤝 #vendas #negocios",
    slides: [
      { id: "s_4_1", position: 1, url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&auto=format&fit=crop&q=80", type: "image", name: "Capa_Framework.jpg", sizeBytes: 1_100_000 },
      { id: "s_4_2", position: 2, url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_Atracao.jpg", sizeBytes: 1_200_000 },
      { id: "s_4_3", position: 3, url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_Nutricao.jpg", sizeBytes: 1_150_000 },
      { id: "s_4_4", position: 4, url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=300&auto=format&fit=crop&q=80", type: "image", name: "Slide_Oferta.jpg", sizeBytes: 1_050_000 },
    ],
  },
];

export default function NovoCarrosselPage() {
  const { accounts, selectedAccountId, addCarouselQueue } = useAppState();
  const { addToast } = useToast();

  const [targetAccountId, setTargetAccountId] = useState(
    selectedAccountId !== "all" ? selectedAccountId : accounts[0]?.id || ""
  );

  const targetAccount = accounts.find((a) => a.id === targetAccountId) || accounts[0];

  const [carousels, setCarousels] = useState<CarouselPost[]>(INITIAL_DEMO_CAROUSELS);
  const [originalCarousels, setOriginalCarousels] = useState<CarouselPost[]>(INITIAL_DEMO_CAROUSELS);
  const [draggedCarouselIdx, setDraggedCarouselIdx] = useState<number | null>(null);

  // Legenda
  const [captionMode, setCaptionMode] = useState<
    "profile_default" | "custom_all" | "individual" | "none"
  >("profile_default");
  const [customCaption, setCustomCaption] = useState(
    "Arraste para o lado e confira todo o conteúdo passo a passo! ➡️ Salve para consultar depois 💡 #carrossel #conteudo #instagram"
  );

  // Programação
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [carouselsPerDay, setCarouselsPerDay] = useState(1);
  const [dailyTimes, setDailyTimes] = useState<string[]>(["18:30"]);

  // Botão: + Adicionar novo carrossel
  const handleAddNewCarousel = () => {
    const newIdx = carousels.length + 1;
    const newCarousel: CarouselPost = {
      id: `c_${Date.now()}`,
      title: `Carrossel ${newIdx.toString().padStart(2, "0")}`,
      position: newIdx,
      status: "draft",
      slides: [
        {
          id: `s_${Date.now()}_1`,
          position: 1,
          url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&auto=format&fit=crop&q=80",
          type: "image",
          name: "Slide_Capa_Novo.jpg",
          sizeBytes: 1_200_000,
        },
      ],
    };

    setCarousels((prev) => [...prev, newCarousel]);
    addToast({
      type: "success",
      title: "Carrossel Criado",
      message: `${newCarousel.title} adicionado à lista.`,
    });
  };

  // Botão PRINCIPAL: EMBARALHAR CARROSSÉIS
  // IMPORTANTE: Esse botão deve embaralhar APENAS a ordem dos carrosséis, NÃO alterando as imagens internas!
  const handleShuffleCarousels = () => {
    const shuffled = QueueService.shuffleArray(carousels).map((c, i) => ({
      ...c,
      position: i + 1,
    }));
    setCarousels(shuffled);
    addToast({
      type: "success",
      title: "Carrosséis Embaralhados!",
      message: "A sequência dos carrosséis foi aleatorizada. Os slides internos foram mantidos intactos!",
    });
  };

  // Restaurar Ordem dos carrosséis
  const handleRestoreOrder = () => {
    setCarousels(originalCarousels.map((c, i) => ({ ...c, position: i + 1 })));
    addToast({
      type: "info",
      title: "Ordem Restaurada",
      message: "Os carrosséis voltaram para a sequência inicial.",
    });
  };

  // Drag and Drop interno de slides dentro de um carrossel
  const handleMoveSlide = (carouselId: string, fromIdx: number, toIdx: number) => {
    setCarousels((prev) =>
      prev.map((c) => {
        if (c.id !== carouselId) return c;
        const newSlides = [...c.slides];
        const [moved] = newSlides.splice(fromIdx, 1);
        newSlides.splice(toIdx, 0, moved);
        return {
          ...c,
          slides: newSlides.map((s, i) => ({ ...s, position: i + 1 })),
        };
      })
    );
    addToast({
      type: "info",
      title: "Slide Reordenado",
      message: "A ordem das imagens internas do carrossel foi atualizada.",
    });
  };

  // Drag and Drop de Carrosséis inteiros
  const handleCarouselDragStart = (idx: number) => {
    setDraggedCarouselIdx(idx);
  };

  const handleCarouselDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedCarouselIdx === null || draggedCarouselIdx === idx) return;

    const updated = [...carousels];
    const dragged = updated[draggedCarouselIdx];
    updated.splice(draggedCarouselIdx, 1);
    updated.splice(idx, 0, dragged);

    setDraggedCarouselIdx(idx);
    setCarousels(updated.map((c, i) => ({ ...c, position: i + 1 })));
  };

  const handleCarouselDragEnd = () => {
    setDraggedCarouselIdx(null);
  };

  // Agendar Carrosséis
  const handleScheduleQueue = () => {
    addCarouselQueue({
      accountId: targetAccount.id,
      accountUsername: targetAccount.username,
      accountAvatar: targetAccount.profilePicture,
      name: `Fila Carrosséis #${Date.now().toString().slice(-4)} - @${targetAccount.username}`,
      totalCarousels: carousels.length,
      publishedCount: 0,
      remainingCount: carousels.length,
      errorCount: 0,
      nextScheduledAt: `${startDate}T${dailyTimes[0] || "18:00"}:00Z`,
      status: "active",
      carousels,
      captionMode,
      customCaption: captionMode === "custom_all" ? customCaption : undefined,
      postsPerDay: carouselsPerDay,
      dailyTimes,
      startDate,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Topo */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Novo carrossel
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
            Carrossel Multi-Mídia
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Crie, ordene slides horizontalmente e gerencie filas de múltiplos carrosséis com embaralhamento independente.
        </p>
      </div>

      {/* Selecionar Perfil */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Perfil que receberá as publicações *
        </label>
        <div className="flex items-center gap-3">
          <select
            value={targetAccountId}
            onChange={(e) => setTargetAccountId(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                @{acc.username} ({acc.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra de Controle de Carrosséis: Embaralhar & Adicionar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 border border-indigo-200 p-4 rounded-2xl">
        <div>
          <h3 className="text-sm font-bold text-indigo-950">
            Gerenciamento de {carousels.length} Carrosséis
          </h3>
          <p className="text-xs text-indigo-700">
            Embaralhe a ordem dos carrosséis mantendo os slides internos intactos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* BOTÃO PRINCIPAL: EMBARALHAR CARROSSÉIS */}
          <button
            type="button"
            onClick={handleShuffleCarousels}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>EMBARALHAR CARROSSÉIS</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreOrder}
            className="py-2.5 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restaurar ordem</span>
          </button>

          <button
            type="button"
            onClick={handleAddNewCarousel}
            className="py-2.5 px-3.5 rounded-xl bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Adicionar novo carrossel</span>
          </button>
        </div>
      </div>

      {/* Lista de Carrosséis Reordenáveis */}
      <div className="space-y-6">
        {carousels.map((carousel, cIdx) => (
          <div
            key={carousel.id}
            draggable
            onDragStart={() => handleCarouselDragStart(cIdx)}
            onDragOver={(e) => handleCarouselDragOver(e, cIdx)}
            onDragEnd={handleCarouselDragEnd}
            className={`bg-white border rounded-2xl p-6 shadow-2xs space-y-4 transition-all ${
              draggedCarouselIdx === cIdx
                ? "border-indigo-500 bg-indigo-50/20 opacity-60"
                : "border-slate-200"
            }`}
          >
            {/* Cabeçalho do Bloco do Carrossel */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab active:cursor-grabbing shrink-0" />
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                  Posição #{carousel.position}
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {carousel.title}
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  ({carousel.slides.length} mídias)
                </span>
              </div>

              {carousels.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setCarousels((prev) => prev.filter((c) => c.id !== carousel.id));
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                  title="Excluir este carrossel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mídias dispostas horizontalmente: 1, 2, 3, 4, 5... */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Slides do Carrossel (Arraste para alterar a ordem interna das imagens):</span>
                <span className="text-[11px] text-slate-400">Máximo: 10 mídias</span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {carousel.slides.map((slide, sIdx) => (
                  <div
                    key={slide.id}
                    className="relative group w-24 sm:w-28 h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs"
                  >
                    <Image
                      src={slide.url}
                      alt={slide.name}
                      width={112}
                      height={144}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold flex items-center justify-center">
                      {slide.position}
                    </div>

                    {/* Controles para mover slide horizontalmente */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-xs p-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        disabled={sIdx === 0}
                        onClick={() => handleMoveSlide(carousel.id, sIdx, sIdx - 1)}
                        className="text-white text-[10px] hover:text-indigo-400 disabled:opacity-30 px-1 font-bold"
                      >
                        ◀
                      </button>
                      <span className="text-[9px] text-white/80 truncate px-1">
                        #{slide.position}
                      </span>
                      <button
                        type="button"
                        disabled={sIdx === carousel.slides.length - 1}
                        onClick={() => handleMoveSlide(carousel.id, sIdx, sIdx + 1)}
                        className="text-white text-[10px] hover:text-indigo-400 disabled:opacity-30 px-1 font-bold"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                ))}

                {/* Botão + Adicionar Mídia neste Carrossel */}
                <label className="w-24 sm:w-28 h-32 sm:h-36 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer shrink-0">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      const addedSlides: CarouselSlide[] = Array.from(files).map((f, i) => ({
                        id: `s_${Date.now()}_${i}`,
                        position: carousel.slides.length + i + 1,
                        url: URL.createObjectURL(f),
                        type: "image",
                        name: f.name,
                        sizeBytes: f.size,
                      }));
                      setCarousels((prev) =>
                        prev.map((c) =>
                          c.id === carousel.id
                            ? { ...c, slides: [...c.slides, ...addedSlides] }
                            : c
                        )
                      );
                      addToast({
                        type: "success",
                        title: "Mídias Adicionadas",
                        message: `${addedSlides.length} slides incluídos no ${carousel.title}.`,
                      });
                    }}
                    className="sr-only"
                  />
                  <Plus className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-semibold text-center px-2 leading-tight">
                    + Mídia
                  </span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* LEGENDA DO CARROSSEL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <h3 className="text-base font-bold text-slate-900">
            Legenda dos Carrosséis
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: "profile_default", label: "Usar legenda padrão do perfil" },
            { id: "custom_all", label: "Legenda personalizada para todos" },
            { id: "individual", label: "Legenda individual por carrossel" },
            { id: "none", label: "Sem legenda" },
          ].map((opt) => (
            <label
              key={opt.id}
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                captionMode === opt.id
                  ? "border-purple-600 bg-purple-50/30 text-purple-900 font-semibold"
                  : "border-slate-200 hover:border-slate-300 text-slate-700"
              }`}
            >
              <input
                type="radio"
                name="carouselCaptionMode"
                value={opt.id}
                checked={captionMode === opt.id}
                onChange={() =>
                  setCaptionMode(
                    opt.id as "profile_default" | "custom_all" | "individual" | "none"
                  )
                }
                className="mt-0.5 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs leading-snug">{opt.label}</span>
            </label>
          ))}
        </div>

        {captionMode === "custom_all" && (
          <textarea
            rows={3}
            value={customCaption}
            onChange={(e) => setCustomCaption(e.target.value)}
            placeholder="Digite a legenda aplicada a todos os carrosséis..."
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        )}
      </div>

      {/* PROGRAMAÇÃO DOS CARROSSÉIS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">
            Programação dos Carrosséis
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Quantidade de carrosséis por dia
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={carouselsPerDay}
              onChange={(e) => setCarouselsPerDay(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          Programando <strong>{carousels.length} carrosséis</strong> com <strong>{carouselsPerDay} por dia</strong> a partir de <strong>{startDate}</strong> às <strong>{dailyTimes.join(", ")}</strong>.
        </div>
      </div>

      {/* Botões Finais */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleScheduleQueue}
          className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Agendar Carrosséis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
