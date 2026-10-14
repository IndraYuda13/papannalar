#!/usr/bin/env node
/**
 * PapanNalar Dummy Testing Account Seeder
 *
 * Prepares a complete teacher test account with:
 * - Teacher credentials (email & password with scrypt hash)
 * - 2 Classes (7A & 7B) with active student rosters (32 & 28 students)
 * - 3 Question Collections (Diagnostic Cards, Fractions, Interactive Tools) with curriculum mappings
 * - Completed diagnostic assessment with 32 graded student responses
 * - Completed group lesson (Teaching at the Right Level / 3 Stations) with historical results
 * - Live active group lesson ready to test pairing & teaching workflows
 *
 * Usage:
 *   node scripts/seed-dummy-account.mjs
 *   node scripts/seed-dummy-account.mjs --email=guru@test.id --password=MySecretPassword123
 */

import { randomBytes, scryptSync, createHash } from "node:crypto";
import {
  sql,
  literal,
  asUser,
  databaseUrl,
} from "../tests/harness/postgres.mjs";

const emailArg = process.argv.find((v) => v.startsWith("--email="))?.slice(8);
const passwordArg = process.argv
  .find((v) => v.startsWith("--password="))
  ?.slice(11);

const DUMMY_EMAIL = (emailArg || "guru.testing@papannalar.id")
  .trim()
  .toLowerCase();
const DUMMY_PASSWORD = passwordArg || "PapanNalar2026!";

if (DUMMY_PASSWORD.length < 8 || DUMMY_PASSWORD.length > 128) {
  throw new Error("Password must be between 8 and 128 characters");
}

