/** Shared selection primitive for the existing weekly plan and the simplified plan. */
export function unusedRecipes<T extends { id: string }>(
  recipes: T[],
  usedIds: string[],
): T[] {
  const used = new Set(usedIds);
  return recipes.filter((recipe) => !used.has(recipe.id));
}

export function replacePlannedRecipe<T extends { id: string }>(
  eligible: T[],
  currentId: string | undefined,
  otherIds: string[],
): T | undefined {
  const alternatives = eligible.filter((recipe) => recipe.id !== currentId);
  return unusedRecipes(alternatives, otherIds)[0] ?? alternatives[0];
}
