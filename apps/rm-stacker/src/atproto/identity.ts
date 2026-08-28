// Where this editor looks up an atproto identity. Two questions get asked —
// which server holds an account's records, and which account a name points at
// — and both are asked the same way wherever they come up: signing in, and
// opening somebody else's models.
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
export type DidDocument = Awaited<ReturnType<DidDocumentResolver<"plc" | "web">["resolve"]>>;

/**
 * Resolves a DID to its document — the record naming the server that holds the
 * account and the handle it claims. `did:plc` documents come from the directory
 * that issues them, `did:web` documents from the domain itself.
 */
export function createDidDocumentResolver(): DidDocumentResolver<"plc" | "web"> {
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
 * The address of the server holding `document`'s repository, without a trailing
 * slash. Newer DID documents name that service `#atproto_pds` and older ones
 * `#atproto`; either is accepted, falling back to a match on the service type.
 */
export function pdsEndpoint(document: DidDocument): string | undefined {
  const service =
    document.service?.find(entry => entry.id === "#atproto" || entry.id === "#atproto_pds") ??
    document.service?.find(entry => {
      const type = Array.isArray(entry.type) ? entry.type : [entry.type];
      return type.includes("AtprotoPersonalDataServer");
    });

  return typeof service?.serviceEndpoint === "string"
    ? service.serviceEndpoint.replace(/\/+$/, "")
    : undefined;
}
