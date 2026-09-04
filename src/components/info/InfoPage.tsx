import Link from "next/link";
import type { ReactNode } from "react";

type InfoPageProps = {
  title: string;
  eyebrow?: string;
  intro: string;
  updatedAt?: string;
  children: ReactNode;
};

export default function InfoPage({
  title,
  eyebrow = "Información de Altavera",
  intro,
  updatedAt,
  children,
}: InfoPageProps) {
  return (
    <main className="info-page">
      <section className="info-hero">
        <div className="container info-hero-inner">
          <nav className="info-breadcrumb" aria-label="Navegación secundaria">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">›</span>
            <span>{title}</span>
          </nav>
          <span className="info-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="info-intro">{intro}</p>
          {updatedAt ? (
            <p className="info-updated">Última actualización: {updatedAt}</p>
          ) : null}
        </div>
      </section>

      <div className="container info-content-wrap">
        <article className="info-card">{children}</article>
      </div>
    </main>
  );
}
