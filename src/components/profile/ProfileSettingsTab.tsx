"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Account } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import { useToast } from "@/context/ToastContext";
import { Modal } from "@/components/ui/Modal";
import {
  Save,
  Plus,
  Trash2,
  Shuffle,
  FileText,
  Clock,
  LogOut,
  AlertTriangle,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface ProfileSettingsTabProps {
  account: Account;
}

export function ProfileSettingsTab({ account }: ProfileSettingsTabProps) {
  const router = useRouter();
  const { updateAccountSettings, refreshAccounts } = useAppState();
  const { addToast } = useToast();

  const [defaultReelCaption, setDefaultReelCaption] = useState(account.defaultReelCaption || "");
  const [defaultCarouselCaption, setDefaultCarouselCaption] = useState(account.defaultCarouselCaption || "");
  const [reelsPerDay, setReelsPerDay] = useState(account.defaultReelsPerDay || 5);
  const [carouselsPerDay, setCarouselsPerDay] = useState(account.defaultCarouselsPerDay || 1);
  const [times, setTimes] = useState<string[]>(
    account.defaultTimes.length > 0 ? account.defaultTimes : ["09:00", "12:00", "15:00", "18:00", "21:00"]
  );
  const [useRandomVariation, setUseRandomVariation] = useState(account.useRandomTimeVariation ?? true);
  const [variationMinutes, setVariationMinutes] = useState(account.randomVariationMinutes || 5);

  // Estados de Desconexão
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleAddTime = () => {
    setTimes((prev) => [...prev, "16:00"]);
  };

  const handleRemoveTime = (index: number) => {
    if (times.length <= 1) return;
    setTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateAccountSettings(account.id, {
      defaultReelCaption,
      defaultCarouselCaption,
      defaultReelsPerDay: reelsPerDay,
      defaultCarouselsPerDay: carouselsPerDay,
      defaultTimes: times,
      useRandomTimeVariation: useRandomVariation,
      randomVariationMinutes: variationMinutes,
    });
  };

  const handleConfirmDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      const res = await fetch("/api/instagram/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Não foi possível desconectar a conta.");
      }

      addToast({
        type: "info",
        title: "Conta Desconectada",
        message: data.message,
      });

      setIsDisconnectModalOpen(false);
      await refreshAccounts();
      router.push("/contas");
    } catch (err: unknown) {
      addToast({
        type: "error",
        title: "Falha na Desconexão",
        message: (err as Error).message || "Erro de comunicação ao desconectar conta.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Preferências e Padrões de @{account.username}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina as legendas e a programação padrão que serão pré-carregadas automaticamente para esta conta.
            </p>
          </div>

          {/* 1. LEGENDA PADRÃO DE REELS */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-rose-600" />
                Legenda padrão para Reels
              </label>
              <span className="text-[11px] text-slate-400">Exclusiva para @{account.username}</span>
            </div>
            <textarea
              rows={4}
              value={defaultReelCaption}
              onChange={(e) => setDefaultReelCaption(e.target.value)}
              placeholder="Digite o modelo de legenda padrão para os Reels desta conta..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed"
            />
            <p className="text-[11px] text-slate-400">
              Ao criar uma nova fila de Reels para esta conta, você poderá optar por &quot;Usar legenda padrão do perfil&quot;.
            </p>
          </div>

          {/* 2. LEGENDA PADRÃO DE CARROSSÉIS */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                Legenda padrão para Carrosséis
              </label>
              <span className="text-[11px] text-slate-400">Exclusiva para @{account.username}</span>
            </div>
            <textarea
              rows={4}
              value={defaultCarouselCaption}
              onChange={(e) => setDefaultCarouselCaption(e.target.value)}
              placeholder="Digite o modelo de legenda padrão para os Carrosséis desta conta..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 leading-relaxed"
            />
          </div>

          {/* 3. METAS DE POSTS POR DIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Quantidade padrão de Reels por dia
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={reelsPerDay}
                onChange={(e) => setReelsPerDay(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Quantidade padrão de Carrosséis por dia
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={carouselsPerDay}
                onChange={(e) => setCarouselsPerDay(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 4. HORÁRIOS PADRÃO DIÁRIOS */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Horários padrão de postagem diária
                </label>
                <span className="text-[11px] text-slate-400">
                  Slots automáticos de disparo para as publicações desta conta.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddTime}
                className="py-1 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar horário</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {times.map((time, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                >
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const newTimes = [...times];
                      newTimes[index] = e.target.value;
                      setTimes(newTimes);
                    }}
                    className="bg-transparent focus:outline-none"
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(index)}
                      className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                      title="Remover slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. VARIAÇÃO ALEATÓRIA DE HORÁRIO (ANTI-DETECÇÃO) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-indigo-600" />
                  Variação Aleatória de Horário (Anti-Detecção)
                </span>
                <span className="text-[11px] text-slate-500">
                  Altera os minutos de disparo aleatoriamente para simular comportamento humano.
                </span>
              </div>

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
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs text-slate-600">Janela de variação:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={variationMinutes}
                    onChange={(e) => setVariationMinutes(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 text-center font-bold"
                  />
                  <span className="text-xs text-slate-500">minutos (± {variationMinutes} min)</span>
                </div>
              </div>
            )}
          </div>

          {/* Botão de Salvar */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações de @{account.username}</span>
            </button>
          </div>
        </div>
      </form>

      {/* ZONA DE DESCONEXÃO DA CONTA (ITEM 4 - CONFORMIDADE META) */}
      <div className="bg-white border border-rose-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-rose-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Integração Meta & Desconexão</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
              Desconectar esta conta do Instagram impedirá imediatamente novos agendamentos e publicações.
              O token de acesso da Meta associado a este perfil será excluído e desativado com segurança do banco de dados.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDisconnectModalOpen(true)}
            className="py-2.5 px-4 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Desconectar conta</span>
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE DESCONEXÃO */}
      <Modal
        isOpen={isDisconnectModalOpen}
        onClose={() => !isDisconnecting && setIsDisconnectModalOpen(false)}
        title={`Desconectar @${account.username}?`}
        description="Confirmação obrigatória de revogação de integração oficial"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold">Ações que serão executadas ao confirmar:</h5>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-900">
                <li>O access token da Meta será imediatamente removido do servidor.</li>
                <li>Todas as publicações agendadas pendentes serão canceladas.</li>
                <li>Nenhuma nova publicação poderá ser realizada até que a conta seja reconectada.</li>
                <li>Os dados históricos de publicações serão mantidos de acordo com a política de retenção.</li>
              </ul>
            </div>
          </div>

          <p className="text-slate-500 text-[11px]">
            Você poderá reconectar esta conta a qualquer momento clicando em &quot;Conectar conta&quot; na listagem de contas.
          </p>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isDisconnecting}
              onClick={() => setIsDisconnectModalOpen(false)}
              className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDisconnecting}
              onClick={handleConfirmDisconnect}
              className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Desconectando...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Confirmar Desconexão</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
