import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Pannello amministratore — Timbrino" },
      { name: "description", content: "Gestione di tutte le attività registrate su Timbrino." },
      { property: "og:title", content: "Pannello amministratore — Timbrino" },
      { property: "og:description", content: "Gestione di tutte le attività registrate." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const q = useQuery({
    queryKey: ["admin-venues"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_venues");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (q.isLoading) return <div className="p-10 text-center text-muted-foreground">Caricamento…</div>;
  if (q.isError) return <div className="p-10 text-center">Accesso riservato all'amministratore.</div>;
  const v = q.data!;
  const sum = (k: "cards_count" | "stamps_total" | "rewards_total") => v.reduce((a, x) => a + Number(x[k]), 0);
  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Torna al pannello</Link>
      <h1 className="mt-4 text-4xl font-bold">Tutte le attività</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["Attività", v.length], ["Clienti", sum("cards_count")], ["Timbri attivi", sum("stamps_total")], ["Premi dati", sum("rewards_total")]] as const).map(([l, n]) => (
          <div key={l} className="rounded-2xl border bg-card p-4 text-center">
            <div className="font-display text-3xl font-bold">{n}</div>
            <div className="text-xs text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr><th className="p-3">Attività</th><th className="p-3">Titolare</th><th className="p-3">Clienti</th><th className="p-3">Premi</th><th className="p-3">Collab.</th><th className="p-3">Iscritta</th></tr>
          </thead>
          <tbody className="divide-y">
            {v.map((x) => (
              <tr key={x.id}>
                <td className="p-3 font-medium">{x.name}</td><td className="p-3">{x.owner_email}</td>
                <td className="p-3">{x.cards_count}</td><td className="p-3">{x.rewards_total}</td><td className="p-3">{x.staff_count}</td>
                <td className="p-3">{new Date(x.created_at).toLocaleDateString("it-IT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
