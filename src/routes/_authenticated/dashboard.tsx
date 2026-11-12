import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ScanLine, LogOut, Copy, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Il mio locale — Timbrino" },
      { name: "description", content: "Gestisci le carte fedeltà del tuo locale." },
      { property: "og:title", content: "Il mio locale — Timbrino" },
      { property: "og:description", content: "Gestisci le carte fedeltà del tuo locale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  const venueQ = useQuery({
    queryKey: ["venue", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const extraQ = useQuery({
    queryKey: ["role-extra", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [staff, admin] = await Promise.all([
        supabase.rpc("my_staff_venue"),
        supabase.from("user_roles").select("role").eq("role", "admin").maybeSingle(),
      ]);
      if (staff.error) throw staff.error;
      return { staffVenue: staff.data?.[0] ?? null, isAdmin: !!admin.data };
    },
  });

  if (loading || !user || venueQ.isLoading || extraQ.isLoading) return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  if (venueQ.isError) return <div className="p-10 text-center"><p>Impossibile caricare il locale.</p><Button onClick={() => venueQ.refetch()} className="mt-4">Riprova</Button></div>;

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-accent">Timbrino</Link>
        <div className="flex gap-1">
          {extraQ.data?.isAdmin && <Button asChild variant="ghost" size="sm"><Link to="/admin"><Shield /> Admin</Link></Button>}
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut /> Esci</Button>
        </div>
      </header>
      {venueQ.data ? <VenueView venue={venueQ.data} /> : extraQ.data?.staffVenue ? <StaffView name={extraQ.data.staffVenue.name} /> : <CreateVenue userId={user.id} />}
    </main>
  );
}

function CreateVenue({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const slug = `${slugify(name) || "locale"}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("venues").insert({ name: name.trim(), slug, owner_id: userId });
    setBusy(false);
    if (error) { toast.error("Impossibile creare il locale"); return; }
    qc.invalidateQueries({ queryKey: ["venue"] });
  }
  return (
    <form onSubmit={create} className="mt-12 rounded-3xl border bg-card p-7 shadow-soft">
      <h1 className="text-3xl font-bold">Come si chiama il tuo locale?</h1>
      <p className="mt-2 text-muted-foreground">Comparirà sulle carte dei tuoi clienti.</p>
      <Input className="mt-6" required maxLength={60} placeholder="Es. Bar Centrale" value={name} onChange={(e) => setName(e.target.value)} />
      <Button disabled={busy} variant="accent" className="mt-4 w-full" size="lg">Crea locale</Button>
    </form>
  );
}

type Venue = { id: string; name: string; slug: string; stamps_required: number };

function VenueView({ venue }: { venue: Venue }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const joinUrl = `${origin}/join/${venue.slug}`;

  const cardsQ = useQuery({
    queryKey: ["cards", venue.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("id, customer_name, stamps, rewards_count, last_stamp_at").eq("venue_id", venue.id).order("last_stamp_at", { ascending: false, nullsFirst: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });
  const cards = cardsQ.data ?? [];
  const ready = cards.filter((c) => c.stamps >= venue.stamps_required).length;

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold">{venue.name}</h1>
        <p className="mt-1 text-muted-foreground">{venue.stamps_required} timbri per un premio</p>
      </div>

      <Button asChild variant="accent" size="lg" className="h-14 w-full text-base">
        <Link to="/scan"><ScanLine className="!size-5" /> Scansiona carta cliente</Link>
      </Button>

      <div className="grid grid-cols-3 gap-3">
        {[["Clienti", cards.length], ["Premi pronti", ready], ["Premi dati", cards.reduce((a, c) => a + c.rewards_count, 0)]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border bg-card p-4 text-center">
            <div className="font-display text-3xl font-bold">{v}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <h2 className="text-2xl font-semibold">QR da esporre al bancone</h2>
        <p className="mt-1 text-sm text-muted-foreground">I clienti lo inquadrano per ricevere la loro carta fedeltà.</p>
        <div className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
          {origin && <div className="rounded-2xl bg-background p-4"><QRCodeSVG value={joinUrl} size={160} bgColor="transparent" /></div>}
          <div className="w-full min-w-0 flex-1">
            <p className="break-all rounded-xl bg-muted p-3 text-xs">{joinUrl}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success("Link copiato"); }}>
              <Copy /> Copia link
            </Button>
          </div>
        </div>
      </div>

      <StaffManager venueId={venue.id} />

      <div>
        <h2 className="text-2xl font-semibold">Clienti</h2>
        <ul className="mt-3 divide-y rounded-2xl border bg-card">
          {cards.length === 0 && <li className="p-5 text-sm text-muted-foreground">Ancora nessun cliente. Esponi il QR al bancone!</li>}
          {cards.map((c) => (
            <li key={c.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{c.customer_name}</div>
                <div className="text-xs text-muted-foreground">{c.rewards_count} premi ricevuti</div>
              </div>
              <span className={c.stamps >= venue.stamps_required ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground" : "text-sm text-muted-foreground"}>
                {c.stamps >= venue.stamps_required ? "Premio pronto" : `${c.stamps}/${venue.stamps_required}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StaffView({ name }: { name: string }) {
  return (
    <div className="mt-10 space-y-6 text-center">
      <p className="text-sm text-muted-foreground">Collaboratore di</p>
      <h1 className="text-4xl font-bold">{name}</h1>
      <Button asChild variant="accent" size="lg" className="h-14 w-full text-base">
        <Link to="/scan"><ScanLine className="!size-5" /> Scansiona tessera cliente</Link>
      </Button>
    </div>
  );
}

function StaffManager({ venueId }: { venueId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["staff", venueId],
    queryFn: async () => {
      const { data, error } = await supabase.from("venue_staff").select("id, email").eq("venue_id", venueId).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("add_staff", { _email: email });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setEmail("");
    toast.success("Collaboratore aggiunto");
    qc.invalidateQueries({ queryKey: ["staff", venueId] });
  }
  async function remove(id: string) {
    const { error } = await supabase.rpc("remove_staff", { _id: id });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["staff", venueId] });
  }
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-soft">
      <h2 className="text-2xl font-semibold">Collaboratori</h2>
      <p className="mt-1 text-sm text-muted-foreground">Possono solo scansionare le tessere e consegnare i premi. Devono prima registrarsi con la loro email.</p>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <Input type="email" required placeholder="email@esempio.it" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button disabled={busy}>Aggiungi</Button>
      </form>
      <ul className="mt-4 divide-y">
        {(q.data ?? []).map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            {s.email}
            <Button variant="ghost" size="icon" aria-label={`Rimuovi ${s.email}`} onClick={() => remove(s.id)}><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
