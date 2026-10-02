// Operator-only, synthetic probe. Default is configuration inspection with ZERO
// network calls. A connection receipt is separate from classroom/content approval.
import { createServer } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const args = process.argv.slice(2),
  paid = args.includes("--allow-paid");
const get = (name) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const vite = await createServer({
  configFile: false,
  logLevel: "silent",
  ssr: { noExternal: ["server-only"] },
  server: { middlewareMode: true },
  plugins: [
    {
      name: "operator-server-only",
      enforce: "pre",
      resolveId: (id) =>
        id === "server-only" ? "\0operator-server-only" : null,
      load: (id) => (id === "\0operator-server-only" ? "export {}" : null),
    },
  ],
});
try {
  const { llmConfiguration } = await vite.ssrLoadModule(
    "/src/server/llm/config.ts",
  );
  const cfg = llmConfiguration();
  const profile = cfg.provider.profile;
  const receipt = {
    kind: "synthetic-connection-diagnostic",
    configuration: cfg.configuration,
    profileId: profile?.id ?? null,
    protocol: profile?.protocol ?? null,
    requestedModel: profile?.model ?? null,
    configVersion: profile?.configVersion ?? null,
    connectionTested: false,
    classroomApproval: false,
    requests: [],
    actualCost: "unknown; conservative ceiling only",
  };
  if (!paid) {
    console.log(JSON.stringify(receipt, null, 2));
  } else {
    const max = Number(get("--max-requests"));
    if (
      !args.includes("--max-requests") ||
      !Number.isSafeInteger(max) ||
      max < 1 ||
      max > 3 ||
      !args.includes("--policy-file")
    )
      throw new Error(
        "Specify --max-requests 1..3 and --policy-file containing trusted price/cap data.",
      );
    if (!cfg.enabled || !profile)
      throw new Error("Server configuration is disabled or invalid.");
    const { diagnosticPolicy } = await vite.ssrLoadModule(
      "/src/server/llm/diagnostic.ts",
    );
    const { policy, ceiling } = diagnosticPolicy(
      JSON.parse(await readFile(get("--policy-file"), "utf8")),
      profile,
      max,
    );
    receipt.priceVersion = policy.price_version;
    const { readAIProfile } = await vite.ssrLoadModule(
      "/src/server/llm/profile.ts",
    );
    const { createTeachingProvider } = await vite.ssrLoadModule(
      "/src/server/llm/provider.ts",
    );
    const { key } = readAIProfile();
    const provider = createTeachingProvider(
      { ...profile, maxOutputTokens: Math.min(64, profile.maxOutputTokens) },
      key,
    );
    for (let i = 0; i < max; i++) {
      const start = Date.now();
      try {
        const reply = await provider.askBisik(
          {
            question: "Probe koneksi sintetis. Berikan satu pertanyaan guru.",
            strategies: [
              {
                code: "generic-error",
                prompts: ["Apa yang sudah kamu coba?"],
                demonstrate: "Guru menunjukkan benda netral.",
              },
            ],
          },
          AbortSignal.timeout(5000),
        );
        receipt.requests.push({
          status: "parsed-envelope",
          reportedModel: reply.reportedModel,
          inputTokens: reply.inputTokens,
          outputTokens: reply.outputTokens,
          usageKnown: reply.usageKnown,
          durationMs: Date.now() - start,
          conservativeCeilingMicrousd: ceiling,
        });
        receipt.connectionTested = true;
      } catch (error) {
        receipt.requests.push({
          status: "failed",
          category: error?.category ?? "unavailable",
          durationMs: Date.now() - start,
          conservativeCeilingMicrousd: ceiling,
        });
        break;
      }
    }
    await mkdir(".local", { recursive: true });
    await writeFile(
      ".local/ai-connection-receipt.json",
      JSON.stringify(receipt, null, 2),
    );
    console.log(JSON.stringify(receipt, null, 2));
  }
} catch {
  console.error(
    "Diagnostic blocked or unavailable: check configuration, explicit --allow-paid, request count and trusted policy file. No provider body/key is printed.",
  );
  process.exitCode = 1;
} finally {
  await vite.close();
}
