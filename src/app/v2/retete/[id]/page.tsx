import { notFound } from "next/navigation";
import { findVisibleRecipe, publishedCatalog } from "@/features/v2/catalog";
import { RecipeDetail } from "@/features/v2/screens";
// Legacy ids may arrive percent-encoded (V1 favorite "omletă-legume-8" → alias "omleta-legume-8").
const safeDecode = (id: string) => { try { return decodeURIComponent(id); } catch { return id; } };
// Recipes have no request-time data: prerendered at build, the full page is in the first HTML response
// (no streamed segment that a client update can orphan). Other ids (legacy aliases) still render on demand.
export function generateStaticParams() {
  return publishedCatalog.map((recipe) => ({ id: recipe.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = findVisibleRecipe(safeDecode(id));
  return { title: recipe ? recipe.name : "Rețetă indisponibilă", alternates: { canonical: `/v2/retete/${encodeURIComponent(id)}` }, robots: { index: false, follow: false } };
}
export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = findVisibleRecipe(safeDecode(id));
  if (!recipe) notFound();
  return <RecipeDetail recipe={recipe} />;
}
