import { combineShares, createShares } from "../sss-wasm/index.js";
import { Number } from "./prompt/mod.ts";
import { encode, decode } from "./encoding/base64.ts";

const totalShareCount = await Number.prompt({
  message: "Total number of password shares",
  min: 3,
});

const minimumShareCount = await Number.prompt({
  message: "Minimum number of password shares",
  max: totalShareCount,
});

// Get random bytes of only-supported fixed length 64
const randomBytes = crypto.getRandomValues(new Uint8Array(64));

// Create password-shares using Shamir's Secret Sharing algorithm
const shares = await createShares(
  randomBytes,
  totalShareCount,
  minimumShareCount,
);

// Encode each share using base64 encoding
const encodedShares = shares.map((s) => encode(s));

// Encode random bytes using base64
const encodedRandomBytes = encode(randomBytes);

// Check if recovery possible in future
if (decode(encodedRandomBytes).join("") !== randomBytes.join("")) {
  console.error("The algorithom will fail to recover secret.");
  Deno.exit(1);
}

// Perform retrieval to check if the SSS implementation works
const bytesResult = await combineShares(
  encodedShares.slice(0, minimumShareCount).map((es) => decode(es)),
);

// Encode the share-combination result using base64
const encodedBytesResult = encode(bytesResult);

// Check if recovery possible in future
if (encodedRandomBytes !== encodedBytesResult) {
  console.error("The algorithom will fail to recover secret.");
  Deno.exit(1);
}

console.log(
  "\n\nA random password and the shares have been generated successfully.\n\n",
);
