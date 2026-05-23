import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as FileSystem from "expo-file-system";

function randomUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
import { eq, desc } from "drizzle-orm";

import { db } from "@/db";
import { expenses as expensesTable, userPreferences as prefsTable } from "@/db/schema";
import type { Category } from "@/constants/colors";
import type { CaptureMethod } from "@/utils/pendingReview";

export interface Expense {
  id: string;
  amount: number;
  date: string;
  description: string;
  category: Category;
  notes: string;
  captureMethod: CaptureMethod;
  receiptPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  currencyCode: string;
  budgets: Record<Category, number | null>;
  confirmAiInput: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  currencyCode: "USD",
  confirmAiInput: true,
  budgets: {
    Food: null, Transport: null, Entertainment: null,
    Shopping: null, Bills: null, Other: null,
  },
};

const PREFS_ROW_ID = "singleton";

interface ExpenseContextValue {
  expenses: Expense[];
  preferences: UserPreferences;
  isLoaded: boolean;
  addExpense: (expense: Omit<Expense, "id" | "createdAt" | "updatedAt">) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  getExpensesForMonth: (year: number, month: number) => Expense[];
  getCategoryTotal: (category: Category, year: number, month: number) => number;
  getMonthTotal: (year: number, month: number) => number;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

function rowToExpense(row: typeof expensesTable.$inferSelect): Expense {
  return {
    id: row.id,
    amount: row.amount,
    date: row.date,
    description: row.description,
    category: row.category as Category,
    notes: row.notes,
    captureMethod: row.captureMethod as CaptureMethod,
    receiptPath: row.receiptPath ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToPrefs(row: typeof prefsTable.$inferSelect): UserPreferences {
  return {
    currencyCode: row.currencyCode,
    confirmAiInput: row.confirmAiInput ?? true,
    budgets: {
      Food: row.budgetFood ?? null,
      Transport: row.budgetTransport ?? null,
      Entertainment: row.budgetEntertainment ?? null,
      Shopping: row.budgetShopping ?? null,
      Bills: row.budgetBills ?? null,
      Other: row.budgetOther ?? null,
    },
  };
}

export function ExpenseProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let rows: typeof expensesTable.$inferSelect[] = [];
    try {
      rows = db.select().from(expensesTable).orderBy(desc(expensesTable.createdAt)).all();
      setExpenses(rows.map(rowToExpense));

      const prefsRows = db.select().from(prefsTable).all();
      if (prefsRows[0]) setPreferences(rowToPrefs(prefsRows[0]));
    } catch {
      // DB init error — start with empty state
    } finally {
      setIsLoaded(true);
    }

    // 90-day receipt auto-purge (design doc: async, 2s delay after mount)
    const timer = setTimeout(async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffStr = cutoff.toISOString().split("T")[0]!;
      for (const row of rows) {
        if (row.receiptPath && row.date < cutoffStr) {
          await FileSystem.deleteAsync(row.receiptPath, { idempotent: true });
          const now = new Date().toISOString();
          db.update(expensesTable)
            .set({ receiptPath: null, updatedAt: now })
            .where(eq(expensesTable.id, row.id))
            .run();
          setExpenses((prev) =>
            prev.map((e) => (e.id === row.id ? { ...e, receiptPath: null, updatedAt: now } : e))
          );
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id" | "createdAt" | "updatedAt">): Promise<Expense> => {
      const now = new Date().toISOString();
      const id = randomUUID();
      const row = { ...expense, id, createdAt: now, updatedAt: now };
      db.insert(expensesTable).values({
        id: row.id,
        amount: row.amount,
        date: row.date,
        description: row.description,
        category: row.category,
        notes: row.notes,
        captureMethod: row.captureMethod,
        receiptPath: row.receiptPath ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }).run();
      const newExpense = rowToExpense({ ...row, notes: row.notes ?? "", receiptPath: row.receiptPath ?? null });
      setExpenses((prev) => [newExpense, ...prev]);
      return newExpense;
    },
    []
  );

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>): Promise<void> => {
    const now = new Date().toISOString();
    db.update(expensesTable).set({
      ...(updates.amount !== undefined && { amount: updates.amount }),
      ...(updates.date !== undefined && { date: updates.date }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.captureMethod !== undefined && { captureMethod: updates.captureMethod }),
      ...(updates.receiptPath !== undefined && { receiptPath: updates.receiptPath }),
      updatedAt: now,
    }).where(eq(expensesTable.id, id)).run();
    setExpenses((prev) =>
      prev.map((e) => e.id === id ? { ...e, ...updates, updatedAt: now } : e)
    );
  }, []);

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    // Delete receipt file if present
    const expense = expenses.find((e) => e.id === id);
    if (expense?.receiptPath) {
      await FileSystem.deleteAsync(expense.receiptPath, { idempotent: true });
    }
    db.delete(expensesTable).where(eq(expensesTable.id, id)).run();
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, [expenses]);

  const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>): Promise<void> => {
    const updated = { ...preferences, ...prefs };
    setPreferences(updated);
    const now = new Date().toISOString();
    const existing = db.select().from(prefsTable).where(eq(prefsTable.id, PREFS_ROW_ID)).all();
    const row = {
      id: PREFS_ROW_ID,
      currencyCode: updated.currencyCode,
      confirmAiInput: updated.confirmAiInput,
      budgetFood: updated.budgets.Food ?? null,
      budgetTransport: updated.budgets.Transport ?? null,
      budgetEntertainment: updated.budgets.Entertainment ?? null,
      budgetShopping: updated.budgets.Shopping ?? null,
      budgetBills: updated.budgets.Bills ?? null,
      budgetOther: updated.budgets.Other ?? null,
      createdAt: existing[0]?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing.length > 0) {
      db.update(prefsTable).set(row).where(eq(prefsTable.id, PREFS_ROW_ID)).run();
    } else {
      db.insert(prefsTable).values(row).run();
    }
  }, [preferences]);

  const getExpensesForMonth = useCallback((year: number, month: number): Expense[] => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return expenses.filter((e) => e.date.startsWith(prefix));
  }, [expenses]);

  const getCategoryTotal = useCallback((category: Category, year: number, month: number): number => {
    return getExpensesForMonth(year, month)
      .filter((e) => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [getExpensesForMonth]);

  const getMonthTotal = useCallback((year: number, month: number): number => {
    return getExpensesForMonth(year, month).reduce((sum, e) => sum + e.amount, 0);
  }, [getExpensesForMonth]);

  return (
    <ExpenseContext.Provider
      value={{
        expenses, preferences, isLoaded,
        addExpense, updateExpense, deleteExpense, updatePreferences,
        getExpensesForMonth, getCategoryTotal, getMonthTotal,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used inside ExpenseProvider");
  return ctx;
}
