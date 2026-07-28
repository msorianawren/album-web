import type { AssistantLocale } from "@/lib/assistant/locales";
import type {
  CompanionHelpLevel,
  CompanionMotion,
  CompanionPreset,
  CompanionPresence,
} from "@/lib/assistant/preferences";

type PresetCopy = Record<Exclude<CompanionPreset, "custom">, {
  label: string;
  outcome: string;
  visibility: string;
  guidance: string;
  motion: string;
  sound: string;
  example: string;
}>;

export interface CompanionSettingsCopy {
  eyebrow: string;
  title: string;
  intro: string;
  choose: string;
  custom: string;
  customDescription: string;
  visibility: string;
  guidance: string;
  motion: string;
  sound: string;
  example: string;
  playground: string;
  playgroundDescription: string;
  whatYouWillSee: string;
  advanced: string;
  advancedDescription: string;
  character: string;
  characterDescription: string;
  save: string;
  reset: string;
  unsaved: string;
  saving: string;
  saved: string;
  guest: string;
  account: string;
  hiddenNote: string;
  applyHelpful: string;
  applyHelpfulDescription: string;
  previewsOnly: string;
  state: string;
  soundOff: string;
  soundOn: string;
  presenceOptions: Record<CompanionPresence, { label: string; description: string }>;
  helpLevelOptions: Record<CompanionHelpLevel, { label: string; description: string }>;
  motionOptions: Record<CompanionMotion, { label: string; description: string }>;
  soundControl: { title: string; description: string };
  loadingControl: { title: string; description: string };
  hintsControl: { title: string; description: string };
  idleControl: { title: string; description: string };
  summaryDock: string;
  summaryContextual: string;
  summaryWait: string;
  summaryHints: string;
  summarySuspends: string;
  summaryHidden: string;
  preset: PresetCopy;
}

