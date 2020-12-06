import * as areEqual from 'fbjs/lib/areEqual';
import {
    Disposable,
    CacheConfig,
    IEnvironment,
    Snapshot,
    OperationType,
    OperationDescriptor,
    GraphQLTaggedNode,
    Variables,
} from 'relay-runtime';
import { Fetcher, fetchResolver } from './FetchResolver';
import { FetchPolicy, RenderProps, QueryOptions } from './RelayHooksType';
import { createOperation } from './Utils';

const defaultPolicy = 'store-or-network';

const cache: Map<string, QueryFetcher<any>> = new Map();

export function getOrCreateQueryFetcher<TOperationType extends OperationType>(
    suspense: boolean,
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    networkCacheConfig: CacheConfig,
    forceUpdate: any,
): QueryFetcher<TOperationType> {
    const withCache = suspense;
    const query = createOperation(gqlQuery, variables, networkCacheConfig);
    const toGet = withCache && cache.has(query.request.identifier);
    const queryFetcher = toGet ? cache.get(query.request.identifier) : new QueryFetcher(withCache);
    queryFetcher.setQuery(gqlQuery, variables, networkCacheConfig, query);
    queryFetcher.setForceUpdate(forceUpdate);
    queryFetcher.setMounted(false);
    return queryFetcher;
}

export class QueryFetcher<TOperationType extends OperationType = OperationType> {
    environment: IEnvironment;
    query: OperationDescriptor;
    fetcher: Fetcher;
    rootSubscription: Disposable;
    cached = false;
    snapshot: Snapshot;
    fetchPolicy: FetchPolicy;
    fetchKey: string | number;
    forceUpdate: () => void;
    mounted = false;
    withCache = false;
    variables: Variables;
    cacheConfig: Variables;
    gqlQuery: GraphQLTaggedNode;
    options: QueryOptions;

    constructor(withCache?: boolean) {
        this.setForceUpdate(() => undefined);
        this.withCache = withCache;
        this.fetcher = fetchResolver({
            disposeTemporary: () => {
                this.dispose();
                this.query && cache.delete(this.query.request.identifier);
            },
        });
    }

    setQuery(
        gqlQuery: GraphQLTaggedNode,
        variables: TOperationType['variables'],
        networkCacheConfig: CacheConfig,
        query: OperationDescriptor,
    ): void {
        this.gqlQuery = gqlQuery;
        this.variables = variables;
        this.query = query;
        this.cacheConfig = networkCacheConfig;
    }

    setMounted(mounted = true): void {
        this.mounted = mounted;
    }

    setForceUpdate(forceUpdate): void {
        this.forceUpdate = forceUpdate;
    }

    dispose(): void {
        this.fetcher.dispose();
        this.disposeSnapshot();
    }

    disposeSnapshot(): void {
        this.cached = false;
        this.snapshot = null;
        if (this.rootSubscription) {
            this.rootSubscription.dispose();
            this.rootSubscription = null;
        }
    }

    onNext = (
        _o: OperationDescriptor,
        snapshot: Snapshot,
        fromStore: boolean,
        onlyStore: boolean,
    ): void => {
        this.snapshot = snapshot;

        if (onlyStore || !fromStore) {
            this.subscribe(snapshot);
        }

        //const suspense = !this.cached && this.suspense;
        this.cached = fromStore;
        if (!fromStore && this.mounted) {
            // !suspense &&
            this.forceUpdate();
        }
    };

    retry = (
        cacheConfigOverride?: CacheConfig | null,
        onComplete?: (_e: Error | null) => void,
    ): void => {
        this.disposeSnapshot();
        /* eslint-disable indent */
        const query = cacheConfigOverride
            ? createOperation(
                  this.query.request.node,
                  this.query.request.variables,
                  cacheConfigOverride,
              )
            : this.query;
        /* eslint-enable indent */
        const complete = (error: Error | null): void => {
            //const suspense = !this.cached && this.suspense;
            if (error && this.mounted) {
                // && !suspense
                this.forceUpdate();
            }
            onComplete && onComplete(error);
        };
        this.fetcher.fetch(this.environment, query, 'network-only', complete, this.onNext);
    };

    getQuery(gqlQuery, variables, networkCacheConfig): OperationDescriptor | null {
        if (
            gqlQuery != this.gqlQuery ||
            networkCacheConfig != this.cacheConfig ||
            variables != this.variables ||
            !areEqual(variables, this.variables)
        ) {
            this.variables = variables;
            this.gqlQuery = gqlQuery;
            this.cacheConfig = networkCacheConfig;
            return createOperation(gqlQuery, variables, networkCacheConfig);
        }
        return this.query;
    }

    resolveEnvironment(environment: IEnvironment): RenderProps<TOperationType> {
        return this.resolve(environment, this.gqlQuery, this.variables, this.options);
    }

    resolve(
        environment: IEnvironment,
        gqlQuery: GraphQLTaggedNode,
        variables: Variables,
        options: QueryOptions,
    ): RenderProps<TOperationType> {
        const query = this.getQuery(gqlQuery, variables, options.networkCacheConfig);
        const { fetchPolicy = defaultPolicy, fetchKey, skip, onComplete } = options;
        this.options = options;
        if (skip) {
            this.fetcher.dispose();
            this.disposeSnapshot();
            return;
        }
        const diffQuery = !this.query || query.request.identifier !== this.query.request.identifier;
        if (
            diffQuery ||
            environment !== this.environment ||
            fetchPolicy !== this.fetchPolicy ||
            fetchKey !== this.fetchKey
        ) {
            this.disposeSnapshot();
            this.environment = environment;
            this.query = query;
            this.fetchPolicy = fetchPolicy;
            this.fetchKey = fetchKey;

            const complete = (error: Error | null): void => {
                //const suspense = !this.cached; // && this.suspense;
                if (error && this.mounted) {
                    //!suspense
                    this.forceUpdate();
                }
                onComplete && onComplete(error);
            };

            this.fetcher.fetch(
                environment,
                query,
                fetchPolicy,
                complete,
                this.onNext,
                options.UNSTABLE_renderPolicy,
            );
        }
    }

    checkAndSuspense(suspense = false, useLazy = false): Promise<any> | Error | null {
        useLazy && cache.set(this.query.request.identifier, this);
        return this.fetcher.checkAndSuspense(suspense, useLazy);
    }

    getData(): RenderProps<TOperationType> {
        cache.delete(this.query.request.identifier);
        const { error } = this.fetcher.getData();
        return {
            cached: this.cached,
            retry: this.retry,
            error,
            props: this.snapshot ? this.snapshot.data : null,
        };
    }

    subscribe(snapshot): void {
        if (this.rootSubscription) {
            this.rootSubscription.dispose();
        }
        this.rootSubscription = this.environment.subscribe(snapshot, (snapshot) => {
            // Read from this._fetchOptions in case onDataChange() was lazily added.
            this.snapshot = snapshot;
            //this.error = null;
            this.forceUpdate();
        });
    }
}
