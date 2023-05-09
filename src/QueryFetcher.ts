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
import { FetchPolicy, RenderProps, QueryOptions, Options } from './RelayHooksTypes';
import { createOperation } from './Utils';

const defaultPolicy = 'store-or-network';

const cache: Map<string, QueryFetcher<any>> = new Map();

export function getOrCreateQueryFetcher<TOperationType extends OperationType>(
    useLazy: boolean,
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    networkCacheConfig: CacheConfig,
): QueryFetcher<TOperationType> {
    const query = createOperation(gqlQuery, variables, networkCacheConfig);
    const toGet = useLazy && cache.has(query.request.identifier);
    const queryFetcher = toGet ? cache.get(query.request.identifier) : new QueryFetcher();
    queryFetcher.setQuery(gqlQuery, variables, networkCacheConfig, query);
    return queryFetcher;
}

const emptyforceUpdate = (): void => undefined;

export class QueryFetcher<TOperationType extends OperationType = OperationType> {
    environment: IEnvironment;
    query: OperationDescriptor;
    fetcher: Fetcher;
    rootSubscription: Disposable;
    snapshot: Snapshot;
    fetchPolicy: FetchPolicy;
    fetchKey: string | number;
    variables: Variables;
    cacheConfig: Variables;
    gqlQuery: GraphQLTaggedNode;
    options: QueryOptions;
    forceUpdate = emptyforceUpdate;
    result: RenderProps<TOperationType> = null;
    skip?: boolean;

    constructor() {
        this.result = {
            retry: this.retry,
            error: null,
            data: null,
            isLoading: false,
        };
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

    getForceUpdate(): () => void {
        return this.forceUpdate;
    }

    setForceUpdate(forceUpdate): void {
        this.forceUpdate = forceUpdate;
    }

    dispose(): void {
        this.fetcher.dispose();
        this.disposeSnapshot();
    }

    disposeSnapshot(): void {
        this.snapshot = null;
        if (this.rootSubscription) {
            this.rootSubscription.dispose();
            this.rootSubscription = null;
        }
    }

    retry = (cacheConfigOverride?: CacheConfig | null, options: Options = {}): void => {
        const { fetchPolicy = 'network-only' } = options;
        /* eslint-disable indent */
        const query = cacheConfigOverride
            ? createOperation(this.query.request.node, this.query.request.variables, cacheConfigOverride)
            : this.query;
        this.fetch(query, fetchPolicy, options);
        this.resolveResult();
        this.forceUpdate();
    };

    fetch(query: OperationDescriptor, fetchPolicy: FetchPolicy, options: Options, skip?: boolean): void {
        this.disposeSnapshot();
        if (skip) {
            this.fetcher.dispose();
            return;
        }

        const { onComplete, onResponse } = options;
        const resolveUpdate = (doUpdate) => {
            this.resolveResult();
            if (doUpdate) {
                this.forceUpdate();
            }
        };
        const onNext = (operation: OperationDescriptor, snapshot: Snapshot, doUpdate: boolean): void => {
            if (!this.snapshot) {
                this.snapshot = snapshot;
                this.subscribe(snapshot);
                resolveUpdate(doUpdate);
            }
        };
        const complete = (error: Error | null, doUpdate: boolean): void => {
            // doUpdate is False only if fetch is Sync
            resolveUpdate(doUpdate);
            onComplete && onComplete(error);
        };
        this.fetcher.fetch(
            this.environment,
            query,
            fetchPolicy,
            complete,
            onNext,
            onResponse,
            options.UNSTABLE_renderPolicy,
        );
    }

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

    resolveEnvironment(environment: IEnvironment): void {
        this.resolve(environment, this.gqlQuery, this.variables, this.options);
    }

    resolve(environment: IEnvironment, gqlQuery: GraphQLTaggedNode, variables: Variables, options: QueryOptions): void {
        const query = this.getQuery(gqlQuery, variables, options.networkCacheConfig);
        const { fetchPolicy = defaultPolicy, fetchKey, skip } = options;
        this.options = options;
        const diffQuery = !this.query || query.request.identifier !== this.query.request.identifier;
        if (
            diffQuery ||
            environment !== this.environment ||
            fetchPolicy !== this.fetchPolicy ||
            fetchKey !== this.fetchKey ||
            skip !== this.skip
        ) {
            this.environment = environment;
            this.query = query;
            this.skip = skip;
            this.fetchPolicy = fetchPolicy;
            this.fetchKey = fetchKey;
            this.fetch(query, fetchPolicy, options, skip);
            this.resolveResult();
        }
    }

    checkAndSuspense(suspense?: boolean, useLazy?: boolean): Promise<any> | Error | null {
        if (useLazy) {
            this.setForceUpdate(emptyforceUpdate);
            cache.set(this.query.request.identifier, this);
        }
        const result = this.fetcher.checkAndSuspense(suspense, useLazy);
        if (useLazy) {
            cache.delete(this.query.request.identifier);
        }
        return result;
    }

    getData(): RenderProps<TOperationType> {
        return this.result;
    }

    resolveResult(): void {
        const { error, isLoading } = this.fetcher.getData();
        this.result = {
            retry: this.retry,
            error,
            data: this.snapshot ? this.snapshot.data : null,
            isLoading,
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
            this.resolveResult();
            this.forceUpdate();
        });
    }
}