const english: CompanionSettingsCopy = {
  eyebrow: "Companion preferences",
  title: "Choose a useful presence",
  intro: "Oriana Companion answers fixed website questions, offers contextual guidance, reacts to important states, and can hand off to Contact. It is not Oriana, cannot approve private access, and never reads private messages or album content.",
  choose: "Choose how Companion behaves",
  custom: "Custom",
  customDescription: "Your independent advanced choices do not match a quick preset.",
  visibility: "Visibility",
  guidance: "Guidance",
  motion: "Motion",
  sound: "Sound",
  example: "Example",
  playground: "Live Companion playground",
  playgroundDescription: "Preview the selected character and the exact state language before saving. This preview never creates a real site interruption.",
  whatYouWillSee: "What you will see",
  advanced: "Fine tune independently",
  advancedDescription: "Changing Motion never changes Presence or Guidance. Hidden takes precedence at runtime without changing your saved advanced choices.",
  character: "Choose a companion",
  characterDescription: "Seven flagship companions have original dimensional portraits. Existing saved legacy choices remain compatible, but are no longer presented as primary choices.",
  save: "Save changes",
  reset: "Reset",
  unsaved: "Unsaved changes",
  saving: "Saving preferences…",
  saved: "Saved",
  guest: "Stored on this device only.",
  account: "Synced to your account and this device.",
  hiddenNote: "Hidden is active: Companion will not appear, play sound, react, or load runtime artwork outside this settings preview.",
  applyHelpful: "Apply Helpful behavior",
  applyHelpfulDescription: "Sets Presence to Contextual, Guidance to Helpful, and enables contextual hints. Your character and sound choice stay unchanged.",
  previewsOnly: "Settings preview only",
  state: "State",
  soundOff: "Sound stays off until you enable it.",
  soundOn: "Soft sound is enabled after a user gesture.",
  presenceOptions: {
    hidden: { label: "Hidden", description: "No runtime entry outside settings." },
    on_demand: { label: "On demand", description: "Only an explicit menu or page trigger can open it." },
    contextual: { label: "Contextual", description: "Appears only for qualifying guidance, waits, and recovery states." },
    dock: { label: "Dock", description: "Stays available in the lower corner on supported pages." },
  },
  helpLevelOptions: {
    essential: { label: "Essential", description: "Answers only when you ask." },
    helpful: { label: "Helpful", description: "Can surface important form, access, and recovery guidance." },
    proactive: { label: "Proactive", description: "Can offer privacy-safe next steps where appropriate." },
  },
  motionOptions: {
    still: { label: "Still", description: "No decorative movement, even when your device allows motion." },
    gentle: { label: "Gentle", description: "Short, restrained breathing and feedback motion." },
    lively: { label: "Lively", description: "Richer expressions and deliberate reactions; it does not change visibility or help." },
  },
  soundControl: { title: "Sound", description: "Optional soft feedback. It never autoplays and is never required to understand a state." },
  loadingControl: { title: "Loading feedback", description: "Show Companion only for longer waits when its current presence allows it." },
  hintsControl: { title: "Contextual hints", description: "Offer short, privacy-safe help for qualifying form, access, and recovery states." },
  idleControl: { title: "Idle reactions", description: "Allow occasional restrained resting behavior only when the dock is available." },
  summaryDock: "Visible as a dock on supported pages.",
  summaryContextual: "Can appear during qualifying guidance and recovery moments.",
  summaryWait: "Appears during longer waits.",
  summaryHints: "Shows important form and access hints.",
  summarySuspends: "Stays hidden inside games and the media viewer.",
  summaryHidden: "Stays hidden everywhere except these settings.",
  preset: {
    hidden: { label: "Hidden", outcome: "Keep Companion completely out of view.", visibility: "Nowhere outside settings", guidance: "No hints or reactions", motion: "Still", sound: "Off", example: "Album browsing stays entirely Companion-free." },
    on_demand: { label: "On demand", outcome: "Only appear when you deliberately open Companion.", visibility: "User menu or another explicit trigger", guidance: "Answers fixed website questions", motion: "Gentle", sound: "Off", example: "Open it from the user menu to ask about a private album." },
    helpful: { label: "Helpful", outcome: "Offer restrained help when a site state needs attention.", visibility: "During qualifying guidance, wait, or recovery moments", guidance: "Forms, access, recoverable errors, and longer waits", motion: "Gentle", sound: "Off", example: "A recoverable download problem can offer a short next step." },
    playful: { label: "Playful", outcome: "Stay visibly available on supported pages without interrupting work.", visibility: "A compact lower-corner dock", guidance: "Proactive, privacy-safe website help", motion: "Lively", sound: "Off until you enable it", example: "A small dock is ready between albums, but sleeps in the viewer and games." },
  },
};

