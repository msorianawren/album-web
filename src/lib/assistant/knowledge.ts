import type { AssistantIntent } from "@/lib/assistant/intents";

export type AssistantLocale = "en" | "vi";

export type AssistantQuickActionId =
  | "private_access"
  | "request_status"
  | "zip_help"
  | "contact"
  | "notifications"
  | "phone_policy"
  | "login";

export interface AssistantQuickAction {
  id: AssistantQuickActionId;
  label: string;
  question: string;
  href?: string;
}

export type AssistantKnowledgeItem = {
  id: string;
  locale: AssistantLocale;
  intent: AssistantIntent;
  category:
    | "private_access"
    | "login"
    | "request_status"
    | "albums"
    | "downloads"
    | "contact"
    | "notifications"
    | "phone_policy"
    | "account"
    | "troubleshooting";
  title: string;
  questionPatterns: string[];
  answer: string;
  quickActions?: AssistantQuickAction[];
  relatedUrls?: string[];
  requiresAuth?: boolean;
};

export const assistantQuickActions: AssistantQuickAction[] = [
  {
    id: "private_access",
    label: "Request private access",
    question: "How do I request private album access?",
    href: "/albums",
  },
  {
    id: "request_status",
    label: "Check request status",
    question: "How do I check my request status?",
    href: "/albums",
  },
  {
    id: "zip_help",
    label: "Download ZIP help",
    question: "How does ZIP download work?",
  },
  {
    id: "contact",
    label: "Contact Oriana Wren",
    question: "How do I contact Oriana Wren?",
    href: "/contact",
  },
  {
    id: "notifications",
    label: "Notifications",
    question: "How do notifications work?",
  },
  {
    id: "phone_policy",
    label: "Phone policy",
    question: "Why is my phone number requested?",
  },
];

