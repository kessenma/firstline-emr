// apps/web/components/telegram-patient/container/intake-form/view-model/api/encryption.ts
import * as crypto from "crypto"

// Log the raw env value and its decoded length.
const rawKey = process.env.NEXT_PUBLIC_PATIENT_INTAKE_FORM_CRYPTO_ENCRYPTION || "";
// console.log("Raw NEXT_PUBLIC_PATIENT_INTAKE_FORM_CRYPTO_ENCRYPTION:", rawKey);

const ENCRYPTION_KEY = Buffer.from(rawKey, "base64");
// console.log("Decoded ENCRYPTION_KEY length:", ENCRYPTION_KEY.length);
// if (ENCRYPTION_KEY.length !== 32) {
//     console.error("❌ Invalid ENCRYPTION_KEY length (expected 32 bytes). Got:", ENCRYPTION_KEY.length);
// }

// The IV must be 16 bytes for AES-256-CBC.
const IV_LENGTH = 16;

function deriveIV(patientId: string, telegramChatId: string): Buffer {
    // Create a SHA-256 hash of the concatenated string and take the first 16 bytes.
    const hash = crypto.createHash("sha256")
        .update(`${patientId}-${telegramChatId}`)
        .digest();
    const iv = hash.slice(0, IV_LENGTH);
    console.log("Derived IV (hex):", iv.toString("hex"));
    return iv;
}

/**
 * Encrypts a string and returns a URL-safe base64 encoded string
 * using a deterministic IV.
 */
export function encrypt(text: string, iv: Buffer): string {
    console.log("Encrypting text:", text);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "base64");
    encrypted += cipher.final("base64");

    const combined = Buffer.concat([iv, Buffer.from(encrypted, "base64")]);
    const token = combined.toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    console.log("Generated token:", token);
    return token;
}

/**
 * Decrypts a URL-safe base64 encoded string.
 */
export function decrypt(encryptedText: string): string {
    try {
        // Convert URL-safe base64 to regular base64.
        const normalizedText = encryptedText.replace(/-/g, "+").replace(/_/g, "/");
        const encryptedBuffer = Buffer.from(normalizedText, "base64");

        // Extract the IV from the first 16 bytes.
        const iv = encryptedBuffer.slice(0, IV_LENGTH);
        console.log("Extracted IV from token (hex):", iv.toString("hex"));

        const encryptedData = encryptedBuffer.slice(IV_LENGTH);
        const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString("utf8");
    } catch (error) {
        console.error("Decryption error:", error);
        throw new Error("Invalid encrypted data");
    }
}

/**
 * Encrypts patient ID and Telegram chat ID into a single token.
 */
export function encryptPatientData(patientId: string, telegramChatId: string): string {
    const data = JSON.stringify({ patientId, telegramChatId });
    const iv = deriveIV(patientId, telegramChatId);
    return encrypt(data, iv);
}

/**
 * Decrypts a token into patient ID and Telegram chat ID.
 */
export function decryptPatientData(token: string): { patientId: string; telegramChatId: string } {
    try {
        const decrypted = decrypt(token);
        return JSON.parse(decrypted);
    } catch (error) {
        console.error("Failed to decrypt patient data:", error);
        throw new Error("Invalid patient data token");
    }
}