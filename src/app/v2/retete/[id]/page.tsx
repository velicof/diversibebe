import { notFound } from "next/navigation";
import { catalog } from "@/features/v2/catalog";
import { RecipeDetail } from "@/features/v2/screens";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = catalog.find(r => r.id === id && r.automaticReview.status === "no-automatic-issues");
  return { title: recipe ? recipe.name : "Rețetă indisponibilă", alternates: { canonical: `/v2/retete/${encodeURIComponent(id)}` }, robots: { index: false, follow: false } };
}
export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = catalog.find((r) => r.id === id);
  if (!recipe || recipe.automaticReview.status !== "no-automatic-issues")
    notFound();
  return <RecipeDetail recipe={recipe} />;
}