export const assistantKnowledge: AssistantKnowledgeItem[] = [
  {
    id: "private-access-en",
    locale: "en",
    intent: "private_access_help",
    category: "private_access",
    title: "Request private album access",
    questionPatterns: ["private access", "request access", "locked album"],
    answer: "Open a locked private album and choose the access request action. Add the requested details, submit once, then wait for review. You can return to Albums later to see whether access is pending, approved, denied, or revoked.",
    relatedUrls: ["/albums", "/profile"],
  },
  {
    id: "private-access-vi",
    locale: "vi",
    intent: "private_access_help",
    category: "private_access",
    title: "Xin quyền xem album riêng tư",
    questionPatterns: ["xin quyền album", "album private", "album riêng tư"],
    answer: "Mở album riêng tư đang bị khóa rồi chọn thao tác xin quyền truy cập. Điền thông tin được yêu cầu, gửi một lần, sau đó chờ xét duyệt. Bạn có thể quay lại trang Albums để xem trạng thái pending, approved, denied hoặc revoked.",
    relatedUrls: ["/albums", "/profile"],
  },
  {
    id: "select-private-en",
    locale: "en",
    intent: "select_private_albums",
    category: "private_access",
    title: "Select multiple private albums",
    questionPatterns: ["select multiple private albums", "several private albums"],
    answer: "When the request form supports multiple albums, select only the private albums you genuinely want to view. Sending one focused request is better than repeating many separate requests. If selection is not shown, request from the specific album page.",
    relatedUrls: ["/albums"],
  },
  {
    id: "request-all-en",
    locale: "en",
    intent: "request_all_private",
    category: "private_access",
    title: "Request all private albums",
    questionPatterns: ["request all private albums", "all private albums"],
    answer: "Request all means your access request can cover every currently private album. It does not guarantee approval, and future private albums may still need a separate decision. Use it only when your reason clearly applies to the whole private archive.",
    relatedUrls: ["/albums"],
  },
  {
    id: "manual-auto-en",
    locale: "en",
    intent: "manual_auto_approval",
    category: "request_status",
    title: "Manual review and auto approval",
    questionPatterns: ["manual review", "auto approval", "7 days"],
    answer: "Private access can be reviewed manually by Oriana Wren. Some pending requests may become eligible for automatic approval after 7 days, depending on the site policy and account status. A pending state means the request is still under review.",
    relatedUrls: ["/albums"],
    requiresAuth: true,
  },
  {
    id: "phone-policy-en",
    locale: "en",
    intent: "phone_policy",
    category: "phone_policy",
    title: "Why phone number is requested",
    questionPatterns: ["why phone", "phone number", "phone privacy"],
    answer: "A phone number may be requested for private access review, especially when access is sensitive or limited. It is not displayed publicly and is not included in notifications. Only provide a number if you are comfortable with that review step.",
    relatedUrls: ["/profile"],
  },
  {
    id: "phone-policy-vi",
    locale: "vi",
    intent: "phone_policy",
    category: "phone_policy",
    title: "Vì sao cần số điện thoại",
    questionPatterns: ["số điện thoại", "tại sao cần phone", "phone privacy"],
    answer: "Số điện thoại có thể được yêu cầu khi xét duyệt quyền xem album riêng tư. Số này không hiển thị công khai và không được đưa vào thông báo. Chỉ gửi nếu bạn thoải mái với bước xác minh đó.",
    relatedUrls: ["/profile"],
  },
  {
    id: "album-status-en",
    locale: "en",
    intent: "album_status_meaning",
    category: "albums",
    title: "Album status meanings",
    questionPatterns: ["public private updating", "album status", "updating albums"],
    answer: "Public albums are open to browse. Private albums require approved access before real media is available. Updating albums may be visible while content, order, captions, or download settings are still being refined.",
    relatedUrls: ["/albums"],
  },
  {
    id: "login-en",
    locale: "en",
    intent: "login_help",
    category: "login",
    title: "Login with Google",
    questionPatterns: ["login", "google sign in", "return after sign in"],
    answer: "Use Google sign-in from the login page or when an action asks for an account. The site keeps a safe return path, so after sign-in you should come back to the album or page you intended to open. If it does not return correctly, open the album again after login.",
    quickActions: [{ id: "login", label: "Sign in", question: "How do I login?", href: "/login" }],
    relatedUrls: ["/login"],
  },
  {
    id: "request-status-en",
    locale: "en",
    intent: "request_status",
    category: "request_status",
    title: "Check request status",
    questionPatterns: ["request status", "pending approved denied revoked"],
    answer: "Pending means the request is waiting for review. Approved means access is active, denied means the request was not accepted, and revoked means access was removed after being granted. Check Albums while signed in to see the latest access state.",
    relatedUrls: ["/albums"],
    requiresAuth: true,
  },
  {
    id: "zip-en",
    locale: "en",
    intent: "download_zip_help",
    category: "downloads",
    title: "ZIP download",
    questionPatterns: ["download zip", "zip download", "why zip takes time"],
    answer: "ZIP download packages allowed album media into one file. Large albums can take time because the server has to gather files and build the archive. If the album is private, your access and download permission are checked before the ZIP is created.",
    relatedUrls: ["/albums"],
  },
  {
    id: "zip-vi",
    locale: "vi",
    intent: "download_zip_help",
    category: "downloads",
    title: "Tải ZIP",
    questionPatterns: ["tải zip", "download zip", "tải album"],
    answer: "Tải ZIP sẽ gom các media được phép tải trong album thành một file. Album lớn có thể mất thời gian vì server phải chuẩn bị gói tải. Với album riêng tư, quyền truy cập và quyền download được kiểm tra trước khi tạo ZIP.",
    relatedUrls: ["/albums"],
  },
  {
    id: "download-blocked-en",
    locale: "en",
    intent: "download_blocked",
    category: "downloads",
    title: "Download blocked",
    questionPatterns: ["download blocked", "cannot download", "download error"],
    answer: "A download can be blocked if the album is private, your access was revoked, the file is not marked downloadable, or the site owner has disabled public downloads. Try signing in, refresh the album page, and contact Oriana Wren if the permission still looks wrong.",
    quickActions: [{ id: "contact", label: "Contact Oriana Wren", question: "How do I contact Oriana Wren?", href: "/contact" }],
    relatedUrls: ["/contact"],
  },
  {
    id: "contact-en",
    locale: "en",
    intent: "contact_help",
    category: "contact",
    title: "Contact Oriana Wren",
    questionPatterns: ["contact", "contact Oriana Wren", "email"],
    answer: "Use the Contact page for private access questions, collaborations, commercial usage, or anything the assistant cannot answer. If you are signed in, replies can be shown in your contact thread. Keep the message specific and avoid sending private links or tokens.",
    relatedUrls: ["/contact"],
  },
  {
    id: "replies-en",
    locale: "en",
    intent: "message_replies",
    category: "contact",
    title: "Read replies",
    questionPatterns: ["message reply", "admin reply", "read replies"],
    answer: "Replies from Oriana Wren appear in your Contact conversation area when you are signed in. Public-facing replies use the name Oriana Wren, not private admin identity. Open Contact to review your own threads.",
    relatedUrls: ["/contact"],
    requiresAuth: true,
  },
  {
    id: "notifications-en",
    locale: "en",
    intent: "notifications_help",
    category: "notifications",
    title: "Notifications",
    questionPatterns: ["notifications", "unread notifications", "bell"],
    answer: "Notifications tell you about access decisions, revokes, and message replies. The header bell can show unread items after you sign in. Notification content never needs your phone number to be visible.",
    requiresAuth: true,
  },
  {
    id: "blocked-en",
    locale: "en",
    intent: "account_blocked",
    category: "account",
    title: "Blocked account basics",
    questionPatterns: ["account blocked", "unblock", "boycott"],
    answer: "A blocked account cannot use protected actions and may be redirected to the boycott page. Only an admin can unblock an account. If you believe this was a mistake, use Contact politely with the email tied to your Google login.",
    relatedUrls: ["/contact"],
  },
  {
    id: "troubleshooting-en",
    locale: "en",
    intent: "troubleshooting",
    category: "troubleshooting",
    title: "Upload and download troubleshooting",
    questionPatterns: ["upload error", "download error", "not working"],
    answer: "Refresh the page, check that you are signed in, and try a stable connection. Uploads may fail if the file type or size is not allowed; downloads may fail if access or download permission is missing. If it keeps failing, contact Oriana Wren with the album name and action you tried.",
    relatedUrls: ["/contact"],
  },
  {
    id: "unknown-en",
    locale: "en",
    intent: "unknown",
    category: "troubleshooting",
    title: "When I cannot answer",
    questionPatterns: ["assistant cannot answer", "not sure", "unknown"],
    answer: "I am not fully sure. You can send this to Oriana Wren through Contact, and the message will be handled by the normal contact flow. I will not invent details outside the website rules.",
    quickActions: [{ id: "contact", label: "Contact Oriana Wren", question: "How do I contact Oriana Wren?", href: "/contact" }],
    relatedUrls: ["/contact"],
  },
];
