"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/context/AppStateContext";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import {
  LayoutDashboard,
  Users,
  Film,
  Layers,
  Calendar,
  BarChart3,
  AlertTriangle,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  ListOrdered,
  CheckCheck,
  Server,
  User,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { errors, unreadNotificationsCount, systemStatus } = useAppState();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reelsOpen, setReelsOpen] = useState(true);
  const [carouselsOpen, setCarouselsOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const criticalErrors = errors.filter((e) => e.status === "pending").length;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Backdrop para mobile */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Topo: Logo & Botão de Recolher */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 shrink-0">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
              <InstagramIcon className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-white tracking-tight text-base leading-tight">
                  Agendador
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  SaaS Instagram
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Lista de Navegação com Scroll */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Dashboard */}
          <Link
            href="/"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive("/") && pathname === "/"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
            }`}
            title="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>

          {/* Contas */}
          <Link
            href="/contas"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive("/contas")
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
            }`}
            title="Contas"
          >
            <Users className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Contas</span>}
          </Link>

          {/* Seção: REELS */}
          <div className="pt-2">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setReelsOpen(!reelsOpen)}
                className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reels</span>
                </div>
                {reelsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="h-px bg-slate-800 my-2" />
            )}

            {(reelsOpen || isCollapsed) && (
              <div className="space-y-0.5 mt-1">
                <Link
                  href="/reels/nova-fila"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/reels/nova-fila"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Nova fila"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  {!isCollapsed && <span>Nova fila</span>}
                </Link>

                <Link
                  href="/reels/filas"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/reels/filas"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Filas"
                >
                  <ListOrdered className="w-3.5 h-3.5 shrink-0" />
                  {!isCollapsed && <span>Filas</span>}
                </Link>

                <Link
                  href="/reels/publicados"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/reels/publicados"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Publicados"
                >
                  <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                  {!isCollapsed && <span>Publicados</span>}
                </Link>
              </div>
            )}
          </div>

          {/* Seção: CARROSSÉIS */}
          <div className="pt-2">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setCarouselsOpen(!carouselsOpen)}
                className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Carrosséis</span>
                </div>
                {carouselsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="h-px bg-slate-800 my-2" />
            )}

            {(carouselsOpen || isCollapsed) && (
              <div className="space-y-0.5 mt-1">
                <Link
                  href="/carrosseis/novo"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/carrosseis/novo"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Novo carrossel"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  {!isCollapsed && <span>Novo carrossel</span>}
                </Link>

                <Link
                  href="/carrosseis/filas"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/carrosseis/filas"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Filas"
                >
                  <ListOrdered className="w-3.5 h-3.5 shrink-0" />
                  {!isCollapsed && <span>Filas</span>}
                </Link>

                <Link
                  href="/carrosseis/publicados"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/carrosseis/publicados"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Publicados"
                >
                  <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                  {!isCollapsed && <span>Publicados</span>}
                </Link>
              </div>
            )}
          </div>

          {/* Agenda */}
          <Link
            href="/agenda"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive("/agenda")
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
            }`}
            title="Agenda"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Agenda</span>}
          </Link>

          {/* Seção: ANALYTICS */}
          <div className="pt-2">
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setAnalyticsOpen(!analyticsOpen)}
                className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Analytics</span>
                </div>
                {analyticsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : null}

            {(analyticsOpen || isCollapsed) && (
              <div className="space-y-0.5 mt-1">
                <Link
                  href="/analytics/geral"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/analytics/geral"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Geral"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {!isCollapsed && <span>Geral</span>}
                </Link>

                <Link
                  href="/analytics/perfil"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/analytics/perfil"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Por perfil"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {!isCollapsed && <span>Por perfil</span>}
                </Link>

                <Link
                  href="/analytics/conteudo"
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    pathname === "/analytics/conteudo"
                      ? "bg-indigo-600/90 text-white"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                  }`}
                  title="Por conteúdo"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {!isCollapsed && <span>Por conteúdo</span>}
                </Link>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-800/80 my-3" />

          {/* Erros e alertas COM BADGE DE DESTAQUE */}
          <Link
            href="/erros"
            onClick={onCloseMobile}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive("/erros")
                ? "bg-rose-600 text-white shadow-xs shadow-rose-600/20"
                : "text-rose-300 hover:bg-rose-950/40 hover:text-rose-200"
            }`}
            title="Erros e alertas"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              {!isCollapsed && <span>Erros e alertas</span>}
            </div>
            {!isCollapsed && criticalErrors > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                {criticalErrors}
              </span>
            )}
          </Link>

          {/* Notificações */}
          <Link
            href="/notificacoes"
            onClick={onCloseMobile}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive("/notificacoes")
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
            }`}
            title="Notificações"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Notificações</span>}
            </div>
            {!isCollapsed && unreadNotificationsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                {unreadNotificationsCount}
              </span>
            )}
          </Link>

          {/* Configurações */}
          <Link
            href="/configuracoes"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive("/configuracoes")
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
            }`}
            title="Configurações"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Configurações</span>}
          </Link>
        </nav>

        {/* Rodapé da Sidebar: Status, Usuário e Versão */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 shrink-0 space-y-2">
          {!isCollapsed ? (
            <>
              {/* Indicador de Status do Sistema */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Server className="w-3 h-3 text-emerald-400" />
                    Status do Sistema
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Meta: {systemStatus.metaApi}</span>
                  <span>DB: {systemStatus.database}</span>
                  <span>R2: {systemStatus.storage}</span>
                </div>
              </div>

              {/* Perfil do Administrador */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-white truncate">
                      Administrador
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      admin@agendador.com
                    </div>
                  </div>
                </div>
              </div>

              {/* Versão do App */}
              <div className="text-[10px] text-slate-500 text-center pt-0.5">
                Agendador v1.2.0 • SaaS Ready
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sistema Operacional" />
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs">
                A
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
