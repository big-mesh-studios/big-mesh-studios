// Publishing places and reading them back over atproto. The read half mirrors
// `models.ts`: a place lives in its author's repository, its record and every
// model it names are public, so listing a place or booting its world costs
// nothing but the author's name and the name of whoever's model it attached.
// The write half is what publishing is — resolving every attached model to a
// strong reference, one already the signed-in account's own kept as is, any
// other duplicated into a fresh record of its own first — and putting the
// record it describes under a key made from its name — and needs the
// signed-in account, unlike reading, so the two halves are separate objects:
// `PlaceLibrary` for anyone, `PlacePublisher` for an account of one's own.
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
import { loadFigure, saveFigure } from "@big-mesh-studios/stacker/format";
import { partDimensions } from "@big-mesh-studios/stacker/renderer";
import {
  blobUrl,
  isModelRecord,
  loadPublishedFigure,
  MODEL_COLLECTION,
  modelAtUri,
  modelRkey,
  parseModelAtUri,
  publishFigure,
  THUMBNAIL_MIME_TYPE,
  type ModelRecord,
} from "@big-mesh-studios/stacker/lexicon";
import {
  isPlaceRecord,
  makePlaceRecord,
  parsePlaceAtUri,
  placeAtUri,
  placeRkey,
  PLACE_COLLECTION,
  type PlaceModelRef,
  type PlaceRecord,
  type PlaceScriptRecord,
  type PublishedPlace,
} from "../places/place.ts";
import type { AttachedModel, PlaceProject } from "../places/project.ts";

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
  /**
   * `place` read back into an editable project: its scripts, already inline
   * in the record, and every attached model resolved from the
   * `app.bms.stacker.model` record it names — fetched, decoded, and rebuilt
   * as the bytes the rest of this world reads a model as. A model whose
   * reference no longer resolves, or has drifted from the exact version this
   * place named, is left out rather than failing the whole place open.
   */
  project(place: PublishedPlace): Promise<PlaceProject>;
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

  /** `ref` resolved into the bytes and, once confirmed unchanged, the strong ref this project carries forward. */
  const resolveModel = async (
    ref: PlaceModelRef,
  ): Promise<AttachedModel | null> => {
    const parsed = parseModelAtUri(ref.uri);
    if (parsed === null) {
      return null;
    }
    const location = await locateOnce(parsed.repo);
    const client = new Client({
      handler: simpleFetchHandler({
        service: location.service,
        fetch: fetchFile,
      }),
    });
    const response = await ok(
      client.get("com.atproto.repo.getRecord", {
        params: {
          repo: parsed.repo as ActorIdentifier,
          collection: MODEL_COLLECTION as Nsid,
          rkey: parsed.rkey as RecordKey,
        },
      }),
    );
    if (
      !isModelRecord(response.value) ||
      response.cid === undefined ||
      response.cid !== ref.cid
    ) {
      return null;
    }
    const model = response.value;
    const figure = await loadPublishedFigure(model, async (blob) => {
      const url = blobUrl(location.service, parsed.repo, blob.ref.$link);
      const blobResponse = await fetchFile(url);
      if (!blobResponse.ok) {
        throw new Error(
          `the server holding ${parsed.repo} would not serve a drawing of "${model.name}" (${blobResponse.status})`,
        );
      }
      return new Uint8Array(await blobResponse.arrayBuffer());
    });
    const zip = await saveFigure(figure, figure.motions);
    return {
      bytes: new Uint8Array(await zip.arrayBuffer()),
      ref: { uri: ref.uri, cid: ref.cid },
    };
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

    async project(place) {
      const scripts: Record<string, string> = {};
      for (const script of place.record.scripts) {
        scripts[script.name] = script.source;
      }

      const models: Record<string, AttachedModel> = {};
      const resolved = await Promise.all(
        place.record.models.map(
          async (ref) => [ref, await resolveModel(ref)] as const,
        ),
      );
      for (const [ref, model] of resolved) {
        if (model !== null) {
          models[ref.name] = model;
        }
      }

      return {
        manifest: {
          name: place.record.name,
          seed: place.record.seed,
          spawn: place.record.spawn,
          mode: place.record.mode,
        },
        scripts,
        models,
      };
    },
  };
};

/** The write half of publishing, bound to one signed-in account. */
export interface PlacePublisher {
  /**
   * Publishes `project` to the signed-in account's repository under a key
   * made from its name, and hands back the place's `at://` address. An
   * attached model already the signed-in account's own is referenced as is;
   * any other is published as a fresh copy of its own under this account
   * first, so the place depends only on this account from here on. Publishing
   * under the same name again replaces what is there, which is how a place
   * gets updated without players having to follow a new address.
   */
  publish(project: PlaceProject): Promise<string>;
}

export const createPlacePublisher = (params: {
  /** The signed-in account's record client, or null while signed out. */
  getClient: () => (AtprotoRepoClient & AtprotoBlobClient) | undefined;
  /** The signed-in account's DID, or null while signed out. */
  getRepo: () => string | null;
}): PlacePublisher => ({
  async publish(project) {
    const client = params.getClient();
    const repo = params.getRepo();
    if (client === undefined || repo === null) {
      throw new Error("not connected — use /account:login first");
    }

    const uploadBlob = (bytes: Uint8Array) =>
      client.uploadBlob(
        new Blob([bytes as BlobPart], { type: THUMBNAIL_MIME_TYPE }),
      );

    const models: PlaceModelRef[] = [];
    for (const [name, attached] of Object.entries(project.models)) {
      if (attached.ref !== undefined) {
        models.push({ name, uri: attached.ref.uri, cid: attached.ref.cid });
        continue;
      }
      const loaded = await loadFigure(new Blob([attached.bytes as BlobPart]));
      const rkey = modelRkey(name);
      const built = await publishFigure(
        { parts: loaded.parts, palette: loaded.palette },
        loaded.motions,
        uploadBlob,
      );
      const record: ModelRecord = {
        $type: MODEL_COLLECTION,
        name,
        createdAt: new Date().toISOString(),
        dimensions: partDimensions(loaded.parts[0]),
        ...built,
      };
      const { cid } = await client.putRecord({
        repo,
        collection: MODEL_COLLECTION,
        rkey,
        record,
      });
      models.push({ name, uri: modelAtUri(repo, rkey), cid });
    }

    const scripts: PlaceScriptRecord[] = Object.entries(project.scripts).map(
      ([name, source]) => ({ name, source }),
    );

    const rkey = placeRkey(project.manifest.name);
    const record: PlaceRecord = makePlaceRecord(
      project.manifest,
      new Date().toISOString(),
      scripts,
      models,
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
