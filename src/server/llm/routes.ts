import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { authContext, requireTeacher } from "../auth/client";
import { readBody, handleError } from "../http";
import { classDetail } from "../classes";
import { readSync } from "../sync";
import {
  bisikRequestSchema,
  bisikResponseSchema,
  enrichRequestSchema,
  enrichResponseSchema,
  feedbackSchema,
  llmStatusSchema,
} from "../../contracts/bisik";
import { fromPackageRecipe } from "../../contracts/sync-package";
import { llmConfiguration } from "./config";
import {
  approvedStrategy,
  bisikInput,
  staticBisik,
  safeQuestionText,
  validateBisik,
} from "./bisik";
import {
  approvedStorySlots,
  enrichmentInput,
  validateStories,
} from "./enrichment";
import { usageStore, logUsage, llmRpc, profileReference } from "./store";
import { BISIK_PRIVACY_REVIEW } from "./reviews";
import { MISCONCEPTION_CODES } from "../../content/strategies/registry";
import { runAssistant, usageMetadata } from "./usage";
import { withDeadline } from "./deadline";
import type { FallbackReason } from "../../contracts/bisik";
function logStatic(
  feature: "bisik" | "enrichment",
  provider: ReturnType<typeof llmConfiguration>["provider"],
  start: number,
  reason: FallbackReason,
) {
  logUsage({
    feature,
    ...usageMetadata(provider),
    usageKnown: false,
    cacheReadInputTokens: null,
    cacheCreationInputTokens: null,
    errorCategory: null,
    promptVersion: feature === "bisik" ? "bisik-v1" : "enrichment-v1",
    inputTokens: null,
    outputTokens: null,
    durationMs: Date.now() - start,
    fallback: reason,
    timestamp: new Date().toISOString(),
  });
}

