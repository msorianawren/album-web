export const blockedCommentKeywords = [
  "xấu",
  "thailand",
  "thai",
  "thái",
  "thái lan",
  "ghép",
  "ms puyi",
  "puiy",
  "đòi",
  "phốt",
  "đính",
  "nitagunawan",
  "nita gunawan",
  "nita",
  "gunawan",
  "@nitagunawan",
  "điêu",
  "mày",
  "tuổi",
  "lồn",
  "ranh",
  "dở",
  "ai",
  "trí tuệ nhân tạo",
  "fake",
  "giả",
  "cướp",
  "mạo",
  "danh",
  "mạo danh",
  "cmm",
  "địt",
  "indoneisia",
  "indonesia",
  "indo",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/@/g, " @")
    .replace(/[^a-z0-9@]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasToken(normalizedText: string, normalizedKeyword: string) {
  return new RegExp(`(^|\\s)${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(
    normalizedText,
  );
}

export function findBlockedCommentKeywords(input: string) {
  const normalizedText = normalizeText(input);
  const padded = ` ${normalizedText} `;

  return blockedCommentKeywords.filter((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return false;

    if (normalizedKeyword.length <= 3 || !normalizedKeyword.includes(" ")) {
      return hasToken(normalizedText, normalizedKeyword);
    }

    return padded.includes(` ${normalizedKeyword} `);
  });
}

export function commentBlockReason(matches: string[]) {
  return `Tự động chặn vì bình luận chứa từ khóa bị cấm: ${matches.join(", ")}.`;
}
