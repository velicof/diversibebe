"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  ChefHat,
  Heart,
  Home,
  Leaf,
  Search,
  Sparkles,
  UserRound,
  Clock3,
  ArrowUpRight,
} from "lucide-react";
import { contentMode, type Recipe } from "./catalog";
import { photoUrl } from "./content/photos";
import { accountCopy, reviewCopy } from "./content/copy";
import { usePreview } from "./Provider";
import { SyncStatus } from "./cloud/SyncStatus";
import { GuestImportPrompt } from "./cloud/GuestImportPrompt";
import { GrowthTelemetry } from "./growth/Telemetry";

export const navItems = [
  { href: "/v2/azi", label: "Azi", icon: Home },
  { href: "/v2/idei", label: "Descoperă", icon: Search },
  { href: "/v2/plan", label: "Planul meu", icon: CalendarDays },
  { href: "/v2/profil", label: "Profil", icon: UserRound },
];
export function Brand() {
  return (
    <Link
      className="v2-brand"
      href="/v2"
      prefetch={false}
      aria-label="DiversiBebe, pagina de început"
    >
      <span className="v2-brand-mark">
        <Leaf size={21} strokeWidth={1.8} />
      </span>
      <span>
        diversi<span>bebe</span>
        <i>mese mici, momente mari</i>
      </span>
    </Link>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { storageError, cloud } = usePreview();
  const landing = pathname === "/v2";
  const marketing = landing || pathname === "/v2/onboarding" || pathname === "/v2/pregatire";
  return (
    <div className={`v2-shell ${landing ? "v2-shell-landing" : ""} ${marketing ? "v2-shell-marketing" : ""}`}>
      <a className="v2-skip" href="#v2-content">
        Sari la conținut
      </a>
      <aside className="v2-sidebar">
        <Brand />
        <span className="v2-side-label">SPAȚIUL TĂU DE ZI CU ZI</span>
        <nav aria-label="Navigare principală">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              <Icon size={21} />
              {label}
            </Link>
          ))}
          <Link
            href="/v2/jurnal"
            aria-current={pathname === "/v2/jurnal" ? "page" : undefined}
          >
            <Heart size={21} />
            Ce a funcționat
          </Link>
        </nav>
        <div className="v2-sidebar-note">
          <Sparkles size={22} />
          <p>
            Mai puțin timp căutând.
            <br />
            Mai mult timp împreună.
          </p>
          <Link href="/v2/premium">
            Descoperă Plus <ArrowUpRight size={15} />
          </Link>
        </div>
        <Link className="v2-side-design" href="/v2/design">
          Ghidul vizual
        </Link>
      </aside>
      <div className="v2-main-wrap">
        <header className="v2-topbar">
          <div className="v2-mobile-brand">
            <Brand />
          </div>
          <span className="v2-top-context">
            <span className="v2-status-dot" />
            Un pic de inspirație pentru fiecare zi
          </span>
          <Link href="/v2/premium" className="v2-plus-link" prefetch={false}>
            <Sparkles size={16} /> DiversiBebe Plus
          </Link>
        </header>
        {contentMode === "preview" && (
          <div className="v2-preview-note">
            <span>VERSIUNE DE TEST</span>{" "}
            {cloud.connected
              ? "Mediu local izolat. Datele sunt salvate în mediul de test."
              : "Mediu local izolat. Datele demo rămân pe acest dispozitiv."}
          </div>
        )}
        {(!marketing || cloud.connected) && <SyncStatus />}
        <GuestImportPrompt />
        <GrowthTelemetry />
        {storageError && (
          <div className="v2-alert" role="alert">
            Salvarea pe dispozitiv nu este disponibilă. Poți continua în această
            sesiune; modificările se pot pierde la reîncărcare.
          </div>
        )}
        <main id="v2-content" className="v2-main">
          {children}
        </main>
        <footer className="v2-footer">
          <span>DiversiBebe · Cu grijă pentru mesele voastre</span>
          <Link href="/v2/profil#date" prefetch={false}>Datele acestei versiuni</Link>
          <a
            href="https://www.nhs.uk/baby/weaning-and-feeding/babys-first-solid-foods/"
            target="_blank"
            rel="noreferrer"
          >
            Resurse despre diversificare
          </a>
        </footer>
      </div>
      {!marketing && (
        <nav className="v2-bottom-nav" aria-label="Navigare mobilă">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              <Icon size={22} strokeWidth={1.7} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="v2-page-heading">
      <div>
        <p className="v2-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="v2-intro">{children}</p>}
      </div>
      {aside}
    </div>
  );
}
export function ReviewNote() {
  return (
    <div className="v2-review-note">
      <Leaf size={18} />
      <p>
        <strong>La masă, cu informații clare.</strong> {reviewCopy.footer}
      </p>
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="v2-skeleton-group" aria-label="Se încarcă" role="status">
      <div className="v2-skeleton v2-skeleton-title" />
      <div className="v2-skeleton v2-skeleton-hero" />
      <div className="v2-skeleton v2-skeleton-line" />
      <span className="v2-sr-only">Se încarcă ideile tale…</span>
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="v2-empty">
      <span>
        <ChefHat size={32} strokeWidth={1.5} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function RecipePhoto({
  recipe,
  priority = false,
  className = "",
  sizes = "(max-width: 600px) 90vw, 45vw",
}: {
  recipe: Recipe;
  priority?: boolean;
  className?: string;
  /** Rendered width hint for the responsive variants; cards pass their own (smaller) slot. */
  sizes?: string;
}) {
  const photo = recipe.photo;
  if (photo)
    return (
      <div className={`v2-photo ${className}`}>
        {/* Pre-generated responsive WebP (scripts/photo-import.cjs): no runtime image optimization cost. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl(photo, 800)}
          srcSet={photo.widths.map((w) => `${photoUrl(photo, w)} ${w}w`).join(", ")}
          sizes={sizes}
          width={photo.width}
          height={photo.height}
          alt={photo.alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
        <span className="v2-photo-caption">{!photo.approved ? "Imagine generată · candidat, neaprobat" : photo.aiGenerated ? "Imagine generată, cu rol ilustrativ" : "Fotografie"}</span>
      </div>
    );
  if (recipe.image.endsWith("icon.svg"))
    return (
      <div className={`v2-photo v2-photo-fallback v2-fallback-${recipe.mealType} ${className}`}>
        <span className="v2-fallback-emoji" aria-hidden="true">{recipe.emoji}</span>
        <span className="v2-ingredient-description">{recipe.relatedFoods.slice(0, 3).map((id) => id.replaceAll("-", " ")).join(" · ") || "O idee din bibliotecă"}</span>
        <span className="v2-photo-caption">Fotografie în pregătire</span>
      </div>
    );
  return (
    <div className={`v2-photo ${className}`}>
      <Image
        src={recipe.image}
        alt={recipe.image.endsWith("icon.svg") ? "" : recipe.image.includes("/generated-") ? `Ilustrație generată pentru ${recipe.name}, fără rol de ghid de servire.` : "Fotografie de textură, ilustrativă; nu indică ingredientele exacte sau forma de servire pentru copil."}
        width={1000}
        height={800}
        priority={priority}
        sizes="(max-width: 600px) 90vw, 45vw"
      />
      {recipe.image.endsWith("icon.svg") && <span className="v2-ingredient-description">{recipe.relatedFoods.slice(0,3).map((id) => id.replaceAll("-", " ")).join(" · ") || "O idee din catalog"}</span>}
      <span className="v2-photo-caption">{recipe.image.includes("/generated-") ? "Ilustrație generată · demo" : recipe.image.endsWith("icon.svg") ? "Prezentare de catalog" : "Textură ilustrativă"}</span>
    </div>
  );
}
/** A visitor's choices live only here: say so where they are saved, with the way to keep them. */
export function DeviceOnlyNote() {
  const { cloud } = usePreview();
  if (cloud.connected || !cloud.available) return null;
  return (
    <p className="v2-device-note">
      Salvat doar pe acest dispozitiv.{" "}
      <Link href="/v2/cont" prefetch={false}>{accountCopy.keepInAccount}</Link>
    </p>
  );
}
export function SaveButton({
  recipe,
  compact = false,
}: {
  recipe: Recipe;
  compact?: boolean;
}) {
  const { state, ready, dispatch, announce, track, cloud } = usePreview();
  const saved = state.favorites.includes(recipe.id);
  return (
    <button
      className={
        compact
          ? "v2-icon-button v2-save-float"
          : "v2-button v2-button-secondary"
      }
      type="button"
      disabled={!ready || cloud.saving || cloud.loading || (cloud.connected && !cloud.selectedBabyId)}
      aria-label={
        saved ? `Elimină ${recipe.name} din salvate` : `Salvează ${recipe.name}`
      }
      aria-pressed={saved}
      onClick={() => {
        dispatch({ type: "favorite", recipeId: recipe.id });
        if (!saved) track("recipe_saved", { recipeId: recipe.id });
        announce(
          saved
            ? "Ideea a fost eliminată din salvate."
            : cloud.available && !cloud.connected
              ? "Gata, ideea e salvată pe acest dispozitiv."
              : "Gata, ideea este în colecția ta.",
        );
      }}
    >
      <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
      {!compact && (saved ? "Salvată" : "Salvează")}
    </button>
  );
}
export function RecipeCard({
  recipe,
  featured = false,
  reason,
  onSelect,
}: {
  recipe: Recipe;
  featured?: boolean;
  reason?: string;
  onSelect?: () => void;
}) {
  return (
    <article
      className={`v2-recipe-card ${featured ? "v2-recipe-featured" : ""}`}
    >
      <div className="v2-card-image">
        <Link
          href={`/v2/retete/${recipe.id}`}
          onClick={onSelect}
          aria-label={`Vezi ${recipe.name}`}
        >
          <RecipePhoto recipe={recipe} priority={featured} sizes={featured ? undefined : "(max-width: 600px) 90vw, (max-width: 1100px) 45vw, 420px"} />
        </Link>
        <SaveButton recipe={recipe} compact />
        <span className="v2-time-badge">
          <Clock3 size={13} />
          {recipe.minutes === null ? "Din timp" : `${recipe.minutes} min`}
        </span>
      </div>
      <div className="v2-recipe-copy">
        <span className="v2-recipe-category">
          {recipe.mealType === "mic-dejun"
            ? "MIC DEJUN"
            : recipe.mealType === "pranz"
              ? "PRÂNZ"
              : recipe.mealType === "cina"
                ? "CINĂ"
                : "GUSTARE"}
        </span>
        <h3>
          {/* Twelve cards would prefetch twelve pages on a phone connection. */}
          <Link href={`/v2/retete/${recipe.id}`} onClick={onSelect} prefetch={false}>
            {recipe.name}
          </Link>
        </h3>
        <p className="v2-card-meta">
          {recipe.age} · {recipe.allergens.length ? recipe.allergens.join(", ") : "fără alergeni majori identificați"}
        </p>
        {reason && (
          <p className="v2-reason">
            <Check size={13} />
            {reason}
          </p>
        )}
        <Link
          href={`/v2/retete/${recipe.id}`}
          className="v2-text-link"
          onClick={onSelect}
        >
          Vezi rețeta <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
