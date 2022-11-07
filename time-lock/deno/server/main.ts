import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import {
  Application,
  Router,
  Status,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { RateLimiter } from "https://deno.land/x/oak_rate_limit@v0.1.1/mod.ts";
import { routes } from "./routes.ts";
import cors from "./cors.ts";
import { getTimestamp } from "../lib/decentralized-time/mod.ts";

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
