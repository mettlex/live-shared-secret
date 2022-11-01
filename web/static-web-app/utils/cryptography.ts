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

export async function aesGcmEncrypt({
  plaintext,
  password,
}: {
  plaintext: string | Uint8Array;
  password: string | Uint8Array;
}): Promise<string> {
  let pw;

  if (typeof password === "string") {
    pw = new TextEncoder().encode(password); // encode password as UTF-8
  } else {
    pw = password;
  }

  const pwHash = await crypto.subtle.digest("SHA-256", pw); // hash the password

  const iv = crypto.getRandomValues(new Uint8Array(12)); // get 96-bit random iv

  const alg = { name: "AES-GCM", iv: iv }; // specify algorithm to use

  const key = await crypto.subtle.importKey("raw", pwHash, alg, false, [
    "encrypt",
  ]); // generate key from pw

  let pt;

  if (typeof plaintext === "string") {
    pt = new TextEncoder().encode(plaintext); // encode plaintext as UTF-8
  } else {
    pt = plaintext;
  }

  const ctBuffer = await crypto.subtle.encrypt(alg, key, pt); // encrypt plaintext using key

  const ctArray = Array.from(new Uint8Array(ctBuffer)); // ciphertext as byte array
  const ctStr = ctArray.map((byte) => String.fromCharCode(byte)).join(""); // ciphertext as string
  const ctBase64 = encodeBase64(ctStr); // encode ciphertext as base64

  const ivHex = Array.from(iv)
    .map((b) => ("00" + b.toString(16)).slice(-2))
    .join(""); // iv as hex string

  return ivHex + ctBase64; // return iv+ciphertext
}

export async function aesGcmDecrypt({
  ciphertext,
  password,
}: {
  ciphertext: string;
  password: string | Uint8Array;
}): Promise<string> {
  let pw;

  if (typeof password === "string") {
    pw = new TextEncoder().encode(password); // encode password as UTF-8
  } else {
    pw = password;
  }

  const pwHash = await crypto.subtle.digest("SHA-256", pw); // hash the password

  const iv = ciphertext
    .slice(0, 24)
    .match(/.{2}/g)!
    .map((byte) => parseInt(byte, 16)); // get iv from ciphertext

  const alg = { name: "AES-GCM", iv: new Uint8Array(iv) }; // specify algorithm to use

  const key = await crypto.subtle.importKey("raw", pwHash, alg, false, [
    "decrypt",
  ]); // use pw to generate key

  const ctStr = new TextDecoder().decode(decodeBase64(ciphertext.slice(24))); // decode base64 ciphertext
  const ctUint8 = new Uint8Array(
    ctStr.match(/[\s\S]/g)!.map((ch) => ch.charCodeAt(0)),
  ); // ciphertext as Uint8Array
  // note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?

  const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8); // decrypt ciphertext using key

  const plaintext = new TextDecoder().decode(plainBuffer); // decode password from UTF-8

  return plaintext; // return the plaintext
}

export async function aesGcmDecryptToUint8({
  ciphertext,
  password,
}: {
  ciphertext: string;
  password: string | Uint8Array;
}): Promise<Uint8Array> {
  let pw;

  if (typeof password === "string") {
    pw = new TextEncoder().encode(password); // encode password as UTF-8
  } else {
    pw = password;
  }

  const pwHash = await crypto.subtle.digest("SHA-256", pw); // hash the password

  const iv = ciphertext
    .slice(0, 24)
    .match(/.{2}/g)!
    .map((byte) => parseInt(byte, 16)); // get iv from ciphertext

  const alg = { name: "AES-GCM", iv: new Uint8Array(iv) }; // specify algorithm to use

  const key = await crypto.subtle.importKey("raw", pwHash, alg, false, [
    "decrypt",
  ]); // use pw to generate key

  const ctStr = new TextDecoder().decode(decodeBase64(ciphertext.slice(24))); // decode base64 ciphertext
  const ctUint8 = new Uint8Array(
    ctStr.match(/[\s\S]/g)!.map((ch) => ch.charCodeAt(0)),
  ); // ciphertext as Uint8Array
  // note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?

  const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8); // decrypt ciphertext using key

  return new Uint8Array(plainBuffer);
}
