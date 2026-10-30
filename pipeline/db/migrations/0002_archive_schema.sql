-- 0002: move the archive out of `public` into its own schema, and shut the hosted API out of it.
--
-- Why: on Supabase, `public` is published automatically through the REST/GraphQL API to the
-- `anon` and `authenticated` roles, whose key ships in any web client. Tables there are safe
-- only while row-level security is on and no policy is wrong. A schema the API does not expose,
-- with those roles revoked and RLS on as a second wall, does not depend on getting that right.
-- Locally (no such roles) the DO block below is a no-op; the move itself applies everywhere.

CREATE SCHEMA archive;
ALTER TABLE sites SET SCHEMA archive;
ALTER TABLE site_images SET SCHEMA archive;
ALTER FUNCTION touch() SET SCHEMA archive;

GRANT USAGE ON SCHEMA archive TO shrines_editor, shrines_reader;
-- table grants travel with the tables; restate them so this file reads complete
GRANT SELECT, INSERT, UPDATE, DELETE ON archive.sites, archive.site_images TO shrines_editor;
GRANT SELECT ON archive.sites, archive.site_images TO shrines_reader;

-- Second wall: RLS on, with policies only for our own roles. Any other role sees nothing.
ALTER TABLE archive.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive.site_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY editors_all ON archive.sites TO shrines_editor USING (true) WITH CHECK (true);
CREATE POLICY readers_read ON archive.sites FOR SELECT TO shrines_reader USING (true);
CREATE POLICY editors_all ON archive.site_images TO shrines_editor USING (true) WITH CHECK (true);
CREATE POLICY readers_read ON archive.site_images FOR SELECT TO shrines_reader USING (true);
CREATE POLICY read_history ON audit.change_log FOR SELECT TO shrines_editor, shrines_reader USING (true);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON SCHEMA archive, audit FROM anon, authenticated';
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA archive FROM anon, authenticated';
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA audit FROM anon, authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA archive REVOKE ALL ON TABLES FROM anon, authenticated';
    END IF;
END $$;