function sampleId(label) {
  const h = createHash("sha256")
    .update("pn-dummy-v2:" + label)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const json = (v) => quote(JSON.stringify(v)) + "::jsonb";

console.log("=== PapanNalar Dummy Account Seeder ===");
console.log(`Database Target: ${databaseUrl}`);
console.log(`Teacher Email  : ${DUMMY_EMAIL}`);
console.log(`Password       : ${DUMMY_PASSWORD}`);
console.log("");

// 1. Resolve or create user in auth.users & pn_private.password_credentials
let teacherId = sql(
  `select id from auth.users where lower(btrim(email))=${literal(DUMMY_EMAIL)} limit 1`,
);

if (!teacherId) {
  teacherId = sampleId("teacher:" + DUMMY_EMAIL);
  sql(
    `insert into auth.users(id, email, is_anonymous) values (${literal(teacherId)}::uuid, ${literal(DUMMY_EMAIL)}, false)`,
  );
  console.log(`[1/7] Created auth.users record: ${teacherId}`);
} else {
  console.log(`[1/7] Found existing auth.users record: ${teacherId}`);
}

const salt = randomBytes(32).toString("hex");
const passwordHash = scryptSync(DUMMY_PASSWORD, Buffer.from(salt, "hex"), 64, {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
}).toString("hex");

sql(`
  insert into pn_private.password_credentials(user_id, email, salt, password_hash, created_at)
  values(${literal(teacherId)}::uuid, ${literal(DUMMY_EMAIL)}, ${literal(salt)}, ${literal(passwordHash)}, now())
  on conflict (user_id) do update set
    email = excluded.email,
    salt = excluded.salt,
    password_hash = excluded.password_hash,
    created_at = now();
`);
console.log(`[1/7] Set password credentials successfully.`);

const teacher = { id: teacherId, email: DUMMY_EMAIL, is_anonymous: false };

// 2. Clean previous test data for this teacher idempotently
console.log("[2/7] Cleaning previous teacher data for a fresh seed...");
sql(`
  begin;
  delete from pn_private.group_board_receipts where assignment_id in (
    select a.id from public.group_assignments a
    join public.group_lessons l on l.id = a.lesson_id
    where l.owner_id = ${literal(teacherId)}::uuid
  );
  delete from pn_private.group_board_progress where assignment_id in (
    select a.id from public.group_assignments a
    join public.group_lessons l on l.id = a.lesson_id
    where l.owner_id = ${literal(teacherId)}::uuid
  );
  delete from public.group_assignments where lesson_id in (
    select id from public.group_lessons where owner_id = ${literal(teacherId)}::uuid
  );
  delete from pn_private.presentations where owner_id = ${literal(teacherId)}::uuid;
  delete from public.library_response_history where run_id in (
    select id from public.library_runs where owner_id = ${literal(teacherId)}::uuid
  );
  delete from public.library_responses where run_id in (
    select id from public.library_runs where owner_id = ${literal(teacherId)}::uuid
  );
  update public.library_runs set assignment_id = null, parent_lesson_id = null where owner_id = ${literal(teacherId)}::uuid;
  delete from public.library_runs where owner_id = ${literal(teacherId)}::uuid;
  delete from public.group_lessons where owner_id = ${literal(teacherId)}::uuid;
  delete from public.question_version_mappings where set_id in (
    select id from public.question_sets where owner_id = ${literal(teacherId)}::uuid
  );
  delete from public.question_set_mappings where set_id in (
    select id from public.question_sets where owner_id = ${literal(teacherId)}::uuid
  );
  delete from public.question_versions where set_id in (
    select id from public.question_sets where owner_id = ${literal(teacherId)}::uuid
  );
  delete from public.question_sets where owner_id = ${literal(teacherId)}::uuid;
  delete from public.students where owner_id = ${literal(teacherId)}::uuid;
  delete from pn_private.deleted_classes where owner_id = ${literal(teacherId)}::uuid;
  delete from public.classes where owner_id = ${literal(teacherId)}::uuid;
  commit;
`);

// 3. Create Classes & Students
console.log("[3/7] Creating classes (7A - 32 siswa, 7B - 28 siswa)...");
const classAId = sampleId(teacherId + ":class:7A");
const classBId = sampleId(teacherId + ":class:7B");

sql(`
  begin;
  insert into public.classes(id, owner_id, label, grade, student_count, runtime_mode, revision)
  values
    (${literal(classAId)}::uuid, ${literal(teacherId)}::uuid, '7A', 7, 32, 'pilot', 1),
    (${literal(classBId)}::uuid, ${literal(teacherId)}::uuid, '7B', 7, 28, 'pilot', 1);
  commit;
`);

const studentsA = [];
const studentsB = [];

let studentInsertsA = [];
for (let i = 1; i <= 32; i++) {
  const sid = sampleId(`${teacherId}:student:7A:${i}`);
  studentsA.push({ id: sid, attendanceNumber: i });
  studentInsertsA.push(
    `(${literal(sid)}::uuid, ${literal(classAId)}::uuid, ${literal(teacherId)}::uuid, ${i}, true, 1)`,
  );
}

let studentInsertsB = [];
for (let i = 1; i <= 28; i++) {
  const sid = sampleId(`${teacherId}:student:7B:${i}`);
  studentsB.push({ id: sid, attendanceNumber: i });
  studentInsertsB.push(
    `(${literal(sid)}::uuid, ${literal(classBId)}::uuid, ${literal(teacherId)}::uuid, ${i}, true, 1)`,
  );
}

sql(`
  begin;
  insert into public.students(id, class_id, owner_id, attendance_number, active, revision)
  values ${studentInsertsA.join(",")}, ${studentInsertsB.join(",")};
  commit;
`);

// 4. Create Question Sets, Versions, and Mappings
console.log(
  "[4/7] Creating question sets (Kartu Nalar Bilangan, Pecahan, Alat Nalar Interaktif)...",
);

const setCardsIntegersId = sampleId(teacherId + ":set:integers");
const setCardsFractionsId = sampleId(teacherId + ":set:fractions");
const setInteractiveToolId = sampleId(teacherId + ":set:tool-number-line");

const cardsIntegersDoc = {
  title: "Bilangan Bulat: Operasi & Penalaran (Sesi 1)",
  kind: "cards",
  items: [
    {
      id: sampleId(teacherId + ":card:int:1"),
      kind: "card",
      prompt:
        "Lift berada di lantai 2, kemudian bergerak turun 5 lantai. Di manakah posisi lift sekarang?",
      options: ["Lantai -3 (Bawah Tanah)", "Lantai -7", "Lantai 3", "Lantai 7"],
      key: "A",
      explanation:
        "2 - 5 = -3. Lift berhenti di lantai 3 bawah tanah (lantai -3).",
    },
    {
      id: sampleId(teacherId + ":card:int:2"),
      kind: "card",
      prompt: "Hasil perhitungan dari (-4) + 7 adalah...",
      options: ["-11", "-3", "3", "11"],
      key: "C",
      explanation:
        "Maju 7 langkah ke kanan dari -4 pada garis bilangan berakhir di angka 3.",
    },
    {
      id: sampleId(teacherId + ":card:int:3"),
      kind: "card",
      prompt:
        "Suhu udara di lereng gunung mula-mula -2°C. Menjelang fajar suhu turun 6°C. Berapakah suhu udara sekarang?",
      options: ["-8°C", "-4°C", "4°C", "8°C"],
      key: "A",
      explanation: "-2 - 6 = -8°C.",
    },
    {
      id: sampleId(teacherId + ":card:int:4"),
      kind: "card",
      prompt:
        "Di antara bilangan berikut, manakah bilangan yang nilainya paling kecil?",
      options: ["-15", "-3", "0", "4"],
      key: "A",
      explanation:
        "Pada garis bilangan mendatar, semakin ke kiri letak suatu bilangan maka nilainya semakin kecil. -15 terletak paling kiri.",
    },
    {
      id: sampleId(teacherId + ":card:int:5"),
      kind: "card",
      prompt:
        "Seekor burung terbang pada ketinggian 9 meter di atas permukaan laut. Seekor ikan berenang di kedalaman 4 meter di bawah permukaan laut (-4 meter). Berapakah jarak vertikal antara burung dan ikan?",
      options: ["5 meter", "9 meter", "13 meter", "-13 meter"],
      key: "C",
      explanation:
        "Jarak vertikal adalah selisih ketinggian: 9 - (-4) = 9 + 4 = 13 meter.",
    },
  ],
};

const cardsFractionsDoc = {
  title: "Pecahan: Konsep & Representasi Visual (Sesi 2)",
  kind: "cards",
  items: [
    {
      id: sampleId(teacherId + ":card:frac:1"),
      kind: "card",
      prompt: "Pecahan yang senilai dengan 2/4 adalah...",
      options: ["1/2", "1/4", "3/4", "2/6"],
      key: "A",
      explanation:
        "2/4 disederhanakan dengan membagi pembilang dan penyebut dengan 2 menghasilkan 1/2.",
    },
    {
      id: sampleId(teacherId + ":card:frac:2"),
      kind: "card",
      prompt: "Hasil penjumlahan dari 1/3 + 1/6 adalah...",
      options: ["2/9", "2/6", "1/2", "3/6"],
      key: "C",
      explanation: "Samakan penyebut: 2/6 + 1/6 = 3/6 = 1/2.",
    },
    {
      id: sampleId(teacherId + ":card:frac:3"),
      kind: "card",
      prompt:
        "Di antara pecahan berikut, manakah yang nilainya lebih besar dari 3/5?",
      options: ["1/2", "2/3", "4/10", "1/5"],
      key: "B",
      explanation:
        "3/5 = 0,60; sedangkan 2/3 = 0,667, sehingga 2/3 lebih besar dari 3/5.",
    },
    {
      id: sampleId(teacherId + ":card:frac:4"),
      kind: "card",
      prompt: "Bentuk paling sederhana dari pecahan 12/16 adalah...",
      options: ["6/8", "3/4", "4/5", "2/3"],
      key: "B",
      explanation:
        "Bagi pembilang dan penyebut dengan FPB(12, 16) yaitu 4 menghasilkan 3/4.",
    },
    {
      id: sampleId(teacherId + ":card:frac:5"),
      kind: "card",
      prompt:
        "Ibu memotong kue bolu menjadi 8 potong sama besar. Jika Rani memakan 3 potong, berapakah sisa kue bolu ibu?",
      options: ["3/8 bagian", "5/8 bagian", "5/5 bagian", "8/3 bagian"],
      key: "B",
      explanation: "1 utuh - 3/8 = 8/8 - 3/8 = 5/8 bagian.",
    },
  ],
};

const interactiveToolDoc = {
  title: "Eksplorasi Garis Bilangan (Alat Nalar Interaktif)",
  kind: "interactive",
  items: [
    {
      id: sampleId(teacherId + ":tool:int:1"),
      kind: "interactive",
      prompt:
        "Katak Nala mulai dari posisi −3, lalu melompat ke kanan sejauh 5 langkah. Di manakah katak mendarat?",
      tool: {
        kind: "number-line",
        origin: { numerator: -3, denominator: 1 },
        delta: { numerator: 5, denominator: 1 },
        orientation: "horizontal",
      },
    },
    {
      id: sampleId(teacherId + ":tool:int:2"),
      kind: "interactive",
      prompt:
        "Mulai dari posisi 4, lalu katak melompat mundur (ke kiri) sejauh 7 langkah. Tentukan posisi akhir katak.",
      tool: {
        kind: "number-line",
        origin: { numerator: 4, denominator: 1 },
        delta: { numerator: -7, denominator: 1 },
        orientation: "horizontal",
      },
    },
  ],
};

const mappingIntegers = {
  default: {
    topicId: "bilangan",
    competencyId: "bilangan-operasi",
    mappingVersion: 1,
  },
  overrides: [],
};

const mappingFractions = {
  default: {
    topicId: "pecahan",
    competencyId: "pecahan-representasi",
    mappingVersion: 1,
  },
  overrides: [],
};

sql(`
  begin;
  -- Question Set 1: Integers Cards
  insert into public.question_sets(id, owner_id, source, revision, status, document, current_version)
  values (${literal(setCardsIntegersId)}::uuid, ${literal(teacherId)}::uuid, 'teacher', 1, 'ready', ${json(cardsIntegersDoc)}, 1);
  insert into public.question_versions(set_id, version, document)
  values (${literal(setCardsIntegersId)}::uuid, 1, ${json(cardsIntegersDoc)});
  insert into public.question_set_mappings(set_id, mapping)
  values (${literal(setCardsIntegersId)}::uuid, ${json(mappingIntegers)});
  insert into public.question_version_mappings(set_id, version, mapping)
  values (${literal(setCardsIntegersId)}::uuid, 1, ${json(mappingIntegers)});

  -- Question Set 2: Fractions Cards
  insert into public.question_sets(id, owner_id, source, revision, status, document, current_version)
  values (${literal(setCardsFractionsId)}::uuid, ${literal(teacherId)}::uuid, 'teacher', 1, 'ready', ${json(cardsFractionsDoc)}, 1);
  insert into public.question_versions(set_id, version, document)
  values (${literal(setCardsFractionsId)}::uuid, 1, ${json(cardsFractionsDoc)});
  insert into public.question_set_mappings(set_id, mapping)
  values (${literal(setCardsFractionsId)}::uuid, ${json(mappingFractions)});
  insert into public.question_version_mappings(set_id, version, mapping)
  values (${literal(setCardsFractionsId)}::uuid, 1, ${json(mappingFractions)});

  -- Question Set 3: Interactive Tools
  insert into public.question_sets(id, owner_id, source, revision, status, document, current_version)
  values (${literal(setInteractiveToolId)}::uuid, ${literal(teacherId)}::uuid, 'teacher', 1, 'ready', ${json(interactiveToolDoc)}, 1);
  insert into public.question_versions(set_id, version, document)
  values (${literal(setInteractiveToolId)}::uuid, 1, ${json(interactiveToolDoc)});
  insert into public.question_set_mappings(set_id, mapping)
  values (${literal(setInteractiveToolId)}::uuid, ${json(mappingIntegers)});
  insert into public.question_version_mappings(set_id, version, mapping)
  values (${literal(setInteractiveToolId)}::uuid, 1, ${json(mappingIntegers)});

  commit;
`);

// 5. Create Standalone Completed Assessment Run for Kelas 7A
console.log(
  "[5/7] Seeding completed diagnostic assessment for Kelas 7A (32 student responses)...",
);
const assessmentRunId7A = sampleId(teacherId + ":run:assessment:7A");
const assessmentFormId7A = sampleId(teacherId + ":form:assessment:7A");

sql(`
  begin;
  insert into public.library_runs(
    id, owner_id, class_id, class_label, set_id, version,
    lesson_date, mode, status, position, revision, form_id,
    roster, synthetic, response_method, prepared
  ) values (
    ${literal(assessmentRunId7A)}::uuid,
    ${literal(teacherId)}::uuid,
    ${literal(classAId)}::uuid,
    '7A',
    ${literal(setCardsIntegersId)}::uuid,
    1,
    '2026-10-10'::date,
    'assessment',
    'closed',
    4,
    2,
    ${literal(assessmentFormId7A)}::uuid,
    ${json(studentsA)},
    false,
    'cards',
    false
  );
  commit;
`);

// Realistic distribution of responses:
// Siswa 1-10: Mahir/Tuntas (5/5)
// Siswa 11-22: Sedang/Miskonsepsi Operasi (3/5 - 4/5)
// Siswa 23-32: Butuh Bimbingan Konsep Negatif (0/5 - 2/5, ada '?')
const responseInserts = [];
for (let i = 1; i <= 32; i++) {
  const s = studentsA[i - 1];
  let answers;
  let correct;

  if (i <= 10) {
    // 5/5
    answers = ["A", "C", "A", "A", "C"];
    correct = 5;
  } else if (i <= 18) {
    // 4/5 (salah di no 5)
    answers = ["A", "C", "A", "A", "A"];
    correct = 4;
  } else if (i <= 22) {
    // 3/5 (salah di no 3 dan 5)
    answers = ["A", "C", "C", "A", "A"];
    correct = 3;
  } else if (i <= 27) {
    // 2/5 (miskonsepsi tanda negatif)
    answers = ["C", "B", "C", "A", "A"];
    correct = 2;
  } else {
    // 1/5 atau 0/5 dengan '?'
    answers = ["C", "B", "C", "?", "?"];
    correct = 0;
  }

  const answerStates = [
    "answered",
    "answered",
    "answered",
    "answered",
    "answered",
  ];
  responseInserts.push(`(
    ${literal(assessmentRunId7A)}::uuid,
    ${literal(s.id)}::uuid,
    ${json(answers)},
    1,
    ${correct},
    'received',
    now() - interval '2 days',
    ${json(answerStates)},
    'scan'
  )`);
}

sql(`
  begin;
  insert into public.library_responses(
    run_id, student_id, answers, revision, correct, status, updated_at, answer_states, response_source
  ) values ${responseInserts.join(",")};
  commit;
`);

// 6. Create Historical Completed Group Lesson for Kelas 7A (TaRL 3 Stations)
console.log(
  "[6/7] Creating completed Group Lesson (Pembelajaran Berdiferensiasi TaRL) for Kelas 7A...",
);
const lesson1Id = sampleId(teacherId + ":lesson:7A:closed");

// Prepare lesson via RPC asUser so PostgreSQL runs topic_evidence & suggest_groups natively
const prepareRes = asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "prepare",
    id: lesson1Id,
    classId: classAId,
    date: "2026-10-12",
    competency: {
      topicId: "bilangan",
      competencyId: "bilangan-operasi",
      mappingVersion: 1,
    },
    absentStudentIds: [],
    groupCount: 3,
    seed: sampleId(teacherId + ":seed:lesson1"),
    source: "evidence",
  })})`,
);

if (prepareRes?.error) {
  throw new Error(
    "Failed to prepare group lesson 1: " + JSON.stringify(prepareRes),
  );
}

// Inspect prepared groups
const preparedLesson = prepareRes;
const groups = preparedLesson.groups;

// Assign stations:
// Group 1 (Needs Concept Support): Teacher Station (Stasiun Guru - Bimbingan Terfokus)
// Group 2 (Intermediate): Board Station (Stasiun Papan Interaktif)
// Group 3 (Advanced): Cards Station (Stasiun Mandiri / Kartu Nalar)
const assignment1Id = sampleId(teacherId + ":assign:1");
const assignment2Id = sampleId(teacherId + ":assign:2");
const assignment3Id = sampleId(teacherId + ":assign:3");

const saveRes = asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "save",
    id: lesson1Id,
    revision: preparedLesson.revision,
    seed: preparedLesson.seed,
    groupingSource: "evidence",
    groups,
    assignments: [
      {
        id: assignment1Id,
        groupId: groups[0].id,
        method: "teacher",
        collectionId: setCardsIntegersId,
        version: 1,
      },
      {
        id: assignment2Id,
        groupId: groups[1].id,
        method: "board",
        collectionId: setInteractiveToolId,
        version: 1,
      },
      {
        id: assignment3Id,
        groupId: groups[2].id,
        method: "cards",
        collectionId: setCardsIntegersId,
        version: 1,
      },
    ],
  })})`,
);

