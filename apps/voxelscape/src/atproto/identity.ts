// Where this app looks up an atproto identity, for every lookup it makes: the
// account you sign in as, and the accounts of the players you meet. Both
// questions — which server holds an account's records, and what name it goes
// by — are answered the same way wherever they are asked, so a peer's handle
// is held to exactly the standard your own was when you typed it.
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
 * Resolves a DID to its document — the record naming the server that holds
 * the account and the handle it claims. `did:plc` documents come from the
 * directory that issues them, `did:web` documents from the domain itself.
 */
export const createDidDocumentResolver = (): DidDocumentResolver<
  "plc" | "web"
> =>
  new CompositeDidDocumentResolver({
    methods: {
      plc: new PlcDidDocumentResolver(),
      web: new WebDidDocumentResolver(),
    },
  });

/**
 * Resolves a handle to the DID it points at, asking the two places whose
 * answer the handle's own owner controls: the domain's `_atproto` text
 * record, and the `atproto-did` file the domain serves. Whichever answers
 * first wins, and either alone is enough — a domain that publishes only the
 * record still resolves when a browser cannot read its file across origins.
 */
export const createHandleResolver = (): HandleResolver =>
  new CompositeHandleResolver({
    strategy: "race",
    methods: {
      dns: new DohJsonHandleResolver({ dohUrl: DNS_OVER_HTTPS_SERVICE }),
      http: new WellKnownHandleResolver(),
    },
  });

/**
 * The address of the server holding the account `document` describes, without
 * a trailing slash. Newer documents name that service `#atproto_pds` and older
 * ones `#atproto`; either is accepted, falling back to whichever service
 * declares itself a personal data server.
 *
 * @throws When the document names no such service, which leaves nothing to ask
 * for the account's records.
 */
export const pdsEndpoint = (document: DidDocument): string => {
  const service =
    document.service?.find(
      (candidate) =>
        candidate.id === "#atproto" || candidate.id === "#atproto_pds",
    ) ??
    document.service?.find((candidate) => {
      const type = Array.isArray(candidate.type)
        ? candidate.type
        : [candidate.type];
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
};
