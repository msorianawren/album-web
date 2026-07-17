import {
  detectAssistantIntent,
  normalizeAssistantText,
  type AssistantConfidence,
  type AssistantIntent,
} from "@/lib/assistant/intents";
import {
  assistantKnowledge,
  type AssistantQuickAction,
} from "@/lib/assistant/knowledge";
import {
  DEFAULT_ASSISTANT_LOCALE,
  normalizeAssistantLocale,
  type AssistantLocale,
} from "@/lib/assistant/locales";
import { getAssistantUICopy } from "@/lib/assistant/ui-copy";
import type { AssistantMode } from "@/lib/assistant/preferences";

export const ASSISTANT_PANEL_STORAGE_KEY = "oriana.assistant.panel.v1";
export const ASSISTANT_HANDOFF_STORAGE_KEY = "oriana.assistant.handoff.v1";

export interface AssistantAnswerContext {
  locale?: AssistantLocale;
  isAuthenticated?: boolean;
  currentPath?: string;
  assistantMode?: AssistantMode;
  notificationCount?: number | null;
}

export interface AssistantAnswer {
  intent: AssistantIntent;
  confidence: AssistantConfidence;
  answer: string;
  title: string;
  quickActions: AssistantQuickAction[];
  relatedUrls: string[];
  requiresAuth: boolean;
  canHandoffToContact: boolean;
}

function detectLocale(input: string, preferred?: AssistantLocale): AssistantLocale {
  if (preferred) return normalizeAssistantLocale(preferred);
  const normalized = normalizeAssistantText(input);
  if (
    normalized.includes("xin quyen") ||
    normalized.includes("tai zip") ||
    normalized.includes("so dien thoai") ||
    normalized.includes("dang nhap") ||
    normalized.includes("thong bao") ||
    normalized.includes("tin nhan") ||
    normalized.includes("khong")
  ) {
    return "vi";
  }
  return DEFAULT_ASSISTANT_LOCALE;
}

function safePath(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

function authQuickAction(currentPath: string | undefined, locale: AssistantLocale): AssistantQuickAction {
  const next = encodeURIComponent(safePath(currentPath));
  const copy = getAssistantUICopy(locale);
  return {
    id: "login",
    label: copy.signIn,
    question: "How do I login?",
    href: `/login?next=${next}`,
  };
}

function gameAnswer(intent: AssistantIntent, locale: AssistantLocale): AssistantAnswer | null {
  const vi = locale === "vi";
  const common = {
    intent,
    confidence: "high" as const,
    relatedUrls: ["/games"],
    requiresAuth: false,
    canHandoffToContact: false,
  };
  if (intent === "games_intro") {
    return {
      ...common,
      title: vi ? "Oriana Puzzle Atelier" : "Oriana Puzzle Atelier",
      answer: vi ? "Bạn có thể chơi Sliding Puzzle hoặc Swap Puzzle với tư cách khách. Bàn 3 x 3 phù hợp để bắt đầu, 4 x 4 cân bằng hơn, còn 5 x 5 dành cho thử thách sâu hơn. Đăng nhập chỉ cần thiết khi muốn lưu thành tích, nhận Wren Feathers và huy hiệu." : "Play Sliding Puzzle or Swap Puzzle as a guest. Start with 3 x 3, choose 4 x 4 for a balanced challenge, or 5 x 5 for the deepest study. Sign in only when you want account scores, Wren Feathers, and badges.",
      quickActions: [{ id: "games", label: vi ? "Mở Puzzle Atelier" : "Open Puzzle Atelier", question: "Open the puzzle games", href: "/games" }],
    };
  }
  if (intent === "games_sliding") {
    return {
      ...common,
      title: vi ? "Sliding Puzzle" : "Sliding Puzzle",
      answer: vi ? "Chỉ những ô cạnh khoảng trống mới di chuyển được. Chạm hoặc bấm vào ô hợp lệ; trên bàn phím, dùng phím mũi tên để di chuyển ô cạnh khoảng trống." : "Only tiles beside the empty space can move. Select a valid tile, or use arrow keys to move the adjacent tile.",
      quickActions: [{ id: "game_valid_moves", label: vi ? "Hiện nước đi hợp lệ" : "Show valid moves", question: "Show valid moves" }],
    };
  }
  if (intent === "games_swap") {
    return {
      ...common,
      title: vi ? "Swap Puzzle" : "Swap Puzzle",
      answer: vi ? "Chọn một ô, sau đó chọn ô thứ hai để đổi vị trí. Chọn lại trò chơi mới bất cứ lúc nào để bắt đầu lại từ cùng bàn cờ xác định." : "Select one tile, then select a second tile to swap their positions. Start a new game at any time to restart the same deterministic board.",
      quickActions: [{ id: "game_restart", label: vi ? "Chơi lại" : "Restart puzzle", question: "Restart this puzzle" }],
    };
  }
  if (intent === "games_rewards") {
    return {
      ...common,
      title: vi ? "Wren Feathers và huy hiệu" : "Wren Feathers and badges",
      answer: vi ? "Phần thưởng được xác minh ở máy chủ sau khi hoàn thành. Thời gian và số bước đạt mục tiêu có thể tăng thưởng; chơi lại không tạo phần thưởng trùng lặp." : "Rewards are verified by the server after completion. Target time and moves can increase the reward; replays cannot create duplicate rewards.",
      quickActions: [{ id: "games", label: vi ? "Xem thử thách" : "Browse challenges", question: "Open the puzzle games", href: "/games" }],
    };
  }
  if (intent === "games_help") {
    return {
      ...common,
      title: vi ? "Trợ giúp Puzzle Atelier" : "Puzzle Atelier help",
      answer: vi ? "Bạn có thể hiện nước đi hợp lệ, xem ảnh tham chiếu hoặc bắt đầu lại mà không làm thay đổi lựa chọn thử thách hiện tại." : "You can highlight valid moves, open the reference image, or restart without changing the selected challenge.",
      quickActions: [
        { id: "game_valid_moves", label: vi ? "Hiện nước đi hợp lệ" : "Show valid moves", question: "Show valid moves" },
        { id: "game_reference", label: vi ? "Xem ảnh tham chiếu" : "View reference", question: "View the puzzle reference" },
      ],
    };
  }
  return null;
}

function findKnowledge(intent: AssistantIntent, locale: AssistantLocale, input: string) {
  const normalizedInput = normalizeAssistantText(input);
  const candidates = assistantKnowledge.filter((item) => item.intent === intent);
  const localeMatch = candidates.find((item) => item.locale === locale);
  if (localeMatch) return localeMatch;

  const localePatternMatch = assistantKnowledge.find((item) =>
    item.locale === locale &&
    item.questionPatterns.some((pattern) =>
      normalizedInput.includes(normalizeAssistantText(pattern)),
    ),
  );
  if (localePatternMatch) return localePatternMatch;

  const englishMatch = candidates.find((item) => item.locale === DEFAULT_ASSISTANT_LOCALE);
  if (englishMatch) return englishMatch;

  return candidates[0] ?? assistantKnowledge.find((item) => item.intent === "unknown");
}

export function sanitizeAssistantQuestion(input: string) {
  return input
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .replace(/\beyJ[A-Za-z0-9._-]{20,}\b/g, "[token removed]")
    .replace(/\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9._-]{20,}\b/g, "[token removed]")
    .trim()
    .slice(0, 300);
}

