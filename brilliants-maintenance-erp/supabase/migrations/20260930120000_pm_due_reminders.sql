-- PM due reminder automation (2026-09-30)
--
-- Schedules a daily (01:15 UTC / 06:45 IST) pg_cron job that calls
-- https://erp.brilliants.in/api/automations/pm-due via pg_net.
-- The Next.js route sends Gmail SMTP emails to org members whose
-- maintenance schedules are due within the next 48h.
--
-- Requires env/secret: AUTOMATION_TOKEN (Vercel production + this file's
-- value). Replace <AUTOMATION_TOKEN> below with the production value before
-- applying on a fresh environment; do NOT commit the real token.

DO $$
DECLARE j bigint;
BEGIN
  SELECT jobid INTO j FROM cron.job WHERE jobname = 'pm-due-reminder';
  IF j IS NOT NULL THEN
    PERFORM cron.unschedule(j);
  END IF;
END $$;

SELECT cron.schedule(
  'pm-due-reminder',
  '15 1 * * *',
  $$SELECT net.http_post(
    'https://erp.brilliants.in/api/automations/pm-due',
    '{"Content-Type":"application/json","x-automation-secret":"<AUTOMATION_TOKEN>"}'::jsonb,
    '{}'::jsonb,
    NULL,
    120000
  )$$
)::text AS jobid;