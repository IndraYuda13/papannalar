// Local-demo privacy boundary. The demo adapter is opt-in (explicit flag) and
// only ever enabled when BOTH the auth provider and the app origin are loopback
// http origins. The hostname allowlist is loopback-only (127.0.0.1, localhost,
// [::1]) so a parallel staging instance on another loopback port can use the
// local adapter without ever accepting a network or public origin.
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

function isLoopbackHttpOrigin(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      LOOPBACK_HOSTNAMES.has(url.hostname) &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

export function isLocalDemoEnvironment(
  flag: string | undefined,
  provider: string | undefined,
  origin: string | undefined,
): boolean {
  return (
    flag === "1" &&
    isLoopbackHttpOrigin(provider) &&
    isLoopbackHttpOrigin(origin)
  );
}

// Same loopback rule applied to a raw `Host` header value: accept a loopback
// host name with any port, reject everything else (credentials, path, query,
// foreign hosts, malformed values).
export function isLoopbackHostHeader(host: string | null | undefined): boolean {
  if (!host) return false;
  try {
    const url = new URL(`http://${host}`);
    return (
      LOOPBACK_HOSTNAMES.has(url.hostname) &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}
