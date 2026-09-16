export type AccountStatus = "connected" | "expired" | "error" | "paused";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface Account {
  id: string;
  userId?: string;
  username: string;
  name: string;
  profilePicture: string;
  status: AccountStatus;
  statusMessage?: string;
  followers: number;
  newFollowersToday: number;
  postsToday: number;
  postsInQueue: number;
  postsLast7Days: number;
  lastPublishedAt?: string;
  successRate: number;
  errorsCount: number;
  // Configurações padrão do perfil
  defaultReelCaption: string;
  defaultCarouselCaption: string;
  defaultReelsPerDay: number;
  defaultCarouselsPerDay: number;
  defaultTimes: string[];
  useRandomTimeVariation: boolean;
  randomVariationMinutes: number;
  nextScheduledAt?: string;
  profileVideosCount?: number;
  profileCarouselsCount?: number;
}

export type PostType = "reel" | "carousel";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "sending"
  | "processing"
  | "published"
  | "error"
  | "cancelled";

export interface MediaItem {
  id: string;
  userId?: string;
  accountId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  type: "video" | "image";
  sizeBytes: number;
  durationSeconds?: number;
  caption?: string;
  position: number;
  status: "ready" | "processing" | "uploaded" | "error";
  createdAt?: string;
}

export interface ReelQueue {
  id: string;
  userId?: string;
  accountId: string;
  accountUsername: string;
  accountAvatar: string;
  name: string;
  createdAt: string;
  totalVideos: number;
  publishedCount: number;
  remainingCount: number;
  errorCount: number;
  nextScheduledAt?: string;
  estimatedFinishAt?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  videos: MediaItem[];
  captionMode: "profile_default" | "custom_all" | "individual" | "none";
  customCaption?: string;
  postsPerDay: number;
  dailyTimes: string[];
  distributeUntilEmpty: boolean;
  startDate: string;
}

export interface CarouselSlide {
  id: string;
  position: number;
  url: string;
  type: "image" | "video";
  thumbnailUrl?: string;
  name: string;
  sizeBytes: number;
}

export interface CarouselPost {
  id: string;
  userId?: string;
  accountId: string;
  title: string;
  position: number;
  slides: CarouselSlide[];
  caption?: string;
  scheduledAt?: string;
  status: PostStatus;
  createdAt?: string;
}

export interface CarouselQueue {
  id: string;
  userId?: string;
  accountId: string;
  accountUsername: string;
  accountAvatar: string;
  name: string;
  createdAt: string;
  totalCarousels: number;
  publishedCount: number;
  remainingCount: number;
  errorCount: number;
  nextScheduledAt?: string;
  status: "active" | "paused" | "completed";
  carousels: CarouselPost[];
  captionMode: "profile_default" | "custom_all" | "individual" | "none";
  customCaption?: string;
  postsPerDay: number;
  dailyTimes: string[];
  startDate: string;
}

export interface PostHistoryLog {
  timestamp: string;
  message: string;
  state: PostStatus;
}

export interface ScheduledPost {
  id: string;
  userId?: string;
  accountId: string;
  accountUsername: string;
  accountAvatar: string;
  type: PostType;
  title: string;
  caption: string;
  scheduledAt: string;
  thumbnailUrl: string;
  mediaUrl?: string;
  slidesCount?: number;
  status: PostStatus;
  queueId?: string;
  history: PostHistoryLog[];
}

export interface PublishedPost {
  id: string;
  userId?: string;
  accountId: string;
  accountUsername: string;
  accountAvatar: string;
  type: PostType;
  thumbnailUrl: string;
  mediaUrl?: string;
  caption: string;
  publishedAt: string;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileVisits: number;
  followersGained: number;
  watchTimeSeconds?: number;
  avgWatchTimeSeconds?: number;
  status: "published";
}

export type ErrorSeverity = "critical" | "warning" | "resolved";
export type ErrorCategory = "account" | "token" | "publish" | "media" | "api";

export interface ErrorLog {
  id: string;
  userId?: string;
  timestamp: string;
  accountId: string;
  accountUsername: string;
  accountAvatar: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  postType?: PostType;
  postTitle?: string;
  mediaUrl?: string;
  errorCode: string;
  errorMessage: string;
  technicalDetails?: string;
  attempts: number;
  lastAttemptAt: string;
  status: "pending" | "retrying" | "resolved" | "ignored";
  suggestedAction: "reconnect" | "retry" | "check_media" | "view_profile" | "manual";
}

export interface NotificationItem {
  id: string;
  userId?: string;
  timestamp: string;
  type:
    | "publish_success"
    | "publish_error"
    | "token_expired"
    | "account_reconnected"
    | "queue_completed"
    | "queue_paused";
  title: string;
  message: string;
  read: boolean;
  accountId?: string;
  link?: string;
}

export interface SystemStatus {
  metaApi: "online" | "degraded" | "offline";
  database: "online" | "degraded" | "offline";
  storage: "online" | "degraded" | "offline";
  scheduler: "online" | "degraded" | "offline";
}
