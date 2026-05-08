import * as FileSystem from "expo-file-system";
import type { Category } from "@/constants/colors";

export type CaptureMethod = "camera" | "upload_image" | "text" | "voice";

export interface ParsedExpense {
  amount: number | null;
  date: string;
  merchant: string;
  category: Category | null;
  notes: string;
  receiptPath: string | null;
  captureMethod: CaptureMethod;
}

const PENDING_FILE = (FileSystem.documentDirectory ?? "") + ".pending-review.json";

let _pending: ParsedExpense | null = null;

export function setPendingReview(data: ParsedExpense | null): void {
  _pending = data;
  if (data === null) {
    FileSystem.deleteAsync(PENDING_FILE, { idempotent: true }).catch(() => {});
  } else {
    FileSystem.writeAsStringAsync(PENDING_FILE, JSON.stringify(data)).catch(() => {});
  }
}

export function getPendingReview(): ParsedExpense | null {
  return _pending;
}

// Restores pending review after an app kill/restart. The review screen calls
// this on mount as a fallback when the in-memory variable is empty.
export async function loadPendingReviewFromDisk(): Promise<ParsedExpense | null> {
  if (_pending) return _pending;
  try {
    const str = await FileSystem.readAsStringAsync(PENDING_FILE);
    _pending = JSON.parse(str) as ParsedExpense;
    return _pending;
  } catch {
    return null;
  }
}
