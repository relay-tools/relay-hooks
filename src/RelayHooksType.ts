import {
    Disposable,
    OperationType,
    CacheConfig,
    GraphQLTaggedNode,
    Environment,
    IEnvironment,
    MutationConfig as BaseMutationConfig,
    MutationParameters,
    FragmentSpecResolver,
    VariablesOf,
    FragmentReference,
    RenderPolicy,
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
    retry: (_cacheConfigOverride?: CacheConfig, options?: Options) => void;
    cached?: boolean;
}

export type QueryOptions = {
    fetchPolicy?: FetchPolicy;
    fetchKey?: string | number;
    networkCacheConfig?: CacheConfig;
    skip?: boolean;
    onComplete?: (_e: Error | null) => void;
    UNSTABLE_renderPolicy?: RenderPolicy;
};

export type $Call<Fn extends (...args: any[]) => any> = Fn extends (arg: any) => infer RT
    ? RT
    : never;

export type KeyType<TData = unknown> = Readonly<{
    ' $data'?: TData;
    ' $fragmentRefs': FragmentReference;
}>;
export type ArrayKeyType = ReadonlyArray<{ readonly ' $data'?: ReadonlyArray<unknown> } | null>;

export type KeyTypeData<TKey extends KeyType<TData>, TData = unknown> = Required<TKey>[' $data'];

export type KeyReturnType<T extends KeyType> = (arg: T) => NonNullable<T[' $data']>;
export type ArrayKeyReturnType<T extends ArrayKeyType> = (
    arg: T,
) => NonNullable<NonNullable<T[0]>[' $data']>[0];

export type LoadMoreFn<TQuery extends OperationType = OperationType> = (
    count: number,
    options?: OptionsLoadMore<TQuery>,
) => Disposable;

// pagination

export const FORWARD = 'forward';

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
    subscribe: (callback: () => any) => () => void;
    getValue: (environment?: TEnvironment) => RenderProps<TOperationType> | Promise<any>;
    dispose: () => void;
};

// refetchable

export interface Options {
    fetchPolicy?: FetchPolicy;
    onComplete?: (arg: Error | null) => void;
    UNSTABLE_renderPolicy?: RenderPolicy;
}

export interface OptionsLoadMore<TQuery extends OperationType = OperationType> {
    fetchPolicy?: FetchPolicy;
    onComplete?: (arg: Error | null) => void;
    UNSTABLE_extraVariables: VariablesOf<TQuery>;
}

// NOTE: RefetchFnDynamic returns a refetch function that:
//  - Expects the /exact/ set of query variables if the provided key type is
//    /nullable/.
//  - Or, expects /a subset/ of the query variables if the provided key type is
//    /non-null/.
export type RefetchFnDynamic<
    TQuery extends OperationType,
    TKey extends KeyType | null,
    TOptions = Options
> = RefetchInexactDynamicResponse<TQuery, TOptions> & RefetchExactDynamicResponse<TQuery, TOptions>;

export type RefetchInexact<TQuery extends OperationType, TOptions> = (
    data?: unknown,
) => RefetchFnInexact<TQuery, TOptions>;
export type RefetchInexactDynamicResponse<TQuery extends OperationType, TOptions> = ReturnType<
    RefetchInexact<TQuery, TOptions>
>;

export type RefetchExact<TQuery extends OperationType, TOptions> = (
    data?: unknown | null,
) => RefetchFnExact<TQuery, TOptions>;
export type RefetchExactDynamicResponse<TQuery extends OperationType, TOptions> = ReturnType<
    RefetchExact<TQuery, TOptions>
>;

export type RefetchFnBase<TVars, TOptions> = (vars: TVars, options?: TOptions) => Disposable;

export type RefetchFnExact<TQuery extends OperationType, TOptions = Options> = RefetchFnBase<
    VariablesOf<TQuery>,
    TOptions
>;
export type RefetchFnInexact<TQuery extends OperationType, TOptions = Options> = RefetchFnBase<
    Partial<VariablesOf<TQuery>>,
    TOptions
>;

export type ReturnTypeRefetchNode<
    TQuery extends OperationType,
    TKey extends KeyType | null,
    TFragmentData
> = [TFragmentData, RefetchFnDynamic<TQuery, TKey>, boolean];

export type ReturnTypeRefetchSuspenseNode<
    TQuery extends OperationType,
    TKey extends KeyType | null,
    TFragmentData
> = [TFragmentData, RefetchFnDynamic<TQuery, TKey>];

// pagination

export interface ReturnTypePagination<
    TQuery extends OperationType,
    TKey extends KeyType | null,
    TFragmentData
> extends ReturnTypePaginationSuspense<TQuery, TKey, TFragmentData> {
    isLoading: boolean;
}

export interface ReturnTypePaginationSuspense<
    TQuery extends OperationType,
    TKey extends KeyType | null,
    TFragmentData
> {
    data: TFragmentData;
    loadNext: LoadMoreFn<TQuery>;
    loadPrevious: LoadMoreFn<TQuery>;
    hasNext: boolean;
    hasPrevious: boolean;
    isLoadingNext: boolean;
    isLoadingPrevious: boolean;
    refetch: RefetchFnDynamic<TQuery, TKey>;
}
