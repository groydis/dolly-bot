import type {
  OrgMembersApiResponse,
  OrgMembersFetchResult,
  ParsedOrgMembers,
} from "./types";

const RSI_ORG_MEMBERS_URL =
  "https://robertsspaceindustries.com/api/orgs/getOrgMembers";

const AFFILIATE_TITLE_PATTERN = /<span class="title">Affiliate<\/span>/i;
const ORG_MAIN_PATTERN = /\borg-main\b/;

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
      "User-Agent": "DollyBot-Verify/1.0",
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

export function parseOrgMembersResponse(rawBody: string): ParsedOrgMembers {
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

  return {
    totalRows,
    found: totalRows > 0,
    isAffiliate: html ? AFFILIATE_TITLE_PATTERN.test(html) : false,
    hasOrgMain: html ? ORG_MAIN_PATTERN.test(html) : false,
    html,
  };
}
