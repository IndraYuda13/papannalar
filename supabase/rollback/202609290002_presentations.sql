-- Manual development rollback of M04 only, including command ledger.
-- NOT EXECUTED by the application/verification. Backup presentation state and
-- stop publishers first. Review RLS after rollback; classes/students remain.
begin;
drop policy pn_receive_public_state on realtime.messages;
drop function public.presentation_action(text,jsonb);
drop function pn_private.presentation_action(text,jsonb);
drop function public.presentation_topic_allowed(text);
drop function pn_private.presentation_snapshot(pn_private.presentations);
drop table pn_private.presentation_commands;
drop table pn_private.presentations;
drop table pn_private.presentation_sessions;
drop table pn_private.pairings;
drop table pn_private.pairing_limits;
drop function pn_private.consume_pairing_limit(text,integer);
drop function pn_private.valid_public_state(jsonb);
drop schema pn_private;
commit;
