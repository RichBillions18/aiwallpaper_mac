/**
 * 【提示词校验】lib/prompt-filter.ts
 *
 * OpenAI 自己有内容安全策略，但请求打过去要花时间也可能计费，
 * 明显违规的词在自己这一层先拦掉，顺便把长度、空白这类基础校验统一。
 *
 * 前端可以调同一个函数做即时提示，后端必须再调一次（前端校验能被绕过）。
 */

export const MAX_DESCRIPTION_LENGTH = 300;
export const MIN_DESCRIPTION_LENGTH = 2;

/** 命中即拒绝；只放明显违规的类别，避免误伤正常创作 */
const BANNED_PATTERNS: RegExp[] = [
  /裸体|裸照|色情|情色|黄片|성인/i,
  /nsfw|porn|nude|explicit\s*sex/i,
  /血腥|斩首|虐杀|自杀教程/i,
  /gore|beheading|torture\s*porn/i,
  /儿童色情|child\s*porn|csam/i,
  /制作炸弹|炸弹教程|how\s*to\s*make\s*a\s*bomb/i,
];

export type PromptCheckResult =
  | { ok: true; description: string }
  | { ok: false; message: string };

export function checkDescription(input: unknown): PromptCheckResult {
  if (typeof input !== "string") {
    return { ok: false, message: "壁纸描述格式不正确" };
  }

  const description = input.trim();

  if (description.length < MIN_DESCRIPTION_LENGTH) {
    return { ok: false, message: "壁纸描述太短，请多写几个字" };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      message: `壁纸描述最多 ${MAX_DESCRIPTION_LENGTH} 个字`,
    };
  }

  if (BANNED_PATTERNS.some((pattern) => pattern.test(description))) {
    return { ok: false, message: "描述包含不允许的内容，请换个说法" };
  }

  return { ok: true, description };
}
