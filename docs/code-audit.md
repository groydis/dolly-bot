# Codebase audit: refactor, functional style, and testing

This document captures a review of the dolly-bot codebase with focus on refactoring opportunities, functional style, avoiding duplication and magic numbers, relevant comments, and testability.

---

## What's already in good shape

**Result ADT and guards** — `src/lib/result.ts` and guards like `requireScanzRole` are small, pure, and composable. This is the right foundation for functional style.

**Pure domain logic** — These modules are side-effect-free and ideal for unit tests without mocks:

- `detectDrift` (`src/audit/detect-drift.ts`)
- `classifyVerificationRoles` / `classifyPartnerOrgRoles` (`src/commands/verify/classify.ts`)
- `parseCitizenPage`, `extractVerifyCode`, `citizenHandlesMatch` (`src/commands/verify/rsi/citizen.ts`)
- `parseOrgMembersResponse` (`src/commands/verify/rsi/org-members.ts`)
- `buildCsv` / `escapeCsvField` (`src/audit/export-csv.ts`)
- `errorToMessage` (`src/errors.ts`)
- `parseVerifyNickname`, `isValidOrgSymbol`, etc. (`src/lib/*`)

**Constants with intent** — `src/audit/constants.ts` documents the Worker time budget well. `src/lib/permissions.ts` is a good model for explaining opaque bitmasks.

---

## Priority 1: Extract duplicated utilities (low risk, high payoff)

### `sleep`, `getInteractionUserId`, defer delay

These appear in at least four places:

- `src/commands/execute.ts` — `DEFER_ACK_DELAY_MS = 250`, `sleep`, `getInteractionUserId`
- `src/commands/verify/execute-confirm.ts` — same
- `src/discord/interactions.ts` — `sleep`
- `src/audit/check-member.ts` — `sleep`

**Recommendation:** Add `src/lib/async.ts` with `sleep`, and `src/discord/interaction-utils.ts` (or extend `interactions.ts`) with:

- `DEFER_ACK_DELAY_MS` — comment that Discord needs time to process the deferred ack before follow-up PATCH
- `getInteractionUserId(interaction)` — generic over command/component interactions

### Constants duplicated across modules

| Duplicate | Locations | Fix |
|-----------|-----------|-----|
| `SCANZ_SID = "SCANZ"` | `classify.ts:7` vs `org-symbol.ts:1` | Import from `org-symbol.ts` |
| `verify:confirm:` prefix | `verify-session.ts:88` vs `VERIFY_BUTTON_PREFIX` in constants | Use the constant everywhere |
| `DISCORD_API_BASE` | `api.ts:14`, hardcoded in `interactions.ts:70` | Export from `discord/constants.ts` |
| `3600` TTL | `verify/constants.ts`, `audit/constants.ts` | Shared `KV_TTL_ONE_HOUR_SECONDS` or document why they differ |
| RSI citizen URL | `citizen.ts` vs `scanz-review-alert.ts` | Single `RSI_CITIZEN_BASE` |

---

## Priority 2: Unify RSI verification pipeline (verify + audit)

The same RSI → classify → compare flow exists twice with different error semantics:

**Audit** (`check-member.ts`) — failures become `inconclusive`:

```typescript
try {
  citizenResult = await fetchCitizenPage(record.rsiHandle);
} catch {
  return buildResult(record, roleIdToName, {
    driftTypes: ["rsi_unreachable"],
    issue: "Could not reach RSI citizen page",
    inconclusive: true,
    // ...
  });
}
```

**Verify** (`confirm.ts`) — failures become `AppError`:

```typescript
try {
  citizenResult = await fetchCitizenPage(session.handle);
} catch {
  return err({ code: "RSI_FETCH_FAILED" });
}
if (citizenResult.status === 404) {
  return err({ code: "RSI_HANDLE_NOT_FOUND" });
}
```

**Recommendation:** Extract a pure pipeline and thin I/O wrappers:

```
src/rsi/
  client.ts              # fetchCitizenPage, fetchOrgMembers (with rate limit + User-Agent)
  resolve-membership.ts  # pure: (citizenHtml, orgBody, path, orgSid) → classification input
  rate-limit.ts          # RSI_DELAY_MS, applied consistently
```

Core pure function shape:

```typescript
type RsiMembershipState = {
  citizenHandle: string | null;
  citizenStatus: number;
  mainOrgSid: string | null;
  orgFound: boolean;
  expectedRoleKeys: VerifyRoleKey[];
  rsiReason: string;
};

function resolveMembership(input: {...}): RsiMembershipState
```

- **Verify wrapper:** maps 404 → `RSI_HANDLE_NOT_FOUND`, network → `RSI_FETCH_FAILED`
- **Audit wrapper:** maps network/Discord failures → `inconclusive: true`

That removes drift risk between verify and audit classification and makes the business rules testable in one place.

Also unify the near-identical check runners in `confirm.ts`:

- `runScanzVerificationChecks`
- `runPartnerVerificationChecks`

These differ only in classifier and org SID source — a single `runVerificationChecks(session, classifyFn)` is enough.

---

## Priority 3: Functional refactors in role and drift logic

### Role sync as set diff

`applyVerificationRoles` uses imperative loops with special-case branches (`src/commands/verify/roles.ts`).

**Recommendation:**

1. Pure: `diffRoles(current: Set<string>, desired: Set<string>) → { add: string[], remove: string[] }`
2. Pure: `resolveTargetRoleIds(env, targetKeys, scanzReviewNeeded)` — encodes the scanz-review exception
3. Effectful: `applyRoleDiff(api, guildId, userId, diff)` — thin loop over add/remove

The scanz-review rule (`roles.ts:58-64`) deserves a comment explaining *why* we add but don't remove @SCANZ/@Verified when review is needed.

### Drift detection as composable predicates

`detectDrift` works but uses imperative `push` and repeated `left_org` guards.

**Recommendation:** Small pure helpers:

- `detectHandleMismatch(input) → DriftType | null`
- `detectScanzRoleDrift(input) → DriftType | null`
- `detectPartnerRoleDrift(input) → DriftType[]`
- `mergeDriftResults(...parts) → DriftDetection` with deduplication

Same behavior, easier to test each rule in isolation.

---

## Priority 4: Magic numbers → named constants

Group by domain in `src/discord/constants.ts`, `src/rsi/constants.ts`, etc.:

| Value | Where | Suggested name |
|-------|-------|----------------|
| `250` | defer delay | `DEFER_ACK_DELAY_MS` |
| `750` | audit RSI delay only | `RSI_REQUEST_DELAY_MS` — apply in verify too or document why audit-only |
| `5`, `300` | follow-up retries | Already named in `interactions.ts`; move to shared config |
| `32` | nickname truncate | `DISCORD_NICKNAME_MAX_LENGTH` |
| `100` | ping thread name | `DISCORD_THREAD_NAME_MAX_LENGTH` |
| `1000` | guild members page | `DISCORD_GUILD_MEMBERS_PAGE_SIZE` |
| `1024`, `68608` | channel permissions | `PermissionFlags.VIEW_CHANNEL`, etc. (mirror `MessageFlags` in `types.ts`) |
| `309641595920` | bot invite | Already documented — keep |
| `total * 2 / 60` | audit ETA | `RSI_CALLS_PER_MEMBER = 2`, `estimateAuditMinutes(total)` with comment |
| HTTP `200`, `404` | scattered | `HttpStatus.OK`, `HttpStatus.NOT_FOUND` or `isOkStatus(n)` |

**Guild-specific IDs** in `config/staff-roles.ts` and `config/activities.ts` are fine as config, but staff role IDs could move to env vars like other role IDs for consistency across environments.

**Discord component raw types** (`components.ts`: `type: 1`, `style: 1`) — use enums/constants from `discord/types.ts` the same way `MessageFlags.EPHEMERAL` is used.

---

## Priority 5: Error handling consistency

Three patterns exist today:

| Pattern | Used in |
|---------|---------|
| `Result<T, AppError>` | Commands, guards, verify |
| `throw DiscordApiError` | Discord API client |
| `throw new Error("AUDIT_RECORD_NOT_FOUND")` | Audit batch processing |

