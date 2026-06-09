// Domain types for AIRI Impact OS — aligned with supabase/schema.sql.
// Use these across the Next.js app for end-to-end type safety.

export type UserRole = "manager" | "staff" | "funder";
export type MetricKind = "number" | "yesno" | "text";
export type LogStatus = "pending" | "approved" | "changes" | "rejected";
export type CommitKind = "count" | "percent" | "budget";
export type ReportType = "overview" | "specific";
export type ReportStatus = "draft" | "pending" | "approved" | "rejected" | "sent";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  funder_id: string | null;
  active: boolean;
}

export interface Funder {
  id: string;
  org: string;
  email: string | null;
}

export interface Program {
  id: string;
  name: string;
  aim: string | null;
  audience: string | null;
  archived_at: string | null;
}

export interface Metric {
  id: string;
  program_id: string;
  label: string;
  kind: MetricKind;
  target: number | null;
  on_dashboard: boolean;
  base: number;
  sort_order: number;
}

export interface Grant {
  id: string;
  program_id: string | null;
  name: string;
  funder_id: string | null;
  funder_name: string | null;
  funder_email: string | null;
  amount: number;
  term_start: string | null;
  term_end: string | null;
  next_report: string | null;
  agreement_text: string | null;
  archived_at: string | null;
}

export interface Commitment {
  id: string;
  grant_id: string;
  label: string;
  kind: CommitKind;
  target: number;
  metric_id: string | null;
}

/** values maps metric_id -> recorded value */
export type LogValues = Record<string, number | boolean | string>;

export interface Log {
  id: string;
  program_id: string;
  staff_id: string;
  log_date: string;
  narrative: string | null;
  values: LogValues;
  status: LogStatus;
  manager_note: string | null;
  evidence_note: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  grant_id: string;
  expense_date: string;
  category: string | null;
  amount: number;
  invoice_ref: string | null;
  note: string | null;
  created_by: string | null;
}

export interface Attachment {
  id: string;
  log_id: string | null;
  expense_id: string | null;
  file_name: string;
  storage_path: string;
  kind: string | null;
}

export interface Activity {
  id: string;
  actor: string;
  text: string;
  created_at: string;
}

export interface ProgramStaff {
  program_id: string;
  profile_id: string;
  added_at: string;
}

export interface ReportQA {
  q: string;
  a: string;
}

export interface Report {
  id: string;
  program_id: string | null;
  grant_id: string | null;
  type: ReportType;
  title: string;
  period_from: string | null;
  period_to: string | null;
  format: string | null;
  body: string | null;
  qa: ReportQA[] | null;
  recipient_email: string | null;
  status: ReportStatus;
  created_at: string;
}
