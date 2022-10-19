import { decode, encode } from "../encoding/base64.ts";

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
  const ctBase64 = encode(ctStr); // encode ciphertext as base64

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

  const ctStr = new TextDecoder().decode(decode(ciphertext.slice(24))); // decode base64 ciphertext
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

  const ctStr = new TextDecoder().decode(decode(ciphertext.slice(24))); // decode base64 ciphertext
  const ctUint8 = new Uint8Array(
    ctStr.match(/[\s\S]/g)!.map((ch) => ch.charCodeAt(0)),
  ); // ciphertext as Uint8Array
  // note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?

  const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8); // decrypt ciphertext using key

  return new Uint8Array(plainBuffer);
}
