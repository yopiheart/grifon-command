-- Apply after companion_cloud_fixtures.sql and companion_cloud_references.sql.
-- Fixture association validation only. No worker or spending authority is added.
begin;
create or replace function grifon_fixture.validate_intent(p_intent_text text, p_identity_text text, p_owner uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare intent jsonb; plan jsonb; confirmation jsonb; item jsonb; previous_end numeric := 0;
  scene_start numeric; scene_end numeric; low_total bigint; high_total bigint; cap bigint; canonical_identity text; canonical_plan text;
  cloud_reference jsonb; snapshot grifon_fixture.reference_snapshots; manifest jsonb; draft jsonb; media jsonb; metadata jsonb;
begin
  if p_intent_text is null or octet_length(p_intent_text) > 131072 or p_identity_text is null or octet_length(p_identity_text) > 131072 then
    raise exception 'INVALID_INTENT' using errcode = '22023';
  end if;
  intent := p_intent_text::jsonb; plan := intent->'plan'; confirmation := plan->'confirmation';
  if not coalesce(jsonb_typeof(intent) = 'object' and intent->'version' = '1'::jsonb and intent->'fixture' = 'true'::jsonb
    and intent->>'ownerId' = p_owner::text and grifon_fixture.text_ok(intent->'ownerChatId', 200) and length(intent->>'ownerChatId') > 0
    and intent->>'ownerChatId' !~ '[\x01-\x1f]' and grifon_fixture.integer_ok(intent->'inputRevision', 0)
    and grifon_fixture.text_ok(intent->'requestId', 64) and intent->>'requestId' ~ '^[a-f0-9]{64}$' and intent->>'scenario' in ('normal', 'second-clip-fails-once')
    and jsonb_typeof(plan) = 'object' and plan->'version' = '1'::jsonb and plan->'fixture' = 'true'::jsonb
    and grifon_fixture.integer_ok(plan->'revision', 1) and plan->'inputRevision' = intent->'inputRevision'
    and grifon_fixture.text_ok(plan->'inputHash', 64) and plan->>'inputHash' ~ '^[a-f0-9]{64}$' and plan->'stale' = 'false'::jsonb
    and grifon_fixture.text_ok(plan->'direction', 4000) and grifon_fixture.js_nonblank(plan->'direction')
    and plan->>'outputLanguage' in ('Taglish', 'Tagalog', 'English') and plan->>'adaptationMode' in ('adapt', 'close')
    and plan->>'speechMode' in ('spoken', 'silent') and jsonb_typeof(confirmation) = 'object'
    and confirmation->'revision' = plan->'revision' and confirmation->'inputRevision' = plan->'inputRevision'
    and confirmation->'inputHash' = plan->'inputHash' and grifon_fixture.text_ok(confirmation->'planSnapshot', 120000), false) then
    raise exception 'INVALID_INTENT' using errcode = '22023';
  end if;
  canonical_identity := '[' || to_json(intent->>'ownerId')::text || ',' || to_json(intent->>'ownerChatId')::text
    || ',' || to_json(confirmation->>'planSnapshot')::text;
  if intent ? 'cloudReference' then
    cloud_reference := intent->'cloudReference';
    if not grifon_fixture.reference_keys(cloud_reference, array['version', 'saveId', 'inputHash'])
      or not grifon_fixture.reference_unique_keys(p_intent_text::json->'cloudReference')
      or (select count(*) from json_each(p_intent_text::json) where key = 'cloudReference') <> 1
      or cloud_reference->'version' is distinct from '1'::jsonb
      or not grifon_fixture.reference_text(cloud_reference->'saveId', 64) or cloud_reference->>'saveId' !~ '^[a-f0-9]{64}$'
      or not grifon_fixture.reference_text(cloud_reference->'inputHash', 64) or cloud_reference->>'inputHash' !~ '^[a-f0-9]{64}$' then
      raise exception 'INVALID_CLOUD_REFERENCE' using errcode = '22023';
    end if;
    canonical_identity := canonical_identity || ',' || to_json(cloud_reference->>'saveId')::text;
  end if;
  canonical_identity := canonical_identity || ']';
  canonical_plan := grifon_fixture.compact_plan_json(p_intent_text::json->'plan', true);
  if confirmation->>'planSnapshot' is distinct from canonical_plan
    or p_identity_text is distinct from canonical_identity
    or encode(sha256(convert_to(canonical_identity, 'UTF8')), 'hex') <> intent->>'requestId' then
    raise exception 'INVALID_IDENTITY_OR_CONFIRMATION' using errcode = '22023';
  end if;
  if plan->'voice' is distinct from 'null'::jsonb and not coalesce(jsonb_typeof(plan->'voice') = 'object'
    and grifon_fixture.text_ok(plan#>'{voice,id}', 200) and length(plan#>>'{voice,id}') > 0
    and grifon_fixture.text_ok(plan#>'{voice,name}', 200) and length(plan#>>'{voice,name}') > 0
    and plan#>>'{voice,source}' in ('curated', 'private'), false) then
    raise exception 'INVALID_VOICE' using errcode = '22023';
  end if;
  if not coalesce(jsonb_typeof(plan->'facts') = 'array' and jsonb_array_length(plan->'facts') <= 10
    and jsonb_typeof(plan->'missing') = 'array' and jsonb_array_length(plan->'missing') <= 10
    and jsonb_typeof(plan->'scenes') = 'array' and jsonb_array_length(plan->'scenes') between 1 and 12
    and jsonb_typeof(plan->'audio') = 'object' and grifon_fixture.text_ok(plan#>'{audio,speech}', 4000)
    and grifon_fixture.text_ok(plan#>'{audio,music}', 4000) and grifon_fixture.text_ok(plan#>'{audio,sfx}', 4000)
    and jsonb_typeof(plan->'quote') = 'object' and jsonb_typeof(plan#>'{quote,items}') = 'array'
    and jsonb_array_length(plan#>'{quote,items}') = 6, false) then
    raise exception 'INVALID_PLAN' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(plan->'facts') loop
    if not (grifon_fixture.text_ok(item->'label', 100) and grifon_fixture.text_ok(item->'value', 4000)) then
      raise exception 'INVALID_FACT' using errcode = '22023';
    end if;
  end loop;
  for item in select value from jsonb_array_elements(plan->'missing') loop
    if not grifon_fixture.text_ok(item, 100) then raise exception 'INVALID_MISSING' using errcode = '22023'; end if;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(plan->'scenes')) <> jsonb_array_length(plan->'scenes')
    or (intent->>'scenario' = 'second-clip-fails-once' and jsonb_array_length(plan->'scenes') < 2) then
    raise exception 'INVALID_SCENES' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(plan->'scenes') loop
    if not coalesce(grifon_fixture.text_ok(item->'id', 100) and grifon_fixture.text_ok(item->'start', 10)
      and grifon_fixture.text_ok(item->'end', 10) and item->>'start' ~ '^[0-9]+(\.[0-9]{1,2})?$'
      and item->>'end' ~ '^[0-9]+(\.[0-9]{1,2})?$' and grifon_fixture.text_ok(item->'script', 2000)
      and grifon_fixture.text_ok(item->'visual', 2000) and grifon_fixture.js_nonblank(item->'visual')
      and ((plan->>'speechMode' = 'silent' and item->>'script' = '') or (plan->>'speechMode' = 'spoken' and grifon_fixture.js_nonblank(item->'script'))), false) then
      raise exception 'INVALID_SCENE' using errcode = '22023';
    end if;
    scene_start := (item->>'start')::numeric; scene_end := (item->>'end')::numeric;
    if scene_start <> previous_end or scene_end <= scene_start or scene_end > 60 then
      raise exception 'INVALID_SCENE_TIMING' using errcode = '22023';
    end if;
    previous_end := scene_end;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(plan#>'{quote,items}')) <> 6 then
    raise exception 'INVALID_QUOTE' using errcode = '22023';
  end if;
  low_total := grifon_fixture.cents(plan#>'{quote,contingencyPesos}'); high_total := low_total;
  cap := grifon_fixture.cents(plan#>'{quote,maxDemoCapPesos}');
  for item in select value from jsonb_array_elements(plan#>'{quote,items}') loop
    if not (grifon_fixture.text_ok(item->'id', 100) and grifon_fixture.text_ok(item->'label', 200))
      or grifon_fixture.cents(item->'lowPesos') > grifon_fixture.cents(item->'highPesos') then
      raise exception 'INVALID_QUOTE' using errcode = '22023';
    end if;
    low_total := low_total + grifon_fixture.cents(item->'lowPesos'); high_total := high_total + grifon_fixture.cents(item->'highPesos');
  end loop;
  if not coalesce(high_total <= cap and confirmation->'lowCents' = to_jsonb(low_total)
    and confirmation->'highCents' = to_jsonb(high_total) and confirmation->'capCents' = to_jsonb(cap), false) then
    raise exception 'INVALID_CONFIRMED_QUOTE' using errcode = '22023';
  end if;
  if intent ? 'cloudReference' then
    select * into snapshot from grifon_fixture.reference_snapshots
      where owner_id = p_owner and save_id = cloud_reference->>'saveId' and committed for share;
    if not found then raise exception 'CLOUD_REFERENCE_NOT_FOUND' using errcode = 'P0002'; end if;
    manifest := grifon_fixture.reference_validate_manifest(snapshot.manifest_text); draft := manifest->'draft';
    if cloud_reference->'inputHash' is distinct from plan->'inputHash' or plan->'inputHash' is distinct from manifest->'inputHash'
      or plan->'voice' is distinct from draft->'voice' or plan->'outputLanguage' is distinct from draft->'outputLanguage'
      or plan->>'adaptationMode' is distinct from coalesce(draft->>'adaptationMode', 'adapt')
      or plan->>'speechMode' is distinct from coalesce(draft->>'speechMode', 'spoken')
      or plan->'facts' is distinct from jsonb_build_array(
        jsonb_build_object('label', 'Brief', 'value', draft->'brief'),
        jsonb_build_object('label', 'Brand', 'value', draft->'brandName'),
        jsonb_build_object('label', 'Product or service', 'value', draft->'productName'),
        jsonb_build_object('label', 'Audience', 'value', draft->'audience'),
        jsonb_build_object('label', 'Offer', 'value', draft->'offer'),
        jsonb_build_object('label', 'Call to action', 'value', draft->'callToAction'),
        jsonb_build_object('label', 'Instructions', 'value', draft->'instructions')) then
      raise exception 'CLOUD_REFERENCE_MISMATCH' using errcode = '22023';
    end if;
    -- Recheck native Storage metadata at start. Content hashes and decoding are verified when reopening inputs.
    for media in select value from jsonb_array_elements(manifest->'media') loop
      select objects.metadata into metadata from storage.objects where bucket_id = 'grifon-fixture-reference-media'
        and name = p_owner::text || '/' || snapshot.save_id || '/' || (media->>'slot') for share;
      if not found then raise exception 'REFERENCE_MEDIA_INCOMPLETE' using errcode = '22023'; end if;
      if not grifon_fixture.reference_integer(metadata->'size', 1, 6000000) or metadata->'size' is distinct from media->'size'
        or metadata->>'mimetype' is distinct from media->>'type' then
        raise exception 'REFERENCE_MEDIA_MISMATCH' using errcode = '22023';
      end if;
    end loop;
  end if;
  return intent;
end;
$$;
commit;
