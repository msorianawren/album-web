import type { AssistantIntent } from "@/lib/assistant/intents";
import {
  DEFAULT_ASSISTANT_LOCALE,
  SUPPORTED_ASSISTANT_LOCALES,
  type AssistantLocale,
} from "@/lib/assistant/locales";

export type { AssistantLocale };

export type AssistantQuickActionId =
  | "private_access"
  | "request_status"
  | "zip_help"
  | "contact"
  | "notifications"
  | "phone_policy"
  | "login"
  | "games"
  | "game_sliding"
  | "game_swap"
  | "game_valid_moves"
  | "game_rewards"
  | "game_reference"
  | "game_restart";

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
    | "troubleshooting"
    | "games";
  title: string;
  questionPatterns: string[];
  answer: string;
  quickActions?: AssistantQuickAction[];
  relatedUrls?: string[];
  requiresAuth?: boolean;
};

const quickActionCopy: Record<AssistantLocale, Partial<Record<AssistantQuickActionId, string>>> = {
  en: {
    private_access: "Request private access",
    request_status: "Check request status",
    zip_help: "Download ZIP help",
    contact: "Contact Oriana Wren",
    notifications: "Notifications",
    phone_policy: "Phone policy",
    login: "Sign in",
    games: "Open Puzzle Atelier",
    game_sliding: "How to play Sliding",
    game_swap: "How to play Swap",
    game_valid_moves: "Show valid moves",
    game_rewards: "Explain rewards",
    game_reference: "View reference image",
    game_restart: "Restart puzzle",
  },
  vi: {
    private_access: "Xin quyền album riêng tư",
    request_status: "Kiểm tra trạng thái",
    zip_help: "Trợ giúp tải ZIP",
    contact: "Liên hệ Oriana Wren",
    notifications: "Thông báo",
    phone_policy: "Chính sách số điện thoại",
    login: "Đăng nhập",
    games: "Mở Puzzle Atelier",
    game_sliding: "Cách chơi Sliding",
    game_swap: "Cách chơi Swap",
    game_valid_moves: "Hiện nước đi hợp lệ",
    game_rewards: "Giải thích phần thưởng",
    game_reference: "Xem ảnh tham chiếu",
    game_restart: "Chơi lại puzzle",
  },
  "zh-CN": {
    private_access: "申请私密访问",
    request_status: "查看申请状态",
    zip_help: "ZIP 下载帮助",
    contact: "联系 Oriana Wren",
    notifications: "通知",
    phone_policy: "电话政策",
    login: "登录",
  },
  ja: {
    private_access: "非公開アクセスを申請",
    request_status: "申請状態を確認",
    zip_help: "ZIP ダウンロード案内",
    contact: "Oriana Wren に連絡",
    notifications: "通知",
    phone_policy: "電話番号ポリシー",
    login: "ログイン",
  },
  ko: {
    private_access: "비공개 접근 요청",
    request_status: "요청 상태 확인",
    zip_help: "ZIP 다운로드 도움말",
    contact: "Oriana Wren 연락",
    notifications: "알림",
    phone_policy: "전화번호 정책",
    login: "로그인",
  },
  th: {
    private_access: "ขอสิทธิ์อัลบั้มส่วนตัว",
    request_status: "ตรวจสอบสถานะคำขอ",
    zip_help: "ช่วยดาวน์โหลด ZIP",
    contact: "ติดต่อ Oriana Wren",
    notifications: "การแจ้งเตือน",
    phone_policy: "นโยบายเบอร์โทร",
    login: "เข้าสู่ระบบ",
  },
  id: {
    private_access: "Minta akses privat",
    request_status: "Cek status permintaan",
    zip_help: "Bantuan unduh ZIP",
    contact: "Hubungi Oriana Wren",
    notifications: "Notifikasi",
    phone_policy: "Kebijakan nomor telepon",
    login: "Masuk",
  },
  fr: {
    private_access: "Demander l'accès privé",
    request_status: "Vérifier la demande",
    zip_help: "Aide téléchargement ZIP",
    contact: "Contacter Oriana Wren",
    notifications: "Notifications",
    phone_policy: "Politique téléphone",
    login: "Se connecter",
  },
  de: {
    private_access: "Privaten Zugriff anfragen",
    request_status: "Anfragestatus prüfen",
    zip_help: "ZIP-Download-Hilfe",
    contact: "Oriana Wren kontaktieren",
    notifications: "Benachrichtigungen",
    phone_policy: "Telefonrichtlinie",
    login: "Anmelden",
  },
  es: {
    private_access: "Solicitar acceso privado",
    request_status: "Ver estado de solicitud",
    zip_help: "Ayuda de descarga ZIP",
    contact: "Contactar a Oriana Wren",
    notifications: "Notificaciones",
    phone_policy: "Política de teléfono",
    login: "Iniciar sesión",
  },
};

