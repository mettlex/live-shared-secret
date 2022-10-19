import { combineShares } from "../sss-wasm/index.js";
import { Number, Secret, Select, Confirm } from "./prompt/mod.ts";
import { decode } from "./encoding/base64.ts";
import { writeText } from "./copy_paste/mod.ts";
import { aesGcmDecryptToUint8 } from "./aes-encryption/mod.ts";

const partCount = await Number.prompt({
  message: "How many parts of the secret",
  min: 1,
});

const shareCount = await Number.prompt({
  message: "Minimum number of shares for each part",
  min: 2,
});

const sharesEncryptedWithDiffPasswords = await Confirm.prompt({
  message: "Is each share encrypted with a different password?",
  default: true,
});

let sharesEncryptedWithSinglePassword = false;

if (!sharesEncryptedWithDiffPasswords) {
  sharesEncryptedWithSinglePassword = await Confirm.prompt({
    message: "Are the shares encrypted with a single password?",
    default: false,
  });
}

let password: string;
const passwords: string[] = [];

if (sharesEncryptedWithSinglePassword) {
  password = await Secret.prompt({
    message: "Enter the password",
  });
} else if (sharesEncryptedWithDiffPasswords) {
  for (let i = 0; i < shareCount; i++) {
    const serial = i + 1;

    const password = await Secret.prompt({
      message: `Enter the password for share #${serial}`,
    });

    passwords.push(password);
  }
}

const parts: string[][] = [];

for (let i = 0; i < partCount; i++) {
  console.log(`\n===== Part ${i + 1} =====\n`);

  if (!parts[i]) {
    parts[i] = [];
  }

  for (let j = 0; j < shareCount; j++) {
    parts[i].push(
      await Secret.prompt({
        message: `Enter secret share #${j + 1}`,
      }),
    );
  }
}

let retrievedSecret;

if (sharesEncryptedWithDiffPasswords) {
  retrievedSecret = (
    await Promise.all(
      parts.map(async (encyptedShares) =>
        Array.from(
          await combineShares(
            await Promise.all(
              encyptedShares.map(async (es, i) => {
                const decrypted = await aesGcmDecryptToUint8({
                  ciphertext: es,
                  password: passwords[i],
                });

                return decrypted;
              }),
            ),
          ),
        ),
      ),
    )
  ).flat();
} else if (sharesEncryptedWithSinglePassword) {
  retrievedSecret = (
    await Promise.all(
      parts.map(async (encyptedShares) =>
        Array.from(
          await combineShares(
            await Promise.all(
              encyptedShares.map(async (es) => {
                const decrypted = await aesGcmDecryptToUint8({
                  ciphertext: es,
                  password,
                });

                return decrypted;
              }),
            ),
          ),
        ),
      ),
    )
  ).flat();
} else {
  retrievedSecret = (
    await Promise.all(
      parts.map(async (shares) =>
        Array.from(await combineShares(shares.map((share) => decode(share)))),
      ),
    )
  ).flat();
}

const bytes = new Uint8Array(retrievedSecret.length);

bytes.set(retrievedSecret, 0);

let retrievedSecretString = new TextDecoder().decode(bytes);

const endIndex = retrievedSecretString.split("").findIndex((x) => {
  return x.charCodeAt(0) === 0;
});

if (endIndex !== -1) {
  retrievedSecretString = retrievedSecretString.slice(0, endIndex);
}

console.log(`\nSecret recovered successfully.\n`);

enum ActionTypes {
  COPY = "copy",
  PRINT = "print",
  NOTHING = "nothing",
}

const action = (await Select.prompt({
  message: "Select an option",
  options: [
    Select.separator("--------"),
    { name: "Copy the secret to the clipboard", value: ActionTypes.COPY },
    Select.separator("--------"),
    { name: "Print the secret to the console", value: ActionTypes.PRINT },
    Select.separator("--------"),
    { name: "Do nothing", value: ActionTypes.NOTHING },
  ],
})) as ActionTypes;

if (action === ActionTypes.PRINT) {
  console.log("Secret:");
  console.log(retrievedSecretString);
} else if (action === ActionTypes.COPY) {
  await writeText(retrievedSecretString);
  console.log("Secret copied.");
} else {
  console.log("Okay.");
}

console.log("\n\n");
