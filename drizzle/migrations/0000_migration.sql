CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  stamps_required int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venues TO authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages venue" ON public.venues FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  stamps int NOT NULL DEFAULT 0,
  rewards_count int NOT NULL DEFAULT 0,
  last_stamp_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads cards" ON public.cards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()));

CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  kind text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads rewards" ON public.rewards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()));

-- Public: venue info by slug
CREATE FUNCTION public.get_venue_public(_slug text)
RETURNS TABLE(name text, stamps_required int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT name, stamps_required FROM public.venues WHERE slug = _slug
$$;

-- Public: customer creates a card
CREATE FUNCTION public.join_venue(_slug text, _name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; t uuid;
BEGIN
  IF length(trim(coalesce(_name,''))) < 1 OR length(_name) > 60 THEN RAISE EXCEPTION 'Nome non valido'; END IF;
  SELECT id INTO v_id FROM public.venues WHERE slug = _slug;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Locale non trovato'; END IF;
  INSERT INTO public.cards(venue_id, customer_name) VALUES (v_id, trim(_name)) RETURNING token INTO t;
  RETURN t;
END $$;

-- Public: read card by secret token
CREATE FUNCTION public.get_card(_token uuid)
RETURNS TABLE(customer_name text, stamps int, rewards_count int, venue_name text, stamps_required int, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.customer_name, c.stamps, c.rewards_count, v.name, v.stamps_required, c.created_at
  FROM public.cards c JOIN public.venues v ON v.id = c.venue_id WHERE c.token = _token
$$;

-- Owner: add a stamp after scanning
CREATE FUNCTION public.add_stamp(_token uuid)
RETURNS TABLE(customer_name text, stamps int, stamps_required int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cards; v public.venues;
BEGIN
  SELECT * INTO c FROM public.cards WHERE token = _token FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Carta non trovata'; END IF;
  SELECT * INTO v FROM public.venues WHERE id = c.venue_id;
  IF v.owner_id <> auth.uid() THEN RAISE EXCEPTION 'Questa carta appartiene a un altro locale'; END IF;
  IF c.stamps >= v.stamps_required THEN RAISE EXCEPTION 'Premio già raggiunto: consegna il premio prima di continuare'; END IF;
  IF c.last_stamp_at IS NOT NULL AND c.last_stamp_at > now() - interval '1 minute' THEN
    RAISE EXCEPTION 'Timbro già registrato meno di un minuto fa'; END IF;
  UPDATE public.cards SET stamps = cards.stamps + 1, last_stamp_at = now() WHERE id = c.id;
  RETURN QUERY SELECT c.customer_name, c.stamps + 1, v.stamps_required;
END $$;

-- Owner: give reward and reset
CREATE FUNCTION public.redeem_reward(_token uuid, _kind text, _description text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cards; v public.venues;
BEGIN
  IF _kind NOT IN ('gift','discount') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
  IF length(trim(coalesce(_description,''))) < 1 THEN RAISE EXCEPTION 'Descrivi il premio'; END IF;
  SELECT * INTO c FROM public.cards WHERE token = _token FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Carta non trovata'; END IF;
  SELECT * INTO v FROM public.venues WHERE id = c.venue_id;
  IF v.owner_id <> auth.uid() THEN RAISE EXCEPTION 'Questa carta appartiene a un altro locale'; END IF;
  IF c.stamps < v.stamps_required THEN RAISE EXCEPTION 'Il cliente non ha ancora raggiunto i timbri necessari'; END IF;
  INSERT INTO public.rewards(card_id, venue_id, kind, description) VALUES (c.id, v.id, _kind, trim(_description));
  UPDATE public.cards SET stamps = 0, rewards_count = rewards_count + 1 WHERE id = c.id;
END $$;

REVOKE ALL ON FUNCTION public.get_venue_public(text), public.join_venue(text,text), public.get_card(uuid), public.add_stamp(uuid), public.redeem_reward(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_venue_public(text), public.join_venue(text,text), public.get_card(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_stamp(uuid), public.redeem_reward(uuid,text,text) TO authenticated;