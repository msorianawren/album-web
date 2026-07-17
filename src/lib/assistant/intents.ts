export type AssistantIntent =
  | "private_access_help"
  | "select_private_albums"
  | "request_all_private"
  | "manual_auto_approval"
  | "phone_policy"
  | "login_help"
  | "request_status"
  | "album_status_meaning"
  | "download_zip_help"
  | "download_blocked"
  | "contact_help"
  | "message_replies"
  | "notifications_help"
  | "account_blocked"
  | "games_intro"
  | "games_sliding"
  | "games_swap"
  | "games_rewards"
  | "games_help"
  | "troubleshooting"
  | "unknown";

export type AssistantConfidence = "high" | "medium" | "low";

export interface AssistantIntentResult {
  intent: AssistantIntent;
  confidence: AssistantConfidence;
}

const intentRules: Array<{
  intent: AssistantIntent;
  high: string[];
  medium: string[];
}> = [
  {
    intent: "games_sliding",
    high: ["sliding puzzle", "sliding game", "trá»£t Ã´", "truot o"],
    medium: ["sliding", "puzzle trÆ°á»£t", "puzzle truot"],
  },
  {
    intent: "games_swap",
    high: ["swap puzzle", "swap game", "Ä‘á»•i Ã´", "doi o"],
    medium: ["swap", "puzzle Ä‘á»•i", "puzzle doi"],
  },
  {
    intent: "games_rewards",
    high: ["wren feathers", "puzzle badge", "puzzle rewards", "pháº§n thÆ°á»Ÿng puzzle", "phan thuong puzzle", "huy hiá»‡u puzzle"],
    medium: ["feathers", "badges", "huy hiá»‡u", "huy hieu"],
  },
  {
    intent: "games_help",
    high: ["i am stuck", "i'm stuck", "tÃ´i bá»‹ káº¹t", "toi bi ket", "show valid moves", "valid moves", "xem nÆ°á»›c Ä‘i há»£p lá»‡", "xem nuoc di hop le"],
    medium: ["stuck", "bá»‹ káº¹t", "bi ket", "reference image", "áº£nh máº«u", "anh mau"],
  },
  {
    intent: "games_intro",
    high: ["oriana puzzle atelier", "games page", "puzzle games", "trÃ² chÆ¡i puzzle", "tro choi puzzle"],
    medium: ["games", "game", "puzzle", "trÃ² chÆ¡i", "tro choi"],
  },
  {
    intent: "select_private_albums",
    high: ["select multiple", "multiple private", "chon nhieu album", "chọn nhiều album", "nhieu album rieng tu", "nhiều album riêng tư"],
    medium: ["multi album", "several private", "nhiều album", "nhieu album"],
  },
  {
    intent: "request_all_private",
    high: ["request all", "all private albums", "tat ca album private", "tất cả album private", "toan bo album rieng tu", "toàn bộ album riêng tư"],
    medium: ["all albums", "toàn bộ", "tat ca", "tất cả"],
  },
  {
    intent: "manual_auto_approval",
    high: ["auto approval", "auto approve", "7 days", "7 ngay", "7 ngày", "manual review", "duyet thu cong", "duyệt thủ công"],
    medium: ["pending long", "under review", "đang duyệt", "dang duyet"],
  },
  {
    intent: "phone_policy",
    high: ["phone number", "why phone", "so dien thoai", "số điện thoại", "tai sao can phone", "tại sao cần phone", "nomor telepon", "telephone", "telefono", "telefon", "電話番号", "电话号码", "전화번호"],
    medium: ["phone", "privacy promise", "điện thoại", "dien thoai", "tel", "téléphone"],
  },
  {
    intent: "private_access_help",
    high: ["private access", "request access", "xin quyền album", "xin quyen album", "album private", "album riêng tư", "album rieng tu", "akses album private", "album privé", "album prive", "album privado", "privaten albumzugriff", "非公開アルバム", "私密相册", "비공개 앨범"],
    medium: ["locked album", "restricted album", "xem album", "mở khóa", "mo khoa", "accès privé", "acceso privado", "privater zugriff"],
  },
  {
    intent: "login_help",
    high: ["login", "sign in", "google login", "dang nhap", "đăng nhập", "masuk", "connexion", "anmelden", "iniciar sesión", "iniciar sesion", "ログイン", "登录"],
    medium: ["account", "google", "tài khoản", "tai khoan", "compte", "cuenta", "konto"],
  },
  {
    intent: "request_status",
    high: ["request status", "check status", "pending approved denied revoked", "trạng thái yêu cầu", "trang thai yeu cau"],
    medium: ["pending", "approved", "denied", "revoked", "đang chờ", "duyệt", "từ chối", "thu hồi"],
  },
  {
    intent: "album_status_meaning",
    high: ["public private updating", "album status", "updating album", "trang thai album", "album updating"],
    medium: ["public", "private", "updating", "công khai", "riêng tư", "đang cập nhật"],
  },
  {
    intent: "download_zip_help",
    high: ["download zip", "zip download", "tải zip", "tai zip", "unduh zip", "télécharger zip", "telecharger zip", "descargar zip", "zip herunterladen", "zip ダウンロード", "ZIP 下载"],
    medium: ["zip", "download album", "tải album", "tai album", "unduh", "descarga"],
  },
  {
    intent: "download_blocked",
    high: ["download blocked", "cannot download", "can't download", "không download được", "khong download duoc", "không tải được"],
    medium: ["blocked download", "download error", "lỗi tải", "loi tai"],
  },
  {
    intent: "contact_help",
    high: ["contact oriana", "contact", "liên hệ", "lien he", "hubungi", "contacter", "kontakt", "contactar", "連絡", "联系"],
    medium: ["email", "message oriana", "gửi tin", "gui tin"],
  },
  {
    intent: "message_replies",
    high: ["message reply", "admin reply", "read replies", "tin nhắn", "tin nhan", "phản hồi", "phan hoi"],
    medium: ["reply", "message", "inbox"],
  },
  {
    intent: "notifications_help",
    high: ["notification", "notifications", "thông báo", "thong bao", "notifikasi", "benachrichtigung", "notificación", "notificacion", "通知", "알림"],
    medium: ["bell", "unread", "chuông", "chuong"],
  },
  {
    intent: "account_blocked",
    high: ["account blocked", "blocked account", "unblock", "bị chặn", "bi chan", "mở chặn", "mo chan"],
    medium: ["boycott", "blocked", "chặn", "chan"],
  },
  {
    intent: "troubleshooting",
    high: ["upload error", "download error", "troubleshoot", "lỗi upload", "loi upload", "lỗi tải", "loi tai"],
    medium: ["error", "bug", "not working", "lỗi", "loi"],
  },
];

export function normalizeAssistantText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectAssistantIntent(input: string): AssistantIntentResult {
  const raw = input.toLowerCase().trim();
  const normalized = normalizeAssistantText(input);
  if (!normalized) return { intent: "unknown", confidence: "low" };

  for (const rule of intentRules) {
    if (rule.high.some((pattern) => raw.includes(pattern) || normalized.includes(normalizeAssistantText(pattern)))) {
      return { intent: rule.intent, confidence: "high" };
    }
  }

  for (const rule of intentRules) {
    if (rule.medium.some((pattern) => raw.includes(pattern) || normalized.includes(normalizeAssistantText(pattern)))) {
      return { intent: rule.intent, confidence: "medium" };
    }
  }

  return { intent: "unknown", confidence: "low" };
}
