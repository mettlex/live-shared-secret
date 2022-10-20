import { connect, Raw } from "https://deno.land/x/redis@v0.27.2/mod.ts";

export const execRedisCommand = async ({
  command,
  args,
}: {
  command: string;
  args: string[];
}): Promise<Raw | null> => {
  try {
    const redis = await connect({
      hostname: Deno.env.get("REDIS_DB_HOSTNAME")!,
      port: Deno.env.get("REDIS_DB_PORT")!,
      username: Deno.env.get("REDIS_DB_USERNAME")!,
      password: Deno.env.get("REDIS_DB_PASSWORD")!,
    });

    const reply = await redis.sendCommand(command, ...args);

    redis.close();

    return reply.value();
  } catch (error) {
    console.error(error);
    return null;
  }
};
