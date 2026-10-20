-- Field reports for the newsroom, plus an integration registry.
-- Nothing in this migration calls an outside API. Every source starts not_configured.
-- High-school reports are not world-readable. Everyone-safe published reports are.
-- The newsroom keeps at most 20 published field reports. A new one archives the oldest.

create table public.integrations (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  provider text not null check (char_length(provider) between 1 and 80),
  category text not null check (char_length(category) between 1 and 40),
  integration_type text not null default 'adapter' check (integration_type in ('adapter','dataset','link','gateway')),
  documentation_url text not null default '' check (char_length(documentation_url) <= 300),
  authentication_type text not null default 'none' check (authentication_type in ('none','api_key','oauth')),
  pricing_type text not null default 'free' check (pricing_type in ('free','free_tier','paid','unknown')),
  commercial_use_status text not null default 'unverified' check (commercial_use_status in ('unverified','allowed','restricted','no')),
  license_status text not null default 'unverified' check (char_length(license_status) <= 40),
  enabled boolean not null default false,
  configured boolean not null default false,
  connection_status text not null default 'not_configured' check (connection_status in ('not_configured','configured','connected','degraded','disconnected','disabled','unsupported')),
  last_checked timestamptz,
  last_error text not null default '' check (char_length(last_error) <= 300),
  monthly_request_count integer not null default 0 check (monthly_request_count >= 0),
  estimated_monthly_cost numeric(8,2) not null default 0 check (estimated_monthly_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news_field_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  summary text not null default '' check (char_length(summary) <= 400),
  body text not null default '' check (char_length(body) <= 4000),
  audience text not null default 'everyone' check (audience in ('everyone','hs')),
  topic text not null default 'general' check (char_length(topic) <= 40),
  source_name text not null check (char_length(source_name) between 1 and 80),
  source_url text not null default '' check (char_length(source_url) <= 300),
  provider text references public.integrations(id) on delete set null,
  license_note text not null default '' check (char_length(license_note) <= 200),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  author uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_field_published on public.news_field_reports (status, published_at desc);

create or replace function public.news_cap_reports() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'published' then
    update public.news_field_reports
      set status = 'archived', updated_at = now()
      where id in (
        select id from public.news_field_reports
        where status = 'published' and id is distinct from new.id
        order by published_at desc nulls last, created_at desc
        offset 19
      );
  end if;
  return new;
end $$;
create trigger news_field_cap before insert or update of status on public.news_field_reports
  for each row execute function public.news_cap_reports();
create trigger news_field_touch before update on public.news_field_reports
  for each row execute function public.touch_updated();
create trigger integrations_touch before update on public.integrations
  for each row execute function public.touch_updated();

alter table public.integrations enable row level security;
alter table public.news_field_reports enable row level security;

-- Younger grades never receive high-school rows from the public key. Editors still can.
create policy nfr_read on public.news_field_reports for select to anon, authenticated
  using ((status = 'published' and audience = 'everyone') or can_edit('newsroom'));
create policy nfr_write on public.news_field_reports for insert to authenticated
  with check (can_edit('newsroom') and (author is null or author = auth.uid()));
create policy nfr_upd on public.news_field_reports for update to authenticated
  using (can_edit('newsroom')) with check (can_edit('newsroom'));
create policy nfr_del on public.news_field_reports for delete to authenticated
  using (can_edit('newsroom'));

-- The registry has no secret column. Only an admin can see or change it.
create policy int_admin on public.integrations for all to authenticated
  using (is_admin()) with check (is_admin());

-- Wired in the school server (/api/sources) and the library search row.
-- nasa stays not_configured: the public DEMO_KEY is rate limited and there is no school key.
-- restcountries is not listed: its old API was shut and the new one needs an account.
insert into public.integrations (id, name, provider, category, documentation_url, authentication_type, pricing_type, commercial_use_status, license_status, enabled, configured, connection_status) values
  ('open-library', 'Open Library', 'Internet Archive', 'books', 'https://openlibrary.org/developers/api', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('gutenberg', 'Project Gutenberg', 'Project Gutenberg', 'books', 'https://www.gutenberg.org', 'none', 'free', 'unverified', 'public-domain', true, true, 'connected'),
  ('wikimedia', 'Wikimedia', 'Wikimedia', 'reference', 'https://www.mediawiki.org/wiki/API:Main_page', 'none', 'free', 'restricted', 'cc-by-sa', true, true, 'connected'),
  ('nasa', 'NASA API', 'NASA', 'science', 'https://api.nasa.gov', 'api_key', 'free', 'unverified', 'unverified', false, false, 'not_configured'),
  ('usgs-quake', 'USGS Earthquakes', 'USGS', 'science', 'https://earthquake.usgs.gov/fdsnws/event/1/', 'none', 'free', 'unverified', 'public-domain', true, true, 'connected'),
  ('open-meteo', 'Open-Meteo', 'Open-Meteo', 'science', 'https://open-meteo.com', 'none', 'free_tier', 'restricted', 'unverified', true, true, 'connected'),
  ('dictionary', 'Free Dictionary', 'dictionaryapi.dev', 'words', 'https://dictionaryapi.dev/', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('datamuse', 'Datamuse', 'Datamuse', 'words', 'https://www.datamuse.com/api/', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('open-trivia', 'Open Trivia Database', 'Open Trivia DB', 'review', 'https://opentdb.com/api_config.php', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('world-bank', 'World Bank', 'World Bank', 'geography', 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('crossref', 'Crossref', 'Crossref', 'research', 'https://api.crossref.org', 'none', 'free', 'unverified', 'unverified', true, true, 'connected')
on conflict (id) do nothing;

insert into public.integrations (id, name, provider, category, documentation_url, authentication_type, pricing_type, commercial_use_status, license_status, enabled, configured, connection_status) values
  ('poetrydb', 'PoetryDB', 'PoetryDB', 'books', 'https://poetrydb.org', 'none', 'free', 'unverified', 'public-domain', true, true, 'connected'),
  ('artic', 'Art Institute of Chicago', 'Art Institute of Chicago', 'art', 'https://api.artic.edu/docs/', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('cleveland-art', 'Cleveland Museum of Art', 'Cleveland Museum of Art', 'art', 'https://openaccess-api.clevelandart.org/', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('loc', 'Library of Congress', 'Library of Congress', 'reference', 'https://www.loc.gov/apis/', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('internet-archive', 'Internet Archive', 'Internet Archive', 'books', 'https://archive.org/advancedsearch.php', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('pubchem', 'PubChem', 'NIH', 'science', 'https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('gbif', 'GBIF', 'GBIF', 'science', 'https://www.gbif.org/developer/summary', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('inaturalist', 'iNaturalist', 'iNaturalist', 'science', 'https://api.inaturalist.org/v1/docs/', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('nws', 'National Weather Service', 'NOAA', 'science', 'https://www.weather.gov/documentation/services-web-api', 'none', 'free', 'unverified', 'public-domain', true, true, 'connected'),
  ('usgs-water', 'USGS Water', 'USGS', 'science', 'https://waterservices.usgs.gov/', 'none', 'free', 'unverified', 'public-domain', true, true, 'connected'),
  ('sunrise-sunset', 'Sunrise-Sunset', 'sunrise-sunset.org', 'science', 'https://sunrise-sunset.org/api', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('wikidata', 'Wikidata', 'Wikimedia', 'reference', 'https://www.wikidata.org/w/api.php', 'none', 'free', 'unverified', 'cc0', true, true, 'connected'),
  ('nominatim', 'Nominatim', 'OpenStreetMap', 'geography', 'https://nominatim.org/release-docs/latest/api/Search/', 'none', 'free', 'restricted', 'odbl', true, true, 'connected'),
  ('arxiv', 'arXiv', 'Cornell', 'research', 'https://info.arxiv.org/help/api/basics.html', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('europe-pmc', 'Europe PMC', 'EMBL-EBI', 'research', 'https://europepmc.org/RestfulWebService', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('doaj', 'DOAJ', 'DOAJ', 'research', 'https://doaj.org/api/v1/docs', 'none', 'free', 'unverified', 'unverified', true, true, 'connected'),
  ('federal-register', 'Federal Register', 'National Archives', 'civics', 'https://www.federalregister.gov/reader-aids/developer-resources/rest-api', 'none', 'free', 'unverified', 'public-domain', true, true, 'connected')
on conflict (id) do nothing;

-- Admins can read the registry. This does not test or enable a provider.
create or replace function public.integrations_list()
returns setof public.integrations
language sql stable security definer set search_path = public as $$
  select * from public.integrations where is_admin() order by category, name;
$$;
revoke all on function public.integrations_list() from public;
grant execute on function public.integrations_list() to authenticated;
