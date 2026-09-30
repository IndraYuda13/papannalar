import { createHash } from "node:crypto";
export const SAMPLE_ID = "7b000001-0000-4000-8000-000000000001";
export function sampleId(label) {
  const h = createHash("sha256")
    .update("pn-recording-v1:" + label)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const json = (v) => quote(JSON.stringify(v)) + "::jsonb";
export function sampleSeedSql(owner) {
  const systemId = sampleId("system-integers"),
    fractionId = sampleId("system-fractions"),
    cardsId = sampleId(owner + ":cards"),
    interactiveId = sampleId(owner + ":interactive");
  const item = (label, prompt, tool) => ({
    id: sampleId(label),
    kind: "interactive",
    prompt,
    tool,
  });
  const line = (origin, delta) => ({
    kind: "number-line",
    origin: { numerator: origin, denominator: 1 },
    delta: { numerator: delta, denominator: 1 },
    orientation: "horizontal",
  });
  const integers = {
    title: "Petualangan Bilangan Bulat",
    kind: "interactive",
    items: [
      item(
        "lift1",
        "Lift mulai dari −3, lalu turun 5 lantai. Di mana lift berhenti?",
        line(-3, -5),
      ),
      item("lift2", "Mulai dari −2, maju 6 langkah.", line(-2, 6)),
      item("lift3", "Mulai dari 4, mundur 7 langkah.", line(4, -7)),
    ],
  };
  const fractions = {
    title: "Mengenal Pecahan",
    kind: "interactive",
    items: [
      item("frac1", "Warnai setengah dari satu utuh.", {
        kind: "fractions",
        operation: "represent",
        left: { numerator: 1, denominator: 2 },
        right: { numerator: 0, denominator: 2 },
      }),
      item("frac2", "Bangun 1/2 + 1/3 dengan batang pecahan.", {
        kind: "fractions",
        operation: "add",
        left: { numerator: 1, denominator: 2 },
        right: { numerator: 1, denominator: 3 },
      }),
    ],
  };
  const cards = {
    title: "Bilangan Bulat — Pertemuan 1",
    kind: "cards",
    items: [
      [
        "Nilai −3 + 5 adalah…",
        ["2", "−8", "8", "−2"],
        "A",
        "Lima langkah ke kanan dari −3 berakhir di 2.",
      ],
      [
        "Lift dari lantai 2 turun 6 lantai. Lift berhenti di…",
        ["8", "4", "−4", "−8"],
        "C",
        "2 − 6 = −4.",
      ],
      [
        "Bilangan yang lebih kecil dari −2 adalah…",
        ["0", "1", "−1", "−5"],
        "D",
        "−5 berada di sebelah kiri −2.",
      ],
      ["Nilai 7 − 10 adalah…", ["3", "−3", "17", "−17"], "B", "7 − 10 = −3."],
      [
        "Suhu −4°C naik 6°C menjadi…",
        ["−10°C", "10°C", "2°C", "−2°C"],
        "C",
        "−4 + 6 = 2.",
      ],
    ].map(([prompt, options, key, explanation], i) => ({
      id: sampleId(owner + ":card:" + i),
      kind: "card",
      prompt,
      options,
      key,
      explanation,
    })),
  };
  const interactive = {
    title: "Eksplorasi dan Cerita Bilangan",
    kind: "interactive",
    items: [
      item(owner + ":my-lift", "Jelaskan gerak dari −1 ke 3.", line(-1, 4)),
      {
        id: sampleId(owner + ":write"),
        kind: "writing",
        prompt: "Tuliskan cerita sehari-hari yang cocok dengan −1 + 4.",
      },
    ],
  };
  const cls = ["7B", "7C"].map((label) => ({
    id: sampleId(owner + ":class:" + label),
    label,
  }));
  const token = sampleId(owner + ":seed-operator");
  let sql = `begin;\n`;
  sql += `insert into pn_private.sample_accounts(owner_id) values(${quote(owner)}::uuid) on conflict(owner_id) do nothing;\n`;
  for (const c of cls) {
    sql += `insert into public.classes(id,owner_id,label,grade,student_count,runtime_mode) values(${quote(c.id)}::uuid,${quote(owner)}::uuid,${quote(c.label)},7,32,'demo') on conflict(id) do nothing;\n`;
    for (let n = 1; n <= 32; n++)
      sql += `insert into public.students(id,class_id,owner_id,attendance_number) values(${quote(sampleId(owner + ":" + c.label + ":" + n))}::uuid,${quote(c.id)}::uuid,${quote(owner)}::uuid,${n}) on conflict(id) do nothing;\n`;
  }
  for (const [id, doc] of [
    [systemId, integers],
    [fractionId, fractions],
  ]) {
    sql += `insert into public.question_sets(id,source,status,document,current_version) values(${quote(id)}::uuid,'system','ready',${json(doc)},1) on conflict(id) do nothing;\ninsert into public.question_versions(set_id,version,document) values(${quote(id)}::uuid,1,${json(doc)}) on conflict do nothing;\n`;
  }
  sql += `set local role authenticated;set local request.jwt.claims=${quote(JSON.stringify({ sub: owner, is_anonymous: false, role: "authenticated" }))};\n`;
  // Never takes over an active recording. Seeding is operator-only, not login.
  sql += `do $$begin if public.sample_control(${quote(token)}::uuid,false,true) ? 'error' then raise exception 'Recording controller active';end if;end$$;\n`;
  for (const [id, doc] of [
    [cardsId, cards],
    [interactiveId, interactive],
  ])
    sql += `do $$begin if not exists(select 1 from public.question_sets where id=${quote(id)}::uuid) then if public.library_action(${json({ action: "save", id, revision: 0, ready: true, document: doc })},${quote(token)}::uuid) ? 'error' then raise exception 'Sample collection rejected';end if;end if;end$$;\n`;
  for (let n = 0; n < 3; n++) {
    const id = sampleId(owner + ":run:" + n),
      classroom = cls[n === 1 ? 1 : 0],
      date = n === 0 ? "2026-09-27" : n === 1 ? "2026-09-28" : "2026-09-30";
    const start = {
      action: "start",
      id,
      classId: classroom.id,
      collectionId: cardsId,
      version: 1,
      date,
      mode: "assessment",
    };
    sql += `do $$declare r jsonb;sid uuid;begin if not exists(select 1 from public.library_runs where id=${quote(id)}::uuid) then r=public.library_action(${json(start)},${quote(token)}::uuid);if r ? 'error' then raise exception 'Sample run rejected';end if;`;
    if (n < 2)
      for (let st = 1; st <= 3; st++)
        sql += `if public.library_action(jsonb_build_object('action','response','id',${quote(id)},'formId',r->'formId','version',1,'pageIndex',0,'studentId',${quote(sampleId(owner + ":" + classroom.label + ":" + st))},'answers',${json(st === 1 ? ["A", "C", "D", "B", "C"] : st === 2 ? ["A", "?", "D", "B", "?"] : ["B", "C", "A", "B", "C"])},'revision',0,'status','received'),${quote(token)}::uuid) ? 'error' then raise exception 'Sample response rejected';end if;`;
    if (n < 2)
      sql += `perform public.library_action(jsonb_build_object('action','close','id',${quote(id)},'revision',1),${quote(token)}::uuid);`;
    sql += `end if;end$$;\n`;
  }
  sql += `reset role;update pn_private.sample_accounts set controller=null,lease_until=null where owner_id=${quote(owner)}::uuid and controller=${quote(token)}::uuid;commit;`;
  return sql;
}
