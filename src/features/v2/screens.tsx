"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Clock3,
  Heart,
  Leaf,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  CalendarDays,
  ChevronRight,
  RefreshCw,
  Trash2,
  ShoppingBasket,
  X,
  Bookmark,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { catalog, ingredients, previewCatalog, type Recipe } from "./catalog";
import { initialFilters, recommend, type Filters } from "./recommendations";
import { usePreview } from "./Provider";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  RecipeCard,
  RecipePhoto,
  ReviewNote,
  SaveButton,
} from "./components";
import {
  nextAvailableSlot,
  nextDays,
  weekRange,
  shoppingList,
  swapRecipe,
} from "./planning";
import type { Stage } from "./model";
import { weeklyUsage } from "./analytics";

function useEligible(filters?: Filters) {
  const { state, clinicalGuidance } = usePreview();
  return recommend(
    previewCatalog,
    filters ?? { ...initialFilters, months: state.stage },
    {
      mode: "preview",
      favorites: state.favorites,
      introduced: state.introduced,
      used: state.uses.map((u) => u.recipeId),
      excludedIngredients: [],
      requiresClinicalGuidance: clinicalGuidance,
    },
  );
}
function useDays() {
  const [now] = useState(() => new Date());
  return useMemo(() => nextDays(now), [now]);
}
function StageSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: Stage;
  onChange: (stage: Stage) => void;
  disabled?: boolean;
}) {
  return (
    <div className="v2-stage-options">
      {(
        [
          { value: 0, label: "Încă ne pregătim", age: "Fără sugestii de mese" },
          { value: 6, label: "Primele descoperiri", age: "6–7 luni" },
          { value: 8, label: "Mai multă varietate", age: "8–9 luni" },
          { value: 10, label: "Noi combinații", age: "10–11 luni" },
          { value: 12, label: "La masa familiei", age: "12+ luni" },
        ] as const
      ).map((stage) => (
        <button
          type="button"
          disabled={disabled}
          key={stage.value}
          aria-pressed={value === stage.value}
          onClick={() => onChange(stage.value)}
        >
          <span className="v2-stage-dot">
            {value === stage.value ? <Check size={17} /> : <Leaf size={17} />}
          </span>
          <strong>{stage.label}</strong>
          <small>{stage.age}</small>
        </button>
      ))}
    </div>
  );
}

export function Landing() {
  return (
    <>
      <section className="v2-landing-hero">
        <div className="v2-landing-copy">
          <span className="v2-pill">
            <Leaf size={14} /> Un pic mai simplu, în fiecare zi
          </span>
          <h1>
            Mese mici.
            <br />
            Descoperiri mari.
            <br />
            <em>Mai puține griji.</em>
          </h1>
          <p>
            Tu aduci ingredientele. Noi te ajutăm să găsești idei, să păstrezi
            ce vă place și să faceți loc pentru timp împreună.
          </p>
          <Link className="v2-button v2-button-primary" href="/v2/idei">
            Ce gătim azi? <ArrowRight size={19} />
          </Link>
          <span className="v2-landing-sub">
            Explorează înainte de cont. Fără abonament activat.
          </span>
        </div>
        <div className="v2-landing-visual">
          <Image
            src="/v2/food-soup.webp"
            alt="Bol de supă cremă, fotografie de atmosferă, nu exemplu de servire pentru copil."
            width={1400}
            height={1100}
            priority
            sizes="(max-width: 760px) 100vw, 50vw"
          />
          <div className="v2-floating-note">
            <span className="v2-check-orb">
              <Check size={20} />
            </span>
            <span>
              O idee pentru astăzi.
              <br />
              <strong>Mai mult timp pentru voi.</strong>
            </span>
          </div>
          <span className="v2-photo-caption">Fotografie ilustrativă</span>
        </div>
      </section>
      <section className="v2-steps-strip" aria-label="Cum funcționează">
        <div>
          <span>01</span>
          <h2>Pornești de la ce ai</h2>
          <p>Ingrediente, etapă, puțin timp.</p>
        </div>
        <div>
          <span>02</span>
          <h2>Alegi ce vă place</h2>
          <p>Câteva idei, fără o listă nesfârșită.</p>
        </div>
        <div>
          <span>03</span>
          <h2>Păstrezi pentru altă zi</h2>
          <p>Favoritele voastre devin un plan simplu.</p>
        </div>
      </section>
      <section className="v2-landing-bottom">
        <div>
          <p className="v2-eyebrow">UN RITM CARE VI SE POTRIVEȘTE</p>
          <h2>
            Nu trebuie să planifici tot.
            <br />
            Doar următoarea masă.
          </h2>
          <p>
            Începe cu câteva alegeri. Profilul se completează treptat, iar
            jurnalul rămâne opțional.
          </p>
          <Link className="v2-text-link" href="/v2/onboarding">
            Personalizează explorarea <ArrowRight size={18} />
          </Link>
        </div>
        <div className="v2-mini-plan">
          <span>
            <CalendarDays size={20} /> Micul vostru plan
          </span>
          <div>
            <b>Azi</b>
            <p>O idee nouă de încercat</p>
            <Check size={17} />
          </div>
          <div>
            <b>Mâine</b>
            <p>Un preparat deja îndrăgit</p>
            <Heart size={17} />
          </div>
          <small>Tu alegi ritmul. Noi păstrăm ideile.</small>
        </div>
      </section>
      <ReviewNote />
    </>
  );
}

