import "https://deno.land/x/dotenv@v3.2.0/load.ts";
import { RateLimiter } from "https://deno.land/x/oak_rate_limit@v0.1.1/mod.ts";
import {
  Application,
  Router,
  Status,
} from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { execRedisCommand } from "./redis.ts";
import { routes } from "./routes.ts";
import {
  AddEncryptedShareRequestBody,
  Room,
  CreateRoomRequestBody,
} from "./types.ts";
import cors from "./cors.ts";

const router = new Router();

router.get(routes.ROOT, (ctx) => {
  ctx.response.body = routes;
});

router.post(routes.GET_ROOM, async (ctx) => {
  try {
    const body = (await ctx.request.body({ type: "json" }).value) as
      | Partial<{
          room: {
            uuid: string;
          };
        }>
      | undefined;

    if (typeof body?.room?.uuid !== "string") {
      ctx.response.status = Status.BadRequest;

      ctx.response.body = {
        success: false,
        message: "Send room.uuid in JSON.",
      };

      return;
    }

    const roomUuid = body.room.uuid;

    const result1 = await execRedisCommand({
      command: "JSON.GET",
      args: [roomUuid],
    });

    if (typeof result1 !== "string") {
      ctx.response.status = Status.NotFound;

      ctx.response.body = {
        success: false,
        message: "No room found with the given uuid",
      };

      return;
    }

    const result2 = await execRedisCommand({
      command: "TTL",
      args: [roomUuid],
    });

    ctx.response.body = {
      ...JSON.parse(result1),
      expires_in_seconds: typeof result2 === "number" ? result2 : null,
    };
  } catch (_error) {
    // console.error(error);
    ctx.response.status = 500;
    ctx.response.body = "";
  }
});

router.post(routes.ADD_ENCRYPTED_SHARE, async (ctx) => {
  try {
    const body = (await ctx.request.body({ type: "json" }).value) as
      | Partial<AddEncryptedShareRequestBody>
      | undefined;

    if (
      typeof body?.room?.uuid !== "string" ||
      typeof body?.encrypted_share?.encrypted_share_text !== "string" ||
      typeof body?.encrypted_share?.public_key !== "string"
    ) {
      ctx.response.status = Status.BadRequest;

      ctx.response.body = {
        success: false,
        message:
          "Send room.uuid, encrypted_share.encrypted_share_text and encrypted_share.public_key in JSON.",
      };

      return;
    }

    const roomUuid = body.room.uuid as string;

    const result1 = await execRedisCommand({
      command: "JSON.GET",
      args: [roomUuid],
    });

    if (typeof result1 !== "string") {
      ctx.response.status = Status.NotFound;

      ctx.response.body = {
        success: false,
        message: "No room found with the given uuid",
      };

      return;
    }

    const room = JSON.parse(result1) as Room;

    if (!room.encrypted_shares) {
      room.encrypted_shares = [];
    }

    if (room.encrypted_shares.length >= room.min_share_count) {
      ctx.response.status = Status.BadRequest;

      ctx.response.body = {
        success: false,
        message: "Minimum number of shares have been set already",
      };

      return;
    }

    const alreadyExists = room.encrypted_shares.find(
      (share) =>
        share.encrypted_share_text ===
          body.encrypted_share?.encrypted_share_text ||
        share.public_key === body.encrypted_share?.public_key,
    );

    if (alreadyExists) {
      ctx.response.status = Status.BadRequest;

      ctx.response.body = {
        success: false,
        message: "This share has been set already",
      };

      return;
    }

    room.encrypted_shares.push({
      encrypted_share_text: body.encrypted_share.encrypted_share_text,
      public_key: body.encrypted_share.public_key,
    });

    const result2 = await execRedisCommand({
      command: "JSON.SET",
      args: [roomUuid, "$", JSON.stringify(room)],
    });

    if (result2 !== "OK") {
      ctx.response.status = 500;

      ctx.response.body = {
        success: false,
        message: "Internal Server Error",
      };

      return;
    }

    ctx.response.body = {
      success: true,
      message: "Your encrypted share has been added to the room successfully",
    };
  } catch (_error) {
    // console.error(error);
    ctx.response.status = 500;
    ctx.response.body = "";
  }
});

router.post(routes.CREATE_ROOM, async (ctx) => {
  try {
    const body = (await ctx.request.body({ type: "json" }).value) as
      | Partial<CreateRoomRequestBody>
      | undefined;

    if (
      typeof body?.room?.uuid !== "string" ||
      typeof body?.room?.min_share_count !== "number"
    ) {
      ctx.response.status = Status.BadRequest;

      ctx.response.body = {
        success: false,
        message: "Send room.uuid and room.min_share_count in JSON.",
      };

      return;
    }

    const roomUuid = body.room.uuid;
    const minShareCount = body.room.min_share_count;
    const publicKey = body.room.public_key;

    const result0 = await execRedisCommand({
      command: "JSON.GET",
      args: [roomUuid],
    });

    if (typeof result0 === "string") {
      ctx.response.status = Status.BadRequest;

      ctx.response.body = {
        success: false,
        message: "The room already exists.",
      };

      return;
    }

    const result1 = await execRedisCommand({
      command: "JSON.SET",
      args: [
        roomUuid,
        "$",
        JSON.stringify({
          min_share_count: minShareCount,
          public_key: publicKey,
        }),
      ],
    });

    if (result1 !== "OK") {
      ctx.response.status = 500;

      ctx.response.body = {
        success: false,
        message: "Internal Server Error",
      };

      return;
    }

    const expiresInSeconds = Deno.env.get("DATA_EXPIRE_SECONDS") || "60";

    const result2 = await execRedisCommand({
      command: "EXPIRE",
      args: [roomUuid, expiresInSeconds],
    });

    if (result2 !== 1) {
      ctx.response.status = 500;

      ctx.response.body = {
        success: false,
        message: "Internal Server Error",
      };

      return;
    }

    ctx.response.body = {
      success: true,
      message: "The room has been created successfully",
    };
  } catch (_error) {
    // console.error(error);
    ctx.response.status = 500;
    ctx.response.body = "";
  }
});

const rateLimit = RateLimiter({
  windowMs: parseInt(Deno.env.get("API_RATE_LIMIT_WINDOW") || "60000"),
  max: parseInt(Deno.env.get("API_RATE_LIMIT_MAX") || "150"),
  headers: true,
  message: "Too many requests, please try again later.",
  statusCode: 429,
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

app.use(await rateLimit);
app.use(router.routes());
app.use(router.allowedMethods());

const port = 8000;

console.log(`Listening at port ${port}`);

await app.listen({ port });
