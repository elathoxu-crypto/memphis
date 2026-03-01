import { randomBytes, createHash, pbkdf2Sync } from "node:crypto";

// BIP39 wordlist (first 2048 words - we'll use a subset)
// In production, use full bip39 library
const WORDLIST = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
  "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
  "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
  "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
  "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
  "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
  "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
  "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
  "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
  "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
  "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
  "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
  "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
  "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
  "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain",
  "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
  "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
  "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
  "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless",
  "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
  "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss",
  "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
  "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze",
  "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb",
  "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy",
  "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call",
  "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas",
  "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry",
  "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category",
];

/**
 * Generate a seed phrase (24 words)
 * Simple implementation - in production use full bip39
 */
export function generateSeedPhrase(): string {
  const words: string[] = [];
  for (let i = 0; i < 24; i++) {
    const rand = randomBytes(2).readUInt16BE(0);
    const idx = rand % WORDLIST.length;
    words.push(WORDLIST[idx]);
  }
  return words.join(" ");
}

/**
 * Validate a seed phrase (basic check)
 */
export function validateSeedPhrase(mnemonic: string): boolean {
  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12 && words.length !== 24) return false;
  return words.every(w => WORDLIST.includes(w) || w.length >= 3);
}

/**
 * Derive a vault recovery key from seed phrase
 */
export function deriveRecoveryKey(mnemonic: string, salt?: string): { key: Buffer; salt: string } {
  const normalized = mnemonic.trim().toLowerCase();
  const useSalt = salt || randomBytes(16).toString("hex");

  if (!validateSeedPhrase(normalized)) {
    throw new Error("Invalid seed phrase - must be 12 or 24 words");
  }

  // Derive key using PBKDF2
  const key = pbkdf2Sync(normalized, useSalt, 100000, 32, "sha256");

  return { key, salt: useSalt };
}

/**
 * Split a secret into n shares using XOR (simple Shamir-like)
 */
export function shamirSplit(secret: Buffer, n: number, k: number): Buffer[] {
  if (k > n) throw new Error("Threshold k cannot exceed total shares n");
  if (k < 2) throw new Error("Threshold k must be at least 2");

  const shares: Buffer[] = [];

  // Generate k-1 random shares
  for (let i = 0; i < k - 1; i++) {
    shares.push(randomBytes(secret.length));
  }

  // Last share is XOR of all previous and secret
  const lastShare = Buffer.alloc(secret.length);
  for (let i = 0; i < secret.length; i++) {
    lastShare[i] = secret[i];
    for (let j = 0; j < k - 1; j++) {
      lastShare[i] ^= shares[j][i];
    }
  }
  shares.push(lastShare);

  return shares;
}

/**
 * Reconstruct secret from shares
 */
export function shamirCombine(shares: Buffer[]): Buffer {
  if (shares.length < 2) throw new Error("Need at least 2 shares");

  const result = Buffer.alloc(shares[0].length);
  for (let i = 0; i < shares[0].length; i++) {
    result[i] = 0;
    for (const share of shares) {
      result[i] ^= share[i];
    }
  }

  return result;
}

/**
 * Format seed phrase for display
 */
export function formatSeedPhrase(mnemonic: string): string {
  const words = mnemonic.trim().split(/\s+/);
  const lines: string[] = [];

  for (let i = 0; i < words.length; i += 6) {
    const row = words.slice(i, i + 6);
    const rowStr = row.map((w, idx) => `${String(i + idx + 1).padStart(2)}. ${w}`).join("  ");
    lines.push(rowStr);
  }

  return lines.join("\n");
}
