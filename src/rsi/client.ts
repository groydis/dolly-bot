import { fetchCitizenPage } from "./citizen";
import { fetchOrgMembers } from "./org-members";

export interface RsiClient {
  fetchCitizen(handle: string): ReturnType<typeof fetchCitizenPage>;
  fetchOrgMembers(
    handle: string,
    orgSid: string,
  ): ReturnType<typeof fetchOrgMembers>;
}

export const defaultRsiClient: RsiClient = {
  fetchCitizen: fetchCitizenPage,
  fetchOrgMembers,
};
