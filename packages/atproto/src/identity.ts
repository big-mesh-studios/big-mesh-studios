// Where an atproto identity is looked up, for every lookup either program
// makes: the account somebody signs in as, and the accounts of the people whose
// work they open or whose company they keep. Both questions — which server
// holds an account's records, and what name it goes by — are answered the same
// way wherever they are asked, so a stranger's handle is held to exactly the
// standard your own was when you typed it.
import type { Did, Handle } from "@atcute/lexicons";
import { confirmHandle } from "./handles";
import {
  PROFILE_COLLECTION,
  PROFILE_RKEY,
  pictureBlobCid,
  pictureBlobUrl,
} from "./profile";
import {
  CompositeDidDocumentResolver,
  CompositeHandleResolver,
  DohJsonHandleResolver,
  PlcDidDocumentResolver,
  WebDidDocumentResolver,
  WellKnownHandleResolver,
  type DidDocumentResolver,
  type HandleResolver,
} from "@atcute/identity-resolver";

/**
 * The public DNS-over-HTTPS endpoint a handle is looked up through. A handle
 * is a domain name, and what it points at lives in that domain's `_atproto`
 * text record; a web page cannot query the domain name system itself, so the
 * question goes over HTTPS to a resolver that can.
 */
const DNS_OVER_HTTPS_SERVICE = "https://cloudflare-dns.com/dns-query";

/** What a DID document resolver hands back for a resolved DID. */
export type DidDocument = Awaited<
  ReturnType<DidDocumentResolver<"plc" | "web">["resolve"]>
>;

/**
 * Resolves a DID to its document — the record naming the server that holds the
 * account and the handle it claims. `did:plc` documents come from the directory
 * that issues them, `did:web` documents from the domain itself.
 */
export function createDidDocumentResolver(): DidDocumentResolver<
  "plc" | "web"
> {
  return new CompositeDidDocumentResolver({
    methods: {
      plc: new PlcDidDocumentResolver(),
      web: new WebDidDocumentResolver(),
    },
  });
}

/**
 * Resolves a handle to the DID it points at, asking the two places whose answer
 * the handle's own owner controls: the domain's `_atproto` text record, and the
 * `atproto-did` file the domain serves. Whichever answers first wins, and
 * either alone is enough — a domain that publishes only the record still
 * resolves when a browser cannot read its file across origins.
 */
export function createHandleResolver(): HandleResolver {
  return new CompositeHandleResolver({
    strategy: "race",
    methods: {
      dns: new DohJsonHandleResolver({ dohUrl: DNS_OVER_HTTPS_SERVICE }),
      http: new WellKnownHandleResolver(),
    },
  });
}

/**
 * The address of the server holding the account `document` describes, without a
 * trailing slash. Newer documents name that service `#atproto_pds` and older
 * ones `#atproto`; either is accepted, falling back to whichever service
 * declares itself a personal data server.
 *
 * @throws When the document names no such service, which leaves nothing to ask
 * for the account's records.
 */
export function pdsEndpoint(document: DidDocument): string {
  const service =
    document.service?.find(
      (entry) => entry.id === "#atproto" || entry.id === "#atproto_pds",
    ) ??
    document.service?.find((entry) => {
      const type = Array.isArray(entry.type) ? entry.type : [entry.type];
      return type.includes("AtprotoPersonalDataServer");
    });

  const endpoint =
    typeof service?.serviceEndpoint === "string"
      ? service.serviceEndpoint.replace(/\/+$/, "")
      : undefined;

  if (endpoint === undefined) {
    throw new Error(
      `no personal data server in the account document for ${document.id}`,
    );
  }

  return endpoint;
}

/**
 * Who an identifier belongs to, and what to show for it. Every answer is
 * remembered for as long as the lookup lives, so asking after the same account
 * again costs nothing — including when the answer was that there is none.
 *
 * Every question here is a public one. None of it needs a session, so a name
 * and a face can be shown for somebody whether or not anybody is signed in.
 */
export interface IdentityLookup {
  /** The account's document, naming the server that holds it and the handle it claims. */
  document(did: string): Promise<DidDocument>;
  /** The address of the server holding that account's records, without a trailing slash. */
  service(did: string): Promise<string>;
  /** The handle to show, or null when the account has none that can be confirmed. */
  handle(did: string): Promise<string | null>;
  /** The bytes of the picture the account shows for itself, or null when it shows none. */
  picture(did: string): Promise<Blob | null>;
  /**
   * The handle to show, falling back to the identifier itself when there is
   * none or the lookup fails — for a line of text that cannot wait and cannot
   * be blank.
   */
  name(did: string): Promise<string>;
  /**
   * The handle already known for `did` without asking anybody: the confirmed
   * handle, null when it is settled that there is none, and undefined when the
   * question has not been answered yet. For a line that has to be written now
   * and cannot await one.
   */
  knownHandle(did: string): string | null | undefined;
}

export function createIdentityLookup(params?: {
  didDocumentResolver?: DidDocumentResolver<"plc" | "web">;
  handleResolver?: HandleResolver;
  /** How network reads are made. Defaults to the browser's own. */
  fetch?: typeof globalThis.fetch;
}): IdentityLookup {
  const didDocumentResolver =
    params?.didDocumentResolver ?? createDidDocumentResolver();
  const handleResolver = params?.handleResolver ?? createHandleResolver();
  const get = params?.fetch ?? ((...args) => globalThis.fetch(...args));

  const documents = new Map<string, Promise<DidDocument>>();
  const handles = new Map<string, Promise<string | null>>();
  const settledHandles = new Map<string, string | null>();
  const pictures = new Map<string, Promise<Blob | null>>();

  // The promise is cached rather than its result, so two callers asking at
  // once ask the network once.
  const once = <T>(
    cache: Map<string, Promise<T>>,
    key: string,
    make: () => Promise<T>,
  ) => {
    const pending = cache.get(key);
    if (pending !== undefined) {
      return pending;
    }
    const started = make();
    cache.set(key, started);
    return started;
  };

  const lookup: IdentityLookup = {
    document(did) {
      return once(documents, did, () =>
        didDocumentResolver.resolve(did as Did<"plc" | "web">),
      );
    },
    async service(did) {
      return pdsEndpoint(await lookup.document(did));
    },
    handle(did) {
      return once(handles, did, async () => {
        const confirmed = await confirmHandle({
          did,
          document: await lookup.document(did),
          resolveDid: (candidate) =>
            handleResolver.resolve(candidate as Handle),
        });
        settledHandles.set(did, confirmed);
        return confirmed;
      });
    },
    knownHandle(did) {
      return settledHandles.get(did);
    },
    picture(did) {
      return once(pictures, did, async () => {
        const service = await lookup.service(did);
        const record = await get(
          `${service}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}` +
            `&collection=${PROFILE_COLLECTION}&rkey=${PROFILE_RKEY}`,
        );
        // An account with no profile record at all: no picture, not an error.
        if (!record.ok) {
          return null;
        }
        const cid = pictureBlobCid(
          ((await record.json()) as { value?: unknown }).value,
        );
        if (cid === null) {
          return null;
        }
        const blob = await get(pictureBlobUrl(service, did, cid));
        return blob.ok ? blob.blob() : null;
      });
    },
    async name(did) {
      try {
        return (await lookup.handle(did)) ?? did;
      } catch {
        return did;
      }
    },
  };

  return lookup;
}