### Problems

1. **Audit handler swallows all errors** (`src/commands/audit/handler.ts`) — RSI/Discord failures surface as "no verify record", which is misleading.

2. **Session missing uses wrong code** — `processVerifyConfirm` returns `VERIFY_SESSION_EXPIRED` when session is null, but `execute-confirm` maps invalid custom ID to `VERIFY_SESSION_NOT_FOUND`. Align code with semantics.

### Recommendation

- Domain modules return `Result<T, AppError>` at boundaries
- Infrastructure (`DiscordApiClient`, RSI fetch) throws typed errors mapped once at the executor layer
- Audit path: add `AUDIT_INCONCLUSIVE`, `AUDIT_RSI_FAILED`, etc., or reuse existing codes with clearer mapping

Move `formatDiscordApiError` from `confirm.ts` next to `formatUnknownError` in `log.ts` — it's shared error formatting, not confirm-specific.

---

## Priority 6: Architecture tidy-ups

### Shared types

`VerifyPath` / `"scanz" | "partner"` appears in `db/verify-records.ts`, `audit/types.ts`, and `rsi/types.ts`. Export once from `src/lib/verify-types.ts` (or `db/verify-records.ts`) and import everywhere.

### Interaction executor abstraction

`executeCommand` and `executeVerifyConfirm` share the same skeleton: defer → guards → handler → followUp → catch. A small helper reduces duplication without over-abstracting:

```typescript
async function executeDeferredInteraction<T>({
  deferMs,
  run,
  followUp,
  errorMessage,
}: {...}): Promise<void>
```

### Discord / RSI client interfaces

`DiscordApiClient` is a concrete class; handlers call `createDiscordApiClient(env)` internally. For testing handlers with light mocks:

```typescript
export interface DiscordApi {
  getGuildMember(...): Promise<...>;
  addMemberRole(...): Promise<void>;
  // ...
}
```

Same for RSI — an `RsiClient` interface with `fetchCitizen` / `fetchOrgMembers`. Production uses real fetch; tests inject fixtures. Not needed for the first wave of tests (pure functions first).

### KV cache in `provision-org.ts`

Org role/channel IDs are cached without TTL. Add TTL or a comment that manual Discord changes require cache invalidation — stale IDs are a real operational footgun.

### `confirm.ts` scanz vs partner finalize

`processScanzVerifyConfirm` and `processPartnerVerifyConfirm` (~90 lines each) share: checks → Discord update → upsert record → delete session → log → success message. Extract `finalizeVerification({ path, handle, roles, nickname, ... })` for the common tail; keep path-specific provisioning (partner org role/channel) in the partner branch.

### Other duplication

| Location | Issue | Suggested refactor |
|----------|-------|-------------------|
| `provision-org.ts` | `ensurePartnerOrgRole` / `ensurePartnerOrgChannel` share cache-hit → list → find → create → cache pattern | Generic `ensureCachedResource({ cacheKey, find, create })` |
| `process-audit-run.ts` | Guild role map built twice (`Object.fromEntries` vs `new Map`) | `buildRoleIdToNameMap(roles): Map<string, string>` used everywhere |
| `run-audit.ts` vs `format-report.ts` | Inconclusive count computed in two places | Derive once on `AuditRunResult` or a small summary helper |
| `scanz-review-alert.ts` vs `roles.ts` | Role mention formatting overlaps | Reuse `getRoleIdForKey` + a `formatRoleMentions(env, keys)` helper |

---

## Priority 7: Comments — where they matter

Good comments already exist in a few places (`audit/constants.ts`, `permissions.ts`, `ping/threads.ts`). Add comments where **business rules are non-obvious**, not on every function:

