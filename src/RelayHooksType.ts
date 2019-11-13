import {
  RelayContext,
  FragmentSpecResolver
} from "relay-runtime/lib/store/RelayStoreTypes";

import { OperationType, CacheConfig, GraphQLTaggedNode } from "relay-runtime";

export const NETWORK_ONLY = "network-only";
export const STORE_THEN_NETWORK = "store-and-network";
export const STORE_OR_NETWORK = "store-or-network";
export const STORE_ONLY = "store-only";

export type FetchPolicy =
  | "store-only"
  | "store-or-network"
  | "store-and-network"
  | "network-only";

export type ContainerResult = {
  data: { [key: string]: any };
  resolver: FragmentSpecResolver;
};

export interface RenderProps<T extends OperationType> {
  error: Error;
  props: T["response"];
  retry: (_cacheConfigOverride: CacheConfig) => void;
  cached?: boolean;
}

export type OperationContextProps = {
  operation: any;
  relay: RelayContext;
};

export type RefetchOptions = {
  force?: boolean;
  fetchPolicy?: FetchPolicy;
  metadata?: { [key: string]: any };
};

export type UseQueryType = <TOperationType extends OperationType>(
  gqlQuery: GraphQLTaggedNode,
  variables: TOperationType["variables"],
  options: {
    fetchPolicy?: FetchPolicy;
    networkCacheConfig?: CacheConfig;
  }
) => RenderProps<TOperationType>;