export function Onboarding() {
  const { ready } = usePreview();
  return ready ? <OnboardingReady /> : <LoadingState />;
}
function OnboardingReady() {
  const { state, dispatch, track } = usePreview();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(state.stage);
  const [selected, setSelected] = useState<string[]>(state.introduced);
  const [step, setStep] = useState(1);
  useEffect(() => {
    track("onboarding_started");
  }, [track]);
  return (
    <div className="v2-onboarding">
      <Link className="v2-back-link" href="/v2">
        <ArrowLeft size={17} /> Înapoi
      </Link>
      <div
        className="v2-step-indicator"
        role="group"
        aria-label={`Pasul ${step} din 2`}
      >
        <span className="is-complete" />
        <span className={step === 2 ? "is-complete" : ""} />
      </div>
      <p className="v2-eyebrow">UN ÎNCEPUT UȘOR · PASUL {step} DIN 2</p>
      <h1>
        {step === 1
          ? "Fiecare descoperire, în ritmul vostru."
          : "Ce ingrediente cunoașteți deja?"}
      </h1>
      <p className="v2-intro">
        {step === 1
          ? "Alege etapa pe care vrei să o explorezi. Nu avem nevoie de nume, data nașterii sau greutate."
          : "Opțional. Le folosim doar pentru ordonarea ideilor demonstrative, fără a presupune toleranța alimentară."}
      </p>
      {step === 1 ? (
        <>
          <StageSelect value={stage} onChange={setStage} />
          <p className="v2-field-note">
            Vârsta singură nu stabilește pregătirea sau siguranța unei mese.
            Personalizarea clinică nu este disponibilă în această versiune.
          </p>
        </>
      ) : (
        <div className="v2-ingredient-cloud">
          {ingredients.map((ingredient) => (
            <button
              key={ingredient.id}
              type="button"
              aria-pressed={selected.includes(ingredient.id)}
              onClick={() =>
                setSelected((old) =>
                  old.includes(ingredient.id)
                    ? old.filter((i) => i !== ingredient.id)
                    : [...old, ingredient.id],
                )
              }
            >
              {selected.includes(ingredient.id) && <Check size={15} />}
              {ingredient.name}
            </button>
          ))}
        </div>
      )}
      <button
        className="v2-button v2-button-primary v2-full-width"
        onClick={() => {
          if (step === 1) {
            setStep(2);
            return;
          }
          dispatch({ type: "onboard", stage, introduced: selected });
          track("onboarding_completed");
          router.push("/v2/azi");
        }}
      >
        {step === 1 ? "Continuă" : "Să descoperim idei"}
        <ArrowRight size={18} />
      </button>
      {step === 2 && (
        <button className="v2-text-button" onClick={() => setStep(1)}>
          Schimbă etapa
        </button>
      )}
      <p className="v2-field-note v2-centered">
        Fără cont real în această versiune. Alegerile sunt salvate doar în acest
        browser.
      </p>
    </div>
  );
}

