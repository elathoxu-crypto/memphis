/**
 * Encrypt data with AES-256-GCM
 * Returns: base64(iv + salt + tag + encrypted)
 */
export declare function encrypt(plaintext: string, password: string): string;
/**
 * Decrypt data encrypted with encrypt()
 */
export declare function decrypt(encryptedData: string, password: string): string;
/**
 * Generate a random DID (Decentralized Identifier)
 */
export declare function generateDID(): string;
/**
 * Verify if string is valid base64
 */
export declare function isBase64(str: string): boolean;
