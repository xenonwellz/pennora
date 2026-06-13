import { BudgetsRepo } from "../repos/budgets.repo";
import { CategoriesRepo } from "../repos/categories.repo";
import { TagsRepo } from "../repos/tags.repo";
import { RatesRepo } from "../repos/rates.repo";
import { IncomeRepo } from "../repos/income.repo";
import { BudgetItemsRepo, BudgetItemTagsRepo } from "../repos/budget-items.repo";
import { BudgetMonthsRepo } from "../repos/budget-months.repo";

export abstract class BaseService {
    protected readonly budgets = new BudgetsRepo();
    protected readonly categories = new CategoriesRepo();
    protected readonly tags = new TagsRepo();
    protected readonly rates = new RatesRepo();
    protected readonly income = new IncomeRepo();
    protected readonly budgetItems = new BudgetItemsRepo();
    protected readonly budgetItemTags = new BudgetItemTagsRepo();
    protected readonly budgetMonths = new BudgetMonthsRepo();
}
