CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.venue_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venue_id, user_id)
);
GRANT SELECT ON public.venue_staff TO authenticated;
GRANT ALL ON public.venue_staff TO service_role;
ALTER TABLE public.venue_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or self reads staff" ON public.venue_staff FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_id AND v.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.can_operate(_venue uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.venues WHERE id = _venue AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.venue_staff WHERE venue_id = _venue AND user_id = auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.my_staff_venue()
RETURNS TABLE(id uuid, name text, stamps_required integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.name, v.stamps_required FROM public.venue_staff s JOIN public.venues v ON v.id = s.venue_id
  WHERE s.user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.add_staff(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.venues; u uuid;
BEGIN
  SELECT * INTO v FROM public.venues WHERE owner_id = auth.uid();
  IF auth.uid() IS NULL OR v.id IS NULL THEN RAISE EXCEPTION 'Solo il titolare può aggiungere collaboratori'; END IF;
  SELECT au.id INTO u FROM auth.users au WHERE lower(au.email) = lower(trim(_email));
  IF u IS NULL THEN RAISE EXCEPTION 'Nessun account con questa email: il collaboratore deve prima registrarsi'; END IF;
  IF u = auth.uid() THEN RAISE EXCEPTION 'Sei già il titolare'; END IF;
  IF EXISTS (SELECT 1 FROM public.venues WHERE owner_id = u) THEN RAISE EXCEPTION 'Questo account è titolare di un altro locale'; END IF;
  IF EXISTS (SELECT 1 FROM public.venue_staff WHERE user_id = u) THEN RAISE EXCEPTION 'Questo account collabora già con un locale'; END IF;
  INSERT INTO public.venue_staff(venue_id, user_id, email) VALUES (v.id, u, lower(trim(_email)));
END $$;

CREATE OR REPLACE FUNCTION public.remove_staff(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accedi'; END IF;
  DELETE FROM public.venue_staff s USING public.venues v
  WHERE s.id = _id AND v.id = s.venue_id AND v.owner_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.add_stamp(_token uuid)
 RETURNS TABLE(customer_name text, stamps integer, stamps_required integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.cards; v public.venues;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accedi come titolare'; END IF;
  SELECT * INTO c FROM public.cards WHERE token = _token FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Carta non trovata'; END IF;
  SELECT * INTO v FROM public.venues WHERE id = c.venue_id;
  IF NOT public.can_operate(v.id) THEN RAISE EXCEPTION 'Questa carta appartiene a un altro locale'; END IF;
  IF c.stamps >= v.stamps_required THEN RAISE EXCEPTION 'Premio già raggiunto: consegna il premio prima di continuare'; END IF;
  IF c.last_stamp_at IS NOT NULL AND c.last_stamp_at > now() - interval '1 minute' THEN RAISE EXCEPTION 'Timbro già registrato meno di un minuto fa'; END IF;
  UPDATE public.cards SET stamps = cards.stamps + 1, last_stamp_at = now() WHERE id = c.id;
  RETURN QUERY SELECT c.customer_name, c.stamps + 1, v.stamps_required;
END $function$;

CREATE OR REPLACE FUNCTION public.redeem_reward(_token uuid, _kind text, _description text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE c public.cards; v public.venues;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accedi come titolare'; END IF;
  IF _kind IS NULL OR _kind NOT IN ('gift','discount') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
  IF length(trim(coalesce(_description,''))) < 1 THEN RAISE EXCEPTION 'Descrivi il premio'; END IF;
  SELECT * INTO c FROM public.cards WHERE token = _token FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Carta non trovata'; END IF;
  SELECT * INTO v FROM public.venues WHERE id = c.venue_id;
  IF NOT public.can_operate(v.id) THEN RAISE EXCEPTION 'Questa carta appartiene a un altro locale'; END IF;
  IF c.stamps < v.stamps_required THEN RAISE EXCEPTION 'Il cliente non ha ancora raggiunto i timbri necessari'; END IF;
  INSERT INTO public.rewards(card_id, venue_id, kind, description) VALUES (c.id, v.id, _kind, trim(_description));
  UPDATE public.cards SET stamps = 0, rewards_count = cards.rewards_count + 1 WHERE id = c.id;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_venues()
RETURNS TABLE(id uuid, name text, owner_email text, created_at timestamptz, cards_count bigint, stamps_total bigint, rewards_total bigint, staff_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accesso riservato'; END IF;
  RETURN QUERY SELECT v.id, v.name, au.email::text, v.created_at,
    (SELECT count(*) FROM public.cards c WHERE c.venue_id = v.id),
    (SELECT coalesce(sum(c.stamps),0)::bigint FROM public.cards c WHERE c.venue_id = v.id),
    (SELECT count(*) FROM public.rewards r WHERE r.venue_id = v.id),
    (SELECT count(*) FROM public.venue_staff s WHERE s.venue_id = v.id)
  FROM public.venues v LEFT JOIN auth.users au ON au.id = v.owner_id ORDER BY v.created_at DESC;
END $$;

REVOKE ALL ON FUNCTION public.can_operate(uuid), public.my_staff_venue(), public.add_staff(text), public.remove_staff(uuid), public.admin_venues(), public.add_stamp(uuid), public.redeem_reward(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_operate(uuid), public.my_staff_venue(), public.add_staff(text), public.remove_staff(uuid), public.admin_venues(), public.add_stamp(uuid), public.redeem_reward(uuid,text,text) TO authenticated;

INSERT INTO public.user_roles(user_id, role) VALUES ('93151ad6-f763-496e-8c1a-46fbc4f603b6','admin');