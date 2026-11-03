import { notFound } from "next/navigation";
import { findVisibleRecipe } from "@/features/v2/catalog";
import { RecipeDetail } from "@/features/v2/screens";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = findVisibleRecipe(id);
  return { title: recipe ? recipe.name : "Rețetă indisponibilă", alternates: { canonical: `/v2/retete/${encodeURIComponent(id)}` }, robots: { index: false, follow: false } };
}
export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = findVisibleRecipe(id);
  if (!recipe) notFound();
  return <RecipeDetail recipe={recipe} />;
}
