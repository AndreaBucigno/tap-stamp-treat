CREATE OR REPLACE FUNCTION public.add_stamp(_token uuid)
RETURNS TABLE(customer_name text, stamps integer, stamps_required integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cards; v public.venues;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accedi come titolare'; END IF;
  SELECT * INTO c FROM public.cards WHERE token = _token FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Carta non trovata'; END IF;
  SELECT * INTO v FROM public.venues WHERE id = c.venue_id;
  IF v.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Questa carta appartiene a un altro locale'; END IF;
  IF c.stamps >= v.stamps_required THEN RAISE EXCEPTION 'Premio già raggiunto: consegna il premio prima di continuare'; END IF;
  IF c.last_stamp_at IS NOT NULL AND c.last_stamp_at > now() - interval '1 minute' THEN RAISE EXCEPTION 'Timbro già registrato meno di un minuto fa'; END IF;
  UPDATE public.cards SET stamps = cards.stamps + 1, last_stamp_at = now() WHERE id = c.id;
  RETURN QUERY SELECT c.customer_name, c.stamps + 1, v.stamps_required;
END $$;
CREATE OR REPLACE FUNCTION public.redeem_reward(_token uuid, _kind text, _description text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.cards; v public.venues;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accedi come titolare'; END IF;
  IF _kind IS NULL OR _kind NOT IN ('gift','discount') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
  IF length(trim(coalesce(_description,''))) < 1 THEN RAISE EXCEPTION 'Descrivi il premio'; END IF;
  SELECT * INTO c FROM public.cards WHERE token = _token FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Carta non trovata'; END IF;
  SELECT * INTO v FROM public.venues WHERE id = c.venue_id;
  IF v.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Questa carta appartiene a un altro locale'; END IF;
  IF c.stamps < v.stamps_required THEN RAISE EXCEPTION 'Il cliente non ha ancora raggiunto i timbri necessari'; END IF;
  INSERT INTO public.rewards(card_id, venue_id, kind, description) VALUES (c.id, v.id, _kind, trim(_description));
  UPDATE public.cards SET stamps = 0, rewards_count = cards.rewards_count + 1 WHERE id = c.id;
END $$;
REVOKE ALL ON FUNCTION public.add_stamp(uuid), public.redeem_reward(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_stamp(uuid), public.redeem_reward(uuid,text,text) TO authenticated;