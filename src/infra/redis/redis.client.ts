import IORedis from "ioredis";
import { env } from "@config/env";

const redisOptions = {
  maxRetriesPerRequest: null, // obrigatório para BullMQ
  enableReadyCheck: false,
};

export const redisClient = new IORedis(env.REDIS_URL, redisOptions);
export const redisSub    = new IORedis(env.REDIS_URL, redisOptions);

redisClient.on("connect", () => console.log("✅ Redis conectado (pub)"));
redisClient.on("error",   (e) => console.error("❌ Redis pub error:", e));
redisSub.on("connect",    () => console.log("✅ Redis conectado (sub)"));
redisSub.on("error",      (e) => console.error("❌ Redis sub error:", e));