import { writeAll } from "./deps.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Closes a process and its pipes, while error-checking. */
async function close(process: Deno.Process): Promise<void> {
  const [{ success }, rawError] = await Promise.all([
    process.status(),
    process.stderrOutput(),
  ]);

  process.close();

  if (!success && typeof rawError !== "undefined") {
    console.error(decoder.decode(rawError));
  }
}

/**
 * Writes/copies raw data to the system clipboard.
 *
 * ```ts
 * await write(await Deno.readFile("file_to_copy.png"));
 * ```
 */
export async function write(input: Uint8Array): Promise<void> {
  const cmd = {
    darwin: ["pbcopy"],
    linux: ["xsel", "-b", "-i"],
    windows: ["powershell", "-noprofile", "-command", "$input|Set-Clipboard"],
  }[Deno.build.os];
  const process = await Deno.run({
    cmd,
    stdin: "piped",
    stdout: "null",
    stderr: "piped",
  });
  await writeAll(process.stdin, input);
  process.stdin.close();
  await close(process);
}

/**
 * Writes/copies text to the system clipboard.
 *
 * ```ts
 * await writeText("text to copy");
 * ```
 */
export async function writeText(input: string): Promise<void> {
  return await write(encoder.encode(input));
}

/**
 * Reads/pastes raw data from the system clipboard.
 *
 * ```ts
 * const pastedData = await read();
 * ```
 */
export async function read(): Promise<Uint8Array> {
  const cmd = {
    darwin: ["pbpaste"],
    linux: ["xsel", "-b", "-o"],
    windows: ["powershell", "-noprofile", "-command", "Get-Clipboard"],
  }[Deno.build.os];
  const process = await Deno.run({
    cmd,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });
  const rawOutput = await process.output();
  await close(process);
  return rawOutput;
}

/**
 * Reads/pastes text from the system clipboard.
 *
 * ```ts
 * const pastedText = await readText();
 * ```
 */
export async function readText(): Promise<string> {
  const rawOutput = await read();
  return decoder.decode(rawOutput);
}