export function Dashboard() {
  const { state, ready } = usePreview();
  const matches = useEligible();
  const days = useDays();
  if (!ready) return <LoadingState />;
  const today = state.plan.find((p) => p.slot === days[0].key);
  const planned = catalog.find((r) => r.id === today?.recipeId);
  const featured = planned ?? matches[0];
  const saved = catalog.filter((r) => state.favorites.includes(r.id));
  return (
    <>
      <PageHeading
        eyebrow="UN NOU ÎNCEPUT, ÎN FIECARE ZI"
        title="Ce bun pregătim azi?"
        aside={
          <Link className="v2-profile-pill" href="/v2/profil">
            <span>
              <Leaf size={17} />
            </span>
            {state.stage ? `Etapa ${state.stage}+ luni` : "Ne pregătim"}{" "}
            <ChevronRight size={15} />
          </Link>
        }
      >
        O idee simplă pentru masă. Un pic mai mult timp pentru voi.
      </PageHeading>
      <div className="v2-dashboard-primary">
        <div className="v2-featured-area">
          <div className="v2-section-top">
            <h2>
              {planned
                ? "În micul vostru plan"
                : "O idee din biblioteca voastră"}
            </h2>
            <span className="v2-small-label">EXPLORARE DEMO</span>
          </div>
          {featured ? (
            <RecipeCard
              recipe={featured}
              featured
              reason={
                planned
                  ? "Păstrată pentru astăzi"
                  : "O alegere simplă de explorat"
              }
            />
          ) : (
            <EmptyState title="O pauză de la recomandări">
              Pentru nevoi individuale este necesară îndrumarea unui specialist.
            </EmptyState>
          )}
        </div>
        <div className="v2-quick-finder">
          <span className="v2-round-icon">
            <Search size={25} strokeWidth={1.4} />
          </span>
          <p className="v2-eyebrow">DIN CE AI DEJA ACASĂ</p>
          <h2>
            Un morcov,
            <br />
            puțin timp,
            <br />
            <em>o idee bună.</em>
          </h2>
          <p>
            Spune-ne ce ingrediente ai. Găsim opțiuni pe care le poți explora.
          </p>
          <Link className="v2-button v2-button-primary" href="/v2/idei">
            Găsește o idee <ArrowRight size={17} />
          </Link>
        </div>
      </div>
      <section className="v2-saved-section">
        <div className="v2-section-top">
          <div>
            <p className="v2-eyebrow">BUNE DE PĂSTRAT APROAPE</p>
            <h2>Idei pentru altă zi</h2>
          </div>
          <Link href="/v2/idei?salvate=1" className="v2-text-link">
            Vezi salvatele <ArrowRight size={16} />
          </Link>
        </div>
        {saved.length ? (
          <div className="v2-recipe-grid v2-recipe-grid-small">
            {saved.slice(0, 3).map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        ) : (
          <div className="v2-inline-empty">
            <Bookmark size={22} />
            <p>
              Ai găsit ceva pe placul vostru?
              <br />
              <strong>Salvează ideea și revino când ai nevoie.</strong>
            </p>
            <Link href="/v2/idei" className="v2-text-link">
              Explorează <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <Link className="v2-journal-banner" href="/v2/jurnal">
        <span className="v2-round-icon">
          <Heart size={22} />
        </span>
        <div>
          <h3>Ce a funcționat pentru voi?</h3>
          <p>O confirmare e suficientă. Fără jurnal obligatoriu.</p>
        </div>
        <ArrowRight size={21} />
      </Link>
      <ReviewNote />
    </>
  );
}

export function Discover() {
  const { ready } = usePreview();
  return ready ? <DiscoverReady /> : <LoadingState />;
}
function DiscoverReady() {
  const { state, ready, track, clinicalGuidance } = usePreview();
  const [filters, setFilters] = useState<Filters>(() => ({
    ...initialFilters,
    months: state.stage,
    favoritesOnly:
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("salvate") === "1",
  }));
  const [showMore, setShowMore] = useState(false);
  const started = useRef<number | null>(null);
  const firstChoice = useRef(false);
  useEffect(() => {
    started.current = performance.now();
  }, []);
  const options = useEligible(filters);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((old) => ({ ...old, [key]: value }));
  useEffect(() => {
    if (ready) track("recommendation_results_shown", { count: options.length });
  }, [ready, options.length, track]);
  const choose = useCallback(
    (recipe: Recipe) => {
      if (!firstChoice.current) {
        const now = performance.now();
        track("first_relevant_choice", {
          recipeId: recipe.id,
          elapsedMs: Math.max(0, now - (started.current ?? now)),
        });
        firstChoice.current = true;
      }
    },
    [track],
  );
  if (!ready) return <LoadingState />;
  return (
    <>
      <PageHeading
        eyebrow="PUȚINE INGREDIENTE. MULTE POSIBILITĂȚI."
        title="Ce gătim azi?"
      >
        Pornește de la ce ai. Alege ceva care vi se potrivește.
      </PageHeading>
      <div className="v2-discover-layout">
        <aside className="v2-filter-panel" aria-label="Filtre de rețete">
          <div className="v2-filter-title">
            <SlidersHorizontal size={18} />
            <h2>Pe gustul vostru</h2>
            <button
              className="v2-text-button"
              onClick={() =>
                setFilters({ ...initialFilters, months: state.stage })
              }
            >
              Resetează
            </button>
          </div>
          <label htmlFor="v2-search">Cauți ceva anume?</label>
          <div className="v2-search-field">
            <Search size={17} />
            <input
              id="v2-search"
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="Rețetă sau ingredient"
              autoComplete="off"
            />
          </div>
          <label htmlFor="v2-stage">Etapa din catalog</label>
          <select
            id="v2-stage"
            value={filters.months}
            onChange={(e) => set("months", Number(e.target.value))}
          >
            <option value={0}>Pregătire · fără sugestii</option>
            <option value={6}>Primele descoperiri · 6–7 luni</option>
            <option value={8}>Mai multă varietate · 8–9 luni</option>
            <option value={10}>Noi combinații · 10–11 luni</option>
            <option value={12}>La masa familiei · 12+ luni</option>
          </select>
          <fieldset>
            <legend>Cât timp ai?</legend>
            <div className="v2-segmented">
              {[15, 30, 60].map((n) => (
                <button
                  key={n}
                  aria-pressed={filters.maxMinutes === n}
                  onClick={() => set("maxMinutes", n)}
                >
                  {n} min
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Ce ai la îndemână?</legend>
            <p className="v2-field-note">
              Căutăm cel puțin un ingredient selectat.
            </p>
            <div className="v2-ingredient-cloud">
              {ingredients.map((ingredient) => (
                <button
                  key={ingredient.id}
                  aria-pressed={filters.ingredientIds.includes(ingredient.id)}
                  onClick={() =>
                    set(
                      "ingredientIds",
                      filters.ingredientIds.includes(ingredient.id)
                        ? filters.ingredientIds.filter(
                            (i) => i !== ingredient.id,
                          )
                        : [...filters.ingredientIds, ingredient.id],
                    )
                  }
                >
                  {filters.ingredientIds.includes(ingredient.id) ? (
                    <Check size={14} />
                  ) : (
                    <Plus size={14} />
                  )}
                  {ingredient.name}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="v2-meal">Momentul mesei</label>
          <select
            id="v2-meal"
            value={filters.meal}
            onChange={(e) => set("meal", e.target.value)}
          >
            <option value="all">Orice moment</option>
            <option value="mic-dejun">Mic dejun</option>
            <option value="pranz">Prânz</option>
            <option value="cina">Cină</option>
            <option value="gustare">Gustare</option>
          </select>
          <label className="v2-checkbox-row">
            <input
              type="checkbox"
              checked={filters.favoritesOnly}
              onChange={(e) => set("favoritesOnly", e.target.checked)}
            />
            <Bookmark size={16} />
            Doar ideile salvate
          </label>
        </aside>
        <section
          className="v2-discover-results"
          aria-label="Rezultatele căutării"
        >
          <div className="v2-section-top">
            <h2 aria-live="polite">{options.length} idei de explorat</h2>
            <span className="v2-small-label">DIN CATALOGUL EXISTENT</span>
          </div>
          {clinicalGuidance ? (
            <EmptyState title="Aici e nevoie de îndrumare individuală">
              Această versiune nu personalizează mese pentru alergii sau alte
              nevoi medicale. Discută cu specialistul care cunoaște copilul.
            </EmptyState>
          ) : options.length ? (
            <>
              <div className="v2-recipe-grid">
                {options.slice(0, showMore ? 48 : 6).map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    reason={
                      filters.ingredientIds.length
                        ? "Include un ingredient ales de tine"
                        : "Se încadrează în timpul ales"
                    }
                    onSelect={() => choose(r)}
                  />
                ))}
              </div>
              {options.length > 6 && !showMore && (
                <button
                  className="v2-button v2-button-secondary v2-show-more"
                  onClick={() => setShowMore(true)}
                >
                  Mai multe idei <Plus size={16} />
                </button>
              )}
            </>
          ) : (
            <EmptyState title="Nu am găsit o combinație deocamdată">
              Încearcă mai mult timp sau un alt ingredient. Restricțiile de
              siguranță nu se relaxează automat.
              <button
                className="v2-button v2-button-secondary"
                onClick={() =>
                  setFilters({ ...initialFilters, months: state.stage })
                }
              >
                Resetează filtrele
              </button>
            </EmptyState>
          )}
          <ReviewNote />
        </section>
      </div>
    </>
  );
}

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const { state, ready, dispatch, announce, track, clinicalGuidance, cloud } =
    usePreview();
  const days = useDays();
  const [checked, setChecked] = useState<number[]>([]);
  const [step, setStep] = useState(0);
  const [cookMode, setCookMode] = useState(false);
  if (!ready) return <LoadingState />;
  const alreadyConfirmed = state.uses.some(
    (u) => u.recipeId === recipe.id && u.day === days[0].key,
  );
  function addToPlan() {
    const slot = nextAvailableSlot(state.plan, days);
    if (!slot) {
      announce(
        "Planul pentru următoarele 7 zile este complet. Poți înlocui o masă din Plan.",
      );
      return;
    }
    dispatch({ type: "plan", slot, recipeId: recipe.id });
    track("plan_slot_saved", { recipeId: recipe.id });
    announce("Ideea a fost adăugată în planul tău.");
  }
  function confirm() {
    if (alreadyConfirmed) return;
    const reused = state.uses.some((u) => u.recipeId === recipe.id);
    dispatch({
      type: "confirm",
      use: {
        id: `${days[0].key}:${recipe.id}`,
        recipeId: recipe.id,
        day: days[0].key,
        confirmedAt: new Date().toISOString(),
      },
    });
    track("meal_confirmed", { recipeId: recipe.id });
    if (reused) track("meal_reused", { recipeId: recipe.id });
    announce("Ai păstrat ce a funcționat. Mulțumim!");
  }
  return (
    <>
      <Link className="v2-back-link" href="/v2/idei">
        <ArrowLeft size={17} /> Înapoi la idei
      </Link>
      <div className="v2-detail-hero">
        <RecipePhoto recipe={recipe} priority />
        <div className="v2-detail-heading">
          <p className="v2-eyebrow">DIN BIBLIOTECA DIVERSIBEBE</p>
          <h1>{recipe.name}</h1>
          <p className="v2-intro">
            O idee de păstrat aproape pentru zilele în care ai nevoie de
            inspirație.
          </p>
          <div className="v2-recipe-facts">
            <span>
              <Clock3 size={18} />
              {recipe.minutes} min
            </span>
            <span>
              <Leaf size={18} />
              {recipe.difficulty}
            </span>
            <span>Etichetă catalog: {recipe.age}</span>
          </div>
          <div className="v2-action-row">
            <SaveButton recipe={recipe} />
            <button
              className="v2-button v2-button-primary"
              onClick={addToPlan}
              disabled={state.stage === 0 || clinicalGuidance || cloud.saving || cloud.loading || (cloud.connected && !cloud.selectedBabyId)}
            >
              <CalendarDays size={18} />
              Adaugă în plan
            </button>
          </div>
          <p className="v2-field-note">
            Explorare locală. Eticheta de vârstă nu confirmă potrivirea sau
            siguranța.
          </p>
        </div>
      </div>
      <ReviewNote />
      <div className="v2-detail-content">
        <section className="v2-ingredients-panel">
          <h2>Ce îți trebuie</h2>
          <p className="v2-field-note">
            Cantitățile sunt cele din catalogul existent, în curs de verificare.
          </p>
          <ul>
            {recipe.ingredients.map((ingredient, i) => (
              <li key={i}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked.includes(i)}
                    onChange={() =>
                      setChecked((old) =>
                        old.includes(i)
                          ? old.filter((v) => v !== i)
                          : [...old, i],
                      )
                    }
                  />
                  <span>{ingredient}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="v2-allergen-note">
            <strong>Alergeni declarați în catalog</strong>
            <p>
              {recipe.allergens.length
                ? recipe.allergens.join(", ")
                : "Niciunul declarat. Aceasta nu confirmă absența alergenilor."}
            </p>
            <small>
              Nu folosi această listă pentru gestionarea unei alergii
              diagnosticate.
            </small>
          </div>
        </section>
        <section className="v2-steps-panel">
          <div className="v2-section-top">
            <h2>Pas cu pas, fără grabă</h2>
            <button
              className="v2-text-button"
              aria-pressed={cookMode}
              onClick={() => setCookMode((value) => !value)}
            >
              {cookMode ? "Toți pașii" : "Un pas pe ecran"}
            </button>
          </div>
          {cookMode ? (
            <div className="v2-cook-step">
              <span className="v2-eyebrow">
                PASUL {step + 1} DIN {recipe.steps.length}
              </span>
              <p>{recipe.steps[step]}</p>
              <div className="v2-action-row">
                <button
                  className="v2-button v2-button-secondary"
                  disabled={step === 0}
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ArrowLeft size={17} />
                  Înapoi
                </button>
                <button
                  className="v2-button v2-button-primary"
                  disabled={step === recipe.steps.length - 1}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Următorul
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          ) : (
            <ol className="v2-recipe-steps">
              {recipe.steps.map((text, i) => (
                <li key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          )}
          <details className="v2-recipe-info">
            <summary>
              Servire, păstrare și revizie <Plus size={17} />
            </summary>
            <p>
              <strong>Servire:</strong> indicațiile din rețetă nu au încă o
              revizie de specialitate documentată. Nu deducem forma sigură de
              servire din fotografie sau vârstă.
            </p>
            <p>
              <strong>Păstrare, text din catalog:</strong> {recipe.storage}
            </p>
            <p>
              <strong>Sursă:</strong> biblioteca DiversiBebe. Autor specialist
              și dată de revizie: neînregistrate.
            </p>
            <p>
              <a
                href="https://www.nhs.uk/baby/weaning-and-feeding/"
                target="_blank"
                rel="noreferrer"
              >
                Resurse generale NHS despre diversificare{" "}
                <ArrowRight size={14} />
              </a>
            </p>
          </details>
        </section>
      </div>
      <section className="v2-confirm-panel">
        <span className="v2-round-icon">
          <Heart size={26} />
        </span>
        <div>
          <h2>
            {alreadyConfirmed
              ? "Păstrat în ce a funcționat."
              : "Ai folosit această idee?"}
          </h2>
          <p>O confirmare opțională. Fără cantități sau note medicale.</p>
        </div>
        <button
          className="v2-button v2-button-primary"
          disabled={state.stage === 0 || alreadyConfirmed || clinicalGuidance || cloud.saving || cloud.loading || (cloud.connected && !cloud.selectedBabyId)}
          onClick={confirm}
        >
          {alreadyConfirmed ? <CheckCircle2 size={18} /> : <Check size={18} />}
          {alreadyConfirmed ? "Confirmată azi" : "Am folosit ideea"}
        </button>
      </section>
    </>
  );
}

export function Planner() {
  const { state, ready, dispatch, announce, track, cloud } = usePreview();
  const eligible = useEligible();
  const days = useDays();
  const [tab, setTab] = useState<"plan" | "shopping">("plan");
  const activePlan = state.plan
    .filter((p) => days.some((d) => d.key === p.slot))
    .sort((a, b) => a.slot.localeCompare(b.slot));
  const list = shoppingList(activePlan, catalog, state.pantry);
  if (!ready) return <LoadingState />;
  const add = (slot: string) => {
    const candidate = swapRecipe(eligible, state.plan, slot);
    if (!candidate) {
      announce("Nu există o altă idee eligibilă cu filtrele curente.");
      return;
    }
    dispatch({ type: "plan", slot, recipeId: candidate.id });
    track("plan_slot_saved", { recipeId: candidate.id });
    announce("Planul a fost actualizat.");
  };
  return (
    <>
      <PageHeading
        eyebrow="UN PIC DE ORGANIZARE. MAI MULTĂ LINIȘTE."
        title="Micul vostru plan"
      >
        Nu trebuie să umpli săptămâna. Începe cu trei mese și schimbă-le
        oricând.
      </PageHeading>
      <div className="v2-planner-toolbar">
        <div className="v2-tabs" role="group" aria-label="Vizualizare plan">
          <button aria-pressed={tab === "plan"} onClick={() => setTab("plan")}>
            <CalendarDays size={17} />
            Mesele mele
          </button>
          <button
            aria-pressed={tab === "shopping"}
            onClick={() => setTab("shopping")}
          >
            <ShoppingBasket size={17} />
            De cumpărat{list.length > 0 && <span>{list.length}</span>}
          </button>
        </div>
        <Link href="/v2/idei" className="v2-text-link">
          <Plus size={17} />
          Adaugă o idee
        </Link>
      </div>
      {tab === "plan" ? (
        <div className="v2-plan-layout">
          <section className="v2-plan-days">
            {days.map((day, i) => {
              const entry = activePlan.find((p) => p.slot === day.key);
              const recipe = catalog.find((r) => r.id === entry?.recipeId);
              return (
                <article
                  className={`v2-plan-day ${i === 0 ? "is-today" : ""}`}
                  key={day.key}
                >
                  <div className="v2-day-label">
                    <span>{i === 0 ? "Azi" : day.label}</span>
                    <strong>{day.number}</strong>
                  </div>
                  {recipe ? (
                    <>
                      <Link
                        className="v2-plan-recipe"
                        href={`/v2/retete/${recipe.id}`}
                      >
                        <Image
                          src={recipe.image}
                          alt=""
                          width={100}
                          height={100}
                        />
                        <div>
                          <h2>{recipe.name}</h2>
                          <span>
                            <Clock3 size={13} />
                            {recipe.minutes} min · în curs de revizie
                          </span>
                        </div>
                      </Link>
                      <div className="v2-plan-actions">
                        <button
                          className="v2-icon-button"
                          aria-label={`Înlocuiește masa pentru ${day.label} ${day.number}`}
                          disabled={cloud.saving}
                          onClick={() => add(day.key)}
                        >
                          <RefreshCw size={17} />
                        </button>
                        <button
                          className="v2-icon-button"
                          aria-label={`Elimină masa pentru ${day.label} ${day.number}`}
                          disabled={cloud.saving}
                          onClick={() => {
                            dispatch({ type: "remove-plan", slot: day.key });
                            announce("Masa a fost eliminată din plan.");
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="v2-plan-add"
                      disabled={cloud.saving}
                      onClick={() => add(day.key)}
                    >
                      <Plus size={19} />
                      <span>
                        {i < 3
                          ? "Alege o idee pentru această zi"
                          : "Lasă loc pentru spontaneitate"}
                      </span>
                    </button>
                  )}
                </article>
              );
            })}
          </section>
          <aside className="v2-plan-note">
            <Leaf size={27} strokeWidth={1.5} />
            <h2>Un plan care se schimbă odată cu ziua.</h2>
            <p>
              Păstrează ce vă place, înlocuiește ce nu se potrivește. Nu e
              nevoie să completezi fiecare zi.
            </p>
            <div className="v2-plan-total">
              <strong>{activePlan.length}</strong>
              <span>
                idei păstrate
                <br />
                pentru următoarele 7 zile
              </span>
            </div>
            <button
              className="v2-button v2-button-secondary"
              onClick={() => setTab("shopping")}
            >
              Vezi ce lipsește
              <ArrowRight size={17} />
            </button>
          </aside>
        </div>
      ) : (
        <section className="v2-shopping-panel">
          <div className="v2-section-top">
            <h2>Doar ce îți lipsește</h2>
            <span>
              {list.filter((r) => state.shoppingChecked.includes(r.key)).length}
              /{list.length} bifate
            </span>
          </div>
          <p className="v2-field-note">
            Lista păstrează cantitățile originale. Pentru ingrediente repetate,
            verifică necesarul fiecărei rețete; nu facem conversii sau însumări
            aproximative.
          </p>
          {list.length ? (
            <ul className="v2-shopping-list">
              {list.map((row) => (
                <li key={row.key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={state.shoppingChecked.includes(row.key)}
                      disabled={cloud.saving}
                      onChange={() =>
                        dispatch({ type: "shopping", key: row.key })
                      }
                    />
                    <span>
                      <strong>{row.label}</strong>
                      <small>
                        {row.recipes.length > 1
                          ? `Apare în ${row.recipes.length} mese · verifică totalul`
                          : row.recipes[0]}
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Lista începe cu o idee">
              Adaugă o masă în plan pentru a vedea ingredientele.
              <Link className="v2-button v2-button-primary" href="/v2/idei">
                Descoperă idei
                <ArrowRight size={17} />
              </Link>
            </EmptyState>
          )}
        </section>
      )}
      <ReviewNote />
    </>
  );
}

export function Journal() {
  const { state, ready, dispatch, announce } = usePreview();
  const days = useDays();
  if (!ready) return <LoadingState />;
  const week = weekRange(new Date(`${days[0].key}T12:00:00Z`));
  const progress = weeklyUsage(state.uses, week.start, week.end);
  return (
    <>
      <PageHeading
        eyebrow="FĂRĂ PERFECȚIUNE. DOAR CE VĂ ESTE UTIL."
        title="Ce a funcționat pentru voi"
      >
        Păstrează mesele la care vrei să revii. Confirmarea este întotdeauna
        opțională.
      </PageHeading>
      {state.uses.length ? (
        <>
          <div className="v2-progress-note">
            <Heart size={23} />
            <p>
              <strong>
                {state.uses.length}{" "}
                {state.uses.length === 1
                  ? "idee confirmată"
                  : "idei confirmate"}{" "}
                în această explorare.
              </strong>{" "}
              Fiecare alegere utilă merită păstrată.
            </p>
            <span>{progress.days} zile cu confirmări în această săptămână</span>
          </div>
          <div className="v2-journal-list">
            {[...state.uses].reverse().map((use) => {
              const r = catalog.find((recipe) => recipe.id === use.recipeId);
              if (!r) return null;
              return (
                <article key={use.id}>
                  <span className="v2-journal-check">
                    <Check size={18} />
                  </span>
                  <div>
                    <span className="v2-small-label">
                      {use.source === "legacy" || use.source === "local_import" ? "Din istoricul anterior · " : "Confirmare opțională · "}
                      {new Intl.DateTimeFormat("ro-RO", {
                        day: "numeric",
                        month: "long",
                      }).format(new Date(`${use.day}T12:00:00`))}
                    </span>
                    <h2>{r.name}</h2>
                    <Link className="v2-text-link" href={`/v2/retete/${r.id}`}>
                      Refolosește ideea
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                  <button
                    className="v2-icon-button"
                    aria-label={`Anulează confirmarea pentru ${r.name}`}
                    onClick={() => {
                      dispatch({ type: "remove-use", id: use.id });
                      announce("Confirmarea a fost anulată.");
                    }}
                  >
                    <X size={18} />
                  </button>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyState title="Bunele idei se întorc la masă">
          Când folosești o rețetă, o poți confirma direct din pagină. O vei găsi
          aici, pentru altă zi.
          <Link className="v2-button v2-button-primary" href="/v2/idei">
            Găsește prima idee
            <ArrowRight size={17} />
          </Link>
        </EmptyState>
      )}
    </>
  );
}

export function Profile() {
  const {
    state,
    ready,
    dispatch,
    announce,
    cloud,
    clinicalGuidance,
    setClinicalGuidance,
  } = usePreview();
  const [resetConfirm, setResetConfirm] = useState(false);
  if (!ready) return <LoadingState />;
  return (
    <>
      <PageHeading
        eyebrow="PUȚINE DETALII, DOAR CE ESTE UTIL"
        title="În ritmul vostru"
      >
        Poți schimba oricând etapa pe care o explorezi.
      </PageHeading>
      <div className="v2-profile-grid">
        <section className="v2-profile-section">
          <h2>Etapa din catalog</h2>
          <StageSelect
            value={state.stage}
            disabled={cloud.saving}
            onChange={(stage) => {
              dispatch({
                type: "onboard",
                stage,
                introduced: state.introduced,
              });
              announce("Etapa de explorare a fost actualizată.");
            }}
          />
          <p className="v2-field-note">
            Nu cerem numele copilului, data nașterii, greutatea sau diagnostice.
          </p>
          <h2>Ingrediente deja cunoscute</h2>
          <p>Influențează ordinea, fără să confirme toleranța.</p>
          <div className="v2-ingredient-cloud">
            {ingredients.map((i) => (
              <button
                aria-pressed={state.introduced.includes(i.id)}
                disabled={cloud.saving}
                key={i.id}
                onClick={() =>
                  dispatch({
                    type: "onboard",
                    stage: state.stage,
                    introduced: state.introduced.includes(i.id)
                      ? state.introduced.filter((v) => v !== i.id)
                      : [...state.introduced, i.id],
                  })
                }
              >
                {state.introduced.includes(i.id) && <Check size={14} />}
                {i.name}
              </button>
            ))}
          </div>
          <div className="v2-allergen-note">
            <h3>Ai nevoie de adaptare medicală?</h3>
            <p>
              Versiunea demonstrativă nu personalizează mese pentru alergii
              diagnosticate sau alte nevoi medicale.
            </p>
            <label className="v2-checkbox-row">
              <input
                type="checkbox"
                checked={clinicalGuidance}
                disabled={cloud.requiresClinicalGuidance}
                onChange={(e) => setClinicalGuidance(e.target.checked)}
              />
              Oprește sugestiile personalizate în această sesiune
            </label>
            <small>
              Această alegere nu este salvată și nu intră în analytics.
            </small>
          </div>
        </section>
        <aside>
          <section className="v2-profile-section" id="date">
            <ShieldCheck size={26} />
            <h2>Un spațiu de test, cu date minime.</h2>
            <p>
              {cloud.connected
                ? "Etapa, alimentele, planul și confirmările sunt păstrate pentru copilul selectat în baza de test. Favoritele sunt comune familiei. Datele se pot încărca pe un alt dispozitiv după conectare."
                : "Favoritele, etapa și planul sunt păstrate doar în browserul curent, separat de conturile reale. Nu se sincronizează între dispozitive."}
            </p>
            <p>
              {cloud.connected
                ? "Folosești un cont sintetic de test. Parola nu este păstrată în aplicație. Evenimentele folosirii nu includ nume, diagnostice sau identificatori ai copilului."
                : "Explorarea fără cont nu cere email sau parolă și nu trimite evenimente în afara dispozitivului."}
            </p>
            {cloud.connected ? (
              <Link className="v2-text-link" href="/v2/cont">
                Gestionează contul de test
                <ArrowRight size={16} />
              </Link>
            ) : resetConfirm ? (
              <div className="v2-reset-confirm">
                <p>
                  Vei șterge doar alegerile din această versiune demonstrativă.
                </p>
                <button
                  className="v2-button v2-button-secondary"
                  onClick={() => {
                    dispatch({ type: "reset" });
                    setResetConfirm(false);
                    announce("Datele demonstrative au fost șterse.");
                  }}
                >
                  Șterge datele demo
                </button>
                <button
                  className="v2-text-button"
                  onClick={() => setResetConfirm(false)}
                >
                  Păstrează datele
                </button>
              </div>
            ) : (
              <button
                className="v2-text-button v2-danger-text"
                onClick={() => setResetConfirm(true)}
              >
                <Trash2 size={16} />
                Resetează explorarea
              </button>
            )}
          </section>
          <Link className="v2-profile-plus" href="/v2/premium">
            <Sparkles size={24} />
            <h2>Mai mult timp, mai puține liste.</h2>
            <p>Vezi ce pregătim pentru DiversiBebe Plus.</p>
            <ArrowRight size={20} />
          </Link>
        </aside>
      </div>
      <details className="v2-diagnostics">
        <summary>Evenimente locale de verificare · sesiunea curentă</summary>
        <p>
          Exclusiv pentru verificarea implementării. Nu sunt trimise și nu sunt
          păstrate după reîncărcare. Alegerea unei rețete este o măsură de
          interacțiune, nu dovada că a fost utilă sau consumată.
        </p>
        <ul>
          {state.events.slice(-20).map((event) => (
            <li key={event.id}>
              <code>{event.name}</code>
              <span>
                {Object.keys(event.properties).join(", ") || "fără proprietăți"}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}

export function Premium() {
  const { track, announce, cloud } = usePreview();
  const [interested, setInterested] = useState(false);
  const [packInterested, setPackInterested] = useState(false);
  return (
    <div className="v2-premium">
      <span className="v2-premium-symbol">
        <Sparkles size={32} strokeWidth={1.4} />
      </span>
      <p className="v2-eyebrow">DIVERSIBEBE PLUS · ÎN PREGĂTIRE</p>
      <h1>
        Mai puține liste.
        <br />
        <em>Mai mult timp pentru voi.</em>
      </h1>
      <p className="v2-intro">
        Rețetele și informațiile esențiale de siguranță rămân gratuite. Plus va
        adăuga organizare pentru zilele pline.
      </p>
      <div className="v2-premium-benefits">
        <div>
          <CalendarDays size={24} />
          <h2>Un plan pentru săptămână</h2>
          <p>Reutilizezi ce a mers și adaptezi rapid ce urmează.</p>
        </div>
        <div>
          <ShoppingBasket size={24} />
          <h2>Cumpărături, mai simplu</h2>
          <p>O listă care pornește de la mesele alese de tine.</p>
        </div>
        <div>
          <Heart size={24} />
          <h2>Preferințe care contează</h2>
          <p>Mai puține căutări, mai multe dintre ideile voastre preferate.</p>
        </div>
      </div>
      <div className="v2-premium-offer">
        <span>IPOTEZĂ DE PREȚ · NEVALIDATĂ</span>
        <p>
          <strong>25 lei</strong> / lună
        </p>
        <small>
          Interval de test: 19–29 lei. Fără plăți și fără abonament activ.
        </small>
        <button
          className="v2-button v2-button-primary"
          disabled={interested}
          onClick={() => {
            setInterested(true);
            track("premium_interest", { price: 25 });
            announce(
              cloud.connected ? "Interesul a fost înregistrat în contul de test. Nu ai activat un abonament." : "Interesul este notat doar în sesiunea locală. Nu ai activat un abonament.",
            );
          }}
        >
          {interested ? (
            <>
              <Check size={18} />
              Interes notat în sesiune
            </>
          ) : (
            <>
              Mi-ar fi util
              <Sparkles size={18} />
            </>
          )}
        </button>
      </div>
      <section className="v2-premium-offer">
        <span>PACHET DIGITAL PROPUS · ÎN PREGĂTIRE</span>
        <h2>O săptămână mai ușor de organizat</h2>
        <p><strong>69 lei</strong> / pachet</p>
        <small>Ipoteză în intervalul 49–79 lei: planificatoare și liste reutilizabile. Conținutul și prețul nu sunt încă validate; produsul nu poate fi cumpărat.</small>
        <button className="v2-button v2-button-secondary" disabled={packInterested} onClick={() => {
          setPackInterested(true);
          track("premium_interest", { price: 69 });
          announce("Interes notat pentru pachet. Nu ai făcut o achiziție.");
        }}>{packInterested ? "Interes notat pentru pachet" : "Mă interesează pachetul"}</button>
      </section>
      <section className="v2-profile-section">
        <h2>Ce rămâne gratuit</h2>
        <p>Catalogul, salvarea ideilor, planul actual și confirmarea opțională a meselor rămân disponibile în această versiune.</p>
        <h2>Ce propunem pentru Plus</h2>
        <p>Planuri reutilizabile pentru mai multe săptămâni, exporturi și instrumente suplimentare de organizare. Sunt propuneri de produs, încă neimplementate.</p>
      </section>
      <p className="v2-field-note">
        Aceasta este o prezentare de concept. Funcțiile existente nu sunt
        limitate comercial.
      </p>
    </div>
  );
}

export function DesignSystem() {
  return (
    <>
      <PageHeading
        eyebrow="DIVERSIBEBE / SISTEM VIZUAL"
        title="Cald. Clar. La îndemână."
      >
        O identitate originală pentru mese mici și zile pline.
      </PageHeading>
      <section className="v2-design-section">
        <h2>Paleta de bază</h2>
        <div className="v2-color-grid">
          {[
            { name: "Crem de ovăz", color: "#FAF7F2", ink: "#302B27" },
            { name: "Caisă coaptă", color: "#A14B2D", ink: "#FFFFFF" },
            { name: "Verde salvie", color: "#3C5548", ink: "#FFFFFF" },
            { name: "Fistic pal", color: "#E9EDDF", ink: "#302B27" },
            { name: "Cacao", color: "#302B27", ink: "#FFFFFF" },
          ].map((c) => (
            <div style={{ background: c.color, color: c.ink }} key={c.name}>
              <strong>{c.name}</strong>
              <code>{c.color}</code>
            </div>
          ))}
        </div>
      </section>
      <section className="v2-design-section">
        <h2>Tipografie și ritm</h2>
        <h3 className="v2-design-display">Mese mici, momente mari.</h3>
        <p>
          DM Sans pentru interfață, Georgia pentru titluri editoriale. Scară de
          spațiere: 4, 8, 12, 16, 24, 32, 48, 64 px. Text de bază: 16 px; text
          secundar: minimum 12 px.
        </p>
      </section>
      <section className="v2-design-section">
        <h2>Acțiuni și feedback</h2>
        <div className="v2-action-row">
          <Link className="v2-button v2-button-primary" href="/v2/idei">
            Găsește o idee
            <ArrowRight size={18} />
          </Link>
          <Link className="v2-button v2-button-secondary" href="/v2/plan">
            <CalendarDays size={18} />
            Planul meu
          </Link>
          <button className="v2-button v2-button-secondary" disabled>
            Indisponibil
          </button>
        </div>
        <p>
          Acțiuni tactile de minimum 44 px, focus vizibil, contrast verificabil,
          mesaje de confirmare anunțate și reducerea mișcării la preferința
          sistemului.
        </p>
      </section>
      <section className="v2-design-section">
        <h2>Stări de interfață</h2>
        <LoadingState />
        <EmptyState title="Nicio idee salvată încă">
          O stare goală explică următorul pas, fără vină sau presiune.
        </EmptyState>
        <div className="v2-alert" role="alert">
          Exemplu de eroare: salvarea nu este disponibilă. Modificările rămân în
          sesiunea curentă.
        </div>
      </section>
    </>
  );
}