| Location | What to document |
|----------|------------------|
| `roles.ts:58-64` | Why scanz-review keeps roles instead of removing |
| `roles.ts:137-152` | Affiliate-only partner path role resolution |
| `rsi/citizen.ts` | HTML scraping fragility; RSI markup changes break parsers |
| `rsi/org-members.ts` | Search API quirk (already partially documented) |
| `check-member.ts` | Why audit uses `inconclusive` vs verify's hard errors |
| `execute.ts:53` | Why `/verify` bypasses scanz guard (`requiresScanzRole: false`) |
| `process-audit-run.ts:191` | ETA formula: 2 RSI calls × delay per member |

Avoid narrating obvious code (`// increment counter`). Prefer "why" over "what".

---

## Testing strategy (minimal mocking)

There are **no tests** today and no Vitest/Jest in `package.json`. Recommended approach:

### Phase 1 — Pure functions only (no mocks)

Add Vitest (works well with Workers/TS):

```bash
npm i -D vitest
```

High-value first tests:

| Module | Example cases |
|--------|---------------|
| `classify.ts` | SCANZ main org → scanz+verified; roster-only → affiliate path |
| `detect-drift.ts` | handle mismatch, left org, affiliate-only with @Verified, inconclusive on non-200 |
| `citizen.ts` parsers | fixture HTML snippets → parsed handle/SID/bio |
| `org-members.ts` | found/not found in HTML/JSON responses |
| `export-csv.ts` | commas/quotes in fields, drift type joining |
| `errorToMessage` | each `AppError` code returns expected string |
| `guards/*` | missing member, wrong role, wrong guild |
| `diffRoles` (once extracted) | add/remove sets |

Keep fixtures as `test/fixtures/rsi-citizen-*.html` — real captured pages, not live fetch.

### Phase 2 — Handler logic with injected deps (light mocks)

Test `processVerifyConfirm` / `checkMemberAudit` by passing:

- Mock `DiscordApi` (returns fixed member roles)
- Mock `RsiClient` (returns fixture responses)
- In-memory KV stub for sessions

Avoid testing `executeCommand` end-to-end — that's integration territory.

### Phase 3 — Skip or minimize

- Discord signature verification
- `followUpEphemeral` retry loop (unless you extract retry policy as pure function)
- Wrangler cron / `WORKER_SELF.fetch` continuation — manual or staging tests

**Target:** ~80% coverage on pure domain; ~20% on orchestration with fakes; almost no live API calls in CI.

---

## Suggested module layout (incremental)

```
src/
  lib/
    async.ts              # sleep
    result.ts             # (existing)
    verify-types.ts       # VerifyPath, shared types
  discord/
    constants.ts          # API base, limits, defer delay
    interaction-utils.ts  # getInteractionUserId
    api.ts                # + DiscordApi interface
  rsi/
    constants.ts          # delays, URLs, User-Agent
    client.ts             # fetch wrappers
    resolve-membership.ts # pure classification pipeline
  verify/
    finalize.ts           # shared confirm tail
    role-diff.ts          # pure diff + apply
```

You don't need a big-bang restructure — extract utilities first, then RSI pipeline, then tests.

---

## Recommended execution order

1. **Quick wins** — `sleep`, `getInteractionUserId`, `DEFER_ACK_DELAY_MS`, `SCANZ_SID`, button prefix, Discord API base
2. **Constants pass** — Discord limits, HTTP status, permission flags
3. **Vitest + pure function tests** — classifiers, parsers, drift, CSV, guards
4. **RSI pipeline extraction** — verify + audit share one resolver
5. **Role diff refactor** — pure diff + thin apply
6. **Error handling in audit path** — narrow catches, typed results
7. **Client interfaces** — when you want handler-level tests

---

## Summary

The codebase already leans functional in the right places (`Result`, classifiers, drift detection, guards). The main technical debt is **copy-pasted interaction/RSI plumbing** and **two parallel verification flows** that will drift over time. Magic numbers are partly centralized but Discord/RSI timing and limits are still scattered. Testing can start immediately on pure modules with **zero mocks**; interfaces for Discord/RSI come later when you want to test confirm/audit orchestration.

A sensible first PR: extract shared utilities + constants, add Vitest, and ship tests for `classify`, `detectDrift`, and the RSI parsers. That's small, reviewable, and establishes the pattern for everything else.
