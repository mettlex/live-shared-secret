import { encode as encodeHex, decode as decodeHex } from "./encoding/hex";
import {
  encode as encodeBase64,
  decode as decodeBase64,
} from "./encoding/base64";

export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"],
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey,
  );

  const privateKeyJwk = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey,
  );

  return { publicKeyJwk, privateKeyJwk };
};

export const deriveKey = async ({
  publicKeyJwk,
  privateKeyJwk,
}: Awaited<ReturnType<typeof generateKeyPair>>): Promise<CryptoKey> => {
  const publicKey = await window.crypto.subtle.importKey(
    "jwk",
    publicKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    [],
  );

  const privateKey = await window.crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"],
  );

  return window.crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
};

export const encryptTextUsingECDHAES = async ({
  text,
  derivedKey,
}: {
  text: string;
  derivedKey: Awaited<ReturnType<typeof deriveKey>>;
}): Promise<{ base64Data: string; hexIv: string }> => {
  const encodedText = new TextEncoder().encode(text);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    encodedText,
  );

  const base64Data = encodeBase64(encryptedData);

  return { base64Data, hexIv: new TextDecoder().decode(encodeHex(iv)) };
};

export const decryptUsingECDHAES = async ({
  message,
  derivedKey,
}: {
  message: Awaited<ReturnType<typeof encryptTextUsingECDHAES>>;
  derivedKey: Awaited<ReturnType<typeof deriveKey>>;
}): Promise<string> => {
  try {
    const text = message.base64Data;
    const iv = decodeHex(new TextEncoder().encode(message.hexIv));

    const uintArray = decodeBase64(text);

    const algorithm = {
      name: "AES-GCM",
      iv,
    };

    const decryptedData = await window.crypto.subtle.decrypt(
      algorithm,
      derivedKey,
      uintArray,
    );

    return new TextDecoder().decode(decryptedData);
  } catch (e) {
    return `error decrypting message: ${e}`;
  }
};
