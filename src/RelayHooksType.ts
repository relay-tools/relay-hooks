import { RelayContext, FragmentSpecResolver } from 'relay-runtime/lib/store/RelayStoreTypes';

import {
    Disposable,
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

export type FetchPolicy = 'store-only' | 'store-or-network' | 'store-and-network' | 'network-only';

export type ContainerResult = {
    data: { [key: string]: any };
    resolver: FragmentSpecResolver;
};

export interface RenderProps<T extends OperationType> {
    error: Error;
    props: T['response'];
    retry: (_cacheConfigOverride?: CacheConfig) => void;
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
    fetchKey?: string | number;
    networkCacheConfig?: CacheConfig;
};

export type $Call<Fn extends (...args: any[]) => any> = Fn extends (arg: any) => infer RT
    ? RT
    : never;

export interface KeyType {
    readonly ' $data'?: unknown;
}
export type ArrayKeyType = ReadonlyArray<{ readonly ' $data'?: ReadonlyArray<unknown> } | null>;

export type KeyReturnType<T extends KeyType> = (arg: T) => NonNullable<T[' $data']>;
export type ArrayKeyReturnType<T extends ArrayKeyType> = (
    arg: T,
) => NonNullable<NonNullable<T[0]>[' $data']>[0];

export type PaginationFunction = {
    loadMore: (
        connectionConfig: ConnectionConfig,
        pageSize: number,
        observerOrCallback: ObserverOrCallback,
        options: RefetchOptions,
    ) => Disposable;
    hasMore: (connectionConfig?: ConnectionConfig) => boolean;
    isLoading: () => boolean;
    refetchConnection: (
        connectionConfig: ConnectionConfig,
        totalCount: number,
        observerOrCallback: ObserverOrCallback,
        refetchVariables: Variables,
    ) => Disposable;
};

export type RefetchableFunction = (
    refetchVariables: Variables | ((fragmentVariables: Variables) => Variables),
    options?: {
        renderVariables?: Variables;
        observerOrCallback?: ObserverOrCallback;
        refetchOptions?: RefetchOptions;
    },
) => Disposable;

export type RefetchFunction = (
    taggedNode: GraphQLTaggedNode,
    refetchVariables: Variables | ((fragmentVariables: Variables) => Variables),
    renderVariables?: Variables,
    observerOrCallback?: ObserverOrCallback,
    options?: RefetchOptions,
) => Disposable;

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
