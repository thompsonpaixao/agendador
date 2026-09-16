"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import {
  Account,
  AccountStatus,
  ErrorLog,
  NotificationItem,
  ScheduledPost,
  PublishedPost,
  ReelQueue,
  CarouselQueue,
  SystemStatus,
  ServiceStatus,
  MediaItem,
  CarouselPost,
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
  MOCK_PROFILE_MEDIA,
  MOCK_PROFILE_CAROUSELS,
} from "@/lib/mock-data";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";
import { createClient } from "@/lib/supabase/client";

interface AppStateContextType {
  // Contas
  accounts: Account[];
  selectedAccountId: string; // "all" ou id da conta
  selectedAccount: Account | null;
  setSelectedAccountId: (id: string) => void;
  toggleAccountPause: (id: string) => void;
  reconnectAccount: (id: string) => void;
  addAccount: (account: Omit<Account, "id">) => void;
  refreshAccounts: () => Promise<void>;

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

  // Repositório e Construtor do Perfil
  profileMedia: MediaItem[];
  profileCarousels: CarouselPost[];
  addProfileMedia: (accountId: string, files: Omit<MediaItem, "id" | "accountId">[]) => void;
  deleteProfileMedia: (accountId: string, mediaId: string) => void;
  addProfileCarousel: (accountId: string, carousel: Omit<CarouselPost, "id" | "accountId">) => void;
  updateProfileCarousel: (accountId: string, carousel: CarouselPost) => void;
  deleteProfileCarousel: (accountId: string, carouselId: string) => void;
  shuffleProfileCarousels: (accountId: string) => void;
  updateAccountSettings: (accountId: string, settings: Partial<Account>) => void;

  // Status e Modais
  systemStatus: SystemStatus;
  isConnectModalOpen: boolean;
  setIsConnectModalOpen: (open: boolean) => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

function mapDbAccountToAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    username: String(row.username || ""),
    name: String(row.name || row.username || ""),
    profilePicture: (row.profile_picture_url as string) || (row.profile_picture as string) || "",
    status: (row.status as AccountStatus) || "connected",
    statusMessage: row.status_message ? String(row.status_message) : undefined,
    followers: typeof row.followers_count === "number" ? row.followers_count : typeof row.followers === "number" ? row.followers : 0,
    newFollowersToday: typeof row.new_followers_today === "number" ? row.new_followers_today : 0,
    postsToday: typeof row.posts_today === "number" ? row.posts_today : 0,
    postsInQueue: typeof row.posts_in_queue === "number" ? row.posts_in_queue : 0,
    postsLast7Days: typeof row.posts_last_7_days === "number" ? row.posts_last_7_days : 0,
    lastPublishedAt: row.last_published_at ? String(row.last_published_at) : undefined,
    successRate: row.success_rate != null ? Number(row.success_rate) : 100,
    errorsCount: typeof row.errors_count === "number" ? row.errors_count : 0,
    defaultReelCaption: String(row.default_reel_caption || ""),
    defaultCarouselCaption: String(row.default_carousel_caption || ""),
    defaultReelsPerDay: typeof row.posts_per_day === "number" ? row.posts_per_day : typeof row.default_reels_per_day === "number" ? row.default_reels_per_day : 1,
    defaultCarouselsPerDay:
      typeof row.default_carousels_per_day === "number" ? row.default_carousels_per_day : 1,
    defaultTimes: Array.isArray(row.default_post_times)
      ? (row.default_post_times as string[])
      : Array.isArray(row.default_times)
      ? (row.default_times as string[])
      : ["09:00", "12:00", "15:00", "18:00", "21:00"],
    useRandomTimeVariation: row.use_random_time_variation !== false,
    randomVariationMinutes:
      typeof row.random_variation_minutes === "number" ? row.random_variation_minutes : 5,
    nextScheduledAt: row.next_scheduled_at ? String(row.next_scheduled_at) : undefined,
    connectionMode: row.connection_mode === "external" ? "external" : "development",
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();
  const { supabaseUser, isConfigured } = useAuth();

  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [selectedAccountId, setSelectedAccountIdState] = useState<string>("all");
  const [errors, setErrors] = useState<ErrorLog[]>(MOCK_ERRORS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(MOCK_SCHEDULED_POSTS);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>(MOCK_PUBLISHED_POSTS);
  const [reelQueues, setReelQueues] = useState<ReelQueue[]>(MOCK_REEL_QUEUES);
  const [carouselQueues, setCarouselQueues] = useState<CarouselQueue[]>(MOCK_CAROUSEL_QUEUES);
  const [profileMedia, setProfileMedia] = useState<MediaItem[]>(MOCK_PROFILE_MEDIA);
  const [profileCarousels, setProfileCarousels] = useState<CarouselPost[]>(MOCK_PROFILE_CAROUSELS);
  const [dbStatus, setDbStatus] = useState<ServiceStatus>("not_configured");
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Sincronização de contas com o Supabase (filtradas por user_id via RLS em instagram_accounts)
  const refreshAccounts = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("instagram_accounts")
        .select(
          "id, user_id, instagram_user_id, username, name, profile_picture_url, status, status_message, followers_count, media_count, default_reel_caption, default_carousel_caption, posts_per_day, default_post_times, use_random_time_variation, random_variation_minutes, connection_mode, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Aviso ao carregar contas do Supabase:", error.message);
        setDbStatus("error");
        return;
      }

