import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Gift, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StampGrid } from "@/components/StampGrid";

export const Route = createFileRoute("/card/$token")({
  head: () => ({
    meta: [
      { title: "La mia carta fedeltà — Timbrino" },
      { name: "description", content: "Mostra questa carta al bancone ad ogni acquisto." },
      { property: "og:title", content: "La mia carta fedeltà" },
      { property: "og:description", content: "Mostra il QR al bancone ad ogni acquisto." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CardPage,
});

function CardPage() {
  const { token } = Route.useParams();
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  const q = useQuery({
    queryKey: ["card", token],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_card", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (q.isLoading) return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  if (q.isError) return <div className="p-10 text-center">Impossibile caricare la carta. Controlla la connessione e riapri il link.</div>;
  const c = q.data;
  if (!c) return <div className="p-10 text-center">Carta non trovata.</div>;
  const complete = c.stamps >= c.stamps_required;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col px-5 py-8">
      <div className="loyalty-card rounded-3xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-70">Carta fedeltà</p>
            <h1 className="mt-1 text-2xl font-bold">{c.venue_name}</h1>
          </div>
          <span className="font-display text-3xl font-bold">{c.stamps}<span className="text-base opacity-60">/{c.stamps_required}</span></span>
        </div>
        <div className="mt-6"><StampGrid stamps={c.stamps} total={c.stamps_required} light /></div>
        <p className="mt-5 text-sm opacity-80">{c.customer_name}</p>
      </div>

      {complete && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-accent p-4 text-accent-foreground">
          <Gift className="size-6 shrink-0" />
          <p className="text-sm font-medium">Hai completato la carta! Mostrala al bancone per ricevere il tuo premio.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col items-center rounded-3xl border bg-card p-6 shadow-soft">
        {url && <QRCodeSVG value={url} size={200} bgColor="transparent" fgColor="currentColor" className="text-foreground" />}
        <p className="mt-4 text-center text-sm text-muted-foreground">Mostra questo QR al barista ad ogni acquisto</p>
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
        <Smartphone className="size-5 shrink-0" />
        <p>Salvala sul telefono: tocca <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>.</p>
      </div>
      {c.rewards_count > 0 && <p className="mt-4 text-center text-xs text-muted-foreground">Premi ricevuti finora: {c.rewards_count}</p>}
    </main>
  );
}