export function answerAssistantQuestion(
  input: string,
  context: AssistantAnswerContext = {},
): AssistantAnswer {
  const question = sanitizeAssistantQuestion(input);
  if (!question) {
    const locale = normalizeAssistantLocale(context.locale);
    const copy = getAssistantUICopy(locale);
    return {
      intent: "unknown",
      confidence: "low",
      title: copy.emptyQuestionTitle,
      answer: copy.emptyQuestionAnswer,
      quickActions: [],
      relatedUrls: [],
      requiresAuth: false,
      canHandoffToContact: false,
    };
  }

  const intentResult = detectAssistantIntent(question);
  const locale = detectLocale(question, context.locale);
  const copy = getAssistantUICopy(locale);
  const puzzleResponse = gameAnswer(intentResult.intent, locale);
  if (puzzleResponse) return { ...puzzleResponse, confidence: intentResult.confidence };
  const item = findKnowledge(intentResult.intent, locale, question);

  if (!item || intentResult.intent === "unknown" || intentResult.confidence === "low") {
    const unknownItem = findKnowledge("unknown", locale, question);
    return {
      intent: "unknown",
      confidence: "low",
      title: unknownItem?.title ?? copy.contactHandoffTitle,
      answer: unknownItem?.answer ?? copy.unknownAnswer,
      quickActions: [{ id: "contact", label: copy.openContactDraft, question, href: "/contact" }],
      relatedUrls: ["/contact"],
      requiresAuth: false,
      canHandoffToContact: true,
    };
  }

  if (item.requiresAuth && !context.isAuthenticated) {
    return {
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      title: item.title,
      answer: copy.authRequiredAnswer,
      quickActions: [authQuickAction(context.currentPath, locale), ...(item.quickActions ?? [])],
      relatedUrls: ["/login", ...(item.relatedUrls ?? [])],
      requiresAuth: true,
      canHandoffToContact: false,
    };
  }

  const notificationSuffix =
    intentResult.intent === "notifications_help" && typeof context.notificationCount === "number"
      ? copy.unreadNotification(context.notificationCount)
      : "";

  return {
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    title: item.title,
    answer: `${item.answer}${notificationSuffix}`,
    quickActions: item.quickActions ?? [],
    relatedUrls: item.relatedUrls ?? [],
    requiresAuth: Boolean(item.requiresAuth),
    canHandoffToContact: true,
  };
}
