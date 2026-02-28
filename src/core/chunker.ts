/**
 * Chunker — splits large text into overlapping chunks for ingestion.
 *
 * Strategy:
 *  - Paragraph-aware split (double newline boundaries preferred)
 *  - Fallback to sentence boundaries
 *  - Overlap window to preserve context across chunk edges
 */

export interface ChunkOptions {
  maxTokens?: number;   // rough token budget per chunk (default: 400)
  overlap?: number;     // overlap in chars (default: 100)
  minChars?: number;    // discard chunks shorter than this (default: 50)
}

export interface Chunk {
  index: number;
  text: string;
  startChar: number;
  endChar: number;
  tokenEstimate: number;
}

// Rough token estimate: 1 token ≈ 4 chars (works for EN and PL)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
}

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space/newline
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function chunk(text: string, options: ChunkOptions = {}): Chunk[] {
  const maxTokens = options.maxTokens ?? 400;
  const overlap = options.overlap ?? 100;
  const minChars = options.minChars ?? 50;
  const maxChars = maxTokens * 4;

  const paragraphs = splitIntoParagraphs(text);
  const chunks: Chunk[] = [];

  let buffer = "";
  let bufferStart = 0; // approximate char offset in original text
  let charOffset = 0;

  function flush() {
    const trimmed = buffer.trim();
    if (trimmed.length >= minChars) {
      chunks.push({
        index: chunks.length,
        text: trimmed,
        startChar: bufferStart,
        endChar: bufferStart + trimmed.length,
        tokenEstimate: estimateTokens(trimmed),
      });
    }
  }

  for (const para of paragraphs) {
    const paraStart = charOffset;

    // If paragraph itself exceeds maxChars, split by sentences
    if (para.length > maxChars) {
      // First flush existing buffer
      if (buffer.trim().length >= minChars) flush();
      buffer = "";
      bufferStart = paraStart;

      const sentences = splitIntoSentences(para);
      let sentBuf = "";
      let sentStart = paraStart;

      for (const sent of sentences) {
        if ((sentBuf + " " + sent).length > maxChars && sentBuf.length >= minChars) {
          buffer = sentBuf.trim();
          bufferStart = sentStart;
          flush();
          // Overlap: carry last `overlap` chars
          const tail = sentBuf.slice(-overlap);
          sentBuf = tail + " " + sent;
          sentStart = sentStart + sentBuf.length - tail.length - sent.length - 1;
        } else {
          sentBuf = sentBuf ? sentBuf + " " + sent : sent;
        }
      }

      if (sentBuf.trim().length >= minChars) {
        buffer = sentBuf.trim();
        bufferStart = sentStart;
        flush();
      }

      buffer = "";
      charOffset += para.length + 2;
      continue;
    }

    // Would adding this paragraph exceed limit?
    const candidate = buffer ? buffer + "\n\n" + para : para;
    if (candidate.length > maxChars && buffer.trim().length >= minChars) {
      flush();
      // Overlap: carry last `overlap` chars of buffer into next chunk
      const tail = buffer.slice(-overlap).trim();
      buffer = tail ? tail + "\n\n" + para : para;
      bufferStart = paraStart - tail.length;
    } else {
      if (!buffer) bufferStart = paraStart;
      buffer = candidate;
    }

    charOffset += para.length + 2; // +2 for "\n\n"
  }

  if (buffer.trim().length >= minChars) flush();

  return chunks;
}
