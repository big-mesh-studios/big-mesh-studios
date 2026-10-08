/**
 * Publishing places and reading them back over atproto.
 *
 * ## Two halves, separated by whether an account is needed
 *
 * **A published place is public**, so reading one costs nothing but the author's name: the record
 * carries its scripts inline and no token is sent anywhere. Asked for one account it needs only
 * that account; asked for the whole network it starts from the public relay's directory of which
 * accounts hold a place at all (`PlaceLibrary.listAll`), which is what a browse view is drawn from.
 * Publishing is the other half and needs the signed-in account, so the two are separate objects:
 * `PlaceLibrary` for anyone, `PlacePublisher` for an account of one's own.
 *
 * ## Ported from `apps/voxelscape/src/atproto/places.ts`, and what was taken out
 *
 * The read path is nearly the sibling's, and the part worth keeping is `listAll`'s ceilings —
 * a listing reads accounts it did not choose, some slow, some gone, one malicious, and
 * `ListingLimits` is what makes the answer bounded whatever the network does. All of it is generic
 * apart from the collection name.
 *
 * What was removed is everything to do with models. voxelscape's places attach rm-stacker figures
 * by reference, so its `project()` fetches and rebuilds each one and its `publish()` duplicates any
 * model this account does not already own. This engine's record carries no model references at all
 * (ADR 0044), so `project()` is a manifest and some scripts, and `publish()` refuses a project that
 * carries an attachment rather than silently dropping it — `makePlaceRecord` is where that refusal
 * lives.
 */

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

import {
  isPlaceRecord,
  parsePlaceAtUri,
  placeAtUri,
  placeRkey,
  PLACE_COLLECTION,
  type PlaceListing,
  type PublishedPlace,
} from "../places/place-record";
import {
  makePlaceRecord,
  projectFromRecord,
  type PlaceProject,
} from "../places/project";

/** Where an account's place records are: which account a name means, which server holds it. */
export interface PlaceLibrary {
  /**
   * Every place `account` has published, in the order its server lists them, up to
   * {@link ListingLimits.bytes} of response.
   */
  list(account: string): Promise<PublishedPlace[]>;
  /**
   * Every published place on the network, as far as the relay's directory of which accounts hold
   * one reaches: at most {@link ListingLimits.repos} accounts read,
   * {@link ListingLimits.placesPerAccount} places taken from any one of them,
   * {@link ListingLimits.places} returned, and {@link ListingLimits.deadlineMs} spent starting
   * accounts. An account that cannot be read — slow, gone, or refusing — is passed over rather than
   * failing the listing, and a place is here because its author published it, not because anything
   * listed it.
   *
   * @returns The places found, ordered by name, and whether the listing stopped at one of its
   * ceilings with places or accounts left unread.
   */
  listAll(): Promise<PlaceListing>;
  /**
   * The place `account` published under `name`.
   *
   * @throws When the account published nothing under that name, or published something this cannot
   * open.
   */
  find(account: string, name: string): Promise<PublishedPlace>;
  /** The place an `at://` address names, wherever it lives. */
  recordAtUri(uri: string): Promise<PublishedPlace>;
  /**
   * `place` read back into an editable project: its manifest and its scripts, both already in the
   * record.
   *
   * @throws When the record does not produce a project `isPlaceProject` accepts — which for a
   * record that passed `isPlaceRecord` means its entry names a script it does not carry.
   */
  project(place: PublishedPlace): Promise<PlaceProject>;
}

/** The public relay, whose record directory names every account holding a place. */
const DEFAULT_RELAY = "https://bsky.network";
/** Records asked for per page, the most a server and the relay both accept. */
const PAGE_LIMIT = 100;

/**
 * What one listing may spend. Every ceiling is here rather than scattered, because a listing reads
 * accounts it did not choose and the answer a page gets back has to be bounded whatever the network
 * does. Overridable so a test can narrow them.
 */
export interface ListingLimits {
  /** Accounts read, whatever the network goes on to hold. */
  repos: number;
  /** Places one account may contribute, so no one account spends the listing. */
  placesPerAccount: number;
  /** Places the listing returns. */
  places: number;
  /**
   * Response the listing reads before it stops. A place record carries its scripts inline, so how
   * many records it has read says nothing about how much they weighed.
   */
  bytes: number;
  /** Accounts read at once, so a listing spreads its requests instead of firing two hundred at a relay. */
  concurrent: number;
  /** Pages one account may hand over, for a server whose cursor never reaches its end. */
  pagesPerAccount: number;
  /** How long one request may take before the listing treats the account as gone. */
  requestMs: number;
  /** How long the listing keeps starting new accounts before it answers with what it has. */
  deadlineMs: number;
}