export async function llmStatus(request: NextRequest) {
  try {
    const ctx = authContext(request);
    await requireTeacher(ctx);
    const cfg = llmConfiguration();
    let budgetEnabled = false,
      budgetReason: FallbackReason = "disabled";
    if (cfg.enabled && cfg.provider.profile) {
      try {
        const value = await withDeadline(2000, request.signal, (signal) =>
          llmRpc(
            ctx.client,
            {
              action: "status",
              schemaVersion: 2,
              profile: profileReference(cfg.provider.profile!),
            },
            signal,
          ),
        );
        const parsed = value as { allowed?: unknown; reason?: unknown };
        budgetEnabled = parsed.allowed === true;
        budgetReason = budgetEnabled
          ? "none"
          : parsed.reason === "budget"
            ? "budget"
            : "disabled";
      } catch {
        budgetReason = "unavailable";
      }
    }
    return ctx.finish(
      NextResponse.json(
        llmStatusSchema.parse({
          enabled: cfg.enabled,
          freeText: cfg.freeText && budgetEnabled,
          configuration: cfg.configuration,
          configured: cfg.enabled,
          connectionTested: false,
          contentEligible: [...MISCONCEPTION_CODES, "generic-error"].some(
            (code) => approvedStrategy(code) !== null,
          ),
          privacyReviewed: BISIK_PRIVACY_REVIEW !== null,
          budgetEnabled,
          budgetReason,
        }),
      ),
    );
  } catch (error) {
    return handleError(error);
  }
}
export async function bisikRequest(request: NextRequest) {
  const start = Date.now();
  try {
    const ctx = authContext(request);
    return await withDeadline(5000, request.signal, async (signal) => {
      await requireTeacher(ctx);
      const input = await readBody(request, bisikRequestSchema);
      await classDetail(ctx.client, input.classId);
      const cfg = llmConfiguration(),
        strategy = approvedStrategy(input.code);
      const fallback = (reason: "privacy" | "disabled" | "unreviewed") => {
        logStatic("bisik", cfg.provider, start, reason);
        return ctx.finish(
          NextResponse.json(
            bisikResponseSchema.parse({
              requestId: input.requestId,
              status: "static",
              reason,
              ...staticBisik(input.code),
              durationMs: Date.now() - start,
            }),
          ),
        );
      };
      if (
        input.question &&
        (!cfg.freeText || !safeQuestionText(input.question))
      )
        return fallback("privacy");
      if (!cfg.enabled) return fallback("disabled");
      if (!strategy) return fallback("unreviewed");
      const history = await readSync(ctx.client, input.classId);
      if (!history.records.some((r) => r.sessionId === input.sessionId))
        throw new Error("NOT_FOUND");
      signal.throwIfAborted();
      const result = await runAssistant({
        feature: "bisik",
        start,
        signal,
        provider: cfg.provider,
        store: usageStore(
          ctx.client,
          {
            requestId: input.requestId,
            classId: input.classId,
            scopeId: input.sessionId,
            feature: "bisik",
          },
          cfg.provider.profile!,
        ),
        call: (s) =>
          cfg.provider.askBisik(bisikInput(strategy, input.question), s),
        validate: (v) => validateBisik(v, [strategy.code]),
        log: logUsage,
      });
      return ctx.finish(
        NextResponse.json(
          bisikResponseSchema.parse({
            requestId: input.requestId,
            status: result.value ? "ai" : "static",
            reason: result.reason,
            ...(result.value ?? staticBisik(input.code)),
            durationMs: Date.now() - start,
          }),
        ),
      );
    });
  } catch (error) {
    return handleError(error);
  }
}
export async function enrichmentRequest(request: NextRequest) {
  const start = Date.now();
  try {
    const ctx = authContext(request);
    return await withDeadline(30000, request.signal, async (signal) => {
      await requireTeacher(ctx);
      const input = await readBody(request, enrichRequestSchema, 65536);
      const detail = await classDetail(ctx.client, input.recipe.classId);
      if (input.recipe.grade !== detail.class.grade)
        throw new Error("INVALID_INPUT");
      let pkg;
      try {
        pkg = fromPackageRecipe(input.recipe, false);
      } catch {
        throw new Error("INVALID_INPUT");
      }
      const cfg = llmConfiguration();
      const fallback = (reason: "disabled" | "unreviewed" | "frozen") => {
        logStatic("enrichment", cfg.provider, start, reason);
        return ctx.finish(
          NextResponse.json(
            enrichResponseSchema.parse({
              requestId: input.requestId,
              packageId: pkg.id,
              revision: pkg.revision,
              status: "static",
              reason,
              stories: [],
              durationMs: Date.now() - start,
            }),
          ),
        );
      };
      const history = await readSync(ctx.client, pkg.classId);
      if (history.records.some((r) => r.payload.package.id === pkg.id))
        return fallback("frozen");
      if (!cfg.enabled) return fallback("disabled");
      const slots = approvedStorySlots(pkg);
      if (!slots.length) return fallback("unreviewed");
      signal.throwIfAborted();
      const result = await runAssistant({
        feature: "enrichment",
        start,
        signal,
        provider: cfg.provider,
        store: usageStore(
          ctx.client,
          {
            requestId: input.requestId,
            classId: pkg.classId,
            scopeId: pkg.id,
            feature: "enrichment",
          },
          cfg.provider.profile!,
        ),
        call: (s) => cfg.provider.enrichPackage(enrichmentInput(slots), s),
        validate: (v) => validateStories(v, slots),
        log: logUsage,
      });
      return ctx.finish(
        NextResponse.json(
          enrichResponseSchema.parse({
            requestId: input.requestId,
            packageId: pkg.id,
            revision: pkg.revision,
            status: result.value ? "ai" : "static",
            reason: result.reason,
            stories: result.value ?? [],
            durationMs: Date.now() - start,
          }),
        ),
      );
    });
  } catch (error) {
    return handleError(error);
  }
}
export async function bisikFeedback(request: NextRequest) {
  try {
    const ctx = authContext(request);
    await requireTeacher(ctx);
    const input = await readBody(request, feedbackSchema);
    await classDetail(ctx.client, input.classId);
    await withDeadline(2000, request.signal, (signal) =>
      llmRpc(
        ctx.client,
        {
          action: "feedback",
          classId: input.classId,
          requestId: input.requestId,
          helpful: input.helpful,
        },
        signal,
      ),
    );
    return ctx.finish(NextResponse.json({ saved: true }));
  } catch (error) {
    return handleError(error);
  }
}
