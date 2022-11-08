import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import {
  Application,
  Router,
  Status,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { RateLimiter } from "https://deno.land/x/oak_rate_limit@v0.1.1/mod.ts";
import { parse } from "https://deno.land/std@0.162.0/flags/mod.ts";
import { routes } from "./routes.ts";
import cors from "./cors.ts";
import { getTimestamp } from "../lib/decentralized-time/mod.ts";
import { db } from "../database/mod.ts";
import { Key } from "../database/models/key.ts";

const flags = parse(Deno.args, {
  boolean: ["drop_tables"],
  default: {
    drop_tables: false,
  },
});

const dbConnectionSuccessful = await db.ping();

if (!dbConnectionSuccessful) {
  console.error("Database connection is not successful");
  Deno.exit(1);
}

try {
  db.link([Key]);

  if (flags.drop_tables) {
    await db.sync({
      drop: true,
    });
  }
} catch (error) {
  console.error("Database sync is not successful");
  console.error(error);
  Deno.exit(1);
}

const router = new Router();

router.get(routes.GET_TIME, async (ctx) => {
  ctx.response.body = await getTimestamp();
});

const app = new Application();

app.use(async (context, next) => {
  cors(context);
  await next();
});

// auth middleware
app.use(async (ctx, next) => {
  const token =
    ctx.request.headers.get("API_ACCESS_TOKEN") ||
    ctx.request.headers.get("api_access_token");

  if (
    ctx.request.method !== "OPTIONS" &&
    (!token || token !== Deno.env.get("API_ACCESS_TOKEN"))
  ) {
    ctx.response.status = Status.Forbidden;
    ctx.response.body = "";
    return;
  } else {
    await next();
  }
});

const rateLimit = RateLimiter({
  windowMs: parseInt(Deno.env.get("API_RATE_LIMIT_WINDOW") || "60000"),
  max: parseInt(Deno.env.get("API_RATE_LIMIT_MAX") || "300"),
  headers: true,
  message: "Too many requests, please try again later.",
  statusCode: 429,
});

app.use(await rateLimit);
app.use(router.routes());
app.use(router.allowedMethods());

const port = 8001;

console.log(`Listening at port ${port}`);

await app.listen({ port });
