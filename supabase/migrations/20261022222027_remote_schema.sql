CREATE TABLE "public"."gig_history" (
  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "setlist_id"              uuid,
  "played_at"               timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "crowd_vibe"              text,
  "sound_notes"             text,
  "performance_reflections" text,
  CONSTRAINT "gig_history_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."gig_history"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."setlist_items" (
  "id"             uuid    NOT NULL DEFAULT gen_random_uuid(),
  "setlist_id"     uuid,
  "song_id"        uuid,
  "sequence_order" integer NOT NULL,
  "item_type"      text    NOT NULL,
  "custom_label"   text,
  "transposed_key" text,
  "notes"          text,
  CONSTRAINT "setlist_items_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."setlist_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."setlists" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "venue"      text,
  "gig_date"   date,
  "status"     text                     DEFAULT 'draft'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "setlists_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."setlists"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."songs" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "title"             text                     NOT NULL,
  "artist"            text,
  "original_key"      text                     NOT NULL,
  "lyrics_and_chords" text                     NOT NULL,
  "tempo"             integer,
  "time_signature"    text                     DEFAULT '4/4'::text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "songs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."songs"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."gig_history"
  ADD CONSTRAINT "gig_history_setlist_id_fkey" FOREIGN KEY (setlist_id) REFERENCES public.setlists(id) ON DELETE CASCADE;

ALTER TABLE "public"."setlist_items"
  ADD CONSTRAINT "setlist_items_setlist_id_fkey" FOREIGN KEY (setlist_id) REFERENCES public.setlists(id) ON DELETE CASCADE;

ALTER TABLE "public"."setlist_items"
  ADD CONSTRAINT "setlist_items_song_id_fkey" FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE SET NULL;

CREATE POLICY "Enable all access for authenticated users on gig_history" ON "public"."gig_history"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users on setlist_items" ON "public"."setlist_items"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users on setlists" ON "public"."setlists"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can add songs" ON "public"."songs"
  FOR INSERT
  TO "anon", "authenticated"
  WITH CHECK (true);

CREATE POLICY "Anyone can read songs" ON "public"."songs"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gig_history" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."gig_history" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gig_history" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gig_history" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."setlist_items" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."setlist_items" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."setlist_items" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."setlist_items" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."setlists" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."setlists" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."setlists" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."setlists" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."songs" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."songs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."songs" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."songs" TO "service_role";

