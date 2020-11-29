import {
    __internal,
    Disposable,
    FetchPolicy,
    Subscription,
    OperationDescriptor,
    IEnvironment,
    Snapshot,
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
            fromStore: boolean,
            onlyStore: boolean,
        ) => void,
    ) => Disposable;
    getData: () => {
        isLoading: boolean;
        error?: Error | null;
    };
    dispose: () => void;
    clearTemporaryRetain: () => void;
};

export function fetchResolver({
    suspense = false,
    useLazy = false,
    setLoading,
    doRetain = true,
    disposeTemporary,
}: {
    suspense?: boolean;
    useLazy?: boolean;
    doRetain?: boolean;
    setLoading?: (loading: boolean) => void;
    disposeTemporary?: () => void;
}): Fetcher {
    let _refetchSubscription: Subscription | null = null;
    let disposable: Disposable | null = null;
    let releaseQueryTimeout;
    let isLoading = false;
    let query;
    let promise;
    let error: Error | null = null;
    let env;

    const updateLoading = (loading: boolean): void => {
        isLoading = loading;
        setLoading && setLoading(isLoading);
    };
    const lookupInStore = (environment: IEnvironment, operation, fetchPolicy): Snapshot | null => {
        if (isStorePolicy(fetchPolicy)) {
            const check = environment.check(operation);
            if (check.status === 'available') {
                return environment.lookup(operation.fragment);
            }
        }
        return null;
    };

    const dispose = (): void => {
        clearTemporaryRetain();
        disposable && disposable.dispose();
        disposeRequest();
        disposable = null;
    };

    const clearTemporaryRetain = (): void => {
        clearTimeout(releaseQueryTimeout);
        releaseQueryTimeout = null;
    };

    const temporaryRetain = (): void => {
        const localReleaseTemporaryRetain = (): void => {
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
        onNext: (operation: OperationDescriptor, snapshot: Snapshot, fromStore, onlyStore) => void,
    ): Disposable => {
        const observer = {
            complete: (): void => {
                onComplete(null);
            },
            error: (e: Error): void => {
                error = e;
                onComplete(error);
            },
        };
        if (env != environment || query.request.identifier !== operation.request.identifier) {
            dispose();
            if (doRetain) {
                disposable = environment.retain(operation);
            }
        }
        env = environment;
        query = operation;

        disposeRequest();
        const storeSnapshot = lookupInStore(environment, operation, fetchPolicy);
        const isNetwork = isNetworkPolicy(fetchPolicy, storeSnapshot);
        if (storeSnapshot != null) {
            const onlyStore = !isNetwork;
            onNext(operation, storeSnapshot, true, onlyStore);
            if (onlyStore) {
                observer.complete();
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
                    observer.complete();
                },
                error: (error: Error): void => {
                    resolveNetworkPromise();
                    updateLoading(false);
                    cleanup();
                    observer.error(error);
                },
                next: () => {
                    const store = environment.lookup(operation.fragment);
                    promise = null;
                    resolveNetworkPromise();
                    onNext(operation, store, false, false);
                },
                start: (subscription) => {
                    refetchSubscription = subscription;
                    _refetchSubscription = refetchSubscription;
                    updateLoading(true);
                },
            });
            if (!storeSnapshot) {
                promise = new Promise((resolve) => {
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

    const getData = (): {
        isLoading: boolean;
        error?: Error | null;
    } => {
        if (promise && suspense) {
            if (useLazy) {
                //this.setForceUpdate(() => undefined);
                temporaryRetain();
            }
            const toThrow = promise;
            promise = null; // loadQuery, only throw promise first time
            throw toThrow;
        }
        return {
            isLoading,
            error,
        };
    };

    return {
        fetch,
        getData,
        dispose,
        clearTemporaryRetain,
    };
}
