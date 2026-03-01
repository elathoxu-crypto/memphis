import crypto from "node:crypto";

export interface TradeBlockRange {
  chain: string;
  from: number;
  to: number;
}

export interface TradeOffer {
  senderDid: string;
  recipientDid: string;
  blocks: TradeBlockRange[];
  ttlDays: number;
  usageRights: string;
}

export interface TradeManifest {
  id: string;
  offer: TradeOffer;
  issuedAt: string;
  expiresAt: string;
  signature: string;
}

export interface TradeValidationResult {
  valid: boolean;
  errors: string[];
}

const DID_PATTERN = /^did:[a-z0-9]+:[a-z0-9]+$/i;

export function validateTradeOffer(offer: TradeOffer): TradeValidationResult {
  const errors: string[] = [];

  if (!offer.senderDid || !DID_PATTERN.test(offer.senderDid)) {
    errors.push("senderDid must be a valid DID (did:namespace:identifier)");
  }

  if (!offer.recipientDid || !DID_PATTERN.test(offer.recipientDid)) {
    errors.push("recipientDid must be a valid DID (did:namespace:identifier)");
  }

  if (!Array.isArray(offer.blocks) || offer.blocks.length === 0) {
    errors.push("At least one block range must be specified");
  } else {
    offer.blocks.forEach((range, index) => {
      if (!range.chain || typeof range.chain !== "string") {
        errors.push(`blocks[${index}].chain must be provided`);
      }
      if (!Number.isInteger(range.from) || range.from < 0) {
        errors.push(`blocks[${index}].from must be a non-negative integer`);
      }
      if (!Number.isInteger(range.to) || range.to < range.from) {
        errors.push(`blocks[${index}].to must be an integer >= from`);
      }
    });
  }

  if (!Number.isFinite(offer.ttlDays) || offer.ttlDays <= 0) {
    errors.push("ttlDays must be a positive number");
  }

  if (!offer.usageRights || typeof offer.usageRights !== "string" || offer.usageRights.trim().length === 0) {
    errors.push("usageRights must be provided");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function canonicalPayload(manifest: Omit<TradeManifest, "signature">): string {
  return JSON.stringify({
    id: manifest.id,
    issuedAt: manifest.issuedAt,
    expiresAt: manifest.expiresAt,
    offer: manifest.offer,
  });
}

function deriveSignature(manifest: Omit<TradeManifest, "signature">): string {
  return crypto.createHmac("sha256", manifest.offer.senderDid).update(canonicalPayload(manifest)).digest("hex");
}

export function signManifest(offer: TradeOffer, issuedAt: string = new Date().toISOString()): TradeManifest {
  const expires = new Date(new Date(issuedAt).getTime() + offer.ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const base: Omit<TradeManifest, "signature"> = {
    id: crypto.randomUUID(),
    offer,
    issuedAt,
    expiresAt: expires,
  };
  const signature = deriveSignature(base);
  return { ...base, signature };
}

export function verifyManifest(manifest: TradeManifest): boolean {
  const { signature, ...rest } = manifest;
  return signature === deriveSignature(rest);
}