if (saveRes?.error) {
  throw new Error(
    "Failed to save group lesson 1 assignments: " + JSON.stringify(saveRes),
  );
}

// Begin lesson
const beginRes = asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "begin",
    id: lesson1Id,
    revision: saveRes.revision,
  })})`,
);

if (beginRes?.error) {
  throw new Error(
    "Failed to begin group lesson 1: " + JSON.stringify(beginRes),
  );
}

// Record student answers for the Cards assignment
const cardsAssignment = saveRes.assignments.find((a) => a.method === "cards");
if (cardsAssignment) {
  for (const st of cardsAssignment.roster) {
    asUser(
      teacher,
      `select public.library_action(${json({
        contractVersion: 2,
        action: "response",
        id: cardsAssignment.runId,
        formId: cardsAssignment.formId,
        version: 1,
        pageIndex: 0,
        studentId: st.id,
        revision: 0,
        source: "scan",
        status: "received",
        answers: ["A", "C", "A", "A", "C"],
        answerStates: [
          "answered",
          "answered",
          "answered",
          "answered",
          "answered",
        ],
      })})`,
    );
  }
}

// Complete assignments & close lesson
asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "complete-assignment",
    id: lesson1Id,
    assignmentId: assignment1Id,
    assignmentRevision: 1,
  })})`,
);

asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "complete-assignment",
    id: lesson1Id,
    assignmentId: assignment3Id,
    assignmentRevision: 1,
  })})`,
);

const currentLesson = asUser(
  teacher,
  `select public.group_lesson_action(${json({ action: "detail", id: lesson1Id })})`,
);

const closeRes = asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "close",
    id: lesson1Id,
    revision: currentLesson.revision,
  })})`,
);

// Finalize lesson
asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "finalize",
    id: lesson1Id,
    revision: closeRes.revision,
    acknowledgeMissing: true,
  })})`,
);
console.log("[6/7] Closed and finalized Group Lesson 1 for Kelas 7A.");

// 7. Create Active Live Ready Group Lesson for Kelas 7B
console.log(
  "[7/7] Creating live ACTIVE Group Lesson for Kelas 7B (ready for live testing)...",
);
const lesson2Id = sampleId(teacherId + ":lesson:7B:active");

// Also add a baseline assessment for 7B so evidence is ready
const assessmentRunId7B = sampleId(teacherId + ":run:assessment:7B");
const assessmentFormId7B = sampleId(teacherId + ":form:assessment:7B");

sql(`
  begin;
  insert into public.library_runs(
    id, owner_id, class_id, class_label, set_id, version,
    lesson_date, mode, status, position, revision, form_id,
    roster, synthetic, response_method, prepared
  ) values (
    ${literal(assessmentRunId7B)}::uuid,
    ${literal(teacherId)}::uuid,
    ${literal(classBId)}::uuid,
    '7B',
    ${literal(setCardsIntegersId)}::uuid,
    1,
    '2026-10-13'::date,
    'assessment',
    'closed',
    4,
    2,
    ${literal(assessmentFormId7B)}::uuid,
    ${json(studentsB)},
    false,
    'cards',
    false
  );
  commit;
