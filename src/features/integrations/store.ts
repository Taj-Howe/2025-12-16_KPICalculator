import type {
  AccountMapping,
  IntegrationSource,
  IntegrationSyncResult,
  NormalizedOfferMapping,
  NormalizedOfferPeriodSnapshot,
  StripeSourceConfig,
} from "./types";

type UserIntegrationState = {
  sources: IntegrationSource[];
  stripeConfigs: Map<string, StripeSourceConfig>;
  offerMappings: NormalizedOfferMapping[];
  accountMappings: AccountMapping[];
  syncs: Map<string, IntegrationSyncResult>;
  snapshots: Map<string, NormalizedOfferPeriodSnapshot>;
};

const integrationStore = new Map<string, UserIntegrationState>();

const getUserState = (userKey: string): UserIntegrationState => {
  const existing = integrationStore.get(userKey);
  if (existing != null) {
    return existing;
  }

  const created: UserIntegrationState = {
    sources: [],
    stripeConfigs: new Map(),
    offerMappings: [],
    accountMappings: [],
    syncs: new Map(),
    snapshots: new Map(),
  };
  integrationStore.set(userKey, created);
  return created;
};

export const listSources = (userKey: string) => [...getUserState(userKey).sources];

export const saveSource = (userKey: string, source: IntegrationSource) => {
  const state = getUserState(userKey);
  state.sources = [
    ...state.sources.filter((current) => current.sourceId !== source.sourceId),
    source,
  ];
  return source;
};

export const saveStripeConfig = (userKey: string, config: StripeSourceConfig) => {
  const state = getUserState(userKey);
  state.stripeConfigs.set(config.sourceId, config);
  return config;
};

export const getStripeConfig = (userKey: string, sourceId: string) =>
  getUserState(userKey).stripeConfigs.get(sourceId) ?? null;

export const listOfferMappings = (userKey: string) => [
  ...getUserState(userKey).offerMappings,
];

export const saveOfferMappings = (
  userKey: string,
  mappings: NormalizedOfferMapping[],
) => {
  const state = getUserState(userKey);
  const incoming = new Map(mappings.map((mapping) => [mapping.mappingId, mapping]));
  state.offerMappings = [
    ...state.offerMappings.filter((mapping) => !incoming.has(mapping.mappingId)),
    ...mappings,
  ];
  return mappings;
};

export const listAccountMappings = (userKey: string) => [
  ...getUserState(userKey).accountMappings,
];

export const saveAccountMappings = (userKey: string, mappings: AccountMapping[]) => {
  const state = getUserState(userKey);
  const incoming = new Map(mappings.map((mapping) => [mapping.accountMappingId, mapping]));
  state.accountMappings = [
    ...state.accountMappings.filter((mapping) => !incoming.has(mapping.accountMappingId)),
    ...mappings,
  ];
  return mappings;
};

export const saveSyncResult = (userKey: string, result: IntegrationSyncResult) => {
  const state = getUserState(userKey);
  state.syncs.set(result.syncId, result);
  for (const snapshot of result.snapshots) {
    state.snapshots.set(snapshot.snapshotId, snapshot);
  }
  return result;
};

export const getSyncResult = (userKey: string, syncId: string) =>
  getUserState(userKey).syncs.get(syncId) ?? null;

export const listSnapshots = (userKey: string) => [
  ...getUserState(userKey).snapshots.values(),
];

export const getSnapshot = (userKey: string, snapshotId: string) =>
  getUserState(userKey).snapshots.get(snapshotId) ?? null;
