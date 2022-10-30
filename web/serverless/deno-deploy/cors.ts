import { Context, Status } from "https://deno.land/x/oak@v11.1.0/mod.ts";

const cors = (ctx: Context) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Origin, X-Requested-With, Content-Type, Accept, DNT, Keep-Alive, User-Agent, If-Modified-Since, Cache-Control, Host, Accept-Language, Accept-Encoding, Referer, Authorization, Origin, Content-Length, Connection, Cookie, TE, API_ACCESS_TOKEN",
  );

  ctx.response.status = Status.OK;
};

export default cors;
