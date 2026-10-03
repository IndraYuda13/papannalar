import { describe, expect, it } from "vitest";
import {
  cacheTarget,
  type ShellManifest,
} from "../../src/offline/cache-policy";

const origin = "https://example.invalid";
const manifest: ShellManifest = {
  cacheName: "pn-shell-test",
  shells: { "/guru": "/offline/guru.html", "/layar": "/offline/layar.html" },
  assets: ["/_next/static/chunk.js", "/_next/static/font.woff2", "/icon.svg"],
};
const request = { method: "GET", mode: "navigate", rsc: false };

describe("Cache shell hanya allowlist build", () => {
  it("practice context reuses a canonical public shell while private or malformed queries never enter cache", () => {
    const withPractice: ShellManifest = {
      ...manifest,
      shells: {
        ...manifest.shells,
        "/guru/latihan": "/offline/guru-latihan.html",
        "/guru/simulasi": "/offline/guru-simulasi.html",
      },
    };
    const id = "7b000002-0000-4000-8000-000000000001";
    for (const route of ["latihan", "simulasi"])
      for (const query of [
        "?mode=demo",
        "?mode=pilot",
        `?mode=demo&class=${id}`,
        `?class=${id}`,
      ]) {
        expect(
          cacheTarget(
            { ...request, url: origin + `/guru/${route}` + query },
            origin,
            withPractice,
          ),
        ).toBe(`/offline/guru-${route}.html`);
      }
    for (const route of ["latihan", "simulasi"])
      for (const query of [
        "?mode=student",
        "?class=PRIVATE_CANARY",
        "?mode=demo&name=PRIVATE_CANARY",
        "?mode=demo&mode=pilot",
        `?class=${id}&student=PRIVATE_CANARY`,
        "?_rsc=test",
      ]) {
        expect(
          cacheTarget(
            { ...request, url: origin + `/guru/${route}` + query },
            origin,
            withPractice,
          ),
        ).toBeUndefined();
      }
    expect(
      cacheTarget(
        { ...request, mode: "cors", url: origin + `/guru/latihan?class=${id}` },
        origin,
        withPractice,
      ),
    ).toBeUndefined();
    expect(
      cacheTarget(
        { ...request, rsc: true, url: origin + `/guru/latihan?class=${id}` },
        origin,
        withPractice,
      ),
    ).toBeUndefined();
  });
  it("normalizes only the Next build icon hash, never private query strings", () => {
    expect(
      cacheTarget(
        {
          ...request,
          mode: "cors",
          url: origin + "/icon.svg?icon.3yiq978yr91_f.svg",
        },
        origin,
        manifest,
      ),
    ).toBe("/icon.svg");
    for (const query of [
      "?student=CANARY",
      "?icon.safe.svg&student=CANARY",
      "?icon.safe.svg=CANARY",
      "?other.svg",
    ])
      expect(
        cacheTarget(
          { ...request, mode: "cors", url: origin + "/icon.svg" + query },
          origin,
          manifest,
        ),
      ).toBeUndefined();
  });
  it.each(["/", "/guru", "/layar"])(
    "navigasi %s punya fallback shell statis",
    (route) => {
      expect(
        cacheTarget({ ...request, url: origin + route }, origin, manifest),
      ).toBe(route === "/layar" ? "/offline/layar.html" : "/offline/guru.html");
    },
  );
  it.each(manifest.assets)("cache aset terdaftar %s", (asset) => {
    expect(
      cacheTarget(
        { ...request, mode: "cors", url: origin + asset },
        origin,
        manifest,
      ),
    ).toBe(asset);
  });
  it.each([
    "/api/v1/students",
    "/api/auth",
    "/api/llm",
    "/api/sync",
    "/guru?student=CANARY",
    "/guru?_rsc=test",
    "/_next/static/not-listed.js",
  ])("tidak menangkap %s", (url) => {
    expect(
      cacheTarget({ ...request, url: origin + url }, origin, manifest),
    ).toBeUndefined();
  });
  it("tidak cache POST, origin lain, RSC, atau fetch HTML pribadi", () => {
    expect(
      cacheTarget(
        { ...request, method: "POST", url: origin + "/guru" },
        origin,
        manifest,
      ),
    ).toBeUndefined();
    expect(
      cacheTarget(
        { ...request, url: "https://other.invalid/guru" },
        origin,
        manifest,
      ),
    ).toBeUndefined();
    expect(
      cacheTarget(
        { ...request, rsc: true, url: origin + "/guru" },
        origin,
        manifest,
      ),
    ).toBeUndefined();
    expect(
      cacheTarget(
        { ...request, mode: "cors", url: origin + "/guru" },
        origin,
        manifest,
      ),
    ).toBeUndefined();
  });

  it("fetch API, sync dan chunk di luar manifest tidak diambil dari cache", () => {
    for (const route of [
      "/api/v1/students",
      "/api/sync",
      "/_next/static/not-listed.js",
    ]) {
      expect(
        cacheTarget(
          { ...request, mode: "cors", url: origin + route },
          origin,
          manifest,
        ),
      ).toBeUndefined();
    }
  });
});
