export type R2StoredObject = {
  key: string;
  body: string;
  contentType?: string;
};

export type MemoryR2 = R2Bucket & {
  objects: Map<string, R2StoredObject>;
};

export function createMemoryR2(): MemoryR2 {
  const objects = new Map<string, R2StoredObject>();

  return {
    objects,
    put: async (
      key: string,
      value: string,
      options?: { httpMetadata?: { contentType?: string } },
    ) => {
      objects.set(key, {
        key,
        body: value,
        contentType: options?.httpMetadata?.contentType,
      });
    },
    get: async (key: string) => {
      const stored = objects.get(key);
      if (!stored) {
        return null;
      }

      return {
        key: stored.key,
        text: async () => stored.body,
      };
    },
    head: async (key: string) => {
      const stored = objects.get(key);
      if (!stored) {
        return null;
      }

      return {
        key: stored.key,
        size: stored.body.length,
        httpMetadata: { contentType: stored.contentType },
      };
    },
    delete: async (key: string) => {
      objects.delete(key);
    },
    list: async () => ({
      objects: [...objects.values()].map((object) => ({ key: object.key })),
      truncated: false,
    }),
  } as unknown as MemoryR2;
}