const LISTING_LIMITS: ListingLimits = {
  repos: 200,
  placesPerAccount: 20,
  places: 200,
  bytes: 8_000_000,
  concurrent: 8,
  pagesPerAccount: 20,
  requestMs: 10_000,
  deadlineMs: 20_000,
};

/**
 * Reads published places over the public half of atproto, with `locate` and `fetch` injectable so a
 * test can answer for a repository that does not exist.
 */
export const createPlaceLibrary = (params?: {
  locate?: (identifier: string) => Promise<{ did: string; service: string }>;
  fetch?: typeof globalThis.fetch;
  relay?: string;
  limits?: Partial<ListingLimits>;
}): PlaceLibrary => {
  const locate = params?.locate ?? locateAccount;
  const fetchFile = params?.fetch ?? globalThis.fetch.bind(globalThis);
  const relay = params?.relay ?? DEFAULT_RELAY;
  const limits = { ...LISTING_LIMITS, ...params?.limits };
  const located = new Map<string, Promise<{ did: string; service: string }>>();

  const locateOnce = (identifier: string) => {
    const pending = located.get(identifier) ?? locate(identifier);
    located.set(identifier, pending);
    return pending;
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

  /**
   * `url` answered, or a refusal naming what it was. A listing reads servers it did not choose, and
   * a connection that is accepted and never answered would otherwise hold the whole listing open
   * for as long as the browser feels patient — every worker in the pool waiting on one that will
   * not return.
   */
  const fetchWithin = async (url: string): Promise<Response> => {
    const abort = new AbortController();
    const giveUp = setTimeout(
      () => abort.abort(new Error("the request was given up on")),
      limits.requestMs,
    );
    try {
      return await fetchFile(url, { signal: abort.signal });
    } catch (err) {
      if (abort.signal.aborted) {
        throw new Error(`${url} did not answer within ${limits.requestMs}ms`, {
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(giveUp);
    }
  };

  /**
   * Every account the relay holds a place record in, at most `limits.repos` of them, and whether
   * the relay named more than it returned. The relay's directory is the one view of the whole
   * network a page can read without being told an account's name first, and an account it names
   * twice is one account, not two. The walk ends on a page naming nothing new as well as on the
   * account ceiling, since a relay repeating the accounts it already named never reaches a count of
   * its own.
   */
  const listRepos = async (): Promise<{
    accounts: string[];
    more: boolean;
  }> => {
    const accounts: string[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined;
    do {
      const search = new URLSearchParams({
        collection: PLACE_COLLECTION,
        limit: String(PAGE_LIMIT),
      });
      if (cursor !== undefined) {
        search.set("cursor", cursor);
      }
      const response = await fetchWithin(
        `${relay}/xrpc/com.atproto.sync.listReposByCollection?${search.toString()}`,
      );
      if (!response.ok) {
        throw new Error(
          `the relay answered ${response.status} for its directory`,
        );
      }
      const body = (await response.json()) as {
        repos?: { did: string }[];
        cursor?: string;
      };
      const before = accounts.length;
      for (const repo of body.repos ?? []) {
        if (seen.has(repo.did)) {
          continue;
        }
        seen.add(repo.did);
        accounts.push(repo.did);
      }
      cursor = body.cursor;
      if (accounts.length === before) {
        break;
      }
    } while (cursor !== undefined && accounts.length < limits.repos);
    return {
      accounts: accounts.slice(0, limits.repos),
      more: cursor !== undefined,
    };
  };

  /**
   * One account's place records, its pages walked until the account holds no more of them, `limit`
   * of them have been read, `pages` of them have been asked for, or `read` has reached
   * `limits.bytes` — along with whether stopping left any of that account's places unread. What
   * each page weighed is added to `read`, so one counter bounds every account a network-wide
   * listing goes on to read.
   *
   * @throws When the account cannot be located, or its server will not answer.
   */
  const readAccount = async (
    account: string,
    limit: number,
    pages: number,
    read: { bytes: number },
  ): Promise<{ places: PublishedPlace[]; more: boolean }> => {
    const location = await locateOnce(account);
    const found: PublishedPlace[] = [];
    let cursor: string | undefined;
    let asked = 0;
    let more = false;
    while (cursor !== undefined || asked === 0) {
      if (asked >= pages || read.bytes >= limits.bytes) {
        break;
      }
      asked += 1;
      const search = new URLSearchParams({
        repo: location.did,
        collection: PLACE_COLLECTION,
        limit: String(PAGE_LIMIT),
      });
      if (cursor !== undefined) {
        search.set("cursor", cursor);
      }
      const response = await fetchWithin(
        `${location.service}/xrpc/com.atproto.repo.listRecords?${search.toString()}`,
      );
      if (!response.ok) {
        throw new Error(
          `the server holding ${location.did} answered ${response.status} for its places`,
        );
      }
      const page = await response.arrayBuffer();
      read.bytes += page.byteLength;
      const body = JSON.parse(new TextDecoder().decode(page)) as {
        records?: { uri: string; value: unknown }[];
        cursor?: string;
      };
      for (const { uri, value } of body.records ?? []) {
        if (found.length >= limit) {
          more = true;
          break;
        }
        if (!isPlaceRecord(value)) {
          continue;
        }
        found.push({
          repo: location.did,
          rkey: uri.slice(uri.lastIndexOf("/") + 1),
          record: value,
        });
      }
      if (found.length >= limit && body.cursor !== undefined) {
        more = true;
      }
      cursor = found.length >= limit ? undefined : body.cursor;
    }
    return { places: found, more: more || cursor !== undefined };
  };

  return {
    async list(account) {
      return (
        await readAccount(account, Infinity, Number.POSITIVE_INFINITY, {
          bytes: 0,
        })
      ).places;
    },

    async listAll(): Promise<PlaceListing> {
      const directory = await listRepos();
      const read = { bytes: 0 };
      const found: PublishedPlace[] = [];
      const deadline = Date.now() + limits.deadlineMs;
      let next = 0;
      let capped = directory.more;
      // Accounts already being read when the listing reaches its ceiling are still counted, so the
      // returned count can sit a few reads past it.
      const readNext = async (): Promise<void> => {
        while (
          next < directory.accounts.length &&
          found.length < limits.places
        ) {
          if (Date.now() >= deadline) {
            capped = true;
            return;
          }
          const account = directory.accounts[next++]!;
          try {
            const page = await readAccount(
              account,
              limits.placesPerAccount,
              limits.pagesPerAccount,
              read,
            );
            capped = capped || page.more;
            found.push(...page.places);
          } catch (err) {
            console.warn(`[places] passed over the places of ${account}.`, err);
          }
        }
      };
      await Promise.all(
        Array.from(
          {
            length: Math.min(limits.concurrent, directory.accounts.length),
          },
          readNext,
        ),
      );
      return {
        places: found.sort(
          (a, b) =>
            a.record.name.localeCompare(b.record.name) ||
            a.repo.localeCompare(b.repo),
        ),
        capped,
      };
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

    async project(place) {
      // **`projectFromRecord` and not a second assembly of the same fields.** It already checks the
      // record and builds a project `isPlaceProject` accepts, and that check is the difference
      // between a project the editor can hold and one whose entry names a file that is not there.
      const project = projectFromRecord(place.record);
      if (project === null) {
        throw new Error(
          `"${place.record.name}" does not carry the files its manifest names`,
        );
      }
      return project;
    },
  };
};

/** The write half of publishing, bound to one signed-in account. */
export interface PlacePublisher {
  /**
   * Publishes `project` to the signed-in account's repository under a key made from its name, and
   * hands back the place's `at://` address. Publishing under the same name again replaces what is
   * there, which is how a place gets updated without players having to follow a new address.
   *
   * @throws When nobody is signed in, or the project is one this cannot publish — see
   * `makePlaceRecord` for the attachment case.
   */
  publish(project: PlaceProject): Promise<string>;
}

export const createPlacePublisher = (params: {
  /** The signed-in account's record client, or undefined while signed out. */
  getClient: () => (AtprotoRepoClient & AtprotoBlobClient) | undefined;
  /** The signed-in account's DID, or null while signed out. */
  getRepo: () => string | null;
}): PlacePublisher => ({
  async publish(project) {
    const client = params.getClient();
    const repo = params.getRepo();
    if (client === undefined || repo === null) {
      throw new Error("not signed in — use /account:login first");
    }

    const rkey = placeRkey(project.manifest.name);
    const record = makePlaceRecord(project, new Date().toISOString());
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
 * Resolves an account the way the rest of this world does: a handle through the two places its own
 * owner controls, an account id through the directory that issued it, and either on to the server
 * holding its records.
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
