import "server-only";
import { z } from "zod";
import type { AIProfile } from "./profile";
import { modelNameSchema, profileNameSchema, protocolSchema } from "./profile";

const price = z.number().int().min(0).max(1e12);
const policySchema = z.strictObject({
  profile_id: profileNameSchema,
  config_version: profileNameSchema,
  protocol: protocolSchema,
  requested_model: modelNameSchema,
  price_version: profileNameSchema,
  currency: z.literal("USD"),
  pricing_date: z.iso.date(),
  configured_free: z.boolean(),
  input_per_million_microusd: price,
  output_per_million_microusd: price,
  cache_read_per_million_microusd: price,
  cache_creation_per_million_microusd: price,
  diagnostic_cap_microusd: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});

export function diagnosticPolicy(
  raw: unknown,
  profile: AIProfile,
  maxRequests: number,
) {
  const policy = policySchema.parse(raw);
  const prices = [
    policy.input_per_million_microusd,
    policy.output_per_million_microusd,
    policy.cache_read_per_million_microusd,
    policy.cache_creation_per_million_microusd,
  ];
  if (
    !Number.isSafeInteger(maxRequests) ||
    maxRequests < 1 ||
    maxRequests > 3 ||
    policy.profile_id !== profile.id ||
    policy.config_version !== profile.configVersion ||
    policy.protocol !== profile.protocol ||
    policy.requested_model !== profile.model ||
    Date.parse(policy.pricing_date) > Date.now() ||
    (policy.configured_free
      ? prices.some((p) => p !== 0)
      : prices[0] === 0 || prices[1] === 0)
  )
    throw new Error("DIAGNOSTIC_POLICY_INVALID");
  const ceiling = Math.ceil(
    (profile.maxInputTokens * Math.max(prices[0], prices[2], prices[3]) +
      Math.min(64, profile.maxOutputTokens) * prices[1]) /
      1e6,
  );
  if (ceiling * maxRequests > policy.diagnostic_cap_microusd)
    throw new Error("DIAGNOSTIC_CAP_EXCEEDED");
  return { policy, ceiling };
}
