"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import {
  Account,
  ErrorLog,
  NotificationItem,
  ScheduledPost,
  PublishedPost,
  ReelQueue,
  CarouselQueue,
  SystemStatus,
} from "@/types";
import {
  MOCK_ACCOUNTS,
  MOCK_ERRORS,
  MOCK_NOTIFICATIONS,
  MOCK_SCHEDULED_POSTS,
  MOCK_PUBLISHED_POSTS,
  MOCK_REEL_QUEUES,
  MOCK_CAROUSEL_QUEUES,
  MOCK_SYSTEM_STATUS,
} from "@/lib/mock-data";
import { useToast } from "./ToastContext";

interface AppStateContextType {
  // Contas
  accounts: Account[];
  selectedAccountId: string; // "all" ou id da conta
  selectedAccount: Account | null;
  setSelectedAccountId: (id: string) => void;
  toggleAccountPause: (id: string) => void;
  reconnectAccount: (id: string) => void;
  addAccount: (account: Omit<Account, "id">) => void;

  // Erros e Alertas
  errors: ErrorLog[];
  criticalErrorsCount: number;
  resolveError: (id: string) => void;
  retryError: (id: string) => void;
  ignoreError: (id: string) => void;

  // Notificações
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  // Postagens e Filas
  scheduledPosts: ScheduledPost[];
  publishedPosts: PublishedPost[];
  reelQueues: ReelQueue[];
  carouselQueues: CarouselQueue[];
  addReelQueue: (queue: Omit<ReelQueue, "id" | "createdAt">) => void;
  addCarouselQueue: (queue: Omit<CarouselQueue, "id" | "createdAt">) => void;
  toggleQueuePause: (queueId: string, type: "reel" | "carousel") => void;

