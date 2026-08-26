// The atproto surface the multiplayer mesh needs: exactly the four
// `com.atproto.repo.*` calls used for presence and the signal mailbox. The
// real `Agent` satisfies this structurally; the harness provides an
// in-memory fake in its place, so the mesh can be exercised without any
// network, OAuth, or accounts.
export interface AtprotoRepoLike {
  com: {
    atproto: {
      repo: {
        putRecord(params: {
          repo: string;
          collection: string;
          rkey: string;
          record: { [_ in string]: unknown };
        }): Promise<unknown>;
        getRecord(params: {
          repo: string;
          collection: string;
          rkey: string;
        }): Promise<{ data: { value: unknown } }>;
        listRecords(params: {
          repo: string;
          collection: string;
          cursor?: string;
          limit?: number;
        }): Promise<{
          data: { records: Array<{ value: unknown }> };
          cursor?: string;
        }>;
        deleteRecord(params: {
          repo: string;
          collection: string;
          rkey: string;
        }): Promise<unknown>;
      };
    };
  };
}
