/**
 * Encryption utilities for multi-agent knowledge exchange
 * Uses AES-256-GCM for authenticated encryption
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface EncryptedPayload {
  iv: string;          // Initialization vector (hex)
  ciphertext: string; // Encrypted data (hex)
  authTag: string;    // Authentication tag (hex)
  version: string;    // Encryption version
}

export class AgentEncryption {
  private key: Buffer | null = null;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // 96 bits for GCM
  private readonly authTagLength = 16; // 128 bits
  private readonly version = '1.0';

  /**
   * Load encryption key from config or environment
   */
  loadKey(memphisDir: string = process.env.MEMPHIS_DIR || path.join(process.env.HOME!, '.memphis')): boolean {
    try {
      // Try environment variable first
      const envKey = process.env.AGENT_EXCHANGE_KEY;
      if (envKey) {
        this.key = Buffer.from(envKey, 'hex');
        return true;
      }

      // Try config file
      const configPath = path.join(memphisDir, 'config.yaml');
      if (fs.existsSync(configPath)) {
        const config = fs.readFileSync(configPath, 'utf-8');
        const match = config.match(/exchangeKey:\s*([a-f0-9]{64})/i);
        if (match) {
          this.key = Buffer.from(match[1], 'hex');
          return true;
        }
      }

      console.warn('⚠️  No encryption key found. Set AGENT_EXCHANGE_KEY env var or add to config.yaml');
      return false;
    } catch (error) {
      console.error('❌ Error loading encryption key:', error);
      return false;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(plaintext: string): EncryptedPayload | null {
    if (!this.key) {
      console.error('❌ No encryption key loaded');
      return null;
    }

    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        ciphertext: encrypted,
        authTag: authTag.toString('hex'),
        version: this.version
      };
    } catch (error) {
      console.error('❌ Encryption error:', error);
      return null;
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(payload: EncryptedPayload): string | null {
    if (!this.key) {
      console.error('❌ No encryption key loaded');
      return null;
    }

    try {
      // Convert from hex
      const iv = Buffer.from(payload.iv, 'hex');
      const authTag = Buffer.from(payload.authTag, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('❌ Decryption error:', error);
      return null;
    }
  }

  /**
   * Check if key is loaded
   */
  hasKey(): boolean {
    return this.key !== null;
  }

  /**
   * Encrypt a block
   */
  encryptBlock(block: any): string | null {
    try {
      const plaintext = JSON.stringify(block);
      const encrypted = this.encrypt(plaintext);
      return encrypted ? JSON.stringify(encrypted) : null;
    } catch (error) {
      console.error('❌ Block encryption error:', error);
      return null;
    }
  }

  /**
   * Decrypt a block
   */
  decryptBlock(encryptedData: string): any | null {
    try {
      const payload: EncryptedPayload = JSON.parse(encryptedData);
      const decrypted = this.decrypt(payload);
      return decrypted ? JSON.parse(decrypted) : null;
    } catch (error) {
      console.error('❌ Block decryption error:', error);
      return null;
    }
  }
}

// Singleton instance
export const agentEncryption = new AgentEncryption();
