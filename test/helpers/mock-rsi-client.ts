import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RsiClient } from "../../src/rsi/client";
import { HttpStatus } from "../../src/lib/http-status";

const fixturesDir = join(__dirname, "../fixtures/rsi");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

export type MockRsiClientOptions = {
  citizenFixture?: string;
  orgFixture?: string;
  citizenStatus?: number;
  orgStatus?: number;
  citizenThrows?: boolean;
  orgThrows?: boolean;
  orgFound?: boolean;
  bioCode?: { orgSid: string; code: string };
  citizenHtml?: string;
  orgBody?: string;
};

function injectBioCode(html: string, orgSid: string, code: string): string {
  const verifyLine = `[${orgSid}: ${code}]`;

  if (html.includes("</div></div>")) {
    return html.replace(
      /(<div class="entry bio">[\s\S]*?<div class="value">)([\s\S]*?)(<\/div>)/i,
      `$1${verifyLine}$3`,
    );
  }

  return `${html}\n<div class="entry bio"><div class="value">${verifyLine}</div></div>`;
}

export function createMockRsiClient(
  options: MockRsiClientOptions = {},
): RsiClient {
  const citizenStatus = options.citizenStatus ?? HttpStatus.OK;
  const orgStatus = options.orgStatus ?? HttpStatus.OK;

  let citizenHtml = options.citizenHtml;
  if (!citizenHtml && options.citizenFixture) {
    citizenHtml = loadFixture(options.citizenFixture);
  }
  if (citizenHtml && options.bioCode) {
    citizenHtml = injectBioCode(
      citizenHtml,
      options.bioCode.orgSid,
      options.bioCode.code,
    );
  }

  let orgBody = options.orgBody;
  if (!orgBody && options.orgFixture) {
    orgBody = loadFixture(options.orgFixture);
  }
  if (orgBody === undefined && options.orgFound === false) {
    orgBody = JSON.stringify({
      success: 1,
      data: { totalrows: 0, html: "" },
    });
  }

  return {
    fetchCitizen: async () => {
      if (options.citizenThrows) {
        throw new Error("citizen fetch failed");
      }

      return {
        status: citizenStatus,
        html: citizenHtml ?? "",
        latencyMs: 1,
      };
    },
    fetchOrgMembers: async () => {
      if (options.orgThrows) {
        throw new Error("org fetch failed");
      }

      return {
        status: orgStatus,
        body: orgBody ?? loadFixture("org-members-found.json"),
        latencyMs: 1,
      };
    },
  };
}
