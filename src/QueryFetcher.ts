import {
    Disposable,
    CacheConfig,
    IEnvironment,
    Snapshot,
    __internal,
    OperationType,
    OperationDescriptor,
    Observer,
} from 'relay-runtime';
import { FetchPolicy, RenderProps, QueryOptions } from './RelayHooksType';
import { isNetworkPolicy, isStorePolicy } from './Utils';

const { fetchQuery } = __internal;

const defaultPolicy = 'store-or-network';

const cache: Map<string, QueryFetcher<any>> = new Map();

export function getOrCreateQueryFetcher<TOperationType extends OperationType>(
    query: OperationDescriptor | null,
    forceUpdate: any,
): QueryFetcher<TOperationType> {
    const suspense = !!query;
    const queryFetcher =
        suspense && cache.has(query.request.identifier)
            ? cache.get(query.request.identifier)
            : new QueryFetcher(suspense, suspense);
    queryFetcher.setForceUpdate(forceUpdate);
    return queryFetcher;
}

const DATA_RETENTION_TIMEOUT = 30 * 1000;

export class QueryFetcher<TOperationType extends OperationType = OperationType> {
    environment: IEnvironment;
    query: OperationDescriptor;
    networkSubscription: Disposable;
    rootSubscription: Disposable;
    error: Error | null;
    snapshot: Snapshot;
    fetchPolicy: FetchPolicy;
    fetchKey: string | number;
    disposableRetain: Disposable;
    forceUpdate: (_o: any) => void;
    suspense: boolean;
    useLazy: boolean;
    releaseQueryTimeout;

    constructor(suspense = false, useLazy = false) {
        this.suspense = suspense;
        this.useLazy = suspense && useLazy;
        this.setForceUpdate(() => undefined);
    }

    setForceUpdate(forceUpdate): void {
        this.forceUpdate = forceUpdate;
    }

    dispose(): void {
        this.disposeRequest();
        this.disposeRetain();
    }

    disposeRetain(): void {
        this.clearTemporaryRetain();
        this.disposableRetain && this.disposableRetain.dispose();
        this.query && cache.delete(this.query.request.identifier);
    }

    clearTemporaryRetain(): void {
        clearTimeout(this.releaseQueryTimeout);
        this.releaseQueryTimeout = null;
    }

    temporaryRetain(): void {
        const localReleaseTemporaryRetain = (): void => {
            this.dispose();
        };
        this.releaseQueryTimeout = setTimeout(localReleaseTemporaryRetain, DATA_RETENTION_TIMEOUT);
    }

    isDiffEnvQuery(environment: IEnvironment, query): boolean {
        return (
            environment !== this.environment ||
            query.request.identifier !== this.query.request.identifier
        );
    }

    lookupInStore(environment: IEnvironment, operation, fetchPolicy: FetchPolicy): Snapshot {
        if (isStorePolicy(fetchPolicy)) {
            const check: any = environment.check(operation);
            if (check === 'available' || check.status === 'available') {
                return environment.lookup(operation.fragment);
            }
        }
        return null;
    }

    execute(
        environment: IEnvironment,
        query: OperationDescriptor,
        options: QueryOptions,
        retain: (environment, query) => Disposable = (environment, query): Disposable =>
            environment.retain(query),
    ): RenderProps<TOperationType> {
        const {
            fetchPolicy = defaultPolicy,
            networkCacheConfig,
            fetchKey,
            skip,
            fetchObserver,
        } = options;
        let storeSnapshot;
        const retry = (
            cacheConfigOverride: CacheConfig = networkCacheConfig,
            observer?: Observer<Snapshot>,
        ): void => {
            this.disposeRequest();
            this.fetch(cacheConfigOverride, false, observer);
        };
        if (skip) {
            return {
                cached: false,
                retry,
                error: null,
                props: undefined,
            };
        }
        this.clearTemporaryRetain();
        const isDiffEnvQuery = this.isDiffEnvQuery(environment, query);
        if (isDiffEnvQuery || fetchPolicy !== this.fetchPolicy || fetchKey !== this.fetchKey) {
            if (isDiffEnvQuery) {
                this.disposeRetain();
                this.useLazy && cache.set(query.request.identifier, this);
                this.disposableRetain = retain(environment, query);
            }
            this.environment = environment;
            this.query = query;
            this.fetchPolicy = fetchPolicy;
            this.fetchKey = fetchKey;
            this.disposeRequest();

            storeSnapshot = this.lookupInStore(environment, this.query, fetchPolicy);
            const isNetwork = isNetworkPolicy(fetchPolicy, storeSnapshot);
            if (isNetwork) {
                this.fetch(networkCacheConfig, this.suspense && !storeSnapshot, fetchObserver);
            } else if (!!storeSnapshot) {
                this.snapshot = storeSnapshot;
                this.error = null;
                this.subscribe(storeSnapshot);
            }
        }

        const resultSnapshot = storeSnapshot || this.snapshot;
        return {
            cached: !!storeSnapshot,
            retry,
            error: this.error,
            props: resultSnapshot ? resultSnapshot.data : null,
        };
    }