`);

const responseInsertsB = [];
for (let i = 1; i <= 28; i++) {
  const s = studentsB[i - 1];
  const correct = i <= 10 ? 5 : i <= 20 ? 3 : 1;
  const answers =
    i <= 10 ? ["A", "C", "A", "A", "C"] : ["A", "B", "C", "A", "?"];
  responseInsertsB.push(`(
    ${literal(assessmentRunId7B)}::uuid,
    ${literal(s.id)}::uuid,
    ${json(answers)},
    1,
    ${correct},
    'received',
    now() - interval '1 day',
    ${json(["answered", "answered", "answered", "answered", "answered"])},
    'scan'
  )`);
}

sql(`
  begin;
  insert into public.library_responses(
    run_id, student_id, answers, revision, correct, status, updated_at, answer_states, response_source
  ) values ${responseInsertsB.join(",")};
  commit;
`);

const prepareResB = asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "prepare",
    id: lesson2Id,
    classId: classBId,
    date: "2026-10-14",
    competency: {
      topicId: "bilangan",
      competencyId: "bilangan-operasi",
      mappingVersion: 1,
    },
    absentStudentIds: [],
    groupCount: 3,
    seed: sampleId(teacherId + ":seed:lesson2"),
    source: "evidence",
  })})`,
);

