import crypto from "crypto";

/**
 * Utilitário de Criptografia AES-256-GCM para Tokens de Acesso
 * Garante que tokens nunca sejam persistidos ou manipulados em texto puro.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.META_APP_SECRET || "default_fallback_secret_key_32_bytes!!";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(token: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    encrypted,
    iv: iv.toString("hex"),
    tag,
  };
}

export function decryptToken(encrypted: string, ivHex: string, tagHex?: string): string {
  try {
    const iv = Buffer.from(ivHex, "hex");
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    if (tagHex) {
      decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    }

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // Se não for possível decriptografar (ex: se o token foi gravado antes da chave ou mock), retorna vazio
    return "";
  }
}
