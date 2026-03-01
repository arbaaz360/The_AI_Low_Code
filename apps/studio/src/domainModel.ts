/** Design-time domain model (loaded from samples) */
export interface DomainField {
  name: string;
  displayName?: string;
  type: string;
  required?: boolean;
  maxLength?: number;
  options?: string[];
}

export interface DomainEntity {
  fields: DomainField[];
}

export interface DomainModel {
  version: string;
  entities: Record<string, DomainEntity>;
}

const DEFAULT_URL = "/samples/domain_model_vendor.json";
const FETCH_TIMEOUT_MS = 5000;

/** Options for domain model loading */
export interface DomainModelLoaderOptions {
  /** Injected model (skips fetch when provided) */
  initialModel?: DomainModel | null;
  /** URL to fetch from (runtime) */
  url?: string;
  /** Timeout in ms for fetch (default 5000) */
  timeoutMs?: number;
}

let cachedModel: DomainModel | null = null;

function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

/** Load domain model. Uses initialModel when provided; otherwise fetches from url. */
export async function loadDomainModel(options?: DomainModelLoaderOptions): Promise<DomainModel> {
  const { initialModel, url = DEFAULT_URL, timeoutMs = FETCH_TIMEOUT_MS } = options ?? {};

  if (initialModel !== undefined && initialModel !== null) {
    return initialModel;
  }
  if (cachedModel) return cachedModel;

  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (!res.ok) throw new Error(`Failed to load domain model: ${res.status}`);
    cachedModel = (await res.json()) as DomainModel;
    return cachedModel!;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Domain model load failed: ${msg}`);
  }
}

/** Get entity fields for doc.dataContext.entity */
export function getEntityFields(model: DomainModel, entityName: string | undefined): DomainField[] {
  if (!entityName) return [];
  const entity = model.entities[entityName];
  return entity?.fields ?? [];
}
