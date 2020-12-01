import {
    Disposable,
    CacheConfig,
    IEnvironment,
    Snapshot,
    OperationType,
    OperationDescriptor,
} from 'relay-runtime';
import { Fetcher, fetchResolver } from './FetchResolver';
import { FetchPolicy, RenderProps, QueryOptions } from './RelayHooksType';
import { createOperation } from './Utils';

const defaultPolicy = 'store-or-network';

const cache: Map<string, QueryFetcher<any>> = new Map();

export function getOrCreateQueryFetcher<TOperationType extends OperationType>(
    query: OperationDescriptor | null,
    forceUpdate: any,
): QueryFetcher<TOperationType> {
    const suspense = !!query;
    const toGet = suspense && cache.has(query.request.identifier);
    const queryFetcher = toGet
        ? cache.get(query.request.identifier)
        : new QueryFetcher(suspense, suspense);
    queryFetcher.setForceUpdate(forceUpdate);
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
    suspense: boolean;
    useLazy: boolean;
    mounted = false;

    constructor(suspense = false, useLazy = false) {
        this.suspense = suspense;
        this.useLazy = suspense && useLazy;
        this.setForceUpdate(() => undefined);
        this.fetcher = fetchResolver({
            suspense,
            useLazy,
            disposeTemporary: () => this.dispose(),
        });
    }

    setMounted(): void {
        this.mounted = true;
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

        const suspense = !this.cached && this.suspense;
        this.cached = fromStore;
        if (!suspense && !fromStore && this.mounted) {
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
            const suspense = !this.cached && this.suspense;
            if (error && !suspense && this.mounted) {
                this.forceUpdate(error);
            }
            onComplete && onComplete(error);
        };
        this.fetcher.fetch(this.environment, query, 'network-only', complete, this.onNext);
    };

    execute(
        environment: IEnvironment,
        query: OperationDescriptor,
        options: QueryOptions,
    ): RenderProps<TOperationType> {
        const { fetchPolicy = defaultPolicy, fetchKey, skip, onComplete } = options;
        const diffQuery = !this.query || query.request.identifier !== this.query.request.identifier;

        this.fetcher.clearTemporaryRetain();

        if (skip) {
            return {
                cached: false,
                retry: this.retry,
                error: null,
                props: undefined,
            };
        }
        if (
            diffQuery ||
            environment !== this.environment ||
            fetchPolicy !== this.fetchPolicy ||
            fetchKey !== this.fetchKey
        ) {
            if (diffQuery && this.useLazy) {
                this.query && cache.delete(this.query.request.identifier);
                cache.set(query.request.identifier, this);
            }
            //if (diffQuery || environment !== this.environment) this.disposeSnapshot();
            this.disposeSnapshot();
            this.environment = environment;
            this.query = query;
            this.fetchPolicy = fetchPolicy;
            this.fetchKey = fetchKey;

            const complete = (error: Error | null): void => {
                const suspense = !this.cached && this.suspense;
                if (error && !suspense && this.mounted) {
                    this.forceUpdate(error);
                }
                onComplete && onComplete(error);
            };

            this.fetcher.fetch(environment, query, fetchPolicy, complete, this.onNext);
        }

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
