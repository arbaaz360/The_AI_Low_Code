/** Test domain model - import JSON directly to avoid fetch in tests */
import domainModelVendor from "../../../samples/domain_model_vendor.json";

export const TEST_DOMAIN_MODEL = domainModelVendor as {
  version: string;
  entities: Record<string, { fields: unknown[] }>;
};

/** Pass to StudioApp to skip fetch; use when domain fields UI is not needed */
export const TEST_DOMAIN_MODEL_NONE = null;
