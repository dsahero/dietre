import type { ParsedRules } from "../../shared/lib/types";

export type ConfirmReply = "yes" | "no" | "other";

export type PreferenceHardConflict = {
  preference: string;
  hard: string;
};

export type StatedContradiction = {
  hards: string[];
  mention: string;
};

const YES_ONLY =
  /^(yes|yeah|yep|yup|yea|y|correct|right|that's right|thats right|that is right|sounds right|looks (good|right|correct)|it's correct|it is correct|ok|okay|sure)[.!]?\s*$/i;

const NO_START = /^(no|nope|nah|wrong|not quite|not really)\b/i;

const YES_WITH_EDIT =
  /^(yes|yeah|yep)\b.+\b(but|except|also|wait|actually|change|add|and)\b/i;

const LIST_CONFIRM_QUESTION =
  /is this list correct|does that sound right|want to change anything|so for you\b/i;

const EMAIL_QUESTION = /\b(e-?mail|follow-up|reach you)\b/i;

const PREFERENCE_TURN =
  /\b(prefer|preference|love|like|want|i'd like|i would like|favourite|favorite)\b/i;

const RESOLUTION_TURN =
  /\b(it's ok|its ok|never mind|nevermind|ignore that|exception|just this once|changed my mind|not actually|i can have|i can eat)\b/i;

const STOP = new Set([
  "me",
  "it",
  "that",
  "this",
  "food",
  "foods",
  "stuff",
  "things",
  "anything",
  "everything",
  "them",
  "those",
  "a",
  "an",
  "the",
  "my",
  "for",
]);

export function lastAssistantText(
  history: Array<{ role: string; text: string }>
): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") return history[i].text;
  }
  return "";
}

export function isListConfirmQuestion(text: string): boolean {
  return LIST_CONFIRM_QUESTION.test(text);
}

export function isEmailQuestion(text: string): boolean {
  return EMAIL_QUESTION.test(text);
}

export function classifyConfirmReply(text: string): ConfirmReply {
  const t = text.trim();
  if (!t) return "other";
  if (YES_ONLY.test(t)) return "yes";
  if (YES_WITH_EDIT.test(t)) return "no";
  if (NO_START.test(t)) return "no";
  return "other";
}

