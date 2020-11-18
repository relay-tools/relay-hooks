import {
    Disposable,
    OperationType,
    CacheConfig,
    GraphQLTaggedNode,
    Environment,
    IEnvironment,
    Variables,
    PageInfo,
    Observer,
    MutationConfig as BaseMutationConfig,
    MutationParameters,
    FragmentSpecResolver,
    Snapshot,
} from 'relay-runtime';

export type MutationState<T extends MutationParameters> = {
    loading: boolean;
    data: T['response'] | null;
    error?: Error | null;
};

export type MutationNode<T extends MutationParameters> = BaseMutationConfig<T>['mutation'];

export type MutationConfig<T extends MutationParameters> = Partial<
    Omit<BaseMutationConfig<T>, 'mutation' | 'onCompleted'>
> & {
    onCompleted?(response: T['response']): void;
};

export type Mutate<T extends MutationParameters> = (
    config?: Partial<MutationConfig<T>>,
) => Promise<T['response']>;

export type MutationProps<T extends MutationParameters> = MutationConfig<T> & {
    children: (mutate: Mutate<T>, state: MutationState<T>) => React.ReactNode;
    mutation: MutationNode<T>;
    /** if not provided, the context environment will be used. */
    environment?: Environment;
};

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
    error: Error | null;
    props: T['response'] | null | undefined;
    retry: (_cacheConfigOverride?: CacheConfig, observer?: Observer<Snapshot>) => void;
    cached?: boolean;
}

export type RefetchOptions = {
    force?: boolean;
    fetchPolicy?: FetchPolicy;
    metadata?: { [key: string]: any };
};

export type QueryOptions = {
    fetchPolicy?: FetchPolicy;
    fetchKey?: string | number;
    networkCacheConfig?: CacheConfig;
    skip?: boolean;
    fetchObserver?: Observer<Snapshot>;
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

export type PaginationFunction<Props, TVariables extends Variables = Variables> = {
    loadMore: (
        connectionConfig: ConnectionConfig<Props>,
        pageSize: number,
        observerOrCallback?: ObserverOrCallback,
        options?: RefetchOptions,
    ) => Disposable;
    hasMore: (connectionConfig?: ConnectionConfig<Props>) => boolean;
    isLoading: () => boolean;
    refetchConnection: (
        connectionConfig: ConnectionConfig<Props>,
        totalCount: number,
        observerOrCallback?: ObserverOrCallback,
        refetchVariables?: TVariables,
    ) => Disposable;
};

export type RefetchableFunction<TVariables extends Variables = Variables> = (
    refetchVariables: TVariables | ((fragmentVariables: TVariables) => TVariables),
    options?: {
        renderVariables?: TVariables;
        observerOrCallback?: ObserverOrCallback;
        refetchOptions?: RefetchOptions;
    },
) => Disposable;

export type RefetchFunction<TVariables extends Variables = Variables> = (
    taggedNode: GraphQLTaggedNode,
    refetchVariables: TVariables | ((fragmentVariables: TVariables) => TVariables),
    renderVariables?: TVariables,
    observerOrCallback?: ObserverOrCallback,
    options?: RefetchOptions,
) => Disposable;

export type ObserverOrCallback = Observer<void> | ((error?: Error | null | undefined) => void);

// pagination

export const FORWARD = 'forward';

export type FragmentVariablesGetter = (prevVars: Variables, totalCount: number) => Variables;

export interface ConnectionConfig<Props = object> {
    direction?: 'backward' | 'forward';
    getConnectionFromProps?: (props: Props) => ConnectionData | null | undefined;
    getFragmentVariables?: (prevVars: Variables, totalCount: number) => Variables;
    getVariables: (
        props: Props,
        paginationInfo: { count: number; cursor?: string | null },
        fragmentVariables: Variables,
    ) => Variables;
    query: GraphQLTaggedNode;
}
export interface ConnectionData {
    edges?: ReadonlyArray<any> | null;
    pageInfo?: Partial<PageInfo> | null;
}

export type PaginationData = {
    direction: string;
    getConnectionFromProps: Function;
    getFragmentVariables: Function;
};

export type LoadQuery<
    TOperationType extends OperationType = OperationType,
    TEnvironment extends IEnvironment = IEnvironment
> = {
    next: (
        environment: TEnvironment,
        gqlQuery: GraphQLTaggedNode,
        variables?: TOperationType['variables'],
        options?: QueryOptions,
    ) => Promise<void>;
    subscribe: (callback: (value: any) => any) => () => void;
    getValue: (environment?: TEnvironment) => RenderProps<TOperationType> | Promise<any>;
    dispose: () => void;
};
