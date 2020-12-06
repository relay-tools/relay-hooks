import {
    Disposable,
    CacheConfig,
    IEnvironment,
    Snapshot,
    OperationType,
    OperationDescriptor,
} from 'relay-runtime';
import { Fetcher, fetchResolver } from './FetchResolver';
import { FetchPolicy, RenderProps, InternalQueryOptions } from './RelayHooksType';
import { createOperation } from './Utils';

const defaultPolicy = 'store-or-network';

const cache: Map<string, QueryFetcher<any>> = new Map();

export function getOrCreateQueryFetcher<TOperationType extends OperationType>(
    query: OperationDescriptor | null,
    forceUpdate: any,
): QueryFetcher<TOperationType> {
    const withCache = !!query;
    const toGet = query && cache.has(query.request.identifier);
    const queryFetcher = toGet ? cache.get(query.request.identifier) : new QueryFetcher(withCache);
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
    forceUpdate: (_o: any) => void;
    mounted = false;
    withCache = false;

    constructor(withCache?: boolean) {
        this.setForceUpdate(() => undefined);
        this.withCache = withCache;
        this.fetcher = fetchResolver({
            disposeTemporary: () => this.dispose(),
        });
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
        this.query && cache.delete(this.query.request.identifier);
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
            this.forceUpdate(snapshot);
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
                this.forceUpdate(error);
            }
            onComplete && onComplete(error);
        };
        this.fetcher.fetch(this.environment, query, 'network-only', complete, this.onNext);
    };

    execute(
        environment: IEnvironment,
        query: OperationDescriptor,
        options: InternalQueryOptions,
    ): RenderProps<TOperationType> {
        const { fetchPolicy = defaultPolicy, fetchKey, skip, onComplete } = options;
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
            if (diffQuery && this.withCache) {
                this.query && cache.delete(this.query.request.identifier);
                cache.set(query.request.identifier, this);
            }
            this.disposeSnapshot();
            this.environment = environment;
            this.query = query;
            this.fetchPolicy = fetchPolicy;
            this.fetchKey = fetchKey;

            const complete = (error: Error | null): void => {
                //const suspense = !this.cached; // && this.suspense;
                if (error && this.mounted) {
                    //!suspense
                    this.forceUpdate(error);
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
        return this.fetcher.checkAndSuspense(suspense, useLazy);
    }

    getData(): RenderProps<TOperationType> {
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
            this.forceUpdate(snapshot);
        });
    }
}
