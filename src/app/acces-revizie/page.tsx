import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acces revizie",
  robots: { index: false, follow: false },
};

export default async function ReviewAccessPage({ searchParams }: { searchParams: Promise<{ eroare?: string }> }) {
  const { eroare } = await searchParams;
  return (
    <main style={{ maxWidth: 420, margin: "12vh auto", padding: "0 16px", fontFamily: "system-ui, sans-serif", color: "#1f2937" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>DiversiBebe 2.0 — revizie de specialitate</h1>
      <p style={{ lineHeight: 1.6, color: "#4b5563" }}>
        Introdu codul de revizie primit de la echipa DiversiBebe. Pagina arată doar rețetele, fără date despre familii.
      </p>
      <form method="post" action="/api/v2-review-access" style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <label htmlFor="code" style={{ fontWeight: 600 }}>Cod de revizie</label>
        <input id="code" name="code" required autoComplete="off" autoCapitalize="characters" minLength={8} maxLength={64}
          aria-describedby={eroare ? "code-error" : undefined}
          style={{ padding: "12px 14px", fontSize: 16, borderRadius: 12, border: "1px solid #d1d5db" }} />
        {eroare && <p id="code-error" role="alert" style={{ color: "#a33a1f", margin: 0 }}>Codul nu este valid. Verifică-l și încearcă din nou.</p>}
        <button type="submit" style={{ padding: "12px 14px", fontSize: 16, borderRadius: 12, border: 0, background: "#a64b2a", color: "#fff", fontWeight: 600 }}>
          Deschide biblioteca de revizie
        </button>
      </form>
    </main>
  );
}
