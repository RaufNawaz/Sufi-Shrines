-- 0001: the archive's master tables. Replaces the Google Sheet as the source of truth.
-- Applied by pipeline/db/migrate.py as shrines_owner, in one transaction. Never edit an applied
-- migration: the runner stores each file's SHA-256 and refuses to run if one has changed.
--
-- Design (docs/DATABASE.md):
--   * Every sheet column has a home, internal ones included (qa_note, needs_review, flags): this is
--     the master, so nothing may be lost. What the public sees is decided at export, not here.
--   * Text stays text. A value is stored exactly as entered; an empty sheet cell is NULL.
--     Coordinates are unconstrained numeric, which keeps the digits as typed (33.74499 stays 33.74499).
--   * Only the controlled vocabularies in CLAUDE.md's schema are CHECKed. Prose columns
--     (year_built_precision, figure_type, ...) carry qualifying notes and are deliberately free.
--   * Every change to a site or an image is written to audit.change_log by trigger: who, when,
--     the row before and after. The sheet had no history; this is the main thing the move buys.

CREATE TABLE sites (
    id                   text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    sheet_row            integer NOT NULL UNIQUE,          -- the row order the export keeps
    name                 text NOT NULL,
    location             text,
    category             text CHECK (category IN ('Muslim Shrine', 'Hindu Temple', 'Sikh Gurdwara',
                                     'Nanakpanthi / Udasi Darbar', 'Jain Temple', 'Secular / Memorial')),
    site_type            text,
    site_type_note       text,
    status               text CHECK (status IN ('Active', 'Occasional', 'Heritage', 'Ruin', 'Destroyed')),
    status_note          text,
    latitude             numeric CHECK (latitude BETWEEN 23 AND 37.5),
    longitude            numeric CHECK (longitude BETWEEN 60.5 AND 77.9),
    principal_figure     text,
    figure_type          text,
    figure_born          text,
    figure_died          text,
    silsila              text,
    silsila_note         text,
    year_built           text,
    year_built_precision text,
    year_built_note      text,
    event_year           text,
    event_note           text,
    events               text,
    description          text,                             -- markdown; never stripped or normalised
    info_level           text CHECK (info_level IN ('Full', 'Moderate', 'Low')),
    support_level        text CHECK (support_level IN ('Field-verified', 'Source-documented',
                                     'Source-seeded', 'Web-compiled')),
    -- internal: never exported to the public site
    qa_note              text,
    needs_review         text,
    flags                text,
    -- legacy columns, still read as fallbacks by the site (CLAUDE.md, Schema)
    legacy_category      text,
    legacy_founded       text,
    legacy_sufi_saint    text,
    geom                 geometry(Point, 4326) GENERATED ALWAYS AS
                         (ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)) STORED,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    updated_by           text NOT NULL DEFAULT current_user,
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);
CREATE INDEX sites_geom_idx ON sites USING gist (geom);

CREATE TABLE site_images (
    site_id    text NOT NULL REFERENCES sites (id) ON UPDATE CASCADE ON DELETE CASCADE,
    position   smallint NOT NULL CHECK (position BETWEEN 1 AND 16),   -- Image 1 is the lead image
    url        text NOT NULL CHECK (url <> ''),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text NOT NULL DEFAULT current_user,
    PRIMARY KEY (site_id, position)
);

COMMENT ON TABLE sites IS 'The archive. One row per site; the master copy since the move off the Google Sheet.';
COMMENT ON COLUMN sites.sheet_row IS 'Row order as in the sheet; new rows take max+1.';
COMMENT ON COLUMN sites.legacy_category IS 'Sheet column "Category" (legacy; fallback for category)';
COMMENT ON COLUMN sites.legacy_founded IS 'Sheet column "Founded/Opened" (legacy; fallback for year_built)';
COMMENT ON COLUMN sites.legacy_sufi_saint IS 'Sheet column "Sufi Saint" (legacy; fallback for principal_figure)';
COMMENT ON COLUMN sites.description IS 'Markdown. The sheet split long text over Description 2..5 (a 50k-character cell limit); here it is one value, joined by the site''s own rule.';

-- updated_at / updated_by on every write
CREATE FUNCTION touch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    NEW.updated_by := current_user;
    RETURN NEW;
END $$;
CREATE TRIGGER sites_touch BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION touch();
CREATE TRIGGER site_images_touch BEFORE UPDATE ON site_images FOR EACH ROW EXECUTE FUNCTION touch();

-- History. Editors cannot write or alter it directly: the trigger runs as the table owner.
CREATE SCHEMA audit;
CREATE TABLE audit.change_log (
    change_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    changed_by text NOT NULL DEFAULT session_user,
    table_name text NOT NULL,
    row_key    text NOT NULL,
    op         text NOT NULL CHECK (op IN ('INSERT', 'UPDATE', 'DELETE')),
    old_row    jsonb,
    new_row    jsonb,
    txid       bigint NOT NULL DEFAULT txid_current()
);
CREATE INDEX change_log_row_idx ON audit.change_log (table_name, row_key, changed_at);

CREATE FUNCTION audit.log_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
    k text;
BEGIN
    IF TG_TABLE_NAME = 'sites' THEN
        k := COALESCE(NEW.id, OLD.id);
    ELSE
        k := COALESCE(NEW.site_id, OLD.site_id) || '#' || COALESCE(NEW.position, OLD.position);
    END IF;
    INSERT INTO audit.change_log (table_name, row_key, op, old_row, new_row)
    VALUES (TG_TABLE_NAME, k, TG_OP,
            CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - 'geom' END,
            CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - 'geom' END);
    RETURN NULL;
END $$;
CREATE TRIGGER sites_audit AFTER INSERT OR UPDATE OR DELETE ON sites
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();
CREATE TRIGGER site_images_audit AFTER INSERT OR UPDATE OR DELETE ON site_images
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- Privileges. Editors change content; readers (the export) only read; nobody but the owner
-- changes structure or history.
GRANT USAGE ON SCHEMA public TO shrines_editor, shrines_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON sites, site_images TO shrines_editor;
GRANT SELECT ON sites, site_images TO shrines_reader;
GRANT USAGE ON SCHEMA audit TO shrines_editor, shrines_reader;
GRANT SELECT ON audit.change_log TO shrines_editor, shrines_reader;
REVOKE ALL ON FUNCTION audit.log_change() FROM PUBLIC;
