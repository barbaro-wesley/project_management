import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "@infra/redis/redis.client";
import { env } from "@config/env";

// ─── Rate Limit Store (Redis) ─────────────────────────────────────────────────
// Compartilhado entre todos os pods — contadores consistentes em multi-instância

function makeRedisStore(prefix: string) {
  return new RedisStore({
    prefix,
    // @ts-expect-error — ioredis é compatível com a interface esperada
    sendCommand: (...args: string[]) => redisClient.call(...args),
  });
}

// ─── Rate Limiters ────────────────────────────────────────────────────────────

// Global — todas as rotas da API
export const globalRateLimit = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutos
  max:              300,             // 300 req por IP por janela
  standardHeaders:  "draft-7",      // RateLimit headers modernos
  legacyHeaders:    false,
  store:            makeRedisStore("rl:global:"),
  message: {
    status:  "error",
    code:    "TOO_MANY_REQUESTS",
    message: "Muitas requisições. Tente novamente em alguns minutos.",
  },
  skip: () => env.NODE_ENV === "test",
});

// Auth — rotas de login e registro (anti brute-force)
export const authRateLimit = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutos
  max:             10,              // 10 tentativas por IP
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  store:           makeRedisStore("rl:auth:"),
  message: {
    status:  "error",
    code:    "TOO_MANY_REQUESTS",
    message: "Muitas tentativas de autenticação. Tente novamente em 15 minutos.",
  },
  skip: () => env.NODE_ENV === "test",
});

// Upload — rotas de anexos (evita abuso de storage)
export const uploadRateLimit = rateLimit({
  windowMs:        60 * 60 * 1000, // 1 hora
  max:             50,              // 50 uploads por IP por hora
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  store:           makeRedisStore("rl:upload:"),
  message: {
    status:  "error",
    code:    "TOO_MANY_REQUESTS",
    message: "Limite de uploads atingido. Tente novamente em 1 hora.",
  },
  skip: () => env.NODE_ENV === "test",
});

// Invites — evita spam de convites
export const inviteRateLimit = rateLimit({
  windowMs:        60 * 60 * 1000, // 1 hora
  max:             20,              // 20 convites por IP por hora
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  store:           makeRedisStore("rl:invite:"),
  message: {
    status:  "error",
    code:    "TOO_MANY_REQUESTS",
    message: "Limite de convites atingido. Tente novamente em 1 hora.",
  },
  skip: () => env.NODE_ENV === "test",
});