import {
    __internal,
    Disposable,
    FetchPolicy,
    Subscription,
    OperationDescriptor,
    IEnvironment,
    Snapshot,
    RenderPolicy,
} from 'relay-runtime';
import { isNetworkPolicy, isStorePolicy } from './Utils';
const { fetchQuery } = __internal;
const DATA_RETENTION_TIMEOUT = 30 * 1000;

export type Fetcher = {
    fetch: (
        environment: IEnvironment,
        operation: OperationDescriptor,
        fetchPolicy: FetchPolicy | null | undefined,
        onComplete: (_e: Error | null) => void,
        onNext: (
            operation: OperationDescriptor,
            snapshot: Snapshot,
            fromStore?: boolean,
            onlyStore?: boolean,
        ) => void,
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
    setLoading,
    doRetain = true,
    disposeTemporary,
}: {
    doRetain?: boolean;
    setLoading?: (loading: boolean) => void;
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

    const updateLoading = (loading: boolean): void => {
        isLoading = loading;
        setLoading && setLoading(isLoading);
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
            const canPartialRender =
                hasFullQuery || (renderPolicy === 'partial' && queryStatus !== 'stale');
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
    };

    const fetch = (
        environment: IEnvironment,
        operation: OperationDescriptor,
        fetchPolicy: FetchPolicy = 'network-only',
        onComplete = (_e: Error | null): void => undefined,
        onNext: (
            operation: OperationDescriptor,
            snapshot: Snapshot,
            fromStore?: boolean,
            onlyStore?: boolean,
        ) => void,
        renderPolicy?: RenderPolicy,
    ): Disposable => {
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
            onNext(operation, snapshot, true, onlyStore);
            if (onlyStore) {
                onComplete(null);
            }
        }
        // Cancel any previously running refetch.
        _refetchSubscription && _refetchSubscription.unsubscribe();
        if (isNetwork) {
            let resolveNetworkPromise = (): void => {};

            // Declare refetchSubscription before assigning it in .start(), since
            // synchronous completion may call callbacks .subscribe() returns.
            let refetchSubscription: Subscription;
            const cleanup = (): void => {
                if (_refetchSubscription === refetchSubscription) {
                    _refetchSubscription = null;
                }
                isLoading = false;
                promise = null;
            };

            fetchQuery(environment, operation).subscribe({
                unsubscribe: (): void => {
                    cleanup();
                },
                complete: (): void => {
                    resolveNetworkPromise();
                    updateLoading(false);
                    cleanup();
                    onComplete(null);
                },
                error: (e: Error): void => {
                    error = e;
                    resolveNetworkPromise();
                    updateLoading(false);
                    cleanup();
                    onComplete(e);
                },
                next: () => {
                    const store = environment.lookup(operation.fragment);
                    promise = null;
                    resolveNetworkPromise();
                    onNext(operation, store);
                },
                start: (subscription) => {
                    refetchSubscription = subscription;
                    _refetchSubscription = refetchSubscription;
                    updateLoading(true);
                },
            });
            if (!snapshot) {
                promise = new Promise((resolve: any) => {
                    resolveNetworkPromise = resolve;
                });
            }
            return {
                dispose: (): void => {
                    refetchSubscription && refetchSubscription.unsubscribe();
                },
            };
        }
        return {
            dispose: (): void => {},
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
