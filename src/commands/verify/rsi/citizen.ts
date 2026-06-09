import type { CitizenFetchResult, ParsedCitizen } from "./types";

const RSI_CITIZEN_BASE =
  "https://robertsspaceindustries.com/en/citizens";

const HANDLE_LABEL_PATTERN =
  /<span class="label">Handle name<\/span>\s*<strong class="value">([^<]+)<\/strong>/i;

const SID_LABEL_PATTERN =
  /Spectrum Identification \(SID\)[\s\S]*?<strong class="value[^"]*">([^<]+)<\/strong>/i;

const BIO_BLOCK_PATTERN =
  /<div class="entry bio">[\s\S]*?<div class="value">([\s\S]*?)<\/div>/i;

const VERIFY_CODE_PATTERN = /\[SCANZ:\s*([A-Za-z0-9]+)\]/i;

export async function fetchCitizenPage(handle: string): Promise<CitizenFetchResult> {
  const started = Date.now();
  const response = await fetch(`${RSI_CITIZEN_BASE}/${encodeURIComponent(handle)}`, {
    headers: {
      Accept: "text/html",
      "User-Agent": "DollyBot-Verify/1.0",
    },
  });

  const html = await response.text();

  return {
    status: response.status,
    html,
    latencyMs: Date.now() - started,
  };
}

export function normalizeBioHtml(bioHtml: string): string {
  return bioHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

export function parseCitizenPage(html: string): ParsedCitizen {
  const handleMatch = html.match(HANDLE_LABEL_PATTERN);
  const sidMatch = html.match(SID_LABEL_PATTERN);
  const bioMatch = html.match(BIO_BLOCK_PATTERN);

  return {
    handle: handleMatch?.[1]?.trim() ?? null,
    mainOrgSid: sidMatch?.[1]?.trim() ?? null,
    bioText: bioMatch?.[1] ? normalizeBioHtml(bioMatch[1]) : null,
  };
}

export function extractVerifyCode(
  bioText: string,
  expectedCode: string,
): boolean {
  const match = bioText.match(VERIFY_CODE_PATTERN);
  if (!match?.[1]) {
    return false;
  }

  return match[1].toUpperCase() === expectedCode.toUpperCase();
}
