import { z } from "zod";

export const registerDto = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(64),
});

export const loginDto = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export type RegisterDto = z.infer<typeof registerDto>;
export type LoginDto    = z.infer<typeof loginDto>;