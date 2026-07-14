import {
  detectAssistantIntent,
  normalizeAssistantText,
  type AssistantConfidence,
  type AssistantIntent,
} from "@/lib/assistant/intents";
import {
  assistantKnowledge,
  type AssistantLocale,
  type AssistantQuickAction,
} from "@/lib/assistant/knowledge";
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

const fallbackAnswer = "I'm not fully sure. You can send this to Oriana Wren through Contact.";

function detectLocale(input: string, preferred?: AssistantLocale): AssistantLocale {
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
  return preferred ?? "en";
}

function safePath(path?: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

function authQuickAction(currentPath?: string): AssistantQuickAction {
  const next = encodeURIComponent(safePath(currentPath));
  return {
    id: "login",
    label: "Sign in",
    question: "How do I login?",
    href: `/login?next=${next}`,
  };
}

function findKnowledge(intent: AssistantIntent, locale: AssistantLocale, input: string) {
  const normalizedInput = normalizeAssistantText(input);
  const candidates = assistantKnowledge.filter((item) => item.intent === intent);
  const localeMatch = candidates.find((item) => item.locale === locale);
  if (localeMatch) return localeMatch;

  const patternMatch = assistantKnowledge.find((item) =>
    item.questionPatterns.some((pattern) =>
      normalizedInput.includes(normalizeAssistantText(pattern)),
    ),
  );
  if (patternMatch) return patternMatch;

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
    return {
      intent: "unknown",
      confidence: "low",
      title: "Ask a website question",
      answer: "Ask about albums, private access, downloads, messages, notifications, or account basics.",
      quickActions: [],
      relatedUrls: [],
      requiresAuth: false,
      canHandoffToContact: false,
    };
  }

  const intentResult = detectAssistantIntent(question);
  const locale = detectLocale(question, context.locale);
  const item = findKnowledge(intentResult.intent, locale, question);

  if (!item || intentResult.intent === "unknown" || intentResult.confidence === "low") {
    return {
      intent: "unknown",
      confidence: "low",
      title: "Contact handoff",
      answer: fallbackAnswer,
      quickActions: [{ id: "contact", label: "Contact Oriana Wren", question, href: "/contact" }],
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
      answer: "Please sign in with Google first. After login, return to the album or page you were viewing and check your own request, message, or notification status there.",
      quickActions: [authQuickAction(context.currentPath), ...(item.quickActions ?? [])],
      relatedUrls: ["/login", ...(item.relatedUrls ?? [])],
      requiresAuth: true,
      canHandoffToContact: false,
    };
  }

  const notificationSuffix =
    intentResult.intent === "notifications_help" && typeof context.notificationCount === "number"
      ? ` You currently have ${context.notificationCount} unread notification${context.notificationCount === 1 ? "" : "s"}.`
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