const vietnamese: CompanionSettingsCopy = {
  ...english,
  presenceOptions: {
    hidden: { label: "\u1ea8n", description: "Kh\u00f4ng hi\u1ec7n ngo\u00e0i c\u00e0i \u0111\u1eb7t." },
    on_demand: { label: "Khi b\u1ea1n m\u1edf", description: "Ch\u1ec9 menu ho\u1eb7c l\u1ec7nh r\u00f5 r\u00e0ng m\u1edbi m\u1edf Companion." },
    contextual: { label: "Theo ng\u1eef c\u1ea3nh", description: "Ch\u1ec9 hi\u1ec7n khi c\u1ea7n h\u01b0\u1edbng d\u1eabn, ch\u1edd ho\u1eb7c kh\u00f4i ph\u1ee5c." },
    dock: { label: "Dock", description: "Lu\u00f4n s\u1eb5n s\u00e0ng \u1edf g\u00f3c d\u01b0\u1edbi tr\u00ean trang \u0111\u01b0\u1ee3c h\u1ed7 tr\u1ee3." },
  },
  helpLevelOptions: {
    essential: { label: "C\u01a1 b\u1ea3n", description: "Ch\u1ec9 tr\u1ea3 l\u1eddi khi b\u1ea1n h\u1ecfi." },
    helpful: { label: "H\u1eefu \u00edch", description: "C\u00f3 th\u1ec3 nh\u1eafc v\u1ec1 bi\u1ec3u m\u1eabu, quy\u1ec1n truy c\u1eadp v\u00e0 kh\u00f4i ph\u1ee5c." },
    proactive: { label: "Ch\u1ee7 \u0111\u1ed9ng", description: "C\u00f3 th\u1ec3 g\u1ee3i \u00fd b\u01b0\u1edbc ti\u1ebfp theo an to\u00e0n v\u1ec1 ri\u00eang t\u01b0." },
  },
  motionOptions: {
    still: { label: "T\u0129nh", description: "Kh\u00f4ng chuy\u1ec3n \u0111\u1ed9ng trang tr\u00ed, k\u1ec3 c\u1ea3 khi thi\u1ebft b\u1ecb cho ph\u00e9p." },
    gentle: { label: "Nh\u1eb9 nh\u00e0ng", description: "Nh\u1ecbp th\u1edf v\u00e0 ph\u1ea3n h\u1ed3i ng\u1eafn, ti\u1ebft ch\u1ebf." },
    lively: { label: "Sinh \u0111\u1ed9ng", description: "Bi\u1ec3u c\u1ea3m phong ph\u00fa h\u01a1n; kh\u00f4ng \u0111\u1ed5i c\u00e1ch hi\u1ec3n th\u1ecb hay h\u01b0\u1edbng d\u1eabn." },
  },
  soundControl: { title: "\u00c2m thanh", description: "Ph\u1ea3n h\u1ed3i nh\u1eb9 t\u00f9y ch\u1ecdn. Kh\u00f4ng t\u1ef1 ph\u00e1t v\u00e0 kh\u00f4ng bao gi\u1edd c\u1ea7n thi\u1ebft \u0111\u1ec3 hi\u1ec3u tr\u1ea1ng th\u00e1i." },
  loadingControl: { title: "Ph\u1ea3n h\u1ed3i khi \u0111ang ch\u1edd", description: "Ch\u1ec9 hi\u1ec7n Companion trong l\u00fac ch\u1edd l\u00e2u khi c\u00e1ch hi\u1ec3n th\u1ecb \u0111ang cho ph\u00e9p." },
  hintsControl: { title: "G\u1ee3i \u00fd theo ng\u1eef c\u1ea3nh", description: "\u0110\u01b0a ra tr\u1ee3 gi\u00fap ng\u1eafn, an to\u00e0n v\u1ec1 ri\u00eang t\u01b0 cho bi\u1ec3u m\u1eabu, quy\u1ec1n truy c\u1eadp v\u00e0 kh\u00f4i ph\u1ee5c." },
  idleControl: { title: "Ph\u1ea3n h\u1ed3i khi ngh\u1ec9 ng\u01a1i", description: "Cho ph\u00e9p h\u00e0nh vi ngh\u1ec9 ng\u01a1i ti\u1ebft ch\u1ebf ch\u1ec9 khi dock \u0111ang s\u1eb5n s\u00e0ng." },
  eyebrow: "Tùy chọn Companion",
  title: "Chọn cách Companion xuất hiện",
  intro: "Oriana Companion trả lời các câu hỏi cố định của website, đưa ra hướng dẫn theo ngữ cảnh, phản hồi những trạng thái quan trọng và có thể chuyển sang Contact. Đây không phải Oriana, không thể duyệt quyền riêng tư và không đọc tin nhắn hay nội dung album riêng tư.",
  choose: "Chọn cách Companion hoạt động",
  custom: "Tùy chỉnh riêng",
  customDescription: "Các lựa chọn nâng cao độc lập của bạn không khớp với một preset nhanh.",
  visibility: "Hiển thị",
  guidance: "Hướng dẫn",
  motion: "Chuyển động",
  sound: "Âm thanh",
  example: "Ví dụ",
  playground: "Khu thử Companion trực tiếp",
  playgroundDescription: "Xem trước nhân vật và trạng thái chính xác trước khi lưu. Phần thử này không tạo gián đoạn thật trên website.",
  whatYouWillSee: "Bạn sẽ thấy gì",
  advanced: "Tinh chỉnh độc lập",
  advancedDescription: "Đổi Chuyển động không thay đổi Hiển thị hoặc Hướng dẫn. Chế độ Ẩn được ưu tiên khi chạy nhưng không thay đổi các lựa chọn nâng cao đã lưu.",
  character: "Chọn một Companion",
  characterDescription: "Bảy Companion chủ đạo có chân dung gốc với chiều sâu. Lựa chọn cũ vẫn tương thích nhưng không còn là lựa chọn chính.",
  save: "Lưu thay đổi",
  reset: "Đặt lại",
  unsaved: "Thay đổi chưa lưu",
  saving: "Đang lưu tùy chọn…",
  saved: "Đã lưu",
  guest: "Chỉ lưu trên thiết bị này.",
  account: "Đồng bộ vào tài khoản và thiết bị này.",
  hiddenNote: "Đang dùng Ẩn: Companion không xuất hiện, phát âm thanh, phản hồi hoặc tải hình ảnh chạy ngoài phần xem trước trong cài đặt.",
  applyHelpful: "Áp dụng hành vi Hữu ích",
  applyHelpfulDescription: "Đặt Hiển thị thành Theo ngữ cảnh, Hướng dẫn thành Hữu ích và bật gợi ý theo ngữ cảnh. Nhân vật và âm thanh không thay đổi.",
  previewsOnly: "Chỉ xem trước trong cài đặt",
  state: "Trạng thái",
  soundOff: "Âm thanh tắt cho đến khi bạn bật.",
  soundOn: "Âm thanh nhẹ chỉ phát sau thao tác của bạn.",
  summaryDock: "Hiện ở góc dưới trên các trang được hỗ trợ.",
  summaryContextual: "Có thể hiện khi cần hướng dẫn hoặc khôi phục.",
  summaryWait: "Hiện khi chờ lâu hơn bình thường.",
  summaryHints: "Hiện gợi ý quan trọng về biểu mẫu và quyền truy cập.",
  summarySuspends: "Ẩn trong game và trình xem media.",
  summaryHidden: "Ẩn ở mọi nơi trừ phần cài đặt này.",
  preset: {
    hidden: { label: "Ẩn", outcome: "Giữ Companion hoàn toàn ngoài tầm nhìn.", visibility: "Không hiện ngoài cài đặt", guidance: "Không gợi ý hoặc phản hồi", motion: "Tĩnh", sound: "Tắt", example: "Duyệt album hoàn toàn không có Companion." },
    on_demand: { label: "Khi bạn mở", outcome: "Chỉ hiện khi bạn chủ động mở Companion.", visibility: "Menu người dùng hoặc một lệnh rõ ràng", guidance: "Trả lời câu hỏi cố định về website", motion: "Nhẹ nhàng", sound: "Tắt", example: "Mở từ menu để hỏi về album riêng tư." },
    helpful: { label: "Hữu ích", outcome: "Đưa ra trợ giúp chừng mực khi trạng thái website cần chú ý.", visibility: "Khi cần hướng dẫn, chờ hoặc khôi phục", guidance: "Biểu mẫu, quyền truy cập, lỗi có thể khôi phục và chờ lâu", motion: "Nhẹ nhàng", sound: "Tắt", example: "Lỗi tải xuống có thể khôi phục sẽ kèm bước tiếp theo ngắn gọn." },
    playful: { label: "Sinh động", outcome: "Luôn sẵn sàng ở trang phù hợp mà không làm gián đoạn công việc.", visibility: "Dock nhỏ ở góc dưới", guidance: "Trợ giúp chủ động, an toàn về riêng tư", motion: "Sinh động", sound: "Tắt đến khi bạn bật", example: "Dock sẵn sàng giữa các album nhưng nghỉ trong trình xem và game." },
  },
};

export function getCompanionSettingsCopy(locale: AssistantLocale): CompanionSettingsCopy {
  return locale === "vi" ? vietnamese : english;
}