      setDbStatus("connected");
      if (data) {
        const mapped = data.map((item) => mapDbAccountToAccount(item as Record<string, unknown>));
        setAccounts(mapped);
      }
    } catch (err) {
      console.warn("Erro ao buscar contas conectadas:", err);
      setDbStatus("error");
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadAccounts() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("instagram_accounts")
          .select(
            "id, user_id, instagram_user_id, username, name, profile_picture_url, status, status_message, followers_count, media_count, default_reel_caption, default_carousel_caption, posts_per_day, default_post_times, use_random_time_variation, random_variation_minutes, connection_mode, created_at"
          )
          .order("created_at", { ascending: false });

        if (!ignore) {
          if (error) {
            setDbStatus("error");
          } else {
            setDbStatus("connected");
            if (data) {
              setAccounts(data.map((item) => mapDbAccountToAccount(item as Record<string, unknown>)));
            }
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar contas:", err);
        if (!ignore) {
          setDbStatus("error");
        }
      }
    }

    if (supabaseUser) {
      void loadAccounts();
    }

    return () => {
      ignore = true;
    };
  }, [supabaseUser]);

  // Status real dos serviços (Item 12: Não configurado, Conectado, Erro, Reconexão necessária)
  const metaApiStatus: ServiceStatus = useMemo(() => {
    if (accounts.length === 0) {
      return "not_configured";
    }
    const hasExpired = accounts.some((a) => a.status === "expired");
    if (hasExpired) return "reconnect_required";
    const hasError = accounts.some((a) => a.status === "error");
    if (hasError) return "error";
    const hasConnected = accounts.some((a) => a.status === "connected");
    if (hasConnected) return "connected";
    return "not_configured";
  }, [accounts]);

  const systemStatus: SystemStatus = useMemo(
    () => ({
      metaApi: metaApiStatus,
      database: isConfigured ? dbStatus : "not_configured",
      storage: "not_configured",
    }),
    [metaApiStatus, isConfigured, dbStatus]
  );

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
      message: `@${newAccount.username} foi integrada ao AgendadorAuto.`,
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

    // Persistência segura server-side (sem permissão direta de update na tabela)
    fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    }).catch(() => {});
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

  const addProfileMedia = (accountId: string, files: Omit<MediaItem, "id" | "accountId">[]) => {
    const newItems: MediaItem[] = files.map((file, idx) => ({
      ...file,
      id: `media_${Date.now()}_${idx}`,
      accountId,
      createdAt: new Date().toISOString(),
    }));
    setProfileMedia((prev) => [...newItems, ...prev]);
    // Atualiza contador da conta
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? { ...acc, profileVideosCount: (acc.profileVideosCount || 0) + newItems.length }
          : acc
      )
    );
    addToast({
      type: "success",
      title: "Vídeos Adicionados ao Perfil!",
      message: `${newItems.length} vídeo(s) foram armazenados no repositório desta conta.`,
    });
  };

  const deleteProfileMedia = (accountId: string, mediaId: string) => {
    setProfileMedia((prev) => prev.filter((m) => !(m.id === mediaId && m.accountId === accountId)));
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? { ...acc, profileVideosCount: Math.max(0, (acc.profileVideosCount || 1) - 1) }
          : acc
      )
    );
    addToast({
      type: "info",
      title: "Vídeo Removido",
      message: "O vídeo foi excluído do repositório da conta.",
    });
  };

  const addProfileCarousel = (accountId: string, carousel: Omit<CarouselPost, "id" | "accountId">) => {
    const newCarousel: CarouselPost = {
      ...carousel,
      id: `cp_${Date.now()}`,
      accountId,
      createdAt: new Date().toISOString(),
    };
    setProfileCarousels((prev) => [newCarousel, ...prev]);
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? { ...acc, profileCarouselsCount: (acc.profileCarouselsCount || 0) + 1 }
          : acc
      )
    );
    addToast({
      type: "success",
      title: "Carrossel Criado com Sucesso!",
      message: `Carrossel salvo com ${newCarousel.slides.length} slides no perfil.`,
    });
  };

  const updateProfileCarousel = (accountId: string, carousel: CarouselPost) => {
    setProfileCarousels((prev) =>
      prev.map((c) => (c.id === carousel.id && c.accountId === accountId ? carousel : c))
    );
    addToast({
      type: "success",
      title: "Carrossel Atualizado",
      message: "As alterações nos slides foram salvas.",
    });
  };

  const deleteProfileCarousel = (accountId: string, carouselId: string) => {
    setProfileCarousels((prev) =>
      prev.filter((c) => !(c.id === carouselId && c.accountId === accountId))
    );
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === accountId
          ? { ...acc, profileCarouselsCount: Math.max(0, (acc.profileCarouselsCount || 1) - 1) }
          : acc
      )
    );
    addToast({
      type: "info",
      title: "Carrossel Excluído",
      message: "O carrossel foi removido do perfil.",
    });
  };

  const shuffleProfileCarousels = (accountId: string) => {
    setProfileCarousels((prev) => {
      const accountItems = prev.filter((c) => c.accountId === accountId);
      const otherItems = prev.filter((c) => c.accountId !== accountId);
      const shuffled = [...accountItems].sort(() => Math.random() - 0.5);
      return [...shuffled, ...otherItems];
    });
    addToast({
      type: "info",
      title: "Ordem Embaralhada!",
      message: "A sequência dos carrosséis deste perfil foi reorganizada.",
    });
  };

  const updateAccountSettings = (accountId: string, settings: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === accountId ? { ...acc, ...settings } : acc))
    );
    addToast({
      type: "success",
      title: "Configurações Atualizadas",
      message: "As preferências da conta foram salvas com sucesso.",
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
        refreshAccounts,
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
        profileMedia,
        profileCarousels,
        addProfileMedia,
        deleteProfileMedia,
        addProfileCarousel,
        updateProfileCarousel,
        deleteProfileCarousel,
        shuffleProfileCarousels,
        updateAccountSettings,
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

