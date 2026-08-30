import "dotenv/config";
import path from "path";
import ExcelJS from "exceljs";
import { query } from "../db/client";
import { normalizeEmployerName } from "../config/constants";

const FILE_PATH = path.join(__dirname, "..", "..", "data", "LCA_Disclosure_Data_FY2026_Q3.xlsx");

// 1-based column positions, confirmed against the file's own header row
const COL = {
  CASE_STATUS: 2,
  DECISION_DATE: 4,
  EMPLOYER_NAME: 20,
  WORKSITE_STATE: 72,
};

const BATCH_SIZE = 500;
const VALID_STATUSES = ["Certified", "Certified - Withdrawn"];

interface LcaRow {
  employerNameNormalized: string;
  rawEmployerName: string;
  caseStatus: string;
  worksiteState: string | null;
  decisionDate: string | null; // ISO date string
}

function excelSerialToIsoDate(serial: number): string {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}

function extractDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return excelSerialToIsoDate(value);
  return null;
}

async function insertBatch(rows: LcaRow[]): Promise<void> {
  if (rows.length === 0) return;

  const values: unknown[] = [];
  const placeholders = rows.map((row, i) => {
    const base = i * 5;
    values.push(
      row.employerNameNormalized,
      row.rawEmployerName,
      row.caseStatus,
      row.worksiteState,
      row.decisionDate
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  });

  await query(
    `INSERT INTO lca_employers
      (employer_name_normalized, raw_employer_name, case_status, worksite_state, most_recent_decision_date)
     VALUES ${placeholders.join(", ")}
     ON CONFLICT (employer_name_normalized, worksite_state) DO NOTHING`,
    values
  );
}

async function main() {
  console.log("Reading:", FILE_PATH);

  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(FILE_PATH, {
    entries: "emit",
    sharedStrings: "cache",
    styles: "cache",
    worksheets: "emit",
  });

  let batch: LcaRow[] = [];
  let processed = 0;
  let queued = 0;
  let isFirstRow = true;

  for await (const worksheetReader of workbookReader) {
    for await (const row of worksheetReader) {
      if (isFirstRow) {
        isFirstRow = false;
        continue; // skip header row
      }

      processed++;

      const values = row.values as unknown[];

      const caseStatus = values[COL.CASE_STATUS] as string | undefined;
      if (!caseStatus || !VALID_STATUSES.includes(caseStatus)) continue;

      const rawEmployerName = values[COL.EMPLOYER_NAME] as string | undefined;
      if (!rawEmployerName) continue;

      const worksiteState = (values[COL.WORKSITE_STATE] as string | undefined) ?? null;
      const decisionDate = extractDate(values[COL.DECISION_DATE]);

      batch.push({
        employerNameNormalized: normalizeEmployerName(rawEmployerName),
        rawEmployerName,
        caseStatus,
        worksiteState,
        decisionDate,
      });

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(batch);
        queued += batch.length;
        batch = [];
      }

      if (processed % 50000 === 0) {
        console.log(`Processed ${processed} rows, queued ${queued} certified rows so far...`);
      }
    }
  }

  await insertBatch(batch);
  queued += batch.length;

  console.log(`Done. Processed ${processed} rows total, queued ${queued} certified rows (duplicates skipped via ON CONFLICT).`);
  process.exit(0);
}

main();
