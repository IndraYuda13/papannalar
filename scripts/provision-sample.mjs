import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_PROVISION_KEY,
  email = process.env.SAMPLE_TEACHER_EMAIL,
  password = process.env.SAMPLE_TEACHER_PASSWORD;
const target = process.argv.find((v) => v.startsWith("--target="))?.slice(9);
if (
  !url ||
  !key ||
  !email ||
  !password ||
  password.length < 20 ||
  !target ||
  new URL(url).hostname !== target
)
  throw new Error(
    "Set URL, operator-only SUPABASE_PROVISION_KEY, sample email/password (20+ chars) and --target=<exact auth host>.",
  );
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
if (process.env.SAMPLE_TEACHER_ID) {
  const { data, error } = await client.auth.admin.getUserById(
    process.env.SAMPLE_TEACHER_ID,
  );
  if (error || data.user?.email !== email)
    throw new Error("Existing sample account did not match; nothing changed.");
  console.log(
    "Existing sample account verified. Continue with the explicit database seed command.",
  );
} else {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { papannalar_sample: true },
  });
  if (error || !data.user)
    throw new Error(
      "Account not created. Check operator configuration; no credentials logged.",
    );
  console.log(
    `Set server SAMPLE_TEACHER_ID=${data.user.id}, then run seed-sample on the matching project database.`,
  );
}
