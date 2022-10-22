import { Number, Secret, Select, Confirm } from "./prompt/mod.ts";
import { writeText } from "./copy_paste/mod.ts";

enum Actions {
  SPLIT = "split",
  MERGE = "merge",
}

const action = (await Select.prompt({
  message: "Select an option",
  options: [
    Select.separator("--------"),
    { name: "Split a secret into multiple parts", value: Actions.SPLIT },
    Select.separator("--------"),
    {
      name: "Merge multiple parts into a secret",
      value: Actions.MERGE,
    },
  ],
})) as Actions;

if (action === Actions.SPLIT) {
  const secret = await Secret.prompt({
    message: "Enter the secret",
  });

  const partCount = await Number.prompt({
    message: "How many parts",
    min: 2,
    max: secret.length,
  });

  const sliceLength = Math.round(secret.length / partCount);

  for (let i = 0; i < partCount; i++) {
    const serial = i + 1;

    const startIndex = i * sliceLength;

    const chunk = secret.slice(startIndex, startIndex + sliceLength);

    const shouldCopy = await Confirm.prompt({
      message: `Copy part #${serial}`,
      default: true,
    });

    if (shouldCopy) {
      await writeText(chunk);
      console.log(`Part #${serial} copied.`);
    }
  }
} else if (action === Actions.MERGE) {
  const partCount = await Number.prompt({
    message: "How many parts",
    min: 2,
  });

  const parts = [];

  for (let i = 0; i < partCount; i++) {
    const serial = i + 1;

    parts.push(
      await Secret.prompt({
        message: `Enter part #${serial}`,
      }),
    );
  }

  const secret = parts.join("");

  const shouldCopy = await Confirm.prompt({
    message: `Copy secret`,
    default: true,
  });

  if (shouldCopy) {
    await writeText(secret);
    console.log(`Secret copied.`);
  }
}
