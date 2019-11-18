import { Disposable, CacheConfig, IEnvironment, Snapshot } from 'relay-runtime';
import { isNetworkPolicy, isStorePolicy } from './Utils';
import { __internal, OperationType } from 'relay-runtime';
import { FetchPolicy, RenderProps } from './RelayHooksType';

const { fetchQuery } = __internal;

const defaultPolicy = 'store-or-network';

class QueryFetcher<TOperationType extends OperationType> {
    environment: IEnvironment;
    query: any;
    networkSubscription: Disposable;
    rootSubscription: Disposable;
    error: Error;
    snapshot: Snapshot;
    fetchPolicy: FetchPolicy;
    result: RenderProps<TOperationType> = {
        retry: (_cacheConfigOverride: CacheConfig): void => undefined,
        cached: false,
        error: null,
        props: null,
    };
    disposableRetain: Disposable;

    forceUpdate: any;

    constructor(forceUpdate) {
        this.forceUpdate = forceUpdate;
    }

    dispose(): void {
        this.disposeRequest();
        this.disposeRetain();
    }

    disposeRetain(): void {
        this.disposableRetain && this.disposableRetain.dispose();
    }

    isDiffEnvQuery(environment: IEnvironment, query): boolean {
        return environment !== this.environment || query !== this.query;
    }

    lookupInStore(environment: IEnvironment, operation, fetchPolicy: FetchPolicy): Snapshot {
        if (isStorePolicy(fetchPolicy) && environment.check(operation.root)) {
            return environment.lookup(operation.fragment, operation);
        }
        return null;
    }

    execute(
        environment: IEnvironment,
        query,
        options,
        retain: (environment, query) => Disposable = (environment, query) =>
            environment.retain(query.root),
    ): RenderProps<TOperationType> {
        const { fetchPolicy = defaultPolicy, networkCacheConfig } = options;
        let storeSnapshot;
        const retry = (cacheConfigOverride: CacheConfig = networkCacheConfig): void => {
            this.disposeRequest();
            this.fetch(cacheConfigOverride);
        };
        const isDiffEnvQuery = this.isDiffEnvQuery(environment, query);
        if (isDiffEnvQuery || fetchPolicy !== this.fetchPolicy) {
            this.environment = environment;
            this.query = query;
            this.fetchPolicy = fetchPolicy;
            if (isDiffEnvQuery) {
                this.disposeRetain();
                this.disposableRetain = retain(environment, query);
            }
            this.disposeRequest();

            storeSnapshot = this.lookupInStore(environment, this.query, fetchPolicy);
            const isNetwork = isNetworkPolicy(fetchPolicy, storeSnapshot);
            if (isNetwork) {
                this.fetch(networkCacheConfig);
            } else if (!!storeSnapshot) {
                this.snapshot = storeSnapshot;
                this.error = null;
                this.subscribe(storeSnapshot);
            }
        }
        const resultSnapshot = storeSnapshot || this.snapshot;
        this.result = {
            cached: !!storeSnapshot,
            retry,
            error: this.error,
            props: resultSnapshot ? resultSnapshot.data : null,
        };
        return this.result;
    }

    subscribe(snapshot): void {
        this.rootSubscription = this.environment.subscribe(snapshot, (snapshot) => {
            // Read from this._fetchOptions in case onDataChange() was lazily added.
            this.snapshot = snapshot;
            this.error = null;
            this.forceUpdate(snapshot);
        });
    }

    fetch(networkCacheConfig): void {
        let fetchHasReturned = false;
        fetchQuery(this.environment, this.query, {
            networkCacheConfig,
        }).subscribe({
            start: (subscription) => {
                this.networkSubscription = {
                    dispose: (): void => subscription.unsubscribe(),
                };
            },
            next: () => {
                this._onQueryDataAvailable({ notifyFirstResult: fetchHasReturned });
            },
            error: (error) => {
                this.error = error;
                this.snapshot = null;
                if (fetchHasReturned) {
                    this.forceUpdate(error);
                }
                this.error = error;
                this.networkSubscription = null;
            },
            complete: () => {
                this.networkSubscription = null;
            },
        });
        fetchHasReturned = true;
    }

    disposeRequest(): void {
        this.error = null;
        this.snapshot = null;
        if (this.networkSubscription) {
            this.networkSubscription.dispose();
        }
        if (this.rootSubscription) {
            this.rootSubscription.dispose();
        }
    }

    _onQueryDataAvailable({ notifyFirstResult }): void {
        // `_onQueryDataAvailable` can be called synchronously the first time and can be called
        // multiple times by network layers that support data subscriptions.
        // Wait until the first payload to call `onDataChange` and subscribe for data updates.
        if (this.snapshot) {
            return;
        }

        this.snapshot = this.environment.lookup(this.query.fragment);

        // Subscribe to changes in the data of the root fragment
        this.subscribe(this.snapshot);

        if (this.snapshot && notifyFirstResult) {
            this.error = null;
            this.forceUpdate(this.snapshot);
        }
    }
}

export default QueryFetcher;
