-- PostgreSQL CHECK expressions bind by OID. Rebind after the M09 function rename.
-- Rollback with M09: strip pattern first, then bind to valid_public_state_v4.
begin;
alter table pn_private.presentations drop constraint public_state_allowlist;
alter table pn_private.presentations add constraint public_state_allowlist check(pn_private.valid_public_state(public_state));
commit;
