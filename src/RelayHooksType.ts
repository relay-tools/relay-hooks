import { RelayContext, FragmentSpecResolver } from 'relay-runtime/lib/store/RelayStoreTypes';

import {
    OperationType,
    CacheConfig,
    GraphQLTaggedNode,
    Variables,
    PageInfo,
    Observer,
} from 'relay-runtime';

export const NETWORK_ONLY = 'network-only';
export const STORE_THEN_NETWORK = 'store-and-network';
export const STORE_OR_NETWORK = 'store-or-network';
export const STORE_ONLY = 'store-only';

export type FetchPolicy =
    | typeof STORE_ONLY
    | typeof STORE_OR_NETWORK
    | typeof STORE_THEN_NETWORK
    | typeof NETWORK_ONLY;

export type ContainerResult = {
    data: { [key: string]: any };
    resolver: FragmentSpecResolver;
};

export interface RenderProps<T extends OperationType> {
    error: Error;
    props: T['response'];
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

export type QueryOptions = {
    fetchPolicy?: FetchPolicy;
    networkCacheConfig?: CacheConfig;
};

export type PaginationFunction = {
    loadMore: (
        connectionConfig: ConnectionConfig,
        pageSize: number,
        observerOrCallback: any,
        options: RefetchOptions,
    ) => any;
    hasMore: () => boolean;
    isLoading: () => boolean;
    refetchConnection: (
        connectionConfig: ConnectionConfig,
        totalCount: number,
        callback: any,
        refetchVariables: any,
    ) => any;
};

export type RefetchFunction = (
    taggedNode: any,
    refetchVariables: any,
    renderVariables: any,
    observerOrCallback: any,
    options: RefetchOptions,
) => {
    dispose(): void;
};

export interface OssFragmentFunction extends PaginationFunction {
    refetch: RefetchFunction;
}

export type FragmentResult = [any, OssFragmentFunction];
export type ObserverOrCallback = Observer<void> | ((error: Error) => any);

// pagination

export const FORWARD = 'forward';

export type FragmentVariablesGetter = (prevVars: Variables, totalCount: number) => Variables;

export type ConnectionConfig = {
    direction?: 'backward' | 'forward';
    getConnectionFromProps?: (props: object) => ConnectionData;
    getFragmentVariables?: FragmentVariablesGetter;
    getVariables: (
        props: object,
        paginationInfo: { count: number; cursor: string },
        fragmentVariables: Variables,
    ) => Variables;
    query: GraphQLTaggedNode;
};
export type ConnectionData = {
    edges?: ReadonlyArray<any>;
    pageInfo?: PageInfo;
};

export type PaginationData = {
    direction: string;
    getConnectionFromProps: Function;
    getFragmentVariables: Function;
};
