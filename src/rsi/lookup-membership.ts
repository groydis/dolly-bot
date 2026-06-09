import type { VerifyPath } from "../db/verify-records";
import { sleep } from "../lib/async";
import { isHttpOk } from "../lib/http-status";
import { defaultRsiClient, type RsiClient } from "./client";
import { parseCitizenPage } from "./citizen";
import { rosterOrgSidForPath } from "./expected-roles";
import { parseOrgMembersResponse } from "./org-members";
import type { ParsedCitizen } from "./types";

export type OrgRosterLookup = {
  found: boolean;
  fetchFailed: boolean;
  status?: number;
  totalRows?: number;
  latencyMs?: number;
};

export type RsiMembershipLookup = {
  rosterHandle: string;
  rosterOrgSid: string;
  citizenStatus: number;
  citizenFetchFailed: boolean;
  parsedCitizen: ParsedCitizen | null;
  orgFound: boolean;
  orgFetchFailed: boolean;
  orgStatus?: number;
  orgTotalRows?: number;
  orgLatencyMs?: number;
};

export async function fetchOrgRosterLookup(
  handle: string,
  rosterOrgSid: string,
  rsiClient: RsiClient = defaultRsiClient,
): Promise<OrgRosterLookup> {
  try {
    const orgResult = await rsiClient.fetchOrgMembers(handle, rosterOrgSid);
    const parsed =
      isHttpOk(orgResult.status)
        ? parseOrgMembersResponse(orgResult.body, handle)
        : { found: false, totalRows: 0 };

    return {
      found: parsed.found,
      fetchFailed: false,
      status: orgResult.status,
      totalRows: parsed.totalRows,
      latencyMs: orgResult.latencyMs,
    };
  } catch {
    return {
      found: false,
      fetchFailed: true,
    };
  }
}

/**
 * Fetches RSI citizen page and org roster, optionally rate-limiting between calls.
 * Verify omits rateLimitMs; batch audit passes RSI_REQUEST_DELAY_MS to avoid throttling.
 */
export async function lookupRsiMembership(input: {
  handle: string;
  verifyPath: VerifyPath;
  orgSid: string;
  rateLimitMs?: number;
  rsiClient?: RsiClient;
}): Promise<RsiMembershipLookup> {
  const rsiClient = input.rsiClient ?? defaultRsiClient;
  const rosterOrgSid = rosterOrgSidForPath(input.verifyPath, input.orgSid);

  let citizenStatus = 0;
  let citizenFetchFailed = false;
  let parsedCitizen: ParsedCitizen | null = null;
  let rosterHandle = input.handle;

  try {
    const citizenResult = await rsiClient.fetchCitizen(input.handle);
    citizenStatus = citizenResult.status;

    if (isHttpOk(citizenResult.status)) {
      parsedCitizen = parseCitizenPage(citizenResult.html);
      rosterHandle = parsedCitizen.handle ?? input.handle;
    }
  } catch {
    return {
      rosterHandle: input.handle,
      rosterOrgSid,
      citizenStatus: 0,
      citizenFetchFailed: true,
      parsedCitizen: null,
      orgFound: false,
      orgFetchFailed: false,
    };
  }

  if (input.rateLimitMs !== undefined) {
    await sleep(input.rateLimitMs);
  }

  if (!isHttpOk(citizenStatus)) {
    return {
      rosterHandle,
      rosterOrgSid,
      citizenStatus,
      citizenFetchFailed: false,
      parsedCitizen,
      orgFound: false,
      orgFetchFailed: false,
    };
  }

  const orgLookup = await fetchOrgRosterLookup(
    rosterHandle,
    rosterOrgSid,
    rsiClient,
  );

  if (input.rateLimitMs !== undefined) {
    await sleep(input.rateLimitMs);
  }

  return {
    rosterHandle,
    rosterOrgSid,
    citizenStatus,
    citizenFetchFailed: false,
    parsedCitizen,
    orgFound: orgLookup.found,
    orgFetchFailed: orgLookup.fetchFailed,
    orgStatus: orgLookup.status,
    orgTotalRows: orgLookup.totalRows,
    orgLatencyMs: orgLookup.latencyMs,
  };
}
