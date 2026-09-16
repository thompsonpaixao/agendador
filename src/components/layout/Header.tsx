"use client";

import React, { useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { GlobalAccountSelector } from "./GlobalAccountSelector";
import {
  Bell,
  Plus,
  Search,
  Menu,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const {
    unreadNotificationsCount,
    setIsConnectModalOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAppState();

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Esquerda: Botão mobile e Seletor Global de Contas */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Seletor Global de Contas */}
        <GlobalAccountSelector />
      </div>

      {/* Direita: Busca, Notificações, Status e Ação Rápida */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Badge Informativo da Meta API */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Meta API:</span>
          <span className="text-indigo-600 font-semibold">Modo Simulado</span>
        </div>

        {/* Notificações Bell Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Dropdown de Notificações Rápidas */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">Notificações</h4>
                  {unreadNotificationsCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                      {unreadNotificationsCount} novas
                    </span>
                  )}
                </div>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                  >
                    Marcar lidas
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationAsRead(notif.id)}
                    className={`p-3.5 text-xs transition-colors cursor-pointer flex items-start gap-3 ${
                      notif.read ? "bg-white hover:bg-slate-50" : "bg-indigo-50/40 hover:bg-indigo-50/70"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>{notif.title}</span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-100 text-center bg-slate-50/60">
                <Link
                  href="/notificacoes"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold block py-1"
                >
                  Ver todas as notificações →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Botão Principal: + Conectar conta */}
        <button
          type="button"
          onClick={() => setIsConnectModalOpen(true)}
          className="hidden sm:flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Conectar conta</span>
        </button>
      </div>
    </header>
  );
}
