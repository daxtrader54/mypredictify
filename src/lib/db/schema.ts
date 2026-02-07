import {
  pgSchema,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Use a separate Postgres schema to isolate from other projects in the same DB
export const predictifySchema = pgSchema('predictify');

// Enums
export const tierEnum = predictifySchema.enum('tier', ['free', 'pro']);
export const accaStatusEnum = predictifySchema.enum('acca_status', ['pending', 'won', 'lost', 'partial']);
export const transactionTypeEnum = predictifySchema.enum('transaction_type', ['deduct', 'redeem', 'purchase', 'subscription', 'refund']);

// Users table
export const users = predictifySchema.table('users', {
  id: text('id').primaryKey(), // Use email as ID for simplicity with NextAuth
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  tier: tierEnum('tier').default('free').notNull(),
  credits: integer('credits').default(100).notNull(),
  hasApiAccess: boolean('has_api_access').default(false).notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  dailyCreditsLastReset: timestamp('daily_credits_last_reset').defaultNow().notNull(),
  monthlyCreditsLastReset: timestamp('monthly_credits_last_reset').defaultNow().notNull(),
  favoriteLeagues: jsonb('favorite_leagues').$type<number[]>().default([8]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Credit transactions for audit trail
export const creditTransactions = predictifySchema.table('credit_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // Positive for additions, negative for deductions
  type: transactionTypeEnum('type').notNull(),
  reason: text('reason'),
  balanceAfter: integer('balance_after').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ACCA history
export const accaHistory = predictifySchema.table('acca_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  selections: jsonb('selections').$type<AccaSelection[]>().notNull(),
  combinedOdds: decimal('combined_odds', { precision: 10, scale: 2 }).notNull(),
  stake: decimal('stake', { precision: 10, scale: 2 }),
  potentialReturn: decimal('potential_return', { precision: 10, scale: 2 }),
  aiRecommendation: text('ai_recommendation'),
  status: accaStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  settledAt: timestamp('settled_at'),
});

// Prediction views for analytics
export const predictionViews = predictifySchema.table('prediction_views', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fixtureId: integer('fixture_id').notNull(),
  leagueId: integer('league_id').notNull(),
  creditsUsed: integer('credits_used').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  creditTransactions: many(creditTransactions),
  accaHistory: many(accaHistory),
  predictionViews: many(predictionViews),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
}));

export const accaHistoryRelations = relations(accaHistory, ({ one }) => ({
  user: one(users, {
    fields: [accaHistory.userId],
    references: [users.id],
  }),
}));

export const predictionViewsRelations = relations(predictionViews, ({ one }) => ({
  user: one(users, {
    fields: [predictionViews.userId],
    references: [users.id],
  }),
}));

// Pipeline enums
export const gameweekStatusEnum = predictifySchema.enum('gameweek_status', ['pending', 'ingested', 'researched', 'predicted', 'evaluated']);
export const pipelineStepEnum = predictifySchema.enum('pipeline_step', ['ingest', 'research', 'predict', 'evaluate', 'report']);
export const pipelineStepStatusEnum = predictifySchema.enum('pipeline_step_status', ['pending', 'running', 'completed', 'failed', 'skipped']);

// Gameweeks table
export const gameweeks = predictifySchema.table('gameweeks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: integer('league_id').notNull(),
  seasonId: integer('season_id'),
  number: integer('number').notNull(),
  name: text('name').notNull(), // e.g., "GW25"
  status: gameweekStatusEnum('status').default('pending').notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Match predictions table
export const matchPredictions = predictifySchema.table('match_predictions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  gameweekId: text('gameweek_id').notNull().references(() => gameweeks.id, { onDelete: 'cascade' }),
  fixtureId: integer('fixture_id').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  homeWinProb: decimal('home_win_prob', { precision: 5, scale: 3 }).notNull(),
  drawProb: decimal('draw_prob', { precision: 5, scale: 3 }).notNull(),
  awayWinProb: decimal('away_win_prob', { precision: 5, scale: 3 }).notNull(),
  predictedScore: text('predicted_score').notNull(),
  prediction: text('prediction').notNull(), // "H", "D", "A"
  confidence: decimal('confidence', { precision: 5, scale: 3 }).notNull(),
  explanation: text('explanation'),
  // Post-match fields
  result: text('result'), // "H", "D", "A"
  homeGoals: integer('home_goals'),
  awayGoals: integer('away_goals'),
  logLoss: decimal('log_loss', { precision: 8, scale: 4 }),
  correct: boolean('correct'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Weekly metrics table
export const weeklyMetrics = predictifySchema.table('weekly_metrics', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  gameweekId: text('gameweek_id').notNull().references(() => gameweeks.id, { onDelete: 'cascade' }),
  leagueId: integer('league_id').notNull(),
  accuracy: decimal('accuracy', { precision: 5, scale: 3 }),
  avgLogLoss: decimal('avg_log_loss', { precision: 8, scale: 4 }),
  brierScore: decimal('brier_score', { precision: 8, scale: 4 }),
  predictions: integer('predictions').default(0).notNull(),
  correct: integer('correct').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Pipeline run log (for error tracking and self-healing)
export const pipelineRuns = predictifySchema.table('pipeline_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  gameweekName: text('gameweek_name').notNull(),
  step: pipelineStepEnum('step').notNull(),
  status: pipelineStepStatusEnum('status').default('pending').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  retryCount: integer('retry_count').default(0).notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Pipeline relations
export const gameweeksRelations = relations(gameweeks, ({ many }) => ({
  matchPredictions: many(matchPredictions),
  weeklyMetrics: many(weeklyMetrics),
}));

export const matchPredictionsRelations = relations(matchPredictions, ({ one }) => ({
  gameweek: one(gameweeks, {
    fields: [matchPredictions.gameweekId],
    references: [gameweeks.id],
  }),
}));

export const weeklyMetricsRelations = relations(weeklyMetrics, ({ one }) => ({
  gameweek: one(gameweeks, {
    fields: [weeklyMetrics.gameweekId],
    references: [gameweeks.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type AccaHistoryRecord = typeof accaHistory.$inferSelect;
export type PredictionView = typeof predictionViews.$inferSelect;

export interface AccaSelection {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  bet: string;
  odds: number;
  leagueId: number;
}

// Pipeline types
export type Gameweek = typeof gameweeks.$inferSelect;
export type NewGameweek = typeof gameweeks.$inferInsert;
export type MatchPrediction = typeof matchPredictions.$inferSelect;
export type NewMatchPrediction = typeof matchPredictions.$inferInsert;
export type WeeklyMetric = typeof weeklyMetrics.$inferSelect;
export type PipelineRun = typeof pipelineRuns.$inferSelect;
