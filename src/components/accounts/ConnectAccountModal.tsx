"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useAppState } from "@/context/AppStateContext";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { Shield, Check, Loader2, Info, ArrowRight } from "lucide-react";

export function ConnectAccountModal() {
  const { isConnectModalOpen, setIsConnectModalOpen, addAccount } = useAppState();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSimulateOAuth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 1200);
  };

  const handleFinishConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const cleanUsername = username.replace("@", "").trim();

      addAccount({
        username: cleanUsername,
        name: name.trim() || `${cleanUsername} Oficial`,
        profilePicture: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
        status: "connected",
        followers: 12500,
        newFollowersToday: 42,
        postsToday: 0,
        postsInQueue: 0,
        postsLast7Days: 0,
        successRate: 100,
        errorsCount: 0,
        defaultReelCaption: `Novidade incrível! 🔥 #reels #${cleanUsername}`,
        defaultCarouselCaption: `Confira todos os detalhes deslizando para o lado ➡️ #${cleanUsername}`,
        defaultReelsPerDay: 3,
        defaultCarouselsPerDay: 1,
        defaultTimes: ["09:00", "15:00", "21:00"],
        useRandomTimeVariation: true,
        randomVariationMinutes: 5,
      });

      // Reset
      setUsername("");
      setName("");
      setStep(1);
      setIsConnectModalOpen(false);
    }, 1000);
  };

  const handleClose = () => {
    setStep(1);
    setIsConnectModalOpen(false);
  };

  return (
    <Modal
      isOpen={isConnectModalOpen}
      onClose={handleClose}
      title="Conectar Conta do Instagram"
      description="Integração oficial através da Meta Graph API (Instagram Business / Creator)"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Passos visuais */}
        <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
            <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[11px]">
              1
            </span>
            <span>Meta OAuth</span>
          </div>
          <div className="w-12 h-px bg-slate-200"></div>
          <div className={`flex items-center gap-1.5 ${step >= 2 ? "text-indigo-600 font-semibold" : ""}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? "bg-indigo-100 text-indigo-600" : "bg-slate-100"}`}>
              2
            </span>
            <span>Perfil</span>
          </div>
          <div className="w-12 h-px bg-slate-200"></div>
          <div className={`flex items-center gap-1.5 ${step === 3 ? "text-indigo-600 font-semibold" : ""}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 3 ? "bg-indigo-100 text-indigo-600" : "bg-slate-100"}`}>
              3
            </span>
            <span>Pronto</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-5 text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <InstagramIcon className="w-8 h-8 text-rose-500" />
              </div>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">
                Autentique com a sua conta Meta
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Você será redirecionado para autorizar o Agendador a publicar Reels e Carrosséis na sua conta profissional ou de criador de conteúdo.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Permissões solicitadas:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500">
                <li><code className="text-indigo-600">instagram_content_publish</code>: Para agendamento e postagem de Reels</li>
                <li><code className="text-indigo-600">instagram_basic</code>: Para leitura de nome e foto de perfil</li>
                <li><code className="text-indigo-600">pages_show_list</code>: Para identificação da página vinculada</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleSimulateOAuth}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Conectando com a Meta...</span>
                </>
              ) : (
                <>
                  <span>Continuar com Facebook / Meta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleFinishConnection} className="space-y-4 py-1">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Autenticação OAuth simulada com sucesso! Confirme os dados da conta abaixo.</span>
            </div>

            <div>
              <label htmlFor="modalUsername" className="block text-xs font-semibold text-slate-700 mb-1">
                Nome de usuário do Instagram (@username) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">@</span>
                <input
                  id="modalUsername"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sua_marca_oficial"
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="modalName" className="block text-xs font-semibold text-slate-700 mb-1">
                Nome de exibição da conta
              </label>
              <input
                id="modalName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Sua Marca | Oficial"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                Em produção, esses dados serão obtidos automaticamente através da Graph API no endpoint <code className="bg-indigo-100/70 px-1 py-0.5 rounded font-mono text-[10px]">GET /me/accounts</code>.
              </span>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Concluir Conexão</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