  // Status e Modais
  systemStatus: SystemStatus;
  isConnectModalOpen: boolean;
  setIsConnectModalOpen: (open: boolean) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [selectedAccountId, setSelectedAccountIdState] = useState<string>("all");
  const [errors, setErrors] = useState<ErrorLog[]>(MOCK_ERRORS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(MOCK_SCHEDULED_POSTS);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>(MOCK_PUBLISHED_POSTS);
  const [reelQueues, setReelQueues] = useState<ReelQueue[]>(MOCK_REEL_QUEUES);
  const [carouselQueues, setCarouselQueues] = useState<CarouselQueue[]>(MOCK_CAROUSEL_QUEUES);
  const [systemStatus] = useState<SystemStatus>(MOCK_SYSTEM_STATUS);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Conta ativa selecionada
  const selectedAccount = useMemo(() => {
    if (selectedAccountId === "all") return null;
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const setSelectedAccountId = (id: string) => {
    setSelectedAccountIdState(id);
    if (id === "all") {
      addToast({
        type: "info",
        title: "Visão Global Ativada",
        message: "Mostrando métricas agregadas de todas as contas.",
      });
    } else {
      const acc = accounts.find((a) => a.id === id);
      if (acc) {
        addToast({
          type: "info",
          title: `Conta Selecionada: @${acc.username}`,
          message: "Painel filtrado para este perfil.",
        });
      }
    }
  };

  const toggleAccountPause = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          const newStatus = acc.status === "paused" ? "connected" : "paused";
          return {
            ...acc,
            status: newStatus,
            statusMessage:
              newStatus === "paused"
                ? "Publicações pausadas pelo usuário."
                : undefined,
          };
        }
        return acc;
      })
    );

    const target = accounts.find((a) => a.id === id);
    if (target) {
      const willPause = target.status !== "paused";
      addToast({
        type: willPause ? "warning" : "success",
        title: willPause ? "Conta Pausada" : "Conta Reativada",
        message: willPause
          ? `@${target.username} teve suas publicações interrompidas temporariamente.`
          : `@${target.username} voltou a publicar normalmente.`,
      });
    }
  };

  const reconnectAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === id) {
          return {
            ...acc,
            status: "connected",
            statusMessage: undefined,
            errorsCount: 0,
          };
        }
        return acc;
      })
    );

    // Remove erros pendentes para esta conta
    setErrors((prev) =>
      prev.map((err) =>
        err.accountId === id ? { ...err, status: "resolved" } : err
      )
    );

    const target = accounts.find((a) => a.id === id);
    addToast({
      type: "success",
      title: "Conta Reconectada!",
      message: `O token de acesso para @${target?.username || "conta"} foi renovado com sucesso via Meta OAuth.`,
    });
  };

  const addAccount = (newAccData: Omit<Account, "id">) => {
    const id = `acc_${Date.now()}`;
    const newAccount: Account = {
      ...newAccData,
      id,
    };
    setAccounts((prev) => [newAccount, ...prev]);
    setSelectedAccountIdState(id);
    addToast({
      type: "success",
      title: "Nova Conta Conectada!",
      message: `@${newAccount.username} foi integrada ao Agendador.`,
    });
  };

  const criticalErrorsCount = useMemo(() => {
    return errors.filter((e) => e.status === "pending" && e.severity === "critical").length;
  }, [errors]);

  const resolveError = (id: string) => {
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "resolved" } : e))
    );
    addToast({
      type: "success",
      title: "Erro Marcado como Resolvido",
      message: "O status da ocorrência foi atualizado.",
    });
  };

  const retryError = (id: string) => {
    setErrors((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              attempts: e.attempts + 1,
              status: "retrying",
              lastAttemptAt: new Date().toISOString(),
            }
          : e
      )
    );
    addToast({
      type: "info",
      title: "Tentativa de Reenvio Iniciada",
      message: "A Meta Graph API está reprocessando a publicação...",
    });

    setTimeout(() => {
      setErrors((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "resolved" } : e))
      );
      addToast({
        type: "success",
        title: "Publicação Concluída com Sucesso!",
        message: "O item com falha anterior foi postado com êxito.",
      });
    }, 2500);
  };

  const ignoreError = (id: string) => {
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "ignored" } : e))
    );
    addToast({
      type: "warning",
      title: "Erro Ignorado",
      message: "A ocorrência foi arquivada sem reenvio.",
    });
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast({
      type: "info",
      title: "Notificações Atualizadas",
      message: "Todas as notificações foram marcadas como lidas.",
    });
  };

  const addReelQueue = (queueData: Omit<ReelQueue, "id" | "createdAt">) => {
    const newQueue: ReelQueue = {
      ...queueData,
      id: `rq_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setReelQueues((prev) => [newQueue, ...prev]);
    addToast({
      type: "success",
      title: "Fila de Reels Criada com Sucesso!",
      message: `${newQueue.totalVideos} vídeos foram agendados para @${newQueue.accountUsername}.`,
    });
  };

  const addCarouselQueue = (queueData: Omit<CarouselQueue, "id" | "createdAt">) => {
    const newQueue: CarouselQueue = {
      ...queueData,
      id: `cq_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setCarouselQueues((prev) => [newQueue, ...prev]);
    addToast({
      type: "success",
      title: "Fila de Carrosséis Criada!",
      message: `${newQueue.totalCarousels} carrosséis foram programados para @${newQueue.accountUsername}.`,
    });
  };

  const toggleQueuePause = (queueId: string, type: "reel" | "carousel") => {
    if (type === "reel") {
      setReelQueues((prev) =>
        prev.map((q) =>
          q.id === queueId
            ? { ...q, status: q.status === "paused" ? "active" : "paused" }
            : q
        )
      );
    } else {
      setCarouselQueues((prev) =>
        prev.map((q) =>
          q.id === queueId
            ? { ...q, status: q.status === "paused" ? "active" : "paused" }
            : q
        )
      );
    }
    addToast({
      type: "info",
      title: "Status da Fila Alterado",
      message: "A programação da fila foi atualizada.",
    });
  };

  return (
    <AppStateContext.Provider
      value={{
        accounts,
        selectedAccountId,
        selectedAccount,
        setSelectedAccountId,
        toggleAccountPause,
        reconnectAccount,
        addAccount,
        errors,
        criticalErrorsCount,
        resolveError,
        retryError,
        ignoreError,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        scheduledPosts,
        publishedPosts,
        reelQueues,
        carouselQueues,
        addReelQueue,
        addCarouselQueue,
        toggleQueuePause,
        systemStatus,
        isConnectModalOpen,
        setIsConnectModalOpen,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState deve ser utilizado dentro de um AppStateProvider");
  }
  return context;
}