    subscribe(snapshot): void {
        if (this.rootSubscription) {
            this.rootSubscription.dispose();
        }
        this.rootSubscription = this.environment.subscribe(snapshot, (snapshot) => {
            // Read from this._fetchOptions in case onDataChange() was lazily added.
            this.snapshot = snapshot;
            this.error = null;
            this.forceUpdate(snapshot);
        });
    }

    fetch(networkCacheConfig, suspense: boolean, observer = {} as Observer<Snapshot>): void {
        let fetchHasReturned = false;
        let resolveNetworkPromise = (): void => {};
        fetchQuery(this.environment, this.query, {
            networkCacheConfig:
                suspense && !networkCacheConfig ? { force: true } : networkCacheConfig,
        }).subscribe({
            start: (subscription) => {
                this.networkSubscription = {
                    dispose: (): void => subscription.unsubscribe(),
                };
                observer.start && observer.start(subscription);
            },
            next: () => {
                this.error = null;
                this._onQueryDataAvailable({
                    notifyFirstResult: fetchHasReturned,
                    suspense,
                    observer,
                });
                resolveNetworkPromise();
            },
            error: (error) => {
                this.error = error;
                this.snapshot = null;
                if (fetchHasReturned && !suspense) {
                    this.forceUpdate(error);
                }
                resolveNetworkPromise();
                this.networkSubscription = null;
                observer.error && observer.error(error);
            },
            complete: () => {
                this.networkSubscription = null;
                observer.complete && observer.complete();
            },
            unsubscribe: (subscription) => {
                if (this.useLazy && !this.rootSubscription && this.releaseQueryTimeout) {
                    this.dispose();
                }
                observer.unsubscribe && observer.unsubscribe(subscription);
            },
        });
        fetchHasReturned = true;
        if (suspense) {
            if (this.useLazy) {
                this.setForceUpdate(() => undefined);
                this.temporaryRetain();
            }
            throw new Promise((resolve) => {
                resolveNetworkPromise = resolve;
            });
        }
    }

    disposeRequest(): void {
        this.error = null;
        this.snapshot = null;
        if (this.networkSubscription) {
            this.networkSubscription.dispose();
            this.networkSubscription = null;
        }
        if (this.rootSubscription) {
            this.rootSubscription.dispose();
            this.rootSubscription = null;
        }
    }

    _onQueryDataAvailable({
        notifyFirstResult,
        suspense,
        observer,
    }: {
        notifyFirstResult: boolean;
        suspense: boolean;
        observer: Observer<Snapshot>;
    }): void {
        // `_onQueryDataAvailable` can be called synchronously the first time and can be called
        // multiple times by network layers that support data subscriptions.
        // Wait until the first payload to call `onDataChange` and subscribe for data updates.

        if (this.snapshot) {
            return;
        }

        this.snapshot = this.environment.lookup(this.query.fragment);

        // Subscribe to changes in the data of the root fragment
        this.subscribe(this.snapshot);

        observer.next && observer.next(this.snapshot);

        if (this.snapshot && notifyFirstResult && !suspense) {
            this.forceUpdate(this.snapshot);
        }
    }
}
