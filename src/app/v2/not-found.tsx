import Link from "next/link";
export default function NotFound() {
  return (
    <div className="v2-empty">
      <h1>Nu am găsit această idee.</h1>
      <p>Poți alege o altă rețetă din colecție.</p>
      <Link className="v2-button v2-button-primary" href="/v2/idei">
        Descoperă idei
      </Link>
    </div>
  );
}