const quickActionQuestions: Record<AssistantLocale, Partial<Record<AssistantQuickActionId, string>>> = {
  en: {
    private_access: "How do I request private album access?",
    request_status: "How do I check my request status?",
    zip_help: "How does ZIP download work?",
    contact: "How do I contact Oriana Wren?",
    notifications: "How do notifications work?",
    phone_policy: "Why is my phone number requested?",
    login: "How do I login?",
    games: "Open the puzzle games",
    game_sliding: "How do I play Sliding Puzzle?",
    game_swap: "How do I play Swap Puzzle?",
    game_valid_moves: "Show valid moves",
    game_rewards: "How do Wren Feather rewards work?",
    game_reference: "View the puzzle reference",
    game_restart: "Restart this puzzle",
  },
  vi: {
    private_access: "Làm sao xin quyền album riêng tư?",
    request_status: "Kiểm tra trạng thái yêu cầu thế nào?",
    zip_help: "Tải ZIP hoạt động thế nào?",
    contact: "Liên hệ Oriana Wren thế nào?",
    notifications: "Thông báo hoạt động thế nào?",
    phone_policy: "Vì sao cần số điện thoại?",
    login: "Đăng nhập thế nào?",
    games: "Mở trò chơi puzzle",
    game_sliding: "Sliding Puzzle chơi thế nào?",
    game_swap: "Swap Puzzle chơi thế nào?",
    game_valid_moves: "Hiện nước đi hợp lệ",
    game_rewards: "Wren Feathers được tính thế nào?",
    game_reference: "Xem ảnh tham chiếu puzzle",
    game_restart: "Chơi lại puzzle này",
  },
  "zh-CN": {
    private_access: "如何申请私密相册访问？",
    request_status: "如何查看申请状态？",
    zip_help: "ZIP 下载如何工作？",
    contact: "如何联系 Oriana Wren？",
    notifications: "通知如何工作？",
    phone_policy: "为什么需要电话号码？",
    login: "如何登录？",
  },
  ja: {
    private_access: "非公開アルバムのアクセス申請方法は？",
    request_status: "申請状態はどう確認しますか？",
    zip_help: "ZIP ダウンロードはどう動きますか？",
    contact: "Oriana Wren への連絡方法は？",
    notifications: "通知はどう動きますか？",
    phone_policy: "なぜ電話番号が必要ですか？",
    login: "ログイン方法は？",
  },
  ko: {
    private_access: "비공개 앨범 접근은 어떻게 요청하나요?",
    request_status: "요청 상태는 어떻게 확인하나요?",
    zip_help: "ZIP 다운로드는 어떻게 작동하나요?",
    contact: "Oriana Wren 에게 어떻게 연락하나요?",
    notifications: "알림은 어떻게 작동하나요?",
    phone_policy: "왜 전화번호가 필요한가요?",
    login: "어떻게 로그인하나요?",
  },
  th: {
    private_access: "จะขอสิทธิ์อัลบั้มส่วนตัวอย่างไร?",
    request_status: "ตรวจสอบสถานะคำขออย่างไร?",
    zip_help: "ดาวน์โหลด ZIP ทำงานอย่างไร?",
    contact: "ติดต่อ Oriana Wren อย่างไร?",
    notifications: "การแจ้งเตือนทำงานอย่างไร?",
    phone_policy: "ทำไมต้องใช้เบอร์โทร?",
    login: "เข้าสู่ระบบอย่างไร?",
  },
  id: {
    private_access: "Bagaimana meminta akses album privat?",
    request_status: "Bagaimana mengecek status permintaan?",
    zip_help: "Bagaimana unduhan ZIP bekerja?",
    contact: "Bagaimana menghubungi Oriana Wren?",
    notifications: "Bagaimana notifikasi bekerja?",
    phone_policy: "Mengapa nomor telepon diminta?",
    login: "Bagaimana cara masuk?",
  },
  fr: {
    private_access: "Comment demander l'accès aux albums privés ?",
    request_status: "Comment vérifier ma demande ?",
    zip_help: "Comment fonctionne le téléchargement ZIP ?",
    contact: "Comment contacter Oriana Wren ?",
    notifications: "Comment fonctionnent les notifications ?",
    phone_policy: "Pourquoi demander mon numéro ?",
    login: "Comment me connecter ?",
  },
  de: {
    private_access: "Wie frage ich privaten Albumzugriff an?",
    request_status: "Wie prüfe ich meinen Anfragestatus?",
    zip_help: "Wie funktioniert der ZIP-Download?",
    contact: "Wie kontaktiere ich Oriana Wren?",
    notifications: "Wie funktionieren Benachrichtigungen?",
    phone_policy: "Warum wird meine Telefonnummer gefragt?",
    login: "Wie melde ich mich an?",
  },
  es: {
    private_access: "¿Cómo solicito acceso a álbumes privados?",
    request_status: "¿Cómo reviso mi solicitud?",
    zip_help: "¿Cómo funciona la descarga ZIP?",
    contact: "¿Cómo contacto a Oriana Wren?",
    notifications: "¿Cómo funcionan las notificaciones?",
    phone_policy: "¿Por qué piden mi teléfono?",
    login: "¿Cómo inicio sesión?",
  },
};

