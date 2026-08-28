// The models an account has published, read without signing in to anything.
//
// A model is a drawing somebody made in rm-stacker and published to their own
// account: a record naming it, pointing at the zip the editor saves. Both the
// record and the zip are public, so dressing this world in somebody's drawing
// costs nothing but their name — no session, no account of this world's own,
// and nothing asked of the person who drew it.
//
// The vocabulary itself comes from the editor that writes it
// (`@big-mesh-studios/stacker/lexicon`), so the collection these records
// live in is named in one place across the two programs.
import { Client, ok, simpleFetchHandler } from "@atcute/client";
import type {
  ActorIdentifier,
  Did,
  Handle,
  Nsid,
  RecordKey,
} from "@atcute/lexicons";
import {
  blobUrl,
  isModelRecord,
  MODEL_COLLECTION,
  modelBlobCid,
  modelRkey,
  type PublishedModel,
} from "@big-mesh-studios/stacker/lexicon";
import {
  createDidDocumentResolver,
  createHandleResolver,
  pdsEndpoint,
} from "@big-mesh-studios/atproto/identity";

/**
 * The account the studio publishes its own drawings to. Anyone can point the
 * game at another account instead — the drawings are read the same way whoever
 * made them — but this is the one whose models it arrives wearing.
 */
export const WORLD_MODEL_ACCOUNT = "bigmesh.eurosky.social";

/** What the monsters are drawn as, named as it is published. */
export const MONSTER_MODEL_NAME = "zombie";

/** Where an account's records are: which account a name means, and which server holds it. */
export interface AccountLocation {
  did: string;
  /** That server's base address, without a trailing slash. */
  service: string;
}

/** Resolves what someone typed — a handle or an account id — to where its records are. */
export type LocateAccount = (identifier: string) => Promise<AccountLocation>;

export interface ModelLibrary {
  /** Every model `account` has published, in the order its server lists them. */
  list(account: string): Promise<PublishedModel[]>;
  /**
   * The model `account` published under `name`.
   *
   * @throws When the account published nothing under that name, or published
   * something this cannot open.
   */
  find(account: string, name: string): Promise<PublishedModel>;
  /** The zip `model` points at, as the loader takes it. */
  file(model: PublishedModel): Promise<Blob>;
}

/**
 * Reads published models over the public half of atproto: a repository's
 * records and the blobs they point at, both served by whichever server holds
 * the account.
 *
 * Where an account lives and how its files are fetched are both taken as
 * parameters, so a test can answer for a repository that does not exist
 * without resolving a name or reaching a network.
 */
export const createModelLibrary = (params?: {
  locate?: LocateAccount;
  fetch?: typeof globalThis.fetch;
}): ModelLibrary => {
  const locate = params?.locate ?? locateAccount;
  const fetchFile = params?.fetch ?? globalThis.fetch.bind(globalThis);
  /** What was typed -> where its records are, so naming one account twice resolves it once. */
  const located = new Map<string, Promise<AccountLocation>>();

  const locateOnce = (identifier: string): Promise<AccountLocation> => {
    const pending = located.get(identifier) ?? locate(identifier);
    located.set(identifier, pending);
    return pending;
  };

  /** A client aimed at the server holding `account`, asking it nothing private. */
  const clientFor = async (account: string) => {
    const location = await locateOnce(account);
    return {
      location,
      client: new Client({
        handler: simpleFetchHandler({
          service: location.service,
          fetch: fetchFile,
        }),
      }),
    };
  };

  return {
    async list(account) {
      const { location, client } = await clientFor(account);
      const models: PublishedModel[] = [];
      let cursor: string | undefined;
      do {
        const page = await ok(
          client.get("com.atproto.repo.listRecords", {
            params: {
              repo: location.did as ActorIdentifier,
              collection: MODEL_COLLECTION as Nsid,
              cursor,
              limit: 100,
            },
          }),
        );
        cursor = page.cursor;
        models.push(...publishedModels(location.did, page.records));
      } while (cursor !== undefined);
      return models;
    },

    async find(account, name) {
      const rkey = modelRkey(name);
      const { location, client } = await clientFor(account);
      const response = await ok(
        client.get("com.atproto.repo.getRecord", {
          params: {
            repo: location.did as ActorIdentifier,
            collection: MODEL_COLLECTION as Nsid,
            rkey: rkey as RecordKey,
          },
        }),
      );
      if (!isModelRecord(response.value)) {
        throw new Error(`"${name}" is not a model this can open`);
      }
      return { repo: location.did, rkey, record: response.value };
    },

    async file(model) {
      const { service } = await locateOnce(model.repo);
      const url = blobUrl(service, model.repo, modelBlobCid(model.record));
      const response = await fetchFile(url);
      if (!response.ok) {
        throw new Error(
          `the server holding ${model.repo} would not serve "${model.record.name}" (${response.status})`,
        );
      }
      return response.blob();
    },
  };
};

/**
 * The models in a page of records, with the key each was published under.
 * Everything here was written by another program, so a record that is not a
 * model, or is one this cannot open, is passed over rather than listed and
 * then failing to load.
 */
export const publishedModels = (
  repo: string,
  records: ReadonlyArray<{ uri: string; value: unknown }>,
): PublishedModel[] =>
  records.flatMap(({ uri, value }) =>
    isModelRecord(value) ? [{ repo, rkey: rkeyOf(uri), record: value }] : [],
  );

/** The record key in an `at://` address, which is everything after its last slash. */
const rkeyOf = (uri: string): string => uri.slice(uri.lastIndexOf("/") + 1);

const handleResolver = createHandleResolver();
const didDocumentResolver = createDidDocumentResolver();

/**
 * Resolves an account the way the rest of this world does: a handle through
 * the two places its own owner controls, an account id through the directory
 * that issued it, and either on to the server holding its records.
 */
export const locateAccount: LocateAccount = async (identifier) => {
  const did = identifier.startsWith("did:")
    ? (identifier as Did)
    : await handleResolver.resolve(identifier as Handle);
  const document = await didDocumentResolver.resolve(did as Did<"plc" | "web">);
  return { did, service: pdsEndpoint(document) };
};
