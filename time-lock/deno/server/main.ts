import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
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
// app.use(async (ctx, next) => {
//   const token =
//     ctx.request.headers.get("API_ACCESS_TOKEN") ||
//     ctx.request.headers.get("api_access_token");

//   if (
//     ctx.request.method !== "OPTIONS" &&
//     (!token || token !== Deno.env.get("API_ACCESS_TOKEN"))
//   ) {
//     ctx.response.status = Status.Forbidden;
//     ctx.response.body = "";
//     return;
//   } else {
//     await next();
//   }
// });

app.use(router.routes());
app.use(router.allowedMethods());

const port = 8001;

console.log(`Listening at port ${port}`);

await app.listen({ port });
