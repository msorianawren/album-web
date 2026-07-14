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