function qa(locale: AssistantLocale, id: AssistantQuickActionId, href?: string): AssistantQuickAction {
  return {
    id,
    label: quickActionCopy[locale][id] ?? quickActionCopy.en[id] ?? id,
    question: quickActionQuestions[locale][id] ?? quickActionQuestions.en[id] ?? id,
    ...(href ? { href } : {}),
  };
}

export function getAssistantQuickActions(locale: AssistantLocale): AssistantQuickAction[] {
  return [
    qa(locale, "private_access", "/albums"),
    qa(locale, "request_status", "/albums"),
    qa(locale, "zip_help"),
    qa(locale, "contact", "/contact"),
    qa(locale, "notifications"),
    qa(locale, "phone_policy"),
  ];
}

export function getPuzzleAssistantQuickActions(locale: AssistantLocale): AssistantQuickAction[] {
  return [
    qa(locale, "game_sliding"),
    qa(locale, "game_swap"),
    qa(locale, "game_valid_moves"),
    qa(locale, "game_rewards"),
    qa(locale, "game_reference"),
  ];
}

export const assistantQuickActions = getAssistantQuickActions(DEFAULT_ASSISTANT_LOCALE);

type KnowledgeIntent = Exclude<AssistantIntent, "games_intro" | "games_sliding" | "games_swap" | "games_rewards" | "games_help">;

type IntentTemplate = Omit<AssistantKnowledgeItem, "id" | "locale" | "quickActions"> & {
  quickActionIds?: Array<{ id: AssistantQuickActionId; href?: string }>;
};

