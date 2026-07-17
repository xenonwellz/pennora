import { pgTable, text, integer, real, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { user } from "./auth";

// ─── Budgets (Workspaces) ───────────────────────────────────────────

export const budgets = pgTable("budgets", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const BUDGET_MEMBER_ROLES = ["member"] as const;
export type BudgetMemberRole = (typeof BUDGET_MEMBER_ROLES)[number];

export const BUDGET_MEMBER_STATUSES = ["pending", "accepted"] as const;
export type BudgetMemberStatus = (typeof BUDGET_MEMBER_STATUSES)[number];

export const budgetMembers = pgTable(
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
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").notNull().default(sql`now()`),
        updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
    },
    (table) => [unique().on(table.budgetId, table.email)],
);

// ─── Categories ─────────────────────────────────────────────────────

export const categories = pgTable("categories", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ─── Tags ───────────────────────────────────────────────────────────

export const tags = pgTable("tags", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
});

// ─── Budget Months (lifecycle) ────────────────────────────────────

export const BUDGET_MONTH_STATUSES = ["uninitialized", "planning", "completed"] as const;
export type BudgetMonthStatus = (typeof BUDGET_MONTH_STATUSES)[number];

export const budgetMonths = pgTable("budget_months", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    status: text("status").notNull().default("uninitialized"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (t) => [unique().on(t.budgetId, t.yearMonth)]);

// ─── Monthly USD Rates ──────────────────────────────────────────────

export const monthlyRates = pgTable("monthly_rates", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    usdBuyRate: real("usd_buy_rate").notNull(),
    usdSellRate: real("usd_sell_rate").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
}, (t) => [unique().on(t.budgetId, t.yearMonth)]);

// ─── Income Targets ─────────────────────────────────────────────────

// Multiple income sources allowed per budget + month (salary, freelancing, etc.)
export const incomeTargets = pgTable("income_targets", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull().default("NGN"),
    label: text("label"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    frequencyMonths: integer("frequency_months").notNull().default(1),
    endsAtYearMonth: text("ends_at_year_month"),
    /** Draft earnings are excluded from totals until activated. */
    isDraft: boolean("is_draft").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ─── Income Entries ─────────────────────────────────────────────────

export const incomeEntries = pgTable("income_entries", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    incomeTargetId: text("income_target_id").references(() => incomeTargets.id, { onDelete: "set null" }),
    yearMonth: text("year_month").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull(),
    receivedAt: timestamp("received_at").notNull(),
    createdAt: timestamp("created_at").notNull(),
});

// ─── Budget Items ───────────────────────────────────────────────────

export const budgetItems = pgTable("budget_items", {
    id: text("id").primaryKey(),
    budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    name: text("name").notNull(),
    amount: real("amount").notNull(),
    currency: text("currency").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    isRecurring: boolean("is_recurring").notNull().default(false),
    frequencyMonths: integer("frequency_months").notNull().default(1),
    endsAtYearMonth: text("ends_at_year_month"),
    paid: boolean("paid").notNull().default(false),
    paidAt: timestamp("paid_at"),
    /** Draft items are planned later — excluded from totals until activated. */
    isDraft: boolean("is_draft").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ─── Budget Item Tags (M2M join) ────────────────────────────────────

export const budgetItemTags = pgTable("budget_item_tags", {
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
