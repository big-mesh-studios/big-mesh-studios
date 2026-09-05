// Publishing places and reading them back over atproto. The read half mirrors
// `models.ts`: a place lives in its author's repository, its record and its zip
// both public, so listing a place or booting its world costs nothing but the
// author's name. The write half is what publishing is — uploading the zip and
// putting the record it describes under a key made from its name — and needs
// the signed-in account, unlike reading, so the two halves are separate
// objects: `PlaceLibrary` for anyone, `PlacePublisher` for an account of one's
// own.
import { Client, ok, simpleFetchHandler } from "@atcute/client";
import type {
  ActorIdentifier,
  Did,
  Handle,
  Nsid,
  RecordKey,
} from "@atcute/lexicons";
import type {
  AtprotoBlobClient,
  AtprotoRepoClient,
} from "@big-mesh-studios/atproto/repo-client";
import {
  createDidDocumentResolver,
  createHandleResolver,
  pdsEndpoint,
} from "@big-mesh-studios/atproto/identity";
import { readPlaceZip } from "../places/package";
import {
  isPlaceRecord,
  makePlaceRecord,
  parsePlaceAtUri,
  placeAtUri,
  placeRkey,
  PLACE_COLLECTION,
  PLACE_MIME_TYPE,
  type PlaceRecord,
  type PublishedPlace,
} from "../places/place";
import { blobUrl } from "@big-mesh-studios/stacker/lexicon";

/** Where an account's place records are: which account a name means, which server holds it. */
export interface PlaceLibrary {
  /** Every place `account` has published, in the order its server lists them. */
  list(account: string): Promise<PublishedPlace[]>;
  /**
   * The place `account` published under `name`.
   *
   * @throws When the account published nothing under that name, or published
   * something this cannot open.
   */
  find(account: string, name: string): Promise<PublishedPlace>;
  /** The place an `at://` address names, wherever it lives. */
  recordAtUri(uri: string): Promise<PublishedPlace>;
  /** The zip `place` points at. */
  file(place: PublishedPlace): Promise<Blob>;
}

/**
 * Reads published places over the public half of atproto, with `locate` and
 * `fetch` injectable so a test can answer for a repository that does not exist.
 */
export const createPlaceLibrary = (params?: {
  locate?: (identifier: string) => Promise<{ did: string; service: string }>;
  fetch?: typeof globalThis.fetch;
}): PlaceLibrary => {
  const locate = params?.locate ?? locateAccount;
  const fetchFile = params?.fetch ?? globalThis.fetch.bind(globalThis);
  const located = new Map<string, Promise<{ did: string; service: string }>>();

  const locateOnce = (identifier: string) => {
    const pending = located.get(identifier) ?? locate(identifier);
    located.set(identifier, pending);
    return pending;
  };

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

  const getPlace = async (
    location: { did: string; service: string },
    rkey: string,
  ): Promise<PublishedPlace> => {
    const client = new Client({
      handler: simpleFetchHandler({
        service: location.service,
        fetch: fetchFile,
      }),
    });
    const response = await ok(
      client.get("com.atproto.repo.getRecord", {
        params: {
          repo: location.did as ActorIdentifier,
          collection: PLACE_COLLECTION as Nsid,
          rkey: rkey as RecordKey,
        },
      }),
    );
    if (!isPlaceRecord(response.value)) {
      throw new Error(`"${rkey}" is not a place this can open`);
    }
    return { repo: location.did, rkey, record: response.value };
  };

  return {
    async list(account) {
      const { location, client } = await clientFor(account);
      const places: PublishedPlace[] = [];
      let cursor: string | undefined;
      do {
        const page = await ok(
          client.get("com.atproto.repo.listRecords", {
            params: {
              repo: location.did as ActorIdentifier,
              collection: PLACE_COLLECTION as Nsid,
              cursor,
              limit: 100,
            },
          }),
        );
        cursor = page.cursor;
        for (const { uri, value } of page.records) {
          if (!isPlaceRecord(value)) {
            continue;
          }
          const rkey = uri.slice(uri.lastIndexOf("/") + 1);
          places.push({ repo: location.did, rkey, record: value });
        }
      } while (cursor !== undefined);
      return places;
    },

    async find(account, name) {
      const location = await locateOnce(account);
      return getPlace(location, placeRkey(name));
    },

    async recordAtUri(uri) {
      const parsed = parsePlaceAtUri(uri);
      if (parsed === null) {
        throw new Error(`"${uri}" is not a place address`);
      }
      const location = await locateOnce(parsed.repo);
      return getPlace(location, parsed.rkey);
    },

    async file(place) {
      const location = await locateOnce(place.repo);
      const url = blobUrl(
        location.service,
        place.repo,
        place.record.file.ref.$link,
      );
      const response = await fetchFile(url);
      if (!response.ok) {
        throw new Error(
          `the server holding ${place.repo} would not serve "${place.record.name}" (${response.status})`,
        );
      }
      return response.blob();
    },
  };
};

/** The write half of publishing, bound to one signed-in account. */
export interface PlacePublisher {
  /**
   * Publishes a place zip to the signed-in account's repository under a key
   * made from the manifest's name, and hands back the place's `at://` address.
   * Publishing under the same name again replaces what is there, which is how a
   * place gets updated without players having to follow a new address.
   */
  publish(zip: Blob): Promise<string>;
}

export const createPlacePublisher = (params: {
  /** The signed-in account's record client, or null while signed out. */
  getClient: () => (AtprotoRepoClient & AtprotoBlobClient) | undefined;
  /** The signed-in account's DID, or null while signed out. */
  getRepo: () => string | null;
}): PlacePublisher => ({
  async publish(zip) {
    const client = params.getClient();
    const repo = params.getRepo();
    if (client === undefined || repo === null) {
      throw new Error("not connected — use /account:login first");
    }
    const manifest = await readPlaceZip(zip);
    const file = await client.uploadBlob(
      zip.type === PLACE_MIME_TYPE
        ? zip
        : new Blob([zip], { type: PLACE_MIME_TYPE }),
    );
    const rkey = placeRkey(manifest.name);
    const record: PlaceRecord = makePlaceRecord(
      manifest,
      new Date().toISOString(),
      file,
    );
    await client.putRecord({
      repo,
      collection: PLACE_COLLECTION,
      rkey,
      record,
    });
    return placeAtUri(repo, rkey);
  },
});

const handleResolver = createHandleResolver();
const didDocumentResolver = createDidDocumentResolver();

/**
 * Resolves an account the way the rest of this world does: a handle through the
 * two places its own owner controls, an account id through the directory that
 * issued it, and either on to the server holding its records.
 */
const locateAccount = async (
  identifier: string,
): Promise<{ did: string; service: string }> => {
  const did = identifier.startsWith("did:")
    ? (identifier as Did)
    : await handleResolver.resolve(identifier as Handle);
  const document = await didDocumentResolver.resolve(did as Did<"plc" | "web">);
  return { did, service: pdsEndpoint(document) };
};
