import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Check, Gift, QrCode, ShieldCheck, Store, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroImg from "@/assets/hero-shop.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Timbrino — Carte fedeltà digitali per attività locali" },
      { name: "description", content: "Tessere fedeltà con QR code per barbieri, parrucchieri, bar, ristoranti e negozi. 9,90 € al mese." },
      { property: "og:title", content: "Timbrino — Premia i tuoi clienti, in modo semplice" },
      { property: "og:description", content: "La tessera fedeltà digitale per qualsiasi attività locale: timbri via QR e premi decisi da te." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const perks = [
  { icon: Zap, t: "Attivazione immediata", d: "Inizia in pochi minuti" },
  { icon: BarChart3, t: "Dashboard completa", d: "Monitora la tua attività" },
  { icon: Gift, t: "Premi personalizzabili", d: "Premia come vuoi tu" },
  { icon: ShieldCheck, t: "Sicurezza garantita", d: "Dati protetti e affidabili" },
];
const steps = [
  { icon: Store, t: "Crea la tua attività", d: "Registrati e ottieni il QR da esporre alla cassa." },
  { icon: Smartphone, t: "I tuoi clienti", d: "Inquadrano il QR e ricevono la tessera sul telefono." },
  { icon: QrCode, t: "Registra le visite", d: "Scansioni la tessera e aggiungi un timbro." },
  { icon: Gift, t: "Premia la fedeltà", d: "Al traguardo scegli tu: omaggio o sconto." },
];
const features = ["Clienti illimitati", "Premi configurabili", "Storico timbri", "Nessuna app da scaricare", "Funziona con ogni telefono", "Nessun costo per scansione"];
const plan = ["Tessere digitali per i clienti", "Timbri tramite QR", "Premi configurabili", "Dashboard dedicata", "Nessun costo per scansione", "Assistenza inclusa"];
const faqs: [string, string][] = [
  ["I clienti devono scaricare un'app?", "No. La tessera si apre dal browser del telefono e si può salvare sulla schermata Home in un tocco."],
  ["Funziona per la mia attività?", "Sì: barbieri, parrucchieri, centri estetici, bar, ristoranti e negozi. Ogni visita o acquisto vale un timbro."],
  ["Ci sono costi per ogni cliente?", "No. Il piano è unico: clienti e scansioni illimitati a 9,90 € al mese."],
  ["Posso disdire il servizio?", "Sì, in qualsiasi momento, senza vincoli."],
];

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="leading-tight">
            <span className="block font-display text-2xl font-bold text-foreground">Timbrino</span>
            <span className="block text-xs text-muted-foreground">Fidelizzazione digitale</span>
          </Link>
          <nav className="hidden gap-8 text-sm font-medium text-foreground md:flex">
            <a href="#funzionalita">Funzionalità</a>
            <a href="#prezzi">Prezzi</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Button asChild size="sm"><Link to="/dashboard">Inizia ora <ArrowRight /></Link></Button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img src={heroImg} alt="Cassa di un negozio con espositore QR" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
        <div className="relative mx-auto max-w-6xl px-6 pb-36 pt-36 md:pt-44">
          <h1 className="max-w-xl text-5xl font-bold leading-[1.05] text-foreground md:text-6xl">
            Premia i tuoi clienti, in modo <span className="text-accent">semplice.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-foreground/80">
            Timbrino è la tessera fedeltà digitale per barbieri, parrucchieri, bar, ristoranti, negozi e molto altro.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 px-7 text-base"><Link to="/dashboard">Inizia ora <ArrowRight /></Link></Button>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-16 max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-y-6 rounded-3xl border bg-card p-6 shadow-soft md:grid-cols-4 md:divide-x">
          {perks.map(({ icon: Icon, t, d }) => (
            <div key={t} className="px-3 text-center">
              <Icon className="mx-auto size-7 text-accent" />
              <p className="mt-2 font-semibold">{t}</p>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="come-funziona" className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-4xl font-bold">Come funziona?</h2>
        <p className="mt-2 text-accent">In pochi passaggi, la fidelizzazione è alla portata di tutti.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {steps.map(({ icon: Icon, t, d }, i) => (
            <div key={t} className="relative rounded-3xl bg-secondary p-6 pt-10">
              <span className="absolute -top-4 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{i + 1}</span>
              <Icon className="mx-auto size-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="funzionalita" className="bg-secondary/60">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold leading-tight">Un'esperienza digitale, su misura per la tua attività.</h2>
            <p className="mt-4 text-muted-foreground">Gestisci le tessere, segui i tuoi clienti e decidi i premi, tutto da un unico pannello.</p>
            <ul className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="size-4 text-accent" />{f}</li>)}
            </ul>
          </div>
          <div className="loyalty-card mx-auto w-full max-w-xs rounded-3xl p-6">
            <p className="text-xs uppercase tracking-widest opacity-70">Tessera fedeltà</p>
            <p className="mt-1 text-2xl font-bold">La tua attività</p>
            <div className="mt-6 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={`aspect-square rounded-full border-2 border-current ${i < 9 ? "bg-stamp" : "opacity-40"}`} />
              ))}
            </div>
            <p className="mt-5 rounded-xl bg-background/90 p-3 text-center text-sm font-medium text-foreground">Manca solo 1 timbro per il tuo premio!</p>
          </div>
        </div>
      </section>

      <section id="prezzi" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-8 rounded-3xl border bg-card p-8 shadow-soft md:grid-cols-[1fr_auto_1.4fr_auto]">
          <div>
            <h2 className="text-3xl font-bold leading-tight">Semplice. Trasparente. Senza sorprese.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tutto quello che serve per far crescere la fedeltà dei tuoi clienti.</p>
          </div>
          <div className="text-center">
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase text-accent">Piano unico</span>
            <p className="mt-3 font-display text-5xl font-bold">9,90 €<span className="text-lg font-normal text-muted-foreground"> / mese</span></p>
            <p className="mt-1 text-sm text-muted-foreground">oppure <b className="text-foreground">99 € / anno</b> · 2 mesi gratis</p>
          </div>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {plan.map((f) => <li key={f} className="flex items-center gap-2"><Check className="size-4 text-accent" />{f}</li>)}
          </ul>
          <Button asChild size="lg"><Link to="/dashboard">Inizia ora <ArrowRight /></Link></Button>
        </div>
      </section>

      <section id="faq" className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold">Domande frequenti</h2>
          <p className="mt-2 text-muted-foreground">Hai un dubbio? Qui trovi le risposte alle domande più comuni.</p>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q} className="rounded-2xl border bg-card px-5">
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <div>
            <p className="font-display text-2xl font-bold">Timbrino</p>
            <p className="text-sm opacity-75">Fidelizzazione digitale</p>
          </div>
          <p className="text-sm opacity-75">© {new Date().getFullYear()} Timbrino</p>
        </div>
      </footer>
    </main>
  );
}
