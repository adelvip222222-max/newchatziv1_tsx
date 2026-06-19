// Terms that indicate the model leaked internal system info in its reply.
// Keep this list TIGHT — only clear, unambiguous internal tokens.
// Do NOT add common words that may appear in natural business replies.
const INTERNAL_TERMS = [
  "<think",
  "[sentiment:",
  "documentId",
  "tenantId",
  "botId",
  "system prompt",
  "confidence score",
];

export type ReplyValidationResult = {
  valid: boolean;
  reason?: string;
};

export function validateCustomerReply(reply: string): ReplyValidationResult {
  const trimmed = reply.trim();
  if (!trimmed) {
    return { valid: false, reason: "empty_reply" };
  }

  const lowerReply = trimmed.toLowerCase();
  const leakedTerm = INTERNAL_TERMS.find((term) =>
    lowerReply.includes(term.toLowerCase())
  );

  if (leakedTerm) {
    return { valid: false, reason: `internal_term:${leakedTerm}` };
  }

  return { valid: true };
}
