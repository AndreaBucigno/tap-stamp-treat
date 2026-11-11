import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/join/$slug")({
  head: () => ({
    meta: [
      { title: "Ricevi la tua carta fedeltà — Timbrino" },
      { name: "description", content: "Ottieni la carta fedeltà digitale del locale." },
      { property: "og:title", content: "Ricevi la tua carta fedeltà" },
      { property: "og:description", content: "Raccogli timbri e ottieni premi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`timbrino:${slug}`);
    if (saved) navigate({ to: "/card/$token", params: { token: saved }, replace: true });
  }, [slug, navigate]);

  const venueQ = useQuery({
    queryKey: ["venue-public", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_venue_public", { _slug: slug });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("join_venue", { _slug: slug, _name: name });
    setBusy(false);
    if (error || !data) { toast.error(error?.message ?? "Errore"); return; }
    try { localStorage.setItem(`timbrino:${slug}`, data); } catch { /* The card remains usable when storage is disabled. */ }
    navigate({ to: "/card/$token", params: { token: data } });
  }

  if (venueQ.isLoading) return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  if (venueQ.isError) return <div className="p-10 text-center">Impossibile caricare il locale. Controlla la connessione e riapri il link.</div>;
  if (!venueQ.data) return <div className="p-10 text-center">Locale non trovato.</div>;

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <form onSubmit={join} className="w-full max-w-sm">
        <div className="loyalty-card rounded-3xl p-7">
          <p className="text-sm opacity-75">Carta fedeltà</p>
          <h1 className="mt-1 text-3xl font-bold">{venueQ.data.name}</h1>
          <p className="mt-6 opacity-85">Raccogli {venueQ.data.stamps_required} timbri e ricevi un premio dal locale.</p>
        </div>
        <label className="mt-8 block text-sm font-medium">Il tuo nome</label>
        <Input className="mt-2" required maxLength={60} placeholder="Es. Giulia" value={name} onChange={(e) => setName(e.target.value)} />
        <Button disabled={busy} variant="accent" size="lg" className="mt-4 w-full">Ottieni la mia carta</Button>
      </form>
    </main>
  );
}
