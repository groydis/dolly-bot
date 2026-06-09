import { HttpStatus } from "../../src/lib/http-status";

export type MockWorkerSelf = Fetcher & {
  requests: Request[];
};

export function createMockWorkerSelf(): MockWorkerSelf {
  const requests: Request[] = [];

  return {
    requests,
    fetch: async (request: Request) => {
      requests.push(request);
      return new Response("accepted", { status: HttpStatus.ACCEPTED });
    },
  } as MockWorkerSelf;
}