const englishTemplates: Record<KnowledgeIntent, IntentTemplate> = {
    private_access_help: {
      intent: "private_access_help",
      category: "private_access",
      title: "Request private album access",
      questionPatterns: ["private access", "request access", "locked album", "prviate acess", "permisson"],
      answer: "Open a locked private album and choose the access request action. Add the requested details, submit once, then wait for review. Return to Albums later to see whether access is pending, approved, denied, or revoked.",
      relatedUrls: ["/albums", "/profile"],
    },
    select_private_albums: {
      intent: "select_private_albums",
      category: "private_access",
      title: "Select private albums",
      questionPatterns: ["select multiple private albums", "several private albums"],
      answer: "When multiple selection is available, choose only the private albums you genuinely want to view. If selection is not shown, request access from the specific album page.",
      relatedUrls: ["/albums"],
    },
    request_all_private: {
      intent: "request_all_private",
      category: "private_access",
      title: "Request all private albums",
      questionPatterns: ["request all private albums", "all private albums"],
      answer: "Request all can cover the current private archive, but it does not guarantee approval. Future private albums may still need a separate decision.",
      relatedUrls: ["/albums"],
    },
    manual_auto_approval: {
      intent: "manual_auto_approval",
      category: "request_status",
      title: "Manual review and auto approval",
      questionPatterns: ["manual review", "auto approval", "7 days"],
      answer: "Private access can be reviewed manually. Some pending requests may become eligible for automatic approval after 7 days, depending on site policy and account status.",
      relatedUrls: ["/albums"],
      requiresAuth: true,
    },
    phone_policy: {
      intent: "phone_policy",
      category: "phone_policy",
      title: "Why phone number is requested",
      questionPatterns: ["why phone", "phone number", "phone privacy"],
      answer: "A phone number may be requested for private access review. It is not displayed publicly and is not included in notifications. Only provide it if you are comfortable with that review step.",
      relatedUrls: ["/profile"],
    },
    login_help: {
      intent: "login_help",
      category: "login",
      title: "Login with Google",
      questionPatterns: ["login", "google sign in", "return after sign in"],
      answer: "Use Google sign-in from the login page or when an action asks for an account. The site keeps a safe return path so you can return to the page you intended to open.",
      quickActionIds: [{ id: "login", href: "/login" }],
      relatedUrls: ["/login"],
    },
    request_status: {
      intent: "request_status",
      category: "request_status",
      title: "Check request status",
      questionPatterns: ["request status", "pending approved denied revoked"],
      answer: "Pending means waiting for review. Approved means access is active, denied means the request was not accepted, and revoked means access was removed after being granted. Check Albums while signed in.",
      relatedUrls: ["/albums"],
      requiresAuth: true,
    },
    album_status_meaning: {
      intent: "album_status_meaning",
      category: "albums",
      title: "Album status meanings",
      questionPatterns: ["public private updating", "album status", "updating albums"],
      answer: "Public albums are open. Private albums require approved access before real media is available. Updating albums may be visible while content or settings are still being refined.",
      relatedUrls: ["/albums"],
    },
    download_zip_help: {
      intent: "download_zip_help",
      category: "downloads",
      title: "ZIP download",
      questionPatterns: ["download zip", "zip download", "dowload zip"],
      answer: "ZIP download packages allowed album media into one file. Large albums can take time. For private albums, access and download permission are checked before the ZIP is created.",
      relatedUrls: ["/albums"],
    },
    download_blocked: {
      intent: "download_blocked",
      category: "downloads",
      title: "Download blocked",
      questionPatterns: ["download blocked", "cannot download", "download error"],
      answer: "Downloads can be blocked if the album is private, access was revoked, the file is not downloadable, or public downloads are disabled. Sign in, refresh, and contact Oriana Wren if it still looks wrong.",
      quickActionIds: [{ id: "contact", href: "/contact" }],
      relatedUrls: ["/contact"],
    },
    contact_help: {
      intent: "contact_help",
      category: "contact",
      title: "Contact Oriana Wren",
      questionPatterns: ["contact", "contact Oriana Wren", "email"],
      answer: "Use Contact for private access questions, collaborations, commercial usage, or anything this assistant cannot answer. Keep the message specific and avoid sending private links or tokens.",
      relatedUrls: ["/contact"],
    },
    message_replies: {
      intent: "message_replies",
      category: "contact",
      title: "Read replies",
      questionPatterns: ["message reply", "admin reply", "read replies"],
      answer: "Replies appear in your Contact conversation area when you are signed in. Public-facing replies use the name Oriana Wren, not a private admin identity.",
      relatedUrls: ["/contact"],
      requiresAuth: true,
    },
    notifications_help: {
      intent: "notifications_help",
      category: "notifications",
      title: "Notifications",
      questionPatterns: ["notifications", "unread notifications", "bell"],
      answer: "Notifications tell you about access decisions, revokes, and message replies. The header bell can show unread items after you sign in.",
      requiresAuth: true,
    },
    account_blocked: {
      intent: "account_blocked",
      category: "account",
      title: "Blocked account basics",
      questionPatterns: ["account blocked", "blocked account", "unblock"],
      answer: "A blocked account cannot use protected actions and may be redirected to the boycott page. Only an admin can unblock an account. If you think this was a mistake, use Contact politely.",
      relatedUrls: ["/contact"],
    },
    troubleshooting: {
      intent: "troubleshooting",
      category: "troubleshooting",
      title: "Troubleshooting",
      questionPatterns: ["upload error", "download error", "not working"],
      answer: "Refresh, confirm you are signed in, and try a stable connection. Uploads may fail if type or size is not allowed; downloads may fail when access or download permission is missing.",
      relatedUrls: ["/contact"],
    },
    unknown: {
      intent: "unknown",
      category: "troubleshooting",
      title: "When I cannot answer",
      questionPatterns: ["assistant cannot answer", "not sure", "unknown"],
      answer: "I am not fully sure. You can send this to Oriana Wren through Contact. I will not invent details outside the website rules.",
      quickActionIds: [{ id: "contact", href: "/contact" }],
      relatedUrls: ["/contact"],
    },
  };

