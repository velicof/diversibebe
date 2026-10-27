"use client";
export default function Error({ retry }: { retry: () => void }) {
  return (
    <div className="v2-empty" role="alert">
      <h1>Ideile tale sunt încă aici.</h1>
      <p>Pagina nu s-a încărcat. Încearcă din nou.</p>
      <button className="v2-button v2-button-primary" onClick={retry}>
        Reîncearcă
      </button>
    </div>
  );
}
