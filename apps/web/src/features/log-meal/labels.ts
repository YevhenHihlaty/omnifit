import { MEAL_TYPES, type MealType } from "./types"

export type LogHubLabels = {
  title: string
  subtitle: string
  getStarted: string
  comingSoon: string
  mealTitle: string
  mealDescription: string
  trainingTitle: string
  trainingDescription: string
  metricsTitle: string
  metricsDescription: string
  waterTitle: string
  waterDescription: string
}

export type ProductDetailLabels = {
  servingSize: string
  amountGrams: string
  gramsUnit: string
  decreaseGrams: string
  increaseGrams: string
  protein: string
  carbs: string
  fat: string
  calories: string
  addToMeal: string
  close: string
}

export type AddProductFormLabels = {
  title: string
  subtitle: string
  nameLabel: string
  brandLabel: string
  servingSizeLabel: string
  caloriesLabel: string
  caloriesUnit: string
  proteinLabel: string
  carbsLabel: string
  fatLabel: string
  save: string
  cancel: string
  close: string
  unitG: string
}

export type SaveAsMealDialogLabels = {
  title: string
  subtitle: string
  nameLabel: string
  namePlaceholder: string
  save: string
  saving: string
  cancel: string
  close: string
}

export type LogMealLabels = {
  title: string
  mealTypeTabsAria: string
  searchLabel: string
  searchPlaceholder: string
  recentTitle: string
  recentEmpty: string
  searchResultsTitle: string
  searchEmpty: string
  searchFailed: string
  searching: string
  loadFailed: string
  retry: string
  addProduct: string
  draftTitle: string
  emptyDraft: string
  saveMeal: string
  savingMeal: string
  savedMeal: string
  saveAsMeal: string
  savedAsMeal: string
  removeItem: string
  decreaseQuantity: string
  increaseQuantity: string
  mealTypes: Record<MealType, string>
  savedMealsLink: string
  todayTitle: string
  todayGoal: string
  protein: string
  carbs: string
  fat: string
  kcalUnit: string
  productDetail: ProductDetailLabels
  addProductForm: AddProductFormLabels
  saveAsMealDialog: SaveAsMealDialogLabels
}

export type SavedMealsLabels = {
  title: string
  subtitle: string
  backToLogMeal: string
  logAgain: string
  loggedSuccess: string
  emptyTitle: string
  emptyBody: string
  goToLogMeal: string
  lastUsed: string
  neverUsed: string
  loadFailed: string
  retry: string
}

export const buildLogHubLabels = (t: (key: string) => string): LogHubLabels => ({
  title: t("logHub.title"),
  subtitle: t("logHub.subtitle"),
  getStarted: t("logHub.getStarted"),
  comingSoon: t("shell.comingSoon"),
  mealTitle: t("logHub.mealTitle"),
  mealDescription: t("logHub.mealDescription"),
  trainingTitle: t("logHub.trainingTitle"),
  trainingDescription: t("logHub.trainingDescription"),
  metricsTitle: t("logHub.metricsTitle"),
  metricsDescription: t("logHub.metricsDescription"),
  waterTitle: t("logHub.waterTitle"),
  waterDescription: t("logHub.waterDescription"),
})

