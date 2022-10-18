import { combineShares, createShares } from "../sss-wasm/index.js";
import { Number, Secret, Confirm, Select } from "./prompt/mod.ts";
import { encode, decode } from "./encoding/base64.ts";
import { zeroPadBy64 } from "./_utils/zero-pad.ts";
import { directoryExists } from "./_utils/fs.ts";

const totalShareCount = await Number.prompt({
  message: "Total number of password shares",
  min: 3,
});

const minimumShareCount = await Number.prompt({
  message: "Minimum number of password shares",
  max: totalShareCount,
});

const isSecretProvidedByUser = await Confirm.prompt({
  message: "Do you enter the password yourself?",
  default: false,
});

let secretFromInput = "";
let secret: Uint8Array;

if (!isSecretProvidedByUser) {
  // Get random bytes of only-supported fixed length 64
  const randomBytes = crypto.getRandomValues(new Uint8Array(64));
  secret = randomBytes;
} else {
  secretFromInput = await Secret.prompt({
    message: "Enter the password",
    default: undefined,
  });

  const paddedString = zeroPadBy64(secretFromInput);

  secret = new TextEncoder().encode(paddedString);
}

const createShareUpto64 = async ({
  secret64,
  totalShareCount,
  minimumShareCount,
}: {
  secret64: Uint8Array;
  totalShareCount: number;
  minimumShareCount: number;
}): Promise<Uint8Array[]> => {
  // Create password-shares using Shamir's Secret Sharing algorithm
  const shareChunk = await createShares(
    secret64,
    totalShareCount,
    minimumShareCount,
  );

  // Encode each share using base64 encoding
  const encodedShares = shareChunk.map((s) => encode(s));

  // Encode random bytes using base64
  const encodedSecret = encode(secret64);

  // Check if recovery possible in future
  if (decode(encodedSecret).join("") !== secret64.join("")) {
    console.error("The algorithom will fail to recover secret.");
    Deno.exit(1);
  }

  // Perform retrieval to check if the SSS implementation works
  const result = await combineShares(
    encodedShares.slice(0, minimumShareCount).map((es) => decode(es)),
  );

  // Encode the share-combination result using base64
  const encodedResult = encode(result);

  // Check if recovery possible in future
  if (encodedSecret !== encodedResult) {
    console.error("The algorithom will fail to recover secret.");
    Deno.exit(1);
  }

  return shareChunk;
};

// Make chunks of 64-bytes
const chunkCount = secret.length / 64;
const secretsWithShares = [];

for (let i = 0; i < chunkCount; i++) {
  const chunk = secret.slice(i * 64, (i + 1) * 64);

  secretsWithShares.push({
    secret: chunk,
    shares: await createShareUpto64({
      totalShareCount,
      minimumShareCount,
      secret64: chunk,
    }),
  });
}

// Verify reconstruction is possible
const retrievedSecret = (
  await Promise.all(
    secretsWithShares.map(async (x) =>
      Array.from(await combineShares(x.shares)),
    ),
  )
).flat();

const bytes = new Uint8Array(retrievedSecret.length);

bytes.set(retrievedSecret, 0);

if (secretFromInput) {
  const retrievedSecretString = new TextDecoder().decode(bytes);

  const endIndex = retrievedSecretString.split("").findIndex((x) => {
    return x.charCodeAt(0) === 0;
  });

  if (endIndex !== -1) {
    if (retrievedSecretString.slice(0, endIndex) !== secretFromInput) {
      console.error("The algorithom will fail to recover secret.");
      Deno.exit(1);
    }
  }

  console.log("\n\nThe shares have been generated successfully.\n\n");
} else {
  console.log(
    "\n\nA random password and the shares have been generated successfully.\n\n",
  );
}

const dataDirectoryExists = await directoryExists("data");

if (!dataDirectoryExists) {
  Deno.mkdirSync("data");
}

const shouldEncryptSharesOneByOne = await Confirm.prompt({
  message: "Do you want to encrypt the shares one by one?",
  default: true,
});

if (!shouldEncryptSharesOneByOne) {
  const shouldEncryptSharesWithSinglePassword = await Confirm.prompt({
    message: "Do you want to encrypt the shares with a single password?",
    default: false,
  });

  if (!shouldEncryptSharesWithSinglePassword) {
    enum ExportTypes {
      SAVE = "save",
      PRINT = "print",
    }

    const exportType = (await Select.prompt({
      message: "Select an option",
      options: [
        Select.separator("--------"),
        { name: "Save the shares as files", value: ExportTypes.SAVE },
        Select.separator("--------"),
        { name: "Print the shares to the console", value: ExportTypes.PRINT },
      ],
    })) as ExportTypes;

    if (exportType === ExportTypes.PRINT) {
      const totalParts = secretsWithShares.length;
      let secretCount = 1;

      for (const { shares } of secretsWithShares) {
        console.log(
          `\n\n============== Secret (${secretCount}/${totalParts}) ==============\n`,
        );

        const totalShares = shares.length;

        shares.forEach((share, i) => {
          console.log(
            `=== Share ${
              i + 1
            }/${totalShares} of Secret ${secretCount}/${totalParts} ===\n`,
          );
          console.log(encode(share));
          console.log("\n\n");
        });

        console.log(
          `\n========== End of Secret (${secretCount}/${totalParts}) ==========\n`,
        );

        secretCount++;
      }
    }

    Deno.exit(0);
  }

  Deno.exit(0);
}
