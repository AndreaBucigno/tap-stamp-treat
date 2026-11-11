import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, Gift, Percent, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StampGrid } from "@/components/StampGrid";
import { cn } from "@/lib/utils";
import { cardToken, rewardDescription } from "@/lib/loyalty";

const QrScanner = lazy(() => import("@/components/QrScanner"));

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scansiona carta — Timbrino" },
      { name: "description", content: "Scansiona la carta del cliente per aggiungere un timbro." },
      { property: "og:title", content: "Scansiona carta — Timbrino" },
      { property: "og:description", content: "Aggiungi timbri alle carte dei clienti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScanPage,
});

type Result = { token: string; name: string; stamps: number; required: number; full: boolean; justStamped: boolean };

function ScanPage() {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => setMounted(true), []);

  async function handle(text: string) {
    if (inFlight.current || result) return;
    const token = cardToken(text);
    if (!token) { toast.error("QR non riconosciuto"); return; }
    setBusy(true);
    inFlight.current = true;
    try {
    const { data, error } = await supabase.rpc("add_stamp", { _token: token });
    if (error) {
      if (error.message.includes("Premio già raggiunto")) {
        const { data: card } = await supabase.rpc("get_card", { _token: token });
        const c = card?.[0];
        if (c) setResult({ token, name: c.customer_name, stamps: c.stamps, required: c.stamps_required, full: true, justStamped: false });
      } else toast.error(error.message);
    } else if (data?.[0]) {
      const r = data[0];
      setResult({ token, name: r.customer_name, stamps: r.stamps, required: r.stamps_required, full: r.stamps >= r.stamps_required, justStamped: true });
    }
    } catch { toast.error("Connessione non disponibile. Riprova."); }
    finally { setBusy(false); inFlight.current = false; }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Torna al locale</Link>
      <h1 className="mt-4 text-3xl font-bold">Scansiona la carta</h1>
      {!result ? (
        <div className="mt-5">
          {mounted && !cameraError && (
            <Suspense fallback={<div className="h-full rounded-3xl bg-muted" />}>
              <QrScanner onScan={handle} paused={busy} onError={() => setCameraError(true)} />
            </Suspense>
          )}
          {cameraError ? <p className="rounded-xl bg-secondary p-4 text-sm">Fotocamera non disponibile. Consenti l’accesso alla fotocamera oppure inserisci il link della carta.</p> : <p className="mt-3 text-center text-sm text-muted-foreground">Inquadra il QR sul telefono del cliente</p>}
          <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); void handle(manual); }}>
            <label htmlFor="card-link" className="text-sm font-medium">Link o codice della carta</label>
            <Input id="card-link" value={manual} onChange={(e) => setManual(e.target.value)} required />
            <Button disabled={busy || !manual.trim()} className="w-full">{busy ? "Registrazione…" : "Aggiungi timbro"}</Button>
          </form>
        </div>
      ) : (
        <ResultView r={result} onDone={() => { setResult(null); setManual(""); }} />
      )}
    </main>
  );
}

function ResultView({ r, onDone }: { r: Result; onDone: () => void }) {
  const [kind, setKind] = useState<"gift" | "discount">("gift");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  async function redeem() {
    const description = rewardDescription(kind, desc);
    if (!description) { toast.error("Inserisci un premio o una percentuale tra 1 e 100."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("redeem_reward", { _token: r.token, _kind: kind, _description: description });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Premio consegnato a ${r.name}!`);
    onDone();
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        {r.justStamped && <p className="flex items-center gap-2 text-sm font-medium text-accent"><Check className="size-4" /> Timbro aggiunto</p>}
        <h2 className="mt-1 text-2xl font-bold">{r.name}</h2>
        <p className="text-muted-foreground">{r.stamps} di {r.required} timbri</p>
        <div className="mt-5"><StampGrid stamps={r.stamps} total={r.required} /></div>
      </div>

      {r.full ? (
        <div className="rounded-3xl loyalty-card p-6">
          <h3 className="text-2xl font-bold">Carta completa! Cosa regali?</h3>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {([["gift", Gift, "Omaggio"], ["discount", Percent, "Sconto %"]] as const).map(([k, Icon, l]) => (
              <Button key={k} type="button" variant="ghost" aria-pressed={kind === k} onClick={() => { setKind(k); setDesc(""); }}
                className={cn("flex items-center justify-center gap-2 rounded-2xl border-2 p-3 font-medium", kind === k ? "border-accent bg-accent text-accent-foreground" : "border-primary-foreground/25")}>
                <Icon className="size-4" /> {l}
              </Button>
            ))}
          </div>
          <Input className="mt-3 bg-card text-card-foreground" value={desc} onChange={(e) => setDesc(e.target.value)}
            type={kind === "discount" ? "number" : "text"} min={1} max={100}
            placeholder={kind === "discount" ? "Percentuale, es. 20" : "Es. Un cappuccino e cornetto"} />
          <Button disabled={busy || !rewardDescription(kind, desc)} onClick={redeem} variant="accent" size="lg" className="mt-4 h-auto min-h-10 w-full whitespace-normal">Consegna premio e azzera carta</Button>
        </div>
      ) : null}

      <Button variant="outline" className="w-full rounded-full" onClick={onDone}>Scansiona un'altra carta</Button>
    </div>
  );
}
