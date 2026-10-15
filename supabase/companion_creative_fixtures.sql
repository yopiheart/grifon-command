-- Apply after companion_cloud_fixture_results.sql. Fixture-only recipe metadata validation.
-- Original validators retain their OIDs and grants. No jobs, worker, schedule or data are rewritten.
begin;
create or replace function grifon_fixture.reference_validate_manifest_v1_base(p_manifest_text text)
returns jsonb language plpgsql set search_path = '' as $$
declare manifest jsonb; draft jsonb; media jsonb; original jsonb; field text; index integer := 0; photo_index integer := 0; video boolean; slot text;
begin
  if p_manifest_text is null or octet_length(p_manifest_text) > 262144 then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  manifest := p_manifest_text::jsonb;
  if not grifon_fixture.reference_unique_keys(p_manifest_text::json)
    or not grifon_fixture.reference_keys(manifest, array['version', 'draft', 'media', 'inputHash'])
    or manifest->'version' is distinct from '1'::jsonb
    or not grifon_fixture.reference_text(manifest->'inputHash', 64) or manifest->>'inputHash' !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  draft := manifest->'draft';
  if not grifon_fixture.reference_keys(draft, array['version', 'brief', 'brandName', 'productName', 'audience', 'offer', 'callToAction', 'instructions',
      'outputLanguage', 'referenceLanguage', 'referenceLink', 'referenceVideo', 'photos', 'voice'], array['adaptationMode', 'speechMode'])
    or draft->'version' is distinct from '1'::jsonb
    or not coalesce(draft->>'outputLanguage' in ('Taglish', 'Tagalog', 'English'), false)
    or (draft ? 'adaptationMode' and not coalesce(draft->>'adaptationMode' in ('adapt', 'close'), false))
    or (draft ? 'speechMode' and not coalesce(draft->>'speechMode' in ('spoken', 'silent'), false)) then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  foreach field in array array['brief', 'brandName', 'productName', 'audience', 'offer', 'callToAction', 'instructions', 'referenceLanguage', 'referenceLink'] loop
    if not grifon_fixture.reference_text(draft->field, 4000) then raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023'; end if;
  end loop;
  if draft->'voice' is distinct from 'null'::jsonb and not (
    grifon_fixture.reference_keys(draft->'voice', array['id', 'name', 'source'])
    and grifon_fixture.reference_text(draft#>'{voice,id}', 200) and length(draft#>>'{voice,id}') > 0
    and grifon_fixture.reference_text(draft#>'{voice,name}', 200) and length(draft#>>'{voice,name}') > 0
    and coalesce(draft#>>'{voice,source}' in ('curated', 'private'), false)) then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  if jsonb_typeof(draft->'photos') is distinct from 'array' or jsonb_typeof(manifest->'media') is distinct from 'array' then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  if jsonb_array_length(draft->'photos') > 5 or jsonb_array_length(manifest->'media') <> jsonb_array_length(draft->'photos')
    + (case when draft->'referenceVideo' = 'null'::jsonb then 0 else 1 end)
    or (select count(distinct value->>'id') from jsonb_array_elements(draft->'photos')) <> jsonb_array_length(draft->'photos') then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  for media in select value from jsonb_array_elements(manifest->'media') loop
    video := index = 0 and draft->'referenceVideo' <> 'null'::jsonb;
    if video then original := draft->'referenceVideo'; slot := 'reference';
    else original := draft->'photos'->photo_index; slot := 'photo-' || photo_index::text; photo_index := photo_index + 1;
    end if;
    if not grifon_fixture.reference_media_ok(original, video)
      or not grifon_fixture.reference_keys(media, case when video then array['slot', 'id', 'name', 'width', 'height', 'duration', 'type', 'size', 'sha256']
        else array['slot', 'id', 'name', 'width', 'height', 'role', 'type', 'size', 'sha256'] end)
      or media - array['slot', 'type', 'size', 'sha256'] is distinct from original
      or media->>'slot' is distinct from slot or not grifon_fixture.reference_integer(media->'size', 1, 6000000)
      or not grifon_fixture.reference_text(media->'sha256', 64) or media->>'sha256' !~ '^[a-f0-9]{64}$'
      or not coalesce(case when video then media->>'type' in ('video/mp4', 'video/webm', 'video/quicktime')
        else media->>'type' in ('image/jpeg', 'image/png', 'image/webp') end, false) then
      raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
    end if;
    index := index + 1;
  end loop;
  return manifest;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
end;
$$;

create or replace function grifon_fixture.validate_intent_v1_base(p_intent_text text, p_identity_text text, p_owner uuid)
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

create or replace function grifon_fixture.creative_catalog_v1()
returns jsonb language sql immutable set search_path = '' as $$
  select $catalog$[{"id":"fixture-ugc-detail-v1","version":1,"category":"ugc","name":"UGC detail sequence","description":"Illustrative presenter opening, product detail and clear next step. No rendered recipe sample is available.","provenance":"original-synthetic-fixture","fixtureSelectable":true,"productionAutoEligible":false,"requiredRoles":["character","product"],"signatureTraits":["Presenter first","Deliberate detail hold","Simple closing product frame"],"shots":[{"id":"intro","startSeconds":0,"endSeconds":4,"role":"presenter","framing":"Medium presenter framing with the product visible.","camera":"Mostly static handheld framing.","cut":"Direct opening cut.","typography":"Short opening label inside safe margins.","cues":["Opening accent"]},{"id":"detail","startSeconds":4,"endSeconds":12,"role":"detail","framing":"Close detail selected from the supplied product photo.","camera":"Restrained forward move.","cut":"Hard cut from presenter to detail.","typography":"One brief factual label, pending approval.","cues":["Detail cut accent"]},{"id":"close","startSeconds":12,"endSeconds":20,"role":"cta","framing":"Product identity with space for the approved call to action.","camera":"Static closing hold.","cut":"Clean cut into a closing hold.","typography":"Approved next step and brand identity.","cues":["Closing resolution"]}],"spokenNodes":[{"id":"source","kind":"source","dependsOn":[],"inputs":["source"]},{"id":"strategy","kind":"strategy","dependsOn":["source"],"inputs":["brand"]},{"id":"identity","kind":"identity","dependsOn":[],"inputs":["photos"]},{"id":"script:intro","kind":"script","dependsOn":["strategy"],"inputs":["shot:intro:script","speech"]},{"id":"visual:intro","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:intro:visual","timing"]},{"id":"voice:intro","kind":"voice","dependsOn":["script:intro"],"inputs":["voice","speech","timing"]},{"id":"script:detail","kind":"script","dependsOn":["strategy"],"inputs":["shot:detail:script","speech"]},{"id":"visual:detail","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:detail:visual","timing"]},{"id":"voice:detail","kind":"voice","dependsOn":["script:detail"],"inputs":["voice","speech","timing"]},{"id":"script:close","kind":"script","dependsOn":["strategy"],"inputs":["shot:close:script","speech"]},{"id":"visual:close","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:close:visual","timing"]},{"id":"voice:close","kind":"voice","dependsOn":["script:close"],"inputs":["voice","speech","timing"]},{"id":"music","kind":"music","dependsOn":["source"],"inputs":["music","timing"]},{"id":"sfx","kind":"sfx","dependsOn":["source"],"inputs":["sfx","timing"]},{"id":"assembly","kind":"assembly","dependsOn":["visual:intro","visual:detail","visual:close","voice:intro","voice:detail","voice:close","music","sfx"],"inputs":["typography","timing","speech"]},{"id":"qa","kind":"qa","dependsOn":["assembly"],"inputs":[]}],"silentNodes":[{"id":"source","kind":"source","dependsOn":[],"inputs":["source"]},{"id":"strategy","kind":"strategy","dependsOn":["source"],"inputs":["brand"]},{"id":"identity","kind":"identity","dependsOn":[],"inputs":["photos"]},{"id":"script:intro","kind":"script","dependsOn":["strategy"],"inputs":["shot:intro:script","speech"]},{"id":"visual:intro","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:intro:visual","timing"]},{"id":"script:detail","kind":"script","dependsOn":["strategy"],"inputs":["shot:detail:script","speech"]},{"id":"visual:detail","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:detail:visual","timing"]},{"id":"script:close","kind":"script","dependsOn":["strategy"],"inputs":["shot:close:script","speech"]},{"id":"visual:close","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:close:visual","timing"]},{"id":"music","kind":"music","dependsOn":["source"],"inputs":["music","timing"]},{"id":"sfx","kind":"sfx","dependsOn":["source"],"inputs":["sfx","timing"]},{"id":"assembly","kind":"assembly","dependsOn":["visual:intro","visual:detail","visual:close","music","sfx"],"inputs":["typography","timing","speech"]},{"id":"qa","kind":"qa","dependsOn":["assembly"],"inputs":[]}]},{"id":"fixture-motion-launch-v1","version":1,"category":"motion-launch","name":"Motion launch sequence","description":"Illustrative type entrance, product reveal, detail card and end card. No rendered recipe sample is available.","provenance":"original-synthetic-fixture","fixtureSelectable":true,"productionAutoEligible":false,"requiredRoles":["product"],"signatureTraits":["Type leads the opening","Centered product reveal","One detail card","Quiet end card"],"shots":[{"id":"intro","startSeconds":0,"endSeconds":3,"role":"product","framing":"Simple graphic field with room for a product title.","camera":"Flat graphic composition.","cut":"Type entrance into the first hold.","typography":"One short title with a measured entrance.","cues":["Title accent"]},{"id":"reveal","startSeconds":3,"endSeconds":7,"role":"product","framing":"Centered product identity from its supplied photo.","camera":"Subtle scale change without distorting the product.","cut":"Reveal on the illustrative music cue.","typography":"Product name remains readable.","cues":["Reveal accent"]},{"id":"detail","startSeconds":7,"endSeconds":12,"role":"detail","framing":"One product detail beside a compact factual label.","camera":"Small lateral graphic move.","cut":"Clean cut to the detail card.","typography":"One approved factual detail.","cues":["Card transition"]},{"id":"close","startSeconds":12,"endSeconds":15,"role":"cta","framing":"Simple brand and product end card.","camera":"Static hold.","cut":"Resolve to the final card.","typography":"Approved call to action.","cues":["Closing resolution"]}],"spokenNodes":[{"id":"source","kind":"source","dependsOn":[],"inputs":["source"]},{"id":"strategy","kind":"strategy","dependsOn":["source"],"inputs":["brand"]},{"id":"identity","kind":"identity","dependsOn":[],"inputs":["photos"]},{"id":"script:intro","kind":"script","dependsOn":["strategy"],"inputs":["shot:intro:script","speech"]},{"id":"visual:intro","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:intro:visual","timing"]},{"id":"voice:intro","kind":"voice","dependsOn":["script:intro"],"inputs":["voice","speech","timing"]},{"id":"script:reveal","kind":"script","dependsOn":["strategy"],"inputs":["shot:reveal:script","speech"]},{"id":"visual:reveal","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:reveal:visual","timing"]},{"id":"voice:reveal","kind":"voice","dependsOn":["script:reveal"],"inputs":["voice","speech","timing"]},{"id":"script:detail","kind":"script","dependsOn":["strategy"],"inputs":["shot:detail:script","speech"]},{"id":"visual:detail","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:detail:visual","timing"]},{"id":"voice:detail","kind":"voice","dependsOn":["script:detail"],"inputs":["voice","speech","timing"]},{"id":"script:close","kind":"script","dependsOn":["strategy"],"inputs":["shot:close:script","speech"]},{"id":"visual:close","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:close:visual","timing"]},{"id":"voice:close","kind":"voice","dependsOn":["script:close"],"inputs":["voice","speech","timing"]},{"id":"music","kind":"music","dependsOn":["source"],"inputs":["music","timing"]},{"id":"sfx","kind":"sfx","dependsOn":["source"],"inputs":["sfx","timing"]},{"id":"assembly","kind":"assembly","dependsOn":["visual:intro","visual:reveal","visual:detail","visual:close","voice:intro","voice:reveal","voice:detail","voice:close","music","sfx"],"inputs":["typography","timing","speech"]},{"id":"qa","kind":"qa","dependsOn":["assembly"],"inputs":[]}],"silentNodes":[{"id":"source","kind":"source","dependsOn":[],"inputs":["source"]},{"id":"strategy","kind":"strategy","dependsOn":["source"],"inputs":["brand"]},{"id":"identity","kind":"identity","dependsOn":[],"inputs":["photos"]},{"id":"script:intro","kind":"script","dependsOn":["strategy"],"inputs":["shot:intro:script","speech"]},{"id":"visual:intro","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:intro:visual","timing"]},{"id":"script:reveal","kind":"script","dependsOn":["strategy"],"inputs":["shot:reveal:script","speech"]},{"id":"visual:reveal","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:reveal:visual","timing"]},{"id":"script:detail","kind":"script","dependsOn":["strategy"],"inputs":["shot:detail:script","speech"]},{"id":"visual:detail","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:detail:visual","timing"]},{"id":"script:close","kind":"script","dependsOn":["strategy"],"inputs":["shot:close:script","speech"]},{"id":"visual:close","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:close:visual","timing"]},{"id":"music","kind":"music","dependsOn":["source"],"inputs":["music","timing"]},{"id":"sfx","kind":"sfx","dependsOn":["source"],"inputs":["sfx","timing"]},{"id":"assembly","kind":"assembly","dependsOn":["visual:intro","visual:reveal","visual:detail","visual:close","music","sfx"],"inputs":["typography","timing","speech"]},{"id":"qa","kind":"qa","dependsOn":["assembly"],"inputs":[]}]},{"id":"fixture-cinematic-spec-v1","version":1,"category":"cinematic-spec","name":"Cinematic product sequence","description":"Illustrative atmosphere, product anchor, macro detail and hero finale. No rendered recipe sample is available.","provenance":"original-synthetic-fixture","fixtureSelectable":true,"productionAutoEligible":false,"requiredRoles":["product"],"signatureTraits":["Atmospheric opening","Recognizable product anchor","Macro detail","Hero finale"],"shots":[{"id":"intro","startSeconds":0,"endSeconds":3,"role":"product","framing":"Restrained atmospheric product silhouette.","camera":"Slow lateral movement.","cut":"Open on a deliberate hold.","typography":"Minimal opening identity.","cues":["Atmosphere rise"]},{"id":"anchor","startSeconds":3,"endSeconds":6,"role":"product","framing":"Clear product silhouette, label and proportions.","camera":"Small orbit, pending real asset feasibility.","cut":"Direct cut to the recognizable product anchor.","typography":"Product identity only.","cues":["Anchor accent"]},{"id":"detail","startSeconds":6,"endSeconds":11,"role":"detail","framing":"Macro detail visible in the supplied product photo.","camera":"Slow push toward the selected detail.","cut":"Measured detail cut.","typography":"Optional approved factual detail.","cues":["Detail accent"]},{"id":"close","startSeconds":11,"endSeconds":15,"role":"cta","framing":"Hero product finale with unobstructed identity.","camera":"Static finale hold.","cut":"Resolve into the hero frame.","typography":"Brand identity and approved next step.","cues":["Closing resolution"]}],"spokenNodes":[{"id":"source","kind":"source","dependsOn":[],"inputs":["source"]},{"id":"strategy","kind":"strategy","dependsOn":["source"],"inputs":["brand"]},{"id":"identity","kind":"identity","dependsOn":[],"inputs":["photos"]},{"id":"script:intro","kind":"script","dependsOn":["strategy"],"inputs":["shot:intro:script","speech"]},{"id":"visual:intro","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:intro:visual","timing"]},{"id":"voice:intro","kind":"voice","dependsOn":["script:intro"],"inputs":["voice","speech","timing"]},{"id":"script:anchor","kind":"script","dependsOn":["strategy"],"inputs":["shot:anchor:script","speech"]},{"id":"visual:anchor","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:anchor:visual","timing"]},{"id":"voice:anchor","kind":"voice","dependsOn":["script:anchor"],"inputs":["voice","speech","timing"]},{"id":"script:detail","kind":"script","dependsOn":["strategy"],"inputs":["shot:detail:script","speech"]},{"id":"visual:detail","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:detail:visual","timing"]},{"id":"voice:detail","kind":"voice","dependsOn":["script:detail"],"inputs":["voice","speech","timing"]},{"id":"script:close","kind":"script","dependsOn":["strategy"],"inputs":["shot:close:script","speech"]},{"id":"visual:close","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:close:visual","timing"]},{"id":"voice:close","kind":"voice","dependsOn":["script:close"],"inputs":["voice","speech","timing"]},{"id":"music","kind":"music","dependsOn":["source"],"inputs":["music","timing"]},{"id":"sfx","kind":"sfx","dependsOn":["source"],"inputs":["sfx","timing"]},{"id":"assembly","kind":"assembly","dependsOn":["visual:intro","visual:anchor","visual:detail","visual:close","voice:intro","voice:anchor","voice:detail","voice:close","music","sfx"],"inputs":["typography","timing","speech"]},{"id":"qa","kind":"qa","dependsOn":["assembly"],"inputs":[]}],"silentNodes":[{"id":"source","kind":"source","dependsOn":[],"inputs":["source"]},{"id":"strategy","kind":"strategy","dependsOn":["source"],"inputs":["brand"]},{"id":"identity","kind":"identity","dependsOn":[],"inputs":["photos"]},{"id":"script:intro","kind":"script","dependsOn":["strategy"],"inputs":["shot:intro:script","speech"]},{"id":"visual:intro","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:intro:visual","timing"]},{"id":"script:anchor","kind":"script","dependsOn":["strategy"],"inputs":["shot:anchor:script","speech"]},{"id":"visual:anchor","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:anchor:visual","timing"]},{"id":"script:detail","kind":"script","dependsOn":["strategy"],"inputs":["shot:detail:script","speech"]},{"id":"visual:detail","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:detail:visual","timing"]},{"id":"script:close","kind":"script","dependsOn":["strategy"],"inputs":["shot:close:script","speech"]},{"id":"visual:close","kind":"visual","dependsOn":["source","identity"],"inputs":["shot:close:visual","timing"]},{"id":"music","kind":"music","dependsOn":["source"],"inputs":["music","timing"]},{"id":"sfx","kind":"sfx","dependsOn":["source"],"inputs":["sfx","timing"]},{"id":"assembly","kind":"assembly","dependsOn":["visual:intro","visual:anchor","visual:detail","visual:close","music","sfx"],"inputs":["typography","timing","speech"]},{"id":"qa","kind":"qa","dependsOn":["assembly"],"inputs":[]}]}]$catalog$::jsonb;
