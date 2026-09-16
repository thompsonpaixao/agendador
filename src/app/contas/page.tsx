"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountTable } from "@/components/accounts/AccountTable";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  Users,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function ContasPage() {
  const { accounts, setIsConnectModalOpen } = useAppState();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "alert" | "expired" | "paused"
  >("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filtros aplicados
  const filtered = accounts.filter((acc) => {
    const matchesSearch =
      acc.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "active") return acc.status === "connected";
    if (statusFilter === "expired") return acc.status === "expired";
    if (statusFilter === "paused") return acc.status === "paused";
    if (statusFilter === "alert") return acc.status === "error" || acc.errorsCount > 0;

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Topo da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Contas do Instagram
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              {accounts.length} perfis
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gerencie todas as contas conectadas, credenciais da Meta, horários padrão e limites de postagem.
          </p>
        </div>

        {/* Botão: + Conectar conta */}
        <button
          type="button"
          onClick={() => setIsConnectModalOpen(true)}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Conectar conta</span>
        </button>
      </div>

      {/* Barra de Filtros, Busca e Alternador de Visão */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por @username ou nome da conta..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Filtros de Status */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {(
              [
                { id: "all", label: "Todas" },
                { id: "active", label: "Ativas" },
                { id: "alert", label: "Com alerta" },
                { id: "expired", label: "Token expirado" },
                { id: "paused", label: "Pausadas" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Alternador de Visão: Cards vs Tabela */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Renderização de Conteúdo */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma conta encontrada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Não encontramos nenhum perfil correspondente aos filtros selecionados.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      ) : (
        <AccountTable accounts={filtered} />
      )}
    </div>
  );
}
