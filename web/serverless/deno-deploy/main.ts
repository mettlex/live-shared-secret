import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import {
  Application,
  Router,
  Status,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { execRedisCommand } from "./redis.ts";
import { routes } from "./routes.ts";

const router = new Router();

router.get(routes.ROOT, (ctx) => {
  ctx.response.body = routes;
});

router.post(routes.GET_ROOM_PUBLIC_KEY, async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;

    if (typeof body?.room?.uuid !== "string") {
      ctx.response.status = Status.BadRequest;

      ctx.response.body = {
        success: false,
        message: "No Room UUID is sent. Send room.uuid in JSON.",
      };

      return;
    }

    const roomUuid = body.room.uuid as string;

    // get public key from redis
    const query = `JSON.GET ${roomUuid} $.public_key`.split(" ");

    const result = await execRedisCommand({
      command: query[0],
      args: [...query.slice(1)],
    });

    if (typeof result !== "string") {
      ctx.response.status = Status.NotFound;

      ctx.response.body = {
        success: false,
        message: "No public key found",
      };

      return;
    }

    ctx.response.body = {
      success: true,
      data: {
        public_key: JSON.parse(result)[0],
      },
    };
  } catch (_error) {
    // console.error(error);
    ctx.response.body = "";
  }
});

router.post(routes.SET_ROOM_PUBLIC_KEY, async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;

    if (
      typeof body?.room?.uuid !== "string" ||
      typeof body?.room?.public_key !== "string"
    ) {
      ctx.response.status = Status.BadRequest;

      ctx.response.body = {
        success: false,
        message: "Send room.uuid and room.public_key in JSON.",
      };

      return;
    }

    const roomUuid = body.room.uuid as string;
    const roomPublicKey = body.room.public_key as string;

    // set public key from redis
    const result = await execRedisCommand({
      command: "JSON.SET",
      args: [
        roomUuid,
        "$",
        JSON.stringify({
          public_key: roomPublicKey,
        }),
      ],
    });

    if (result !== "OK") {
      ctx.response.status = 500;

      ctx.response.body = {
        success: false,
        message: "Internal Server Error",
      };

      return;
    }

    ctx.response.body = {
      success: true,
      message: "Room Public Key was set successfully",
    };
  } catch (_error) {
    // console.error(error);
    ctx.response.body = "";
  }
});

const app = new Application();

// auth middleware
app.use(async (ctx, next) => {
  const token = ctx.request.headers.get("API_ACCESS_TOKEN");

  if (!token || token !== Deno.env.get("API_ACCESS_TOKEN")) {
    return ctx.throw(Status.Forbidden);
  } else {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = 8000;

console.log(`Listening at port ${port}`);

await app.listen({ port });