function splitItems(chunk: string): string[] {
  return chunk
    .replace(/\s+(for me|please|at all|though|actually)\s*$/i, "")
    .split(/\s*(?:,|;|\/|\band\b|\bor\b)\s*/i)
    .map((s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/^[.?'"“”]+|[.?'"!]+$/g, "")
    )
    .filter((s) => s.length >= 2 && !STOP.has(s));
}

function collectFromPattern(text: string, re: RegExp): string[] {
  const out: string[] = [];
  const copy = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  let m: RegExpExecArray | null;
  while ((m = copy.exec(text)) !== null) {
    if (m[1]) out.push(...splitItems(m[1]));
  }
  return out;
}

/** Pull ingredients the guest stated as hard constraints, not tastes. */
export function extractHardConstraintTokens(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (/\b(i eat everything|no allergies|no restrictions)\b/i.test(t) && !/\bhard no\b/i.test(t)) {
    return [];
  }

  const found = [
    ...collectFromPattern(
      t,
      /\b([a-z][a-z0-9 '&-]{0,40}?)\s+(?:is|are)\s+(?:a\s+)?hard\s+no\b/gi
    ),
    ...collectFromPattern(t, /\bhard\s+no\s+(?:for|on|to)\s+([a-z0-9 ,&'/-]+)/gi),
    ...collectFromPattern(
      t,
      /\b(?:i(?:'m| am)?\s+)?(?:allergic|allergy)\s+to\s+([a-z0-9 ,&'/-]+?)(?=\s*(?:[.!?;]|then\b|but\b|$))/gi
    ),
    ...collectFromPattern(
      t,
      /\b(?:cannot|can't|can not)\s+(?:eat|have|consume)\s+([a-z0-9 ,&'/-]+?)(?=\s*(?:[.!?;]|then\b|but\b|$))/gi
    ),
    ...collectFromPattern(
      t,
      /\bmust\s+(?:avoid|not eat)\s+([a-z0-9 ,&'/-]+?)(?=\s*(?:[.!?;]|then\b|but\b|$))/gi
    ),
    ...collectFromPattern(
      t,
      /\bintolerant(?:ce)?\s+to\s+([a-z0-9 ,&'/-]+?)(?=\s*(?:[.!?;]|then\b|but\b|$))/gi
    ),
  ];

  return unique(found);
}

export function unique(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

export function containsToken(haystack: string, token: string): boolean {
  const h = haystack.trim().toLowerCase();
  const raw = token.trim().toLowerCase();
  if (!h || !raw) return false;
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(h)) return true;
  const singular = raw.replace(/s$/, "");
  if (singular.length >= 4 && singular !== raw) {
    const se = singular.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|[^a-z0-9])${se}(?:[^a-z0-9]|$)`, "i").test(h)) return true;
  }
  return false;
}

export function findPreferenceHardConflicts(
  hard: string[],
  prefs: string[]
): PreferenceHardConflict[] {
  const conflicts: PreferenceHardConflict[] = [];
  for (const preference of prefs) {
    for (const item of hard) {
      if (containsToken(preference, item) || containsToken(item, preference)) {
        conflicts.push({ preference, hard: item });
      }
    }
  }
  return conflicts;
}

export function promoteHardConstraints(
  rules: ParsedRules,
  userTexts: string[]
): ParsedRules {
  const mentioned = unique(userTexts.flatMap(extractHardConstraintTokens));
  const hard = unique([...rules.hard_excludes, ...mentioned]);
  const soft_preferences = rules.soft_preferences.filter(
    (pref) => !mentioned.some((item) => containsToken(pref, item) || containsToken(item, pref))
  );
  let severity = rules.severity;
  if (
    severity === "low" &&
    userTexts.some((t) => /\b(allergic|allergy|anaphyla|celiac|cannot|can't|hard no)\b/i.test(t))
  ) {
    severity = /\b(allergic|allergy|anaphyla|celiac)\b/i.test(userTexts.join(" "))
      ? "high"
      : "medium";
  }
  return {
    ...rules,
    hard_excludes: hard,
    soft_preferences,
    severity,
  };
}

export function stripConflictingPreferences(rules: ParsedRules): ParsedRules {
  const conflicts = findPreferenceHardConflicts(rules.hard_excludes, rules.soft_preferences);
  if (conflicts.length === 0) return rules;
  const drop = new Set(conflicts.map((c) => c.preference));
  return {
    ...rules,
    soft_preferences: rules.soft_preferences.filter((p) => !drop.has(p)),
  };
}

export function detectStatedContradiction(
  priorUserTexts: string[],
  currentMessage: string
): StatedContradiction | null {
  if (RESOLUTION_TURN.test(currentMessage)) return null;
  if (!PREFERENCE_TURN.test(currentMessage)) return null;
  const hards = unique(priorUserTexts.flatMap(extractHardConstraintTokens));
  const hits = hards.filter((h) => containsToken(currentMessage, h));
  if (hits.length === 0) return null;
  return { hards: hits, mention: currentMessage.trim() };
}

export function contradictionQuestion(conflict: StatedContradiction): string {
  const listed =
    conflict.hards.length === 1
      ? conflict.hards[0]
      : `${conflict.hards.slice(0, -1).join(", ")} / ${conflict.hards[conflict.hards.length - 1]}`;
  return `Hold on — earlier you said ${listed} ${conflict.hards.length === 1 ? "is" : "are"} a hard constraint. You also mentioned "${conflict.mention}". Should I keep ${listed} as must-avoid, or did you mean something else?`;
}

export function shouldBlockIntakeSubmit(opts: {
  askedListConfirm: boolean;
  confirmReply: ConfirmReply | null;
  contradiction: StatedContradiction | null;
}): boolean {
  if (opts.contradiction) return true;
  // List-confirm is its own turn. Yes → email next. No → listen for edits.
  if (opts.askedListConfirm) return true;
  return false;
}

export const WRAP_UP =
  /all set|the host will|got everything|you're done|you are done|that's everything/i;

export function replyIfBlockedSubmit(
  modelReply: string,
  opts: {
    askedListConfirm: boolean;
    confirmReply: ConfirmReply | null;
    contradiction: StatedContradiction | null;
    userMessage: string;
  }
): string {
  const text = modelReply.trim();
  if (opts.contradiction && (WRAP_UP.test(text) || !opts.contradiction.hards.some((h) => containsToken(text, h)))) {
    return contradictionQuestion(opts.contradiction);
  }
  if (opts.askedListConfirm && opts.confirmReply === "yes") {
    if (!text || WRAP_UP.test(text)) {
      return "Optional — any email for the host if a kitchen can't guarantee this? Skip if not.";
    }
    return text;
  }
  if (opts.askedListConfirm && opts.confirmReply !== "yes") {
    if (!text || WRAP_UP.test(text)) {
      const named = extractHardConstraintTokens(opts.userMessage);
      if (named.length > 0) {
        return `Got it — ${named.join(", ")} ${named.length === 1 ? "is" : "are"} a must-avoid. Is this list correct?`;
      }
      return "What should I add or change?";
    }
  }
  return text;
}
