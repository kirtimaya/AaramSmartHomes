/**
 * Server-safe subset of the food module: pure logic only, no React hooks.
 * Imported via the `@aaram/core/food/server` subpath so Next.js route
 * handlers never pull in client-only hooks (useWeekMenuNutrition,
 * useMemberNutrition) into a server module graph.
 */
export { isMealLocked, cutoffLabel } from './mealCutoff';
export type { MealBlock } from './mealCutoff';

export { sumMacros, addMacros, rdvPercent, macroCalorieBreakdown } from './nutrition';
export type { MacroTotals, MacroCalorieBreakdown } from './nutrition';
