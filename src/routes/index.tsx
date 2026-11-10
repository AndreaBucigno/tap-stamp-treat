import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, Gift, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-cafe.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Timbrino — Carte fedeltà digitali per bar" },
      { name: "description", content: "Crea carte fedeltà digitali per i tuoi clienti: 10 timbri via QR code e scegli tu il premio." },
      { property: "og:title", content: "Timbrino — Carte fedeltà digitali per bar" },
      { property: "og:description", content: "10 timbri via QR code, poi un omaggio o uno sconto deciso da te." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen">
      <section className="relative overflow-hidden">
        <img src={heroImg} alt="Bancone di un bar con una tazzina di caffè" width={1280} height={896} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/60 to-background" />
        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-16 text-center">
          <p className="font-display text-2xl text-primary-foreground">Timbrino</p>
          <h1 className="mt-14 text-4xl font-bold leading-tight text-primary-foreground md:text-6xl">
            La carta fedeltà del tuo bar, nel telefono dei clienti.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/85">
            Ogni caffè un timbro. Al decimo, decidi tu: un omaggio o uno sconto.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" variant="accent">
              <Link to="/dashboard">Area titolare</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-4xl gap-5 px-6 pb-20 md:grid-cols-3">
        {[
          { icon: Store, t: "Crea il tuo locale", d: "Ottieni un QR da esporre al bancone: i clienti lo inquadrano e ricevono la carta." },
          { icon: QrCode, t: "Scansiona ad ogni acquisto", d: "Inquadri il QR della carta del cliente e aggiungi un timbro certificato." },
          { icon: Gift, t: "Premia al decimo", d: "Raggiunti i timbri scegli il premio: omaggio o percentuale di sconto." },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-2xl border bg-card p-6 shadow-soft">
            <Icon className="size-7 text-accent" />
            <h3 className="mt-4 text-xl font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
