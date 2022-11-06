import { getTimestamp } from "./mod.ts";

const now = Math.floor(Date.now() / 1000);
console.log("Difference in ms:", now - (await getTimestamp()).timestamp);

Deno.exit(0);
