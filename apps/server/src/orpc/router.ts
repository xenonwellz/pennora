import * as budgetProcedures from "./procedures/budget";
import * as budgetsProcedures from "./procedures/budgets";
import * as categoriesProcedures from "./procedures/categories";
import * as tagsProcedures from "./procedures/tags";
import * as ratesProcedures from "./procedures/rates";
import * as incomeProcedures from "./procedures/income";
import * as monthsProcedures from "./procedures/months";
import * as analyticsProcedures from "./procedures/analytics";
import * as invitationsProcedures from "./procedures/invitations";

export const router = {
    budget: budgetProcedures,
    budgets: budgetsProcedures,
    categories: categoriesProcedures,
    tags: tagsProcedures,
    rates: ratesProcedures,
    income: incomeProcedures,
    months: monthsProcedures,
    analytics: analyticsProcedures,
    invitations: invitationsProcedures,
};

export type AppRouter = typeof router;
