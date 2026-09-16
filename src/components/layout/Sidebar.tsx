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
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Server,
  User,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const { accounts, errors, unreadNotificationsCount, systemStatus, setIsConnectModalOpen } = useAppState();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const criticalErrors = errors.filter((e) => e.status === "pending").length;

  const isProfileRoute = pathname.startsWith("/contas/") && pathname !== "/contas";
  const profileId = isProfileRoute ? pathname.split("/")[2] : null;
  const currentProfile = accounts.find((a) => a.id === profileId);

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
          {/* SE ESTIVER DENTRO DE UM PERFIL ESPECÍFICO */}
          {isProfileRoute && currentProfile ? (
            <div className="space-y-4">
              {/* Card do Perfil Ativo na Sidebar */}
              {!isCollapsed ? (
                <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-600 shrink-0">
                      <Image
                        src={currentProfile.profilePicture}
                        alt={currentProfile.username}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        @{currentProfile.username}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ambiente Ativo
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/contas"
                    onClick={onCloseMobile}
                    className="w-full py-1 px-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center justify-center gap-1 transition-colors block text-center"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Trocar de perfil</span>
                  </Link>
                </div>
              ) : (
                <div className="flex justify-center pb-2">
                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-600">
                    <Image
                      src={currentProfile.profilePicture}
                      alt={currentProfile.username}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {/* 8 Abas do Perfil */}
              <div className="space-y-0.5">
                {!isCollapsed && (
                  <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Gerenciamento da Conta
                  </div>
                )}

                {[
                  { id: "visao-geral", label: "Visão Geral", icon: LayoutDashboard },
                  { id: "reels", label: "Reels", icon: Film },
                  { id: "carrosseis", label: "Carrosséis", icon: Layers },
                  { id: "agenda", label: "Agenda", icon: Calendar },
                  { id: "publicados", label: "Publicados", icon: CheckCircle },
                  { id: "analytics", label: "Analytics", icon: BarChart3 },
                  { id: "erros", label: "Erros da Conta", icon: AlertTriangle },
                  { id: "configuracoes", label: "Configurações", icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={`/contas/${currentProfile.id}?tab=${item.id}`}
                      onClick={onCloseMobile}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/70 hover:text-white transition-all"
                      title={item.label}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>

              <div className="h-px bg-slate-800 my-2" />

              {/* Retorno ao Dashboard Geral */}
              <Link
                href="/"
                onClick={onCloseMobile}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 transition-all"
                title="Dashboard Geral"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Dashboard Geral</span>}
              </Link>
            </div>
          ) : (
            /* SE ESTIVER NO MODO GERAL / VISÃO CONSOLIDADA */
            <>
              {/* Dashboard Geral */}
              <Link
                href="/"
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive("/") && pathname === "/"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
                title="Dashboard Geral"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Dashboard Geral</span>}
              </Link>

              {/* Contas */}
              <Link
                href="/contas"
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive("/contas")
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
                title="Contas Conectadas"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Contas (Perfis)</span>}
                </div>
                {!isCollapsed && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-400 font-bold">
                    {accounts.length}
                  </span>
                )}
              </Link>

              {/* Lista Rápida de Perfis Conectados */}
              {accounts.length > 0 && (
                <div className="pt-2">
                  {!isCollapsed && (
                    <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Perfis Conectados
                    </div>
                  )}
                  <div className="space-y-0.5 mt-1">
                    {accounts.map((acc) => (
                      <Link
                        key={acc.id}
                        href={`/contas/${acc.id}`}
                        onClick={onCloseMobile}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition-all group"
                        title={`@${acc.username}`}
                      >
                        <div className="relative w-5 h-5 rounded-md overflow-hidden border border-slate-700 shrink-0">
                          <Image
                            src={acc.profilePicture}
                            alt={acc.username}
                            width={20}
                            height={20}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                        {!isCollapsed && (
                          <span className="truncate group-hover:text-indigo-400">
                            @{acc.username}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão Conectar Conta */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-400 hover:bg-indigo-950/40 hover:text-indigo-300 transition-colors cursor-pointer"
                  title="Conectar novo perfil"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>+ Conectar Perfil</span>}
                </button>
              </div>

              <div className="h-px bg-slate-800/80 my-3" />

              {/* Erros e Alertas Globais */}
              <Link
                href="/erros"
                onClick={onCloseMobile}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive("/erros")
                    ? "bg-rose-600 text-white shadow-xs shadow-rose-600/20"
                    : criticalErrors > 0
                    ? "text-rose-300 hover:bg-rose-950/40 hover:text-rose-200"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
                title="Erros e Alertas Globais"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${criticalErrors > 0 ? "text-rose-400" : "text-slate-400"}`} />
                  {!isCollapsed && <span>Erros e Alertas</span>}
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

              {/* Configurações Globais */}
              <Link
                href="/configuracoes"
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive("/configuracoes")
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
                title="Configurações Globais"
              >
                <Settings className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Configurações</span>}
              </Link>
            </>
          )}
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
                Agendador v2.0 • Perfil Centric
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
