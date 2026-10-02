import { z } from "zod";
export const modelNameSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[-a-zA-Z0-9_.:/]+$/);
export const profileNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_.-]+$/);
export const protocolSchema = z.enum([
  "openai-chat-completions",
  "anthropic-messages",
]);
export const tokenCountSchema = z.number().int().min(0).max(131072);
export const outputCountSchema = z.number().int().min(0).max(16384);
