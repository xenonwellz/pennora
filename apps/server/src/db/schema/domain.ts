import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

import { user } from "./auth";

function t() {
    return { mode: "timestamp" as const };
}
const now = () => sql`(unixepoch())`;

// ─── Budgets (Workspaces) ───────────────────────────────────────────

export const budgets = sqliteTable("budgets", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: integer("created_at", t()).notNull().default(now()),
    updatedAt: integer("updated_at", t()).notNull().default(now()),
});

export const BUDGET_MEMBER_ROLES = ["member"] as const;
export type BudgetMemberRole = (typeof BUDGET_MEMBER_ROLES)[number];

export const BUDGET_MEMBER_STATUSES = ["pending", "accepted"] as const;
export type BudgetMemberStatus = (typeof BUDGET_MEMBER_STATUSES)[number];

export const budgetMembers = sqliteTable(
    "budget_members",
    {
        id: text("id").primaryKey(),
        budgetId: text("budget_id")
            .notNull()
            .references(() => budgets.id, { onDelete: "cascade" }),
        userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
        email: text("email").notNull(),
        role: text("role").notNull().default("member"),
        status: text("status").notNull().default("pending"),
        invitedBy: text("invited_by")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        token: text("token").notNull().unique(),
        expiresAt: integer("expires_at", t()).notNull(),
        createdAt: integer("created_at", t()).notNull().default(now()),
        updatedAt: integer("updated_at", t()).notNull().default(now()),
    },
    (table) => [unique().on(table.budgetId, table.email)],
);

// ─── Categories ─────────────────────────────────────────────────────

export const categories = sqliteTable("categories", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", t()).notNull().default(now()),
    updatedAt: integer("updated_at", t()).notNull().default(now()),
});

// ─── Tags ───────────────────────────────────────────────────────────

export const tags = sqliteTable("tags", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", t()).notNull(),
    updatedAt: integer("updated_at", t()).notNull(),
});

// ─── Budget Months (lifecycle) ────────────────────────────────────

export const BUDGET_MONTH_STATUSES = ["uninitialized", "planning", "completed"] as const;
export type BudgetMonthStatus = (typeof BUDGET_MONTH_STATUSES)[number];

export const budgetMonths = sqliteTable("budget_months", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    status: text("status").notNull().default("uninitialized"),
    startedAt: integer("started_at", t()),
    completedAt: integer("completed_at", t()),
    createdAt: integer("created_at", t()).notNull().default(now()),
    updatedAt: integer("updated_at", t()).notNull().default(now()),
}, (t) => [unique().on(t.budgetId, t.yearMonth)]);

// ─── Monthly USD Rates ──────────────────────────────────────────────

export const monthlyRates = sqliteTable("monthly_rates", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    usdBuyRate: real("usd_buy_rate").notNull(),
    usdSellRate: real("usd_sell_rate").notNull(),
    createdAt: integer("created_at", t()).notNull().default(now()),
    updatedAt: integer("updated_at", t()).notNull().default(now()),
}, (t) => [unique().on(t.budgetId, t.yearMonth)]);

// ─── Income Targets ─────────────────────────────────────────────────

export const incomeTargets = sqliteTable("income_targets", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("NGN"),
    label: text("label"),
    isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
    frequencyMonths: integer("frequency_months").notNull().default(1),
    endsAtYearMonth: text("ends_at_year_month"),
    createdAt: integer("created_at", t()).notNull().default(now()),
    updatedAt: integer("updated_at", t()).notNull().default(now()),
}, (t) => [unique().on(t.budgetId, t.yearMonth)]);

// ─── Income Entries ─────────────────────────────────────────────────

export const incomeEntries = sqliteTable("income_entries", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    incomeTargetId: text("income_target_id").references(() => incomeTargets.id, { onDelete: "set null" }),
    yearMonth: text("year_month").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull(),
    receivedAt: integer("received_at", t()).notNull(),
    createdAt: integer("created_at", t()).notNull(),
});

// ─── Budget Items ───────────────────────────────────────────────────

export const budgetItems = sqliteTable("budget_items", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    name: text("name").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
    frequencyMonths: integer("frequency_months").notNull().default(1),
    endsAtYearMonth: text("ends_at_year_month"),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
    paidAt: integer("paid_at", t()),
    createdAt: integer("created_at", t()).notNull().default(now()),
    updatedAt: integer("updated_at", t()).notNull().default(now()),
});

// ─── Budget Item Tags (M2M join) ────────────────────────────────────

export const budgetItemTags = sqliteTable("budget_item_tags", {
    budgetItemId: text("budget_item_id").notNull().references(() => budgetItems.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// ─── Relations ──────────────────────────────────────────────────────

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
    user: one(user, { fields: [budgets.userId], references: [user.id] }),
    members: many(budgetMembers),
    categories: many(categories),
    tags: many(tags),
    monthlyRates: many(monthlyRates),
    budgetMonths: many(budgetMonths),
    incomeTargets: many(incomeTargets),
    incomeEntries: many(incomeEntries),
    budgetItems: many(budgetItems),
}));

export const budgetMembersRelations = relations(budgetMembers, ({ one }) => ({
    budget: one(budgets, { fields: [budgetMembers.budgetId], references: [budgets.id] }),
    user: one(user, { fields: [budgetMembers.userId], references: [user.id] }),
    inviter: one(user, { fields: [budgetMembers.invitedBy], references: [user.id] }),
}));

export const categoriesRelations = relations(categories, ({ one }) => ({
    budget: one(budgets, { fields: [categories.budgetId], references: [budgets.id] }),
}));

export const tagsRelations = relations(tags, ({ one }) => ({
    budget: one(budgets, { fields: [tags.budgetId], references: [budgets.id] }),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one, many }) => ({
    budget: one(budgets, { fields: [budgetItems.budgetId], references: [budgets.id] }),
    category: one(categories, { fields: [budgetItems.categoryId], references: [categories.id] }),
    tags: many(budgetItemTags),
}));

export const budgetItemTagsRelations = relations(budgetItemTags, ({ one }) => ({
    budgetItem: one(budgetItems, { fields: [budgetItemTags.budgetItemId], references: [budgetItems.id] }),
    tag: one(tags, { fields: [budgetItemTags.tagId], references: [tags.id] }),
}));
