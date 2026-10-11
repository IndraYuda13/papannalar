// Local test/demo runtime ports. Defaults are the documented local pair
// (app 3100, provider 54325) so an unset environment behaves exactly as before;
// staging/audit runs override them with PNL_APP_PORT / PNL_PROVIDER_PORT so a
// second instance can boot without binding production's ports.
function port(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535)
    throw new Error(`${name} must be a TCP port between 1 and 65535`);
  return value;
}
export const appPort = port("PNL_APP_PORT", 3100);
export const providerPort = port("PNL_PROVIDER_PORT", 54325);
export const appOrigin = `http://127.0.0.1:${appPort}`;
export const providerOrigin = `http://127.0.0.1:${providerPort}`;
