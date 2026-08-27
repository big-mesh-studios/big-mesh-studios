// The record a published sprite stack is, for anything reading one out of an
// atproto repository. Reading needs no session and no client library: a
// listing hands back record values, `isModelRecord` says which of them this
// vocabulary covers, and `blobUrl` says where the file itself is served from.
export {
  blobUrl,
  isModelRecord,
  MODEL_COLLECTION,
  MODEL_MIME_TYPE,
  modelBlobCid,
  modelRkey,
  type ModelRecord,
  type PublishedModel,
} from "./atproto/models";
