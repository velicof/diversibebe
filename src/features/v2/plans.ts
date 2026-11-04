// What is free and what Plus would add. Nothing is gated today: no payments exist, and this list only
// drives the comparison on /v2/premium. Food-safety information must stay free in every version
// (tests/monetization.test.cjs).
export type PlanFeature = { id: string; label: string; note: string; safety?: boolean };

export const FREE_FEATURES: PlanFeature[] = [
  { id: "library", label: "Biblioteca de rețete, căutare și filtre", note: "Disponibile acum" },
  { id: "allergens", label: "Alergeni, formă de servire și regulile pe etape", note: "Mereu gratuite", safety: true },
  { id: "safety-guides", label: "Resurse despre pregătire și siguranță", note: "Fără cont și fără plată", safety: true },
  { id: "favorites", label: "Salvarea ideilor și revenirea la ele", note: "Disponibilă acum" },
  { id: "planner", label: "Planul pe 5 zile și lista de cumpărături", note: "Gratuite cât timp testăm" },
];

export const PLUS_FEATURES: PlanFeature[] = [
  { id: "reusable-plans", label: "Planuri reutilizabile pentru mai multe săptămâni", note: "Încă neimplementate" },
  { id: "exports", label: "Exporturi și organizare extinsă", note: "Încă neimplementate" },
  { id: "shared-list", label: "Listă de cumpărături partajată în familie", note: "Ipoteză de validat" },
];

/** Monthly prices tested on /v2/premium. 0 means "I would not pay". Recorded as premium_interest.price. */
export const PRICE_OPTIONS = [19, 24, 29, 0] as const;
