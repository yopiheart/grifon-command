-- Explicit activation, reviewed separately from the fixture schema. Apply as postgres.
-- Enroll approved pilot UUIDs in grifon_fixture.allowed_owners separately; no auth.users changes.
-- This schedule invokes SQL only. It cannot call any generation or payment provider.
begin;
create extension if not exists pg_cron;
select cron.schedule('grifon-cloud-fixture-tick', '5 seconds', 'select grifon_fixture.tick();');
commit;
-- Safe deactivation (preserves jobs/events/receipts):
-- select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'grifon-cloud-fixture-tick'), active := false);
