import { RSI_ORG_MEMBERS_URL, RSI_USER_AGENT } from "./constants";
import type {
  OrgMembersApiResponse,
  OrgMembersFetchResult,
  ParsedOrgMembers,
} from "./types";

const AFFILIATE_TITLE_PATTERN = /<span class="title">Affiliate<\/span>/i;
const ORG_MAIN_PATTERN = /\borg-main\b/;
const CITIZEN_PATH_PATTERN = /\/citizens\/([^"'/?#]+)/gi;

/** RSI org search is prefix-based; confirm the exact handle appears in results. */
export function isHandleInOrgMembersHtml(
  html: string | null,
  handle: string,
): boolean {
  if (!html || handle.length === 0) {
    return false;
  }

  const target = handle.toUpperCase();

  for (const match of html.matchAll(CITIZEN_PATH_PATTERN)) {
    const citizenHandle = match[1]?.trim();
    if (citizenHandle && citizenHandle.toUpperCase() === target) {
      return true;
    }
  }

  return false;
}

export async function fetchOrgMembers(
  handle: string,
  symbol: string,
): Promise<OrgMembersFetchResult> {
  const started = Date.now();
  const response = await fetch(RSI_ORG_MEMBERS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": RSI_USER_AGENT,
    },
    body: JSON.stringify({
      symbol,
      search: handle,
    }),
  });

  const body = await response.text();

  return {
    status: response.status,
    body,
    latencyMs: Date.now() - started,
  };
}

export function parseOrgMembersResponse(
  rawBody: string,
  handle?: string,
): ParsedOrgMembers {
  let parsed: OrgMembersApiResponse;

  try {
    parsed = JSON.parse(rawBody) as OrgMembersApiResponse;
  } catch {
    return {
      totalRows: 0,
      found: false,
      isAffiliate: false,
      hasOrgMain: false,
      html: null,
    };
  }

  const totalRows = parsed.data?.totalrows ?? 0;
  const html = parsed.data?.html ?? null;
  const found =
    handle !== undefined
      ? isHandleInOrgMembersHtml(html, handle)
      : totalRows > 0;

  return {
    totalRows,
    found,
    isAffiliate: html ? AFFILIATE_TITLE_PATTERN.test(html) : false,
    hasOrgMain: html ? ORG_MAIN_PATTERN.test(html) : false,
    html,
  };
}
