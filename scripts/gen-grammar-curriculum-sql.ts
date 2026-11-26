import { writeFileSync } from "fs";
import { GRAMMAR_CURRICULUM } from "../lib/grammarCurriculum";

const esc = (s: string) => s.replace(/'/g, "''");
const values = GRAMMAR_CURRICULUM.map(
  (t) =>
    `  ('${t.slug}', '${esc(t.title)}', '${esc(t.summary)}', '${esc(t.tip_tr)}', '${esc(t.example)}', ${t.difficulty})`
).join(",\n");

const sql = `-- Full A1–C1 grammar topic catalog (run after schema-grammar-topics.sql)
insert into public.grammar_topics (slug, title, summary, tip_tr, example, difficulty) values
${values}
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  tip_tr = excluded.tip_tr,
  example = excluded.example,
  difficulty = excluded.difficulty;
`;

writeFileSync("schema-grammar-curriculum-seed.sql", sql);
console.log(`wrote ${GRAMMAR_CURRICULUM.length} topics (${sql.length} bytes)`);