$$;

create or replace function grifon_fixture.creative_source_valid_v1(source jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare recipe jsonb;
begin
  if not grifon_fixture.reference_keys(source, array['version','mode','category'], array['recipeId','recipeVersion'])
    or source->'version' is distinct from '1'::jsonb
    or not coalesce(source->>'category' in ('ugc','motion-launch','cinematic-spec'), false) then return false; end if;
  if source->>'mode' = 'fixture-auto' then
    return grifon_fixture.reference_keys(source,array['version','mode','category']);
  end if;
  if source->>'mode' is distinct from 'fixture-recipe'
    or not grifon_fixture.reference_keys(source,array['version','mode','category','recipeId','recipeVersion'])
    or source->'recipeVersion' is distinct from '1'::jsonb then return false; end if;
  select value into recipe from jsonb_array_elements(grifon_fixture.creative_catalog_v1())
    where value->'id' = source->'recipeId' and value->'version' = source->'recipeVersion' and value->'category' = source->'category';
  return recipe is not null;
end;
$$;

create or replace function grifon_fixture.creative_strings_v1(value jsonb, maximum_count integer, maximum_length integer)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(value) is distinct from 'array' then return false; end if;
  if jsonb_array_length(value) > maximum_count then return false; end if;
  for item in select element from jsonb_array_elements(value) as elements(element) loop
    if not grifon_fixture.reference_text(item, maximum_length) or not grifon_fixture.js_nonblank(item) then return false; end if;
  end loop;
  return true;
end;
$$;

create or replace function grifon_fixture.creative_plan_valid_v1(creative jsonb, review jsonb, draft jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare source jsonb := creative->'source'; selected jsonb := draft->'creativeSource'; recipe jsonb; dna jsonb := creative->'editDNA';
  strategy jsonb := creative->'brandStrategy'; binding jsonb; photo jsonb; audio jsonb := creative->'audio'; route jsonb; shot jsonb;
  execution jsonb := creative->'execution'; expected_route text; expected_voice jsonb; voice_used boolean; index integer := 0;
begin
  if not grifon_fixture.reference_keys(creative,array['version','fixture','productionEligible','inputHash','inputRevision','adaptationMode','speechMode','source','selection','sampleLanguage','editDNA','brandStrategy','bindings','audio','execution'])
    or creative->'version' is distinct from '1'::jsonb or creative->'fixture' is distinct from 'true'::jsonb
    or creative->'productionEligible' is distinct from 'false'::jsonb or creative->>'sampleLanguage' is distinct from 'English'
    or not grifon_fixture.reference_text(creative->'inputHash',64) or not coalesce(creative->>'inputHash' ~ '^[a-f0-9]{64}$',false)
    or not grifon_fixture.reference_integer(creative->'inputRevision',0,9007199254740991)
    or creative->'inputHash' is distinct from review->'inputHash' or creative->'inputRevision' is distinct from review->'inputRevision'
    or creative->'adaptationMode' is distinct from review->'adaptationMode' or creative->'speechMode' is distinct from review->'speechMode'
    or not grifon_fixture.creative_source_valid_v1(selected) then return false; end if;
  if not grifon_fixture.reference_keys(source,array['mode','category','recipeId','recipeVersion','provenance','referenceAnalysis'])
    or source->'mode' is distinct from selected->'mode' or source->'category' is distinct from selected->'category'
    or source->'recipeVersion' is distinct from '1'::jsonb or source->>'provenance' is distinct from 'original-synthetic-fixture'
    or source->>'referenceAnalysis' is distinct from 'not-run'
    or (selected->>'mode' = 'fixture-recipe' and (source->'recipeId' is distinct from selected->'recipeId' or source->'recipeVersion' is distinct from selected->'recipeVersion')) then return false; end if;
  select value into recipe from jsonb_array_elements(grifon_fixture.creative_catalog_v1())
    where value->'id' = source->'recipeId' and value->'version' = source->'recipeVersion' and value->'category' = source->'category';
  if recipe is null then return false; end if;
  if not grifon_fixture.reference_keys(creative->'selection',array['reasons','productionAutoEligible'])
    or not grifon_fixture.creative_strings_v1(creative#>'{selection,reasons}',8,1000)
    or jsonb_array_length(creative#>'{selection,reasons}') = 0
    or creative#>'{selection,productionAutoEligible}' is distinct from 'false'::jsonb then return false; end if;
  if not grifon_fixture.reference_keys(dna,array['basis','durationSeconds','signatureTraits','preserve','adapt','shots'])
    or dna->>'basis' is distinct from 'illustrative-recipe'
    or dna->'shots' is distinct from recipe->'shots' or dna->'signatureTraits' is distinct from recipe->'signatureTraits'
    or dna->'durationSeconds' is distinct from recipe#>array['shots',(jsonb_array_length(recipe->'shots') - 1)::text,'endSeconds']
    or not grifon_fixture.creative_strings_v1(dna->'preserve',12,1000) or not grifon_fixture.creative_strings_v1(dna->'adapt',12,1000)
    or jsonb_array_length(dna->'preserve') = 0 or jsonb_array_length(dna->'adapt') = 0 then return false; end if;
  if not grifon_fixture.reference_keys(strategy,array['facts','missing','researchStatus','objective','messaging'])
    or strategy->>'researchStatus' is distinct from 'not-run' or strategy->'facts' is distinct from review->'facts'
    or strategy->'missing' is distinct from review->'missing'
    or not grifon_fixture.reference_text(strategy->'objective',4000) or not grifon_fixture.js_nonblank(strategy->'objective')
    or not grifon_fixture.reference_text(strategy->'messaging',4000) or not grifon_fixture.js_nonblank(strategy->'messaging')
    or strategy->>'objective' is distinct from (case when grifon_fixture.js_nonblank(draft->'callToAction') then draft->>'callToAction' else 'Missing call to action; choose the next step during review.' end)
    or strategy->>'messaging' is distinct from 'Only the seven user-supplied facts are recorded here. No market research, claim verification, conversion prediction or reference analysis has run. English sample speech is illustrative, even when another output language is selected.'
    or not grifon_fixture.creative_strings_v1(strategy->'missing',10,100) then return false; end if;
  if jsonb_typeof(creative->'bindings') is distinct from 'array' then return false; end if;
  if jsonb_array_length(creative->'bindings') <> jsonb_array_length(draft->'photos') or jsonb_array_length(creative->'bindings') not between 1 and 5 then return false; end if;
  for binding in select value from jsonb_array_elements(creative->'bindings') loop
    photo := draft->'photos'->index;
    if not grifon_fixture.reference_keys(binding,array['photoId','role','identityAnchor','preserve'])
      or binding->'photoId' is distinct from photo->'id' or binding->'role' is distinct from photo->'role'
      or binding->'identityAnchor' is distinct from 'true'::jsonb or not grifon_fixture.creative_strings_v1(binding->'preserve',8,1000)
      or jsonb_array_length(binding->'preserve') = 0 then return false; end if;
    index := index + 1;
  end loop;
  if exists(select 1 from jsonb_array_elements_text(recipe->'requiredRoles') as roles(role)
    where not exists(select 1 from jsonb_array_elements(draft->'photos') as photos(photo) where photos.photo->>'role'=roles.role)) then return false; end if;
  if not grifon_fixture.reference_keys(audio,array['selectedVoice','voiceUsed','routes','music','sfx'])
    or audio->'selectedVoice' is distinct from review->'voice' or audio->'selectedVoice' is distinct from draft->'voice'
    or audio->>'music' is distinct from 'planned-original-instrumental' or audio->>'sfx' is distinct from 'planned-cues-not-generated'
    or jsonb_typeof(audio->'routes') is distinct from 'array' then return false; end if;
  voice_used := review->>'speechMode' = 'spoken' and review->'voice' <> 'null'::jsonb;
  if audio->'voiceUsed' is distinct from to_jsonb(voice_used) or jsonb_array_length(audio->'routes') <> jsonb_array_length(recipe->'shots') then return false; end if;
  index := 0;
  for shot in select value from jsonb_array_elements(recipe->'shots') loop
    route := audio->'routes'->index;
    expected_route := case when review->>'speechMode' = 'silent' then 'none' when shot->>'role' = 'presenter' then 'voice-conversion' else 'text-to-speech' end;
    expected_voice := case when review->>'speechMode' = 'silent' then 'null'::jsonb else coalesce(review#>'{voice,id}','null'::jsonb) end;
    if not grifon_fixture.reference_keys(route,array['shotId','route','voiceId']) or route->'shotId' is distinct from shot->'id'
      or route->>'route' is distinct from expected_route or route->'voiceId' is distinct from expected_voice then return false; end if;
    index := index + 1;
  end loop;
  if (select jsonb_agg(scenes.scene->'id' order by scenes.ordinal) from jsonb_array_elements(review->'scenes') with ordinality as scenes(scene,ordinal))
    is distinct from (select jsonb_agg(shots.shot->'id' order by shots.ordinal) from jsonb_array_elements(recipe->'shots') with ordinality as shots(shot,ordinal)) then return false; end if;
  return coalesce(grifon_fixture.reference_keys(execution,array['mode','providerCalls','actualCents','nodes'])
    and execution->>'mode' = 'metadata-only' and execution->'providerCalls' = '0'::jsonb and execution->'actualCents' = '0'::jsonb
    and execution->'nodes' = case when review->>'speechMode' = 'spoken' then recipe->'spokenNodes' else recipe->'silentNodes' end,false);
end;
$$;

create or replace function grifon_fixture.reference_validate_manifest(p_manifest_text text)
returns jsonb language plpgsql set search_path = '' as $$
declare manifest jsonb;
begin
  if p_manifest_text is null or octet_length(p_manifest_text) > 262144 then
    return grifon_fixture.reference_validate_manifest_v1_base(p_manifest_text);
  end if;
  manifest := p_manifest_text::jsonb;
  if not coalesce(manifest->'draft' ? 'creativeSource',false) then return grifon_fixture.reference_validate_manifest_v1_base(p_manifest_text); end if;
  if not grifon_fixture.reference_unique_keys(p_manifest_text::json) then raise exception 'INVALID_REFERENCE_MANIFEST' using errcode='22023'; end if;
  if not grifon_fixture.creative_source_valid_v1(manifest#>'{draft,creativeSource}') then raise exception 'INVALID_CREATIVE_SOURCE' using errcode='22023'; end if;
  perform grifon_fixture.reference_validate_manifest_v1_base(jsonb_set(manifest,'{draft}',(manifest->'draft')-'creativeSource')::text);
  return manifest;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'INVALID_REFERENCE_MANIFEST' using errcode='22023';
end;
$$;

create or replace function grifon_fixture.validate_intent(p_intent_text text,p_identity_text text,p_owner uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare intent jsonb; review jsonb; draft jsonb; creative jsonb;
begin
  intent := grifon_fixture.validate_intent_v1_base(p_intent_text,p_identity_text,p_owner);
  review := intent->'plan'; creative := review->'creativePlan';
  if intent ? 'cloudReference' then
    select manifest_text::jsonb->'draft' into draft from grifon_fixture.reference_snapshots
      where owner_id=p_owner and save_id=intent#>>'{cloudReference,saveId}' and committed;
  end if;
  if draft ? 'creativeSource' then
    if not review ? 'creativePlan' then raise exception 'CREATIVE_PLAN_REQUIRED' using errcode='22023'; end if;
    if not grifon_fixture.reference_unique_keys(p_intent_text::json) or not coalesce(grifon_fixture.creative_plan_valid_v1(creative,review,draft),false) then
      raise exception 'INVALID_CREATIVE_PLAN' using errcode='22023';
    end if;
  elsif review ? 'creativePlan' then raise exception 'CREATIVE_PLAN_REQUIRES_SOURCE' using errcode='22023';
  end if;
  return intent;
end;
$$;

revoke all on function grifon_fixture.reference_validate_manifest_v1_base(text),grifon_fixture.validate_intent_v1_base(text,text,uuid),
  grifon_fixture.creative_catalog_v1(),grifon_fixture.creative_source_valid_v1(jsonb),grifon_fixture.creative_strings_v1(jsonb,integer,integer),
  grifon_fixture.creative_plan_valid_v1(jsonb,jsonb,jsonb) from public,anon,authenticated;
commit;