const groupsB = prepareResB.groups;
const assignB1 = sampleId(teacherId + ":assignB:1");
const assignB2 = sampleId(teacherId + ":assignB:2");
const assignB3 = sampleId(teacherId + ":assignB:3");

const saveResB = asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "save",
    id: lesson2Id,
    revision: prepareResB.revision,
    seed: prepareResB.seed,
    groupingSource: "evidence",
    groups: groupsB,
    assignments: [
      {
        id: assignB1,
        groupId: groupsB[0].id,
        method: "teacher",
        collectionId: setCardsIntegersId,
        version: 1,
      },
      {
        id: assignB2,
        groupId: groupsB[1].id,
        method: "board",
        collectionId: setInteractiveToolId,
        version: 1,
      },
      {
        id: assignB3,
        groupId: groupsB[2].id,
        method: "cards",
        collectionId: setCardsIntegersId,
        version: 1,
      },
    ],
  })})`,
);

asUser(
  teacher,
  `select public.group_lesson_action(${json({
    action: "begin",
    id: lesson2Id,
    revision: saveResB.revision,
  })})`,
);
console.log("[7/7] Live ACTIVE Group Lesson for Kelas 7B is now active!");

console.log("");
console.log("==================================================");
console.log(" SUCCESS! Akun Dummy & Data Testing Siap Digunakan");
console.log("==================================================");
console.log(`URL Login : https://papannalar.indrayuda.my.id/masuk`);
console.log(`Email     : ${DUMMY_EMAIL}`);
console.log(`Password  : ${DUMMY_PASSWORD}`);
console.log("--------------------------------------------------");
console.log("Data yang tersedia di dalam akun:");
console.log("1. Kelas:");
console.log(
  "   - Kelas 7A (32 Siswa) [Lengkap dengan asesmen & riwayat mengajar]",
);
console.log("   - Kelas 7B (28 Siswa) [Lengkap dengan sesi aktif siap demo]");
console.log("2. Koleksi Soal & Alat Nalar:");
console.log(
  "   - 'Bilangan Bulat: Operasi & Penalaran (Sesi 1)' (5 Kartu Pilihan Ganda Diagnostik 2-Tier)",
);
console.log(
  "   - 'Pecahan: Konsep & Representasi Visual (Sesi 2)' (5 Kartu Pecahan)",
);
console.log(
  "   - 'Eksplorasi Garis Bilangan (Alat Nalar Interaktif)' (2 Alat Peraga Garis Bilangan)",
);
console.log("3. Hasil Asesmen:");
console.log(
  "   - Selesai & ternilai untuk Kelas 7A (32 respon hasil scan kartu OMR)",
);
console.log(
  "   - Selesai & ternilai untuk Kelas 7B (28 respon hasil scan kartu OMR)",
);
console.log("4. Hasil Mengajar / Belajar Kelompok (TaRL):");
console.log(
  "   - 1 Sesi Selesai (Closed) di Kelas 7A dengan pembagian 3 Stasiun Rotasi:",
);
console.log(
  "     * Kelompok 1: Stasiun Guru (Bimbingan Terfokus Siswa Butuh Fondasi)",
);
console.log(
  "     * Kelompok 2: Stasiun Papan (Alat Nalar Interaktif IFP Siswa Sedang)",
);
console.log(
  "     * Kelompok 3: Stasiun Mandiri (Kartu Nalar Penalaran Siswa Mahir)",
);
console.log(
  "   - 1 Sesi Aktif (Active / Sedang Berjalan) di Kelas 7B siap dicoba/didemokan langsung.",
);
console.log("==================================================");
