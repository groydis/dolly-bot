# Staging test checklist

Run these checks on the staging guild after deploy or before a production release. CI covers domain logic and handler orchestration with mocks; these paths need real Discord and Cloudflare bindings.

## Automated CI (local)

```bash
npm test
npm run typecheck
```

## Manual staging checks

1. **Health** — `GET /` returns `SCANZ activity ping bot is running.`
2. **Bad signature** — `POST` to the interactions URL without `x-signature-ed25519` / `x-signature-timestamp` returns `401`.
3. **Verify button** — Run `/verify`, add the bio code on RSI, click **Verify**; roles and nickname update.
4. **Partner verify** — Run `/verify` with a partner org symbol; confirm `org_*` role and text channel under the partner category.
5. **Deferred follow-up** — Complete verify on a slow path; ephemeral result arrives (no “interaction failed” in Discord).
6. **Audit command** — Run `/audit`; drift cases post to the audit channel and a CSV lands in R2.
7. **Audit continuation** — With enough verify records to exceed one batch, Worker logs show `Audit batch continuing` and the run completes.
8. **Cron** — Trigger the scheduled handler from the Cloudflare dashboard; weekly audit starts when records exist.

## Logs

```bash
npx wrangler tail dolly-bot
```

Watch for `Audit batch continuing`, `Audit run finished`, and verify confirm errors during checks 5–8.
