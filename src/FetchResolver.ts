import {
    __internal,
    Disposable,
    FetchPolicy,
    Subscription,
    OperationDescriptor,
    IEnvironment,
    Snapshot,
    RenderPolicy,
    GraphQLResponse,
} from 'relay-runtime';
import { isNetworkPolicy, isStorePolicy } from './Utils';
const { fetchQuery } = __internal;
const DATA_RETENTION_TIMEOUT = 30 * 1000;

export type Fetcher = {
    fetch: (
        environment: IEnvironment,
        operation: OperationDescriptor,
        fetchPolicy: FetchPolicy | null | undefined,
        onComplete: (_e: Error | null, doUpdate: boolean) => void,
        onNext: (operation: OperationDescriptor, snapshot: Snapshot, doUpdate: boolean) => void,
        onResponse?: (response: GraphQLResponse | null) => void,
        renderPolicy?: RenderPolicy,
    ) => Disposable;
    getData: () => {
        isLoading: boolean;
        error?: Error | null;
    };
    dispose: () => void;
    checkAndSuspense: (suspense: boolean, useLazy?: boolean) => Promise<any> | Error | null;
};

export function fetchResolver({
    doRetain = true,
    disposeTemporary,
}: {
    doRetain?: boolean;
    disposeTemporary?: () => void;
}): Fetcher {
    let _refetchSubscription: Subscription | null = null;
    let disposable: Disposable | null = null;
    let releaseQueryTimeout;
    let isLoading = false;
    let query;
    let promise: Promise<any>;
    let error: Error | null = null;
    let env;

    const update = (loading: boolean, e: Error = null): void => {
        isLoading = loading;
        error = e;
    };
    const lookupInStore = (
        environment: IEnvironment,
        operation,
        fetchPolicy,
        renderPolicy: RenderPolicy,
    ): { snapshot: Snapshot | null; full: boolean } => {
        if (isStorePolicy(fetchPolicy)) {
            const check = environment.check(operation);
            const queryStatus = check.status;
            const hasFullQuery = queryStatus === 'available';
            const canPartialRender = hasFullQuery || (renderPolicy === 'partial' && queryStatus !== 'stale');
            if (canPartialRender) {
                return { snapshot: environment.lookup(operation.fragment), full: hasFullQuery };
            }
        }
        return { snapshot: null, full: false };
    };

    const dispose = (): void => {
        clearTemporaryRetain();
        disposable && disposable.dispose();
        disposeRequest();
        disposable = null;
        env = null;
        query = null;
    };

    const clearTemporaryRetain = (): void => {
        clearTimeout(releaseQueryTimeout);
        releaseQueryTimeout = null;
    };

    const temporaryRetain = (): void => {
        const localReleaseTemporaryRetain = (): void => {
            clearTemporaryRetain();
            dispose();
            disposeTemporary && disposeTemporary();
        };
        releaseQueryTimeout = setTimeout(localReleaseTemporaryRetain, DATA_RETENTION_TIMEOUT);
    };

    const disposeRequest = (): void => {
        _refetchSubscription && _refetchSubscription.unsubscribe();
        error = null;
        isLoading = false;
    };

    const fetch = (
        environment: IEnvironment,
        operation: OperationDescriptor,
        fetchPolicy: FetchPolicy = 'network-only',
        onComplete = (_e: Error | null, _u: boolean): void => undefined,
        onNext: (operation: OperationDescriptor, snapshot: Snapshot, doUpdate: boolean) => void,
        onResponse?: (response: GraphQLResponse | null) => void,
        renderPolicy?: RenderPolicy,
    ): Disposable => {
        let fetchHasReturned = false;
        if (env != environment || query.request.identifier !== operation.request.identifier) {
            dispose();
            if (doRetain) {
                disposable = environment.retain(operation);
            }
        }
        env = environment;
        query = operation;

        disposeRequest();
        const { snapshot, full } = lookupInStore(environment, operation, fetchPolicy, renderPolicy);
        const isNetwork = isNetworkPolicy(fetchPolicy, full);
        if (snapshot != null) {
            const onlyStore = !isNetwork;
            onNext(operation, snapshot, fetchHasReturned && !onlyStore);
            if (onlyStore) {
                onComplete(null, fetchHasReturned);
            }
        }
        // Cancel any previously running refetch.
        _refetchSubscription && _refetchSubscription.unsubscribe();
        let refetchSubscription: Subscription;
        if (isNetwork) {
            let resolveNetworkPromise = (): void => {};

            // Declare refetchSubscription before assigning it in .start(), since
            // synchronous completion may call callbacks .subscribe() returns.
            const cleanup = (): void => {
                if (_refetchSubscription === refetchSubscription) {
                    _refetchSubscription = null;
                }
                isLoading = false;
                promise = null;
            };

            const complete = (error: Error = null) => {
                resolveNetworkPromise();
                update(false, error);
                cleanup();
                onComplete(error, fetchHasReturned);
            };

            fetchQuery(environment, operation).subscribe({
                unsubscribe: (): void => {
                    cleanup();
                },
                complete,
                error: (e: Error): void => complete(e),
                next: (response: GraphQLResponse) => {
                    const store = environment.lookup(operation.fragment);
                    promise = null;
                    const responses = Array.isArray(response) ? response : [response];
                    const cacheConfig = operation.request.cacheConfig;
                    const isQueryPolling = !!cacheConfig && !!cacheConfig.poll;
                    const isIncremental = responses.some((x) => x != null && x.hasNext === true);
                    isQueryPolling && update(false);
                    resolveNetworkPromise();
                    onResponse && onResponse(response);
                    onNext(operation, store, fetchHasReturned && (isIncremental || isQueryPolling));
                },
                start: (subscription) => {
                    refetchSubscription = subscription;
                    _refetchSubscription = refetchSubscription;
                    update(true);
                },
            });
            if (!snapshot) {
                promise = new Promise((resolve: any) => {
                    resolveNetworkPromise = resolve;
                });
            }
        }
        fetchHasReturned = true;
        return {
            dispose: (): void => {
                refetchSubscription && refetchSubscription.unsubscribe();
            },
        };
    };

    const checkAndSuspense = (suspense, useLazy): Promise<any> | Error | null => {
        clearTemporaryRetain();
        const toThrow = promise || error;
        if (suspense && toThrow) {
            if (promise && useLazy) {
                temporaryRetain();
            }
            throw toThrow;
        }
        return toThrow;
    };

    const getData = (): {
        isLoading: boolean;
        error?: Error | null;
    } => {
        return {
            isLoading,
            error,
        };
    };

    return {
        fetch,
        getData,
        dispose,
        checkAndSuspense,
    };
}