export const buildLogMealLabels = (t: (key: string) => string): LogMealLabels => {
  const mealTypes = Object.fromEntries(
    MEAL_TYPES.map((type) => [type, t(`logMeal.mealTypes.${type}`)])
  ) as Record<MealType, string>

  return {
    title: t("logMeal.title"),
    mealTypeTabsAria: t("logMeal.mealTypeTabsAria"),
    searchLabel: t("logMeal.searchLabel"),
    searchPlaceholder: t("logMeal.searchPlaceholder"),
    recentTitle: t("logMeal.recentTitle"),
    recentEmpty: t("logMeal.recentEmpty"),
    searchResultsTitle: t("logMeal.searchResultsTitle"),
    searchEmpty: t("logMeal.searchEmpty"),
    searchFailed: t("logMeal.searchFailed"),
    searching: t("logMeal.searching"),
    loadFailed: t("logMeal.loadFailed"),
    retry: t("logMeal.retry"),
    addProduct: t("logMeal.addProduct"),
    draftTitle: t("logMeal.draftTitle"),
    emptyDraft: t("logMeal.emptyDraft"),
    saveMeal: t("logMeal.saveMeal"),
    savingMeal: t("logMeal.savingMeal"),
    savedMeal: t("logMeal.savedMeal"),
    saveAsMeal: t("logMeal.saveAsMeal"),
    savedAsMeal: t("logMeal.savedAsMeal"),
    removeItem: t("logMeal.removeItem"),
    decreaseQuantity: t("logMeal.decreaseQuantity"),
    increaseQuantity: t("logMeal.increaseQuantity"),
    mealTypes,
    savedMealsLink: t("logMeal.savedMealsLink"),
    todayTitle: t("logMeal.todayTitle"),
    todayGoal: t("logMeal.todayGoal"),
    protein: t("logMeal.protein"),
    carbs: t("logMeal.carbs"),
    fat: t("logMeal.fat"),
    kcalUnit: t("logMeal.kcalUnit"),
    productDetail: {
      servingSize: t("logMeal.productDetail.servingSize"),
      amountGrams: t("logMeal.productDetail.amountGrams"),
      gramsUnit: t("logMeal.productDetail.gramsUnit"),
      decreaseGrams: t("logMeal.productDetail.decreaseGrams"),
      increaseGrams: t("logMeal.productDetail.increaseGrams"),
      protein: t("logMeal.productDetail.protein"),
      carbs: t("logMeal.productDetail.carbs"),
      fat: t("logMeal.productDetail.fat"),
      calories: t("logMeal.productDetail.calories"),
      addToMeal: t("logMeal.productDetail.addToMeal"),
      close: t("logMeal.productDetail.close"),
    },
    addProductForm: {
      title: t("logMeal.addProductTitle"),
      subtitle: t("logMeal.addProductSubtitle"),
      nameLabel: t("logMeal.addProductNameLabel"),
      brandLabel: t("logMeal.addProductBrandLabel"),
      servingSizeLabel: t("logMeal.addProductServingLabel"),
      caloriesLabel: t("logMeal.addProductCaloriesLabel"),
      caloriesUnit: t("logMeal.addProductCaloriesUnit"),
      proteinLabel: t("logMeal.addProductProteinLabel"),
      carbsLabel: t("logMeal.addProductCarbsLabel"),
      fatLabel: t("logMeal.addProductFatLabel"),
      save: t("addProduct.addToLog"),
      cancel: t("logMeal.addProductCancel"),
      close: t("logMeal.addProductClose"),
      unitG: t("logMeal.addProductUnitG"),
    },
    saveAsMealDialog: {
      title: t("logMeal.saveAsMealDialog.title"),
      subtitle: t("logMeal.saveAsMealDialog.subtitle"),
      nameLabel: t("logMeal.saveAsMealDialog.nameLabel"),
      namePlaceholder: t("logMeal.saveAsMealDialog.namePlaceholder"),
      save: t("logMeal.saveAsMealDialog.save"),
      saving: t("logMeal.saveAsMealDialog.saving"),
      cancel: t("logMeal.saveAsMealDialog.cancel"),
      close: t("logMeal.saveAsMealDialog.close"),
    },
  }
}

export const buildSavedMealsLabels = (
  t: (key: string) => string
): SavedMealsLabels => ({
  title: t("savedMeals.title"),
  subtitle: t("savedMeals.subtitle"),
  backToLogMeal: t("savedMeals.backToLogMeal"),
  logAgain: t("savedMeals.logAgain"),
  loggedSuccess: t("savedMeals.loggedSuccess"),
  emptyTitle: t("savedMeals.emptyTitle"),
  emptyBody: t("savedMeals.emptyBody"),
  goToLogMeal: t("savedMeals.goToLogMeal"),
  lastUsed: t("savedMeals.lastUsed"),
  neverUsed: t("savedMeals.neverUsed"),
  loadFailed: t("savedMeals.loadFailed"),
  retry: t("savedMeals.retry"),
})