const templates: Record<AssistantLocale, Record<KnowledgeIntent, IntentTemplate>> = {
  en: englishTemplates,
  vi: {
    private_access_help: {
      intent: "private_access_help",
      category: "private_access",
      title: "Xin quyền xem album riêng tư",
      questionPatterns: ["xin quyền", "xin quyen", "album riêng tư", "album rieng tu", "album private"],
      answer: "Mở album riêng tư đang bị khóa và chọn thao tác xin quyền truy cập. Điền thông tin được yêu cầu, gửi một lần, rồi chờ xét duyệt. Quay lại Albums để xem trạng thái pending, approved, denied hoặc revoked.",
      relatedUrls: ["/albums", "/profile"],
    },
    select_private_albums: {
      intent: "select_private_albums",
      category: "private_access",
      title: "Chọn album riêng tư",
      questionPatterns: ["chọn nhiều album", "chon nhieu album", "nhiều album riêng tư", "nhieu album rieng tu"],
      answer: "Nếu form cho chọn nhiều album, hãy chọn đúng những album riêng tư bạn thật sự muốn xem. Nếu không thấy lựa chọn, hãy xin quyền từ trang album cụ thể.",
      relatedUrls: ["/albums"],
    },
    request_all_private: {
      intent: "request_all_private",
      category: "private_access",
      title: "Xin quyền toàn bộ album riêng tư",
      questionPatterns: ["tất cả album private", "tat ca album private", "toàn bộ album riêng tư", "toan bo album rieng tu"],
      answer: "Xin quyền toàn bộ có thể áp dụng cho kho album riêng tư hiện tại, nhưng không đảm bảo được duyệt. Album riêng tư trong tương lai vẫn có thể cần quyết định riêng.",
      relatedUrls: ["/albums"],
    },
    manual_auto_approval: {
      intent: "manual_auto_approval",
      category: "request_status",
      title: "Duyệt thủ công và tự động",
      questionPatterns: ["duyệt thủ công", "duyet thu cong", "tự động duyệt", "tu dong duyet", "7 ngày", "7 ngay"],
      answer: "Quyền riêng tư có thể được Oriana Wren xét duyệt thủ công. Một số yêu cầu pending có thể đủ điều kiện tự động duyệt sau 7 ngày, tùy chính sách site và trạng thái tài khoản.",
      relatedUrls: ["/albums"],
      requiresAuth: true,
    },
    phone_policy: {
      intent: "phone_policy",
      category: "phone_policy",
      title: "Vì sao cần số điện thoại",
      questionPatterns: ["số điện thoại", "so dien thoai", "tại sao cần phone", "tai sao can phone"],
      answer: "Số điện thoại có thể được yêu cầu khi xét duyệt quyền xem album riêng tư. Số này không hiển thị công khai và không nằm trong thông báo. Chỉ gửi nếu bạn thoải mái với bước xác minh đó.",
      relatedUrls: ["/profile"],
    },
    login_help: {
      intent: "login_help",
      category: "login",
      title: "Đăng nhập bằng Google",
      questionPatterns: ["đăng nhập", "dang nhap", "google login"],
      answer: "Dùng đăng nhập Google từ trang login hoặc khi một thao tác yêu cầu tài khoản. Site giữ đường quay lại an toàn để bạn trở về trang đang định mở.",
      quickActionIds: [{ id: "login", href: "/login" }],
      relatedUrls: ["/login"],
    },
    request_status: {
      intent: "request_status",
      category: "request_status",
      title: "Kiểm tra trạng thái yêu cầu",
      questionPatterns: ["trạng thái yêu cầu", "trang thai yeu cau", "pending", "approved", "denied", "revoked"],
      answer: "Pending là đang chờ xét duyệt. Approved là đã có quyền. Denied là không được chấp nhận. Revoked là quyền đã bị thu hồi. Hãy đăng nhập rồi kiểm tra ở Albums.",
      relatedUrls: ["/albums"],
      requiresAuth: true,
    },
    album_status_meaning: {
      intent: "album_status_meaning",
      category: "albums",
      title: "Ý nghĩa trạng thái album",
      questionPatterns: ["trạng thái album", "trang thai album", "public private updating"],
      answer: "Album public có thể xem tự do. Album private cần quyền đã duyệt. Album updating có thể đang được chỉnh nội dung, thứ tự, caption hoặc thiết lập tải xuống.",
      relatedUrls: ["/albums"],
    },
    download_zip_help: {
      intent: "download_zip_help",
      category: "downloads",
      title: "Tải ZIP",
      questionPatterns: ["tải zip", "tai zip", "download zip", "tải album", "tai album"],
      answer: "Tải ZIP gom các media được phép tải trong album thành một file. Album lớn có thể mất thời gian. Với album riêng tư, quyền truy cập và quyền download được kiểm tra trước khi tạo ZIP.",
      relatedUrls: ["/albums"],
    },
    download_blocked: {
      intent: "download_blocked",
      category: "downloads",
      title: "Không tải được",
      questionPatterns: ["không tải được", "khong tai duoc", "download bị chặn", "download bi chan"],
      answer: "Tải xuống có thể bị chặn nếu album là private, quyền bị thu hồi, file không cho tải, hoặc chủ site tắt tải công khai. Hãy đăng nhập, refresh, rồi liên hệ Oriana Wren nếu vẫn sai.",
      quickActionIds: [{ id: "contact", href: "/contact" }],
      relatedUrls: ["/contact"],
    },
    contact_help: {
      intent: "contact_help",
      category: "contact",
      title: "Liên hệ Oriana Wren",
      questionPatterns: ["liên hệ", "lien he", "contact", "email"],
      answer: "Dùng trang Contact cho câu hỏi về quyền riêng tư, hợp tác, sử dụng thương mại hoặc điều trợ lý không trả lời được. Hãy viết cụ thể và không gửi link riêng tư hay token.",
      relatedUrls: ["/contact"],
    },
    message_replies: {
      intent: "message_replies",
      category: "contact",
      title: "Đọc phản hồi",
      questionPatterns: ["tin nhắn", "tin nhan", "phản hồi", "phan hoi", "reply"],
      answer: "Phản hồi từ Oriana Wren hiển thị trong khu vực Contact khi bạn đã đăng nhập. Phản hồi công khai dùng tên Oriana Wren, không lộ danh tính admin riêng.",
      relatedUrls: ["/contact"],
      requiresAuth: true,
    },
    notifications_help: {
      intent: "notifications_help",
      category: "notifications",
      title: "Thông báo",
      questionPatterns: ["thông báo", "thong bao", "chuông", "chuong"],
      answer: "Thông báo cho biết quyết định quyền truy cập, thu hồi quyền và phản hồi tin nhắn. Chuông trên header có thể hiện mục chưa đọc sau khi bạn đăng nhập.",
      requiresAuth: true,
    },
    account_blocked: {
      intent: "account_blocked",
      category: "account",
      title: "Tài khoản bị chặn",
      questionPatterns: ["bị chặn", "bi chan", "mở chặn", "mo chan", "boycott"],
      answer: "Tài khoản bị chặn không dùng được thao tác bảo vệ và có thể bị chuyển đến trang tẩy chay. Chỉ admin mới có thể bỏ chặn. Nếu nhầm lẫn, hãy liên hệ lịch sự qua Contact.",
      relatedUrls: ["/contact"],
    },
    troubleshooting: {
      intent: "troubleshooting",
      category: "troubleshooting",
      title: "Khắc phục lỗi",
      questionPatterns: ["lỗi upload", "loi upload", "lỗi tải", "loi tai", "không hoạt động", "khong hoat dong"],
      answer: "Hãy refresh, kiểm tra đã đăng nhập và dùng kết nối ổn định. Upload có thể lỗi nếu sai loại hoặc quá dung lượng; download có thể lỗi nếu thiếu quyền truy cập hoặc quyền tải.",
      relatedUrls: ["/contact"],
    },
    unknown: {
      intent: "unknown",
      category: "troubleshooting",
      title: "Khi mình không chắc",
      questionPatterns: ["không chắc", "khong chac", "không biết", "khong biet"],
      answer: "Mình chưa chắc chắn. Bạn có thể gửi câu hỏi này cho Oriana Wren qua Contact. Mình sẽ không tự bịa thông tin ngoài quy tắc website.",
      quickActionIds: [{ id: "contact", href: "/contact" }],
      relatedUrls: ["/contact"],
    },
  },
  "zh-CN": makeTranslatedTemplates("zh-CN", {
    private_access_help: ["私密相册需要从被锁定的相册页提交访问申请。填写要求的信息，只提交一次，然后等待审核。之后回到 Albums 查看 pending、approved、denied 或 revoked 状态。", "申请私密相册访问"],
    phone_policy: ["电话号码可能用于私密访问审核。它不会公开显示，也不会放进通知。只有在你接受此审核步骤时再提供。", "为什么需要电话号码"],
    download_zip_help: ["ZIP 下载会把允许下载的相册媒体打包成一个文件。大相册可能需要时间。私密相册会先检查访问权限和下载权限。", "ZIP 下载"],
    unknown: ["我不完全确定。你可以通过 Contact 将此问题发送给 Oriana Wren。我不会编造网站规则之外的信息。", "无法确定时"],
  }),
  ja: makeTranslatedTemplates("ja", {
    private_access_help: ["ロックされた非公開アルバムを開き、アクセス申請を選んでください。必要情報を入力して一度だけ送信し、審査を待ちます。Albums で pending、approved、denied、revoked を確認できます。", "非公開アクセス申請"],
    phone_policy: ["電話番号は非公開アクセスの審査に使われる場合があります。公開表示されず、通知にも含まれません。納得できる場合だけ入力してください。", "電話番号が必要な理由"],
    download_zip_help: ["ZIP ダウンロードは許可されたアルバムメディアを一つのファイルにまとめます。大きなアルバムは時間がかかります。非公開アルバムではアクセス権とダウンロード権限を先に確認します。", "ZIP ダウンロード"],
    unknown: ["正確には分かりません。Contact から Oriana Wren に送ることができます。サイトルール外の内容は作りません。", "答えられない場合"],
  }),
  ko: makeTranslatedTemplates("ko", {
    private_access_help: ["잠긴 비공개 앨범에서 접근 요청을 선택하세요. 필요한 정보를 입력하고 한 번만 제출한 뒤 검토를 기다립니다. Albums 에서 pending, approved, denied, revoked 상태를 확인할 수 있습니다.", "비공개 앨범 접근 요청"],
    phone_policy: ["전화번호는 비공개 접근 검토에 사용될 수 있습니다. 공개되지 않으며 알림에도 포함되지 않습니다. 해당 검토 단계에 동의할 때만 제공하세요.", "전화번호가 필요한 이유"],
    download_zip_help: ["ZIP 다운로드는 허용된 앨범 미디어를 하나의 파일로 묶습니다. 큰 앨범은 시간이 걸릴 수 있습니다. 비공개 앨범은 접근 권한과 다운로드 권한을 먼저 확인합니다.", "ZIP 다운로드"],
    unknown: ["정확히 확신할 수 없습니다. Contact 를 통해 Oriana Wren 에게 보낼 수 있습니다. 사이트 규칙 밖의 내용은 만들지 않습니다.", "답변할 수 없을 때"],
  }),
  th: makeTranslatedTemplates("th", {
    private_access_help: ["เปิดอัลบั้มส่วนตัวที่ถูกล็อกแล้วเลือกขอสิทธิ์เข้าถึง กรอกข้อมูลที่ร้องขอ ส่งครั้งเดียว แล้วรอการตรวจสอบ กลับไปที่ Albums เพื่อดูสถานะ pending, approved, denied หรือ revoked", "ขอสิทธิ์อัลบั้มส่วนตัว"],
    phone_policy: ["อาจขอเบอร์โทรเพื่อใช้ตรวจสอบสิทธิ์อัลบั้มส่วนตัว เบอร์นี้ไม่แสดงสาธารณะและไม่อยู่ในการแจ้งเตือน ให้ส่งเฉพาะเมื่อคุณยอมรับขั้นตอนนี้", "ทำไมต้องใช้เบอร์โทร"],
    download_zip_help: ["ดาวน์โหลด ZIP จะรวมสื่อที่อนุญาตให้ดาวน์โหลดในอัลบั้มเป็นไฟล์เดียว อัลบั้มใหญ่อาจใช้เวลา สำหรับอัลบั้มส่วนตัวจะตรวจสิทธิ์ก่อนสร้าง ZIP", "ดาวน์โหลด ZIP"],
    unknown: ["ฉันยังไม่แน่ใจ คุณสามารถส่งคำถามนี้ถึง Oriana Wren ผ่าน Contact ได้ ฉันจะไม่แต่งข้อมูลนอกกฎเว็บไซต์", "เมื่อไม่แน่ใจ"],
  }),
  id: makeTranslatedTemplates("id", {
    private_access_help: ["Buka album privat yang terkunci lalu pilih tindakan permintaan akses. Isi detail yang diminta, kirim sekali, lalu tunggu peninjauan. Kembali ke Albums untuk melihat status pending, approved, denied, atau revoked.", "Minta akses album privat"],
    phone_policy: ["Nomor telepon dapat diminta untuk peninjauan akses privat. Nomor itu tidak ditampilkan publik dan tidak dimasukkan ke notifikasi. Berikan hanya jika Anda nyaman dengan langkah peninjauan itu.", "Mengapa nomor telepon diminta"],
    download_zip_help: ["Unduhan ZIP mengemas media album yang diizinkan menjadi satu file. Album besar bisa membutuhkan waktu. Untuk album privat, akses dan izin unduh diperiksa sebelum ZIP dibuat.", "Unduhan ZIP"],
    unknown: ["Saya belum yakin. Anda dapat mengirim pertanyaan ini ke Oriana Wren melalui Contact. Saya tidak akan mengarang detail di luar aturan situs.", "Saat saya tidak bisa menjawab"],
  }),
  fr: makeTranslatedTemplates("fr", {
    private_access_help: ["Ouvrez un album privé verrouillé et choisissez la demande d'accès. Ajoutez les informations demandées, envoyez une seule fois, puis attendez la revue. Revenez dans Albums pour voir pending, approved, denied ou revoked.", "Demander l'accès à un album privé"],
    phone_policy: ["Un numéro de téléphone peut être demandé pour la revue d'accès privé. Il n'est pas affiché publiquement et n'apparaît pas dans les notifications. Ne le fournissez que si cette étape vous convient.", "Pourquoi le téléphone est demandé"],
    download_zip_help: ["Le téléchargement ZIP regroupe les médias autorisés dans un seul fichier. Les grands albums peuvent prendre du temps. Pour un album privé, l'accès et l'autorisation de téléchargement sont vérifiés avant la création du ZIP.", "Téléchargement ZIP"],
    unknown: ["Je ne suis pas totalement sûr. Vous pouvez envoyer cette question à Oriana Wren via Contact. Je n'inventerai rien hors des règles du site.", "Quand je ne peux pas répondre"],
  }),
  de: makeTranslatedTemplates("de", {
    private_access_help: ["Öffnen Sie ein gesperrtes privates Album und wählen Sie die Zugriffsanfrage. Geben Sie die verlangten Angaben ein, senden Sie einmal und warten Sie auf die Prüfung. In Albums sehen Sie pending, approved, denied oder revoked.", "Privaten Albumzugriff anfragen"],
    phone_policy: ["Eine Telefonnummer kann für die Prüfung privaten Zugriffs abgefragt werden. Sie wird nicht öffentlich angezeigt und erscheint nicht in Benachrichtigungen. Geben Sie sie nur an, wenn Sie mit diesem Schritt einverstanden sind.", "Warum eine Telefonnummer gefragt wird"],
    download_zip_help: ["Der ZIP-Download bündelt erlaubte Album-Medien in eine Datei. Große Alben können dauern. Bei privaten Alben werden Zugriff und Download-Berechtigung vor dem Erstellen geprüft.", "ZIP-Download"],
    unknown: ["Ich bin nicht ganz sicher. Sie können diese Frage über Contact an Oriana Wren senden. Ich erfinde keine Details außerhalb der Website-Regeln.", "Wenn ich nicht antworten kann"],
  }),
  es: makeTranslatedTemplates("es", {
    private_access_help: ["Abre un álbum privado bloqueado y elige la acción de solicitar acceso. Añade los datos pedidos, envía una sola vez y espera revisión. Vuelve a Albums para ver pending, approved, denied o revoked.", "Solicitar acceso a álbum privado"],
    phone_policy: ["Puede pedirse un número de teléfono para revisar el acceso privado. No se muestra públicamente ni aparece en notificaciones. Envíalo solo si aceptas ese paso de revisión.", "Por qué se pide el teléfono"],
    download_zip_help: ["La descarga ZIP empaqueta los medios permitidos del álbum en un archivo. Los álbumes grandes pueden tardar. En álbumes privados se revisan acceso y permiso de descarga antes de crear el ZIP.", "Descarga ZIP"],
    unknown: ["No estoy totalmente seguro. Puedes enviar esta pregunta a Oriana Wren mediante Contact. No inventaré detalles fuera de las reglas del sitio.", "Cuando no puedo responder"],
  }),
};

