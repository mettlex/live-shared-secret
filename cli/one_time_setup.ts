import { combineShares, createShares } from "../sss-wasm/index.js";
import { Number, Secret, Confirm, Select } from "./prompt/mod.ts";
import { encode, decode } from "./encoding/base64.ts";
import { zeroPadBy64 } from "./_utils/zero-pad.ts";
import { directoryExists } from "./_utils/fs.ts";
import { aesGcmDecrypt, aesGcmEncrypt } from "./aes-encryption/mod.ts";
import { writeText as copyTextToClipboard } from "./copy_paste/mod.ts";

enum ExportTypes {
  SAVE = "save",
  PRINT = "print",
}

const totalShareCount = await Number.prompt({
  message: "Total number of secret shares",
  min: 3,
});

const minimumShareCount = await Number.prompt({
  message: "Minimum number of secret shares",
  max: totalShareCount,
});

const isSecretProvidedByUser = await Confirm.prompt({
  message: "Do you enter the secret yourself?",
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
    message: "Enter the secret",
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

let retrievedSecretString = new TextDecoder().decode(bytes);

const endIndex = retrievedSecretString.split("").findIndex((x) => {
  return x.charCodeAt(0) === 0;
});

retrievedSecretString = retrievedSecretString.slice(0, endIndex);

if (secretFromInput) {
  if (endIndex !== -1) {
    if (retrievedSecretString !== secretFromInput) {
      console.error("The algorithom will fail to recover secret.");
      Deno.exit(1);
    }
  }

  console.log("\n\nThe shares have been generated successfully.\n\n");
} else {
  console.log(
    "\n\nA random secret and the shares have been generated successfully.\n\n",
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
    const exportType = await getExportType();

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
    } else if (exportType === ExportTypes.SAVE) {
      const newDirectoryPath = `data/${Date.now()}`;

      Deno.mkdirSync(newDirectoryPath, { recursive: true });

      const exportedShares: { [key: string]: string[] } = {};

      for (let i = 0; i < secretsWithShares.length; i++) {
        secretsWithShares[i].shares.forEach((share, j) => {
          const key = `share_${j + 1}`;

          if (!exportedShares[key]) {
            exportedShares[key] = [];
          }

          exportedShares[key].push(encode(share));
        });
      }

      Deno.writeFileSync(
        `${newDirectoryPath}/export.json`,
        new TextEncoder().encode(JSON.stringify(exportedShares, null, 2)),
      );
    }
  } else {
    // encrypt all shares with a single password

    const password = await Secret.prompt({
      message: "Enter the password for the AES encryption",
    });

    const exportType = await getExportType();

    if (exportType === ExportTypes.PRINT) {
      const totalParts = secretsWithShares.length;
      let secretCount = 1;

      for (const { shares } of secretsWithShares) {
        console.log(
          `\n\n============== Secret (${secretCount}/${totalParts}) ==============\n`,
        );

        const totalShares = shares.length;

        for (let i = 0; i < shares.length; i++) {
          const share = shares[i];

          console.log(
            `=== Share ${
              i + 1
            }/${totalShares} of Secret ${secretCount}/${totalParts} ===\n`,
          );

          const encrypted = await aesGcmEncrypt({ plaintext: share, password });

          const decrypted = await aesGcmDecrypt({
            ciphertext: encrypted,
            password,
          });

          // verify encryption-decryption works
          if (new TextDecoder().decode(share) !== decrypted) {
            console.error("AES Encryption algorithm failed.");
            Deno.exit(1);
          }

          console.log(encrypted);

          console.log("\n\n");
        }

        console.log(
          `\n========== End of Secret (${secretCount}/${totalParts}) ==========\n`,
        );

        secretCount++;
      }
    } else if (exportType === ExportTypes.SAVE) {
      const newDirectoryPath = `data/${Date.now()}`;

      Deno.mkdirSync(newDirectoryPath, { recursive: true });

      const exportedShares: { [key: string]: string[] } = {};

      for (let i = 0; i < secretsWithShares.length; i++) {
        for (let j = 0; j < secretsWithShares[i].shares.length; j++) {
          const share = secretsWithShares[i].shares[j];

          const key = `share_${j + 1}`;

          if (!exportedShares[key]) {
            exportedShares[key] = [];
          }

          const encrypted = await aesGcmEncrypt({ plaintext: share, password });

          const decrypted = await aesGcmDecrypt({
            ciphertext: encrypted,
            password,
          });

          // verify encryption-decryption works
          if (new TextDecoder().decode(share) !== decrypted) {
            console.error("AES Encryption algorithm failed.");
            Deno.exit(1);
          }

          exportedShares[key].push(encrypted);
        }
      }

      Deno.writeFileSync(
        `${newDirectoryPath}/export.json`,
        new TextEncoder().encode(JSON.stringify(exportedShares, null, 2)),
      );
    }
  }

  console.log("Done.");
} else {
  // encrypt each share one by one

  const passwords = [];

  for (let i = 0; i < totalShareCount; i++) {
    const serial = i + 1;

    const password = await Secret.prompt({
      message: `Enter the password for share #${serial}`,
    });

    passwords.push(password);
  }

  const exportType = await getExportType();

  if (exportType === ExportTypes.PRINT) {
    const totalParts = secretsWithShares.length;
    let secretCount = 1;

    for (const { shares } of secretsWithShares) {
      console.log(
        `\n\n============== Secret (${secretCount}/${totalParts}) ==============\n`,
      );

      const totalShares = shares.length;

      for (let i = 0; i < shares.length; i++) {
        const share = shares[i];
        const password = passwords[i];

        console.log(
          `=== Share ${
            i + 1
          }/${totalShares} of Secret ${secretCount}/${totalParts} ===\n`,
        );

        const encrypted = await aesGcmEncrypt({ plaintext: share, password });

        const decrypted = await aesGcmDecrypt({
          ciphertext: encrypted,
          password,
        });

        // verify encryption-decryption works
        if (new TextDecoder().decode(share) !== decrypted) {
          console.error("AES Encryption algorithm failed.");
          Deno.exit(1);
        }

        console.log(encrypted);

        console.log("\n\n");
      }

      console.log(
        `\n========== End of Secret (${secretCount}/${totalParts}) ==========\n`,
      );

      secretCount++;
    }
  } else if (exportType === ExportTypes.SAVE) {
    const newDirectoryPath = `data/${Date.now()}`;

    Deno.mkdirSync(newDirectoryPath, { recursive: true });

    const exportedShares: { [key: string]: string[] } = {};

    for (let i = 0; i < secretsWithShares.length; i++) {
      for (let j = 0; j < secretsWithShares[i].shares.length; j++) {
        const share = secretsWithShares[i].shares[j];
        const password = passwords[j];

        const key = `share_${j + 1}`;

        if (!exportedShares[key]) {
          exportedShares[key] = [];
        }

        const encrypted = await aesGcmEncrypt({ plaintext: share, password });

        const decrypted = await aesGcmDecrypt({
          ciphertext: encrypted,
          password,
        });

        // verify encryption-decryption works
        if (new TextDecoder().decode(share) !== decrypted) {
          console.error("AES Encryption algorithm failed.");
          Deno.exit(1);
        }

        exportedShares[key].push(encrypted);
      }
    }

    Deno.writeFileSync(
      `${newDirectoryPath}/export.json`,
      new TextEncoder().encode(JSON.stringify(exportedShares, null, 2)),
    );
  }

  console.log("Done.");
}

console.log("\n\n");

let secretToBeCopied = retrievedSecretString;

const shouldEncodeSecret = await Confirm.prompt({
  message: "Do you want to encode the secret using base64 encoding?",
  default: false,
});

if (shouldEncodeSecret) {
  secretToBeCopied = encode(secretToBeCopied);
}

const shouldCopySecret = await Confirm.prompt({
  message: "Do you want to copy the secret to the clipboard?",
  default: false,
});

if (shouldCopySecret) {
  await copyTextToClipboard(secretToBeCopied);
}

function getExportType() {
  return Select.prompt({
    message: "Select an option",
    options: [
      Select.separator("--------"),
      { name: "Save the shares as files", value: ExportTypes.SAVE },
      Select.separator("--------"),
      { name: "Print the shares to the console", value: ExportTypes.PRINT },
    ],
  }) as Promise<ExportTypes>;
}