function makeTranslatedTemplates(
  locale: AssistantLocale,
  overrides: Partial<Record<KnowledgeIntent, [answer: string, title: string]>>,
): Record<KnowledgeIntent, IntentTemplate> {
  const output = {} as Record<KnowledgeIntent, IntentTemplate>;
  for (const [intent, template] of Object.entries(englishTemplates) as Array<[KnowledgeIntent, IntentTemplate]>) {
    const override = overrides[intent];
    output[intent] = {
      ...template,
      title: override?.[1] ?? template.title,
      answer: override?.[0] ?? template.answer,
      questionPatterns: [
        ...template.questionPatterns,
        ...translatedPatterns(locale, intent),
      ],
    };
  }
  return output;
}

function translatedPatterns(locale: AssistantLocale, intent: KnowledgeIntent) {
  const shared: Partial<Record<KnowledgeIntent, string[]>> = {
    private_access_help: ["private album", "akses album private", "album privé", "álbum privado", "非公開アルバム", "私密相册", "비공개 앨범"],
    phone_policy: ["phone", "nomor telepon", "telefono", "téléphone", "電話番号", "电话号码", "전화번호"],
    download_zip_help: ["zip", "download", "unduh zip", "télécharger zip", "descargar zip", "zip ダウンロード", "ZIP 下载"],
    notifications_help: ["notification", "notifikasi", "通知", "알림"],
    contact_help: ["contact", "hubungi", "contacter", "kontakt", "contactar"],
    login_help: ["login", "masuk", "connexion", "anmelden", "ログイン", "登录"],
    account_blocked: ["blocked", "diblokir", "bloqué", "gesperrt", "bloqueado", "ブロック", "被阻止"],
  };
  return locale === "en" || locale === "vi" ? [] : shared[intent] ?? [];
}

export const assistantKnowledge: AssistantKnowledgeItem[] = SUPPORTED_ASSISTANT_LOCALES.flatMap(
  (locale) =>
    Object.entries(templates[locale] ?? templates[DEFAULT_ASSISTANT_LOCALE]).map(
      ([intent, template]) => ({
        ...template,
        id: `${intent}-${locale}`,
        locale,
        quickActions: template.quickActionIds?.map((item) => qa(locale, item.id, item.href)),
      }),
    ),
);
