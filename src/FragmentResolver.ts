import * as areEqual from 'fbjs/lib/areEqual';
import * as invariant from 'fbjs/lib/invariant';
import * as warning from 'fbjs/lib/warning';
import {
    getSelector,
    IEnvironment,
    Disposable,
    Snapshot,
    Variables,
    getVariablesFromFragment,
    GraphQLTaggedNode,
    OperationDescriptor,
    Subscription,
    getFragmentIdentifier,
    PluralReaderSelector,
    __internal,
    ReaderSelector,
    SingularReaderSelector,
    ReaderFragment,
    Observer,
    FetchPolicy,
    getDataIDsFromFragment,
} from 'relay-runtime';
import { getConnectionState } from './getConnectionState';
import { getPaginationMetadata } from './getPaginationMetadata';
import { getPaginationVariables } from './getPaginationVariables';
import { getRefetchMetadata } from './getRefetchMetadata';
import { getValueAtPath } from './getValueAtPath';
import { Options, OptionsLoadMore } from './RelayHooksType';
import { isNetworkPolicy, isStorePolicy, createOperation, forceCache } from './Utils';

const { fetchQuery } = __internal;

type SingularOrPluralSnapshot = Snapshot | Array<Snapshot>;

function lookupFragment(environment, selector): SingularOrPluralSnapshot {
    return selector.kind === 'PluralReaderSelector'
        ? selector.selectors.map((s) => environment.lookup(s))
        : environment.lookup(selector);
}

function getFragmentResult(snapshot: SingularOrPluralSnapshot): any {
    if (Array.isArray(snapshot)) {
        return { snapshot, data: snapshot.map((s) => s.data) };
    }
    return { snapshot, data: snapshot.data };
}

type FragmentResult = {
    snapshot: SingularOrPluralSnapshot | null;
    data: any;
};

export class FragmentResolver {
    _environment: IEnvironment;
    _fragment: ReaderFragment;
    _fragmentRef: any;
    _idfragment: any;
    _idfragmentrefetch: any;
    _result: FragmentResult;
    _disposable: Disposable = { dispose: () => {} };
    _selector: ReaderSelector;
    _forceUpdate: any;
    _isPlural: boolean;
    _refetchSubscription: Subscription;
    _refetchVariables: Variables;
    _isARequestInFlight = false;
    _selectionReferences: Array<Disposable> = [];
    _cacheSelectionReference: Disposable;
    indexUpdate = 0;

    hasNext = false;
    hasPrevious = false;
    isLoadingNext = false;
    isLoadingPrevious = false;

    constructor(forceUpdate) {
        this._forceUpdate = forceUpdate;
    }

    isEqualsFragmentRef(fragmentRef): boolean {
        if (this._fragmentRef !== fragmentRef) {
            const prevIDs = getDataIDsFromFragment(this._fragment, this._fragmentRef);
            const nextIDs = getDataIDsFromFragment(this._fragment, fragmentRef);
            if (
                !areEqual(prevIDs, nextIDs) ||
                !areEqual(
                    this.getFragmentVariables(fragmentRef),
                    this.getFragmentVariables(this._fragmentRef),
                )
            ) {
                return false;
            }
        }
        return true;
    }

    refreshHooks(): void {
        this.indexUpdate += 1;
        this._forceUpdate(this.indexUpdate);
    }

    dispose(): void {
        this._disposable && this._disposable.dispose();
        this._refetchSubscription && this._refetchSubscription.unsubscribe();
        this._refetchSubscription = null;
        this.disposeSelectionReferences();

        this._isARequestInFlight = false;
    }

    disposeSelectionReferences(): void {
        this._disposeCacheSelectionReference();
        this._selectionReferences.forEach((r) => r.dispose());
        this._selectionReferences = [];
    }

    _retainCachedOperation(operation: OperationDescriptor): void {
        this._disposeCacheSelectionReference();
        this._cacheSelectionReference = this._environment.retain(operation);
    }

    _disposeCacheSelectionReference(): void {
        this._cacheSelectionReference && this._cacheSelectionReference.dispose();
        this._cacheSelectionReference = null;
    }

    getFragmentVariables(fRef = this._fragmentRef): Variables {
        return getVariablesFromFragment(this._fragment, fRef);
    }

    resolve(
        environment: IEnvironment,
        idfragment: string,
        fragment: ReaderFragment,
        fragmentRef,
    ): void {
        if (
            this._environment !== environment ||
            (idfragment !== this._idfragment &&
                (!this._idfragmentrefetch ||
                    (this._idfragmentrefetch && idfragment !== this._idfragmentrefetch)))
        ) {
            this._environment = environment;
            this._fragment = fragment;
            this._fragmentRef = fragmentRef;
            this._idfragment = idfragment;
            this._result = null;
            this._selector = null;
            this.dispose();
            this.lookup(this._fragmentRef);
        }
    }

    lookup(fragmentRef): void {
        if (fragmentRef == null) {
            this._result = { data: null, snapshot: null };
            return;
        }
        this._isPlural =
            this._fragment.metadata &&
            this._fragment.metadata.plural &&
            this._fragment.metadata.plural === true;
        if (this._isPlural) {
            if (fragmentRef.length === 0) {
                this._result = { data: [], snapshot: [] };
                return;
            }
        }
        this._selector = getSelector(this._fragment, fragmentRef);
        const snapshot = lookupFragment(this._environment, this._selector);

        // if (!isMissingData(snapshot)) { this for promises
        this._result = getFragmentResult(snapshot);
        this.subscribe();
    }

    getData(): any | null {
        return this._result ? this._result.data : null;
    }

    subscribe(): void {
        const environment = this._environment;
        const renderedSnapshot = this._result.snapshot;

        this._disposable && this._disposable.dispose();
        if (!renderedSnapshot) {
            this._disposable = { dispose: (): void => {} };
        }

        const dataSubscriptions = [];

        if (Array.isArray(renderedSnapshot)) {
            renderedSnapshot.forEach((snapshot, idx) => {
                dataSubscriptions.push(
                    environment.subscribe(snapshot, (latestSnapshot) => {
                        this._result.snapshot[idx] = latestSnapshot;
                        this._result.data[idx] = latestSnapshot.data;
                        this.refreshHooks();
                    }),
                );
            });
        } else {
            dataSubscriptions.push(
                environment.subscribe(renderedSnapshot, (latestSnapshot) => {
                    this._result = getFragmentResult(latestSnapshot);
                    this.refreshHooks();
                }),
            );
        }

        this._disposable = {
            dispose: (): void => {
                dataSubscriptions.map((s) => s.dispose());
            },
        };
    }

    lookupInStore(environment: IEnvironment, operation, fetchPolicy): Snapshot | null {
        if (isStorePolicy(fetchPolicy)) {
            const check = environment.check(operation);
            if (check.status === 'available') {
                this._retainCachedOperation(operation);
                return environment.lookup(operation.fragment);
            }
        }
        return null;
    }

    refetch = (variables: Variables, options?: Options): Disposable => {
        const {
            fragmentRefPathInResponse,
            identifierField,
            refetchableRequest,
        } = getRefetchMetadata(this._fragment, 'useRefetchable()');
        const fragmentData = this.getData();
        const identifierValue =
            identifierField != null && typeof fragmentData === 'object'
                ? fragmentData[identifierField]
                : null;
        //TODO Function
        /*const fragmentVariables = this.getFragmentVariables();
        const fetchVariables =
            typeof refetchVariables === 'function'
                ? refetchVariables(fragmentVariables)
                : refetchVariables;
        const newFragmentVariables = renderVariables
            ? { ...fetchVariables, ...renderVariables }
            : fetchVariables;*/

        let parentVariables;
        let fragmentVariables;
        if (this._selector == null) {
            parentVariables = {};
            fragmentVariables = {};
        } else if (this._selector.kind === 'PluralReaderSelector') {
            parentVariables =
                (this._selector as PluralReaderSelector).selectors[0]?.owner.variables ?? {};
            fragmentVariables =
                (this._selector as PluralReaderSelector).selectors[0]?.variables ?? {};
        } else {
            parentVariables = (this._selector as SingularReaderSelector).owner.variables;
            fragmentVariables = (this._selector as SingularReaderSelector).variables;
        }

        // NOTE: A user of `useRefetchableFragment()` may pass a subset of
        // all variables required by the fragment when calling `refetch()`.
        // We fill in any variables not passed by the call to `refetch()` with the
        // variables from the original parent fragment owner.
        /* $FlowFixMe[cannot-spread-indexer] (>=0.123.0) This comment suppresses
         * an error found when Flow v0.123.0 was deployed. To see the error
         * delete this comment and run Flow. */
        const refetchVariables = {
            ...parentVariables,
            /* $FlowFixMe[exponential-spread] (>=0.111.0) This comment suppresses
             * an error found when Flow v0.111.0 was deployed. To see the error,
             * delete this comment and run Flow. */
            ...fragmentVariables,
            ...variables,
        };

        if (identifierField != null && !variables.hasOwnProperty('id')) {
            // @refetchable fragments are guaranteed to have an `id` selection
            // if the type is Node, implements Node, or is @fetchable. Double-check
            // that there actually is a value at runtime.
            if (typeof identifierValue !== 'string') {
                warning(
                    false,
                    'Relay: Expected result to have a string  ' +
                        '`%s` in order to refetch, got `%s`.',
                    identifierField,
                    identifierValue,
                );
            }
            refetchVariables.id = identifierValue;
        }

        const onNext = (operation: OperationDescriptor, payload, complete): void => {
            const fragmentRef = getValueAtPath(payload, fragmentRefPathInResponse);
            if (!this.isEqualsFragmentRef(fragmentRef)) {
                this._idfragmentrefetch = getFragmentIdentifier(this._fragment, fragmentRef);
                this.lookup(fragmentRef);
                this.refreshHooks();
            }
            complete();
        };
        let started = false;
        const observer = {
            start: (): void => {
                this.refreshHooks();
                started = true;
            },
            complete: (): void => {
                if (started) this.refreshHooks();
                options?.onComplete ? options.onComplete(null) : (): void => undefined;
            },
            error: (error: Error): void => {
                if (started) this.refreshHooks();
                options?.onComplete ? options.onComplete(error) : (): void => undefined;
            },
        };

        return this.executeFetcher(
            refetchableRequest,
            refetchVariables,
            options?.fetchPolicy,
            observer,
            onNext,
        );
    };

    isLoading = (_direction?: 'backward' | 'forward'): boolean => {
        return !!this._refetchSubscription;
    };

    getPaginationData = (direction: 'backward' | 'forward'): boolean[] => {
        const isLoading = this.isLoading(direction);
        const { connectionPathInFragmentData } = getPaginationMetadata(
            this._fragment,
            'usePagination()',
        );
        const { hasMore } = getConnectionState(
            direction,
            this._fragment,
            this.getData(),
            connectionPathInFragmentData,
        );
        return [hasMore, isLoading];
    };

    loadPrevious = (count: number, options?: OptionsLoadMore): Disposable => {
        return this.loadMore('backward', count, options);
    };

    loadNext = (count: number, options?: OptionsLoadMore): Disposable => {
        return this.loadMore('forward', count, options);
    };

    loadMore = (
        direction: 'backward' | 'forward',
        count: number,
        options?: OptionsLoadMore,
    ): Disposable => {
        if (this._selector == null) {
            warning(
                false,
                'Relay: Unexpected fetch while using a null fragment ref ' +
                    'for fragment `%s` in `%s`. When fetching more items, we expect ' +
                    "initial fragment data to be non-null. Please make sure you're " +
                    'passing a valid fragment ref to `%s` before paginating.',
                this._fragment.name,
                'usePagination()',
                'usePagination()',
            );
            if (options?.onComplete) {
                options.onComplete(null);
            }
            return { dispose: (): void => {} };
        }
        invariant(
            this._selector != null && this._selector.kind !== 'PluralReaderSelector',
            'Relay: Expected to be able to find a non-plural fragment owner for ' +
                "fragment `%s` when using `%s`. If you're seeing this, " +
                'this is likely a bug in Relay.',
            this._fragment.name,
            'usePagination()',
        );

        const {
            paginationRequest,
            paginationMetadata,
            identifierField,
            connectionPathInFragmentData,
        } = getPaginationMetadata(this._fragment, 'usePagination()');
        const fragmentData = this.getData();
        const identifierValue =
            identifierField != null && typeof fragmentData === 'object'
                ? fragmentData[identifierField]
                : null;

        const parentVariables = (this._selector as SingularReaderSelector).owner.variables;
        const fragmentVariables = (this._selector as SingularReaderSelector).variables;
        const extraVariables = options?.UNSTABLE_extraVariables;
        const baseVariables = {
            ...parentVariables,
            ...fragmentVariables,
        };
        const { cursor } = getConnectionState(
            direction,
            this._fragment,
            fragmentData,
            connectionPathInFragmentData,
        );
        const paginationVariables = getPaginationVariables(
            direction,
            count,
            cursor,
            baseVariables,
            { ...extraVariables },
            paginationMetadata,
        );

        // If the query needs an identifier value ('id' or similar) and one
        // was not explicitly provided, read it from the fragment data.
        if (identifierField != null) {
            // @refetchable fragments are guaranteed to have an `id` selection
            // if the type is Node, implements Node, or is @fetchable. Double-check
            // that there actually is a value at runtime.
            if (typeof identifierValue !== 'string') {
                warning(
                    false,
                    'Relay: Expected result to have a string  ' +
                        '`%s` in order to refetch, got `%s`.',
                    identifierField,
                    identifierValue,
                );
            }
            paginationVariables.id = identifierValue;
        }

        let started = false;
        const observer = {
            start: (): void => {
                this.refreshHooks();
                started = true;
            },
            complete: (): void => {
                if (started) this.refreshHooks();
                options?.onComplete ? options.onComplete(null) : (): void => undefined;
            },
            error: (error: Error): void => {
                if (started) this.refreshHooks();
                options?.onComplete ? options.onComplete(error) : (): void => undefined;
            },
        };

        const onNext = (operation: OperationDescriptor, payload, complete): void => {
            complete();
        };

        return this.executeFetcher(
            paginationRequest,
            paginationVariables,
            options?.fetchPolicy,
            observer,
            onNext,
        );
    };

    executeFetcher(
        taggedNode: GraphQLTaggedNode,
        fetchVariables: Variables,
        fetchPolicy: FetchPolicy = 'network-only',
        observer: Observer<void>,
        onNext: (operation, payload, complete) => void,
    ): Disposable {
        const operation = createOperation(taggedNode, fetchVariables, forceCache);

        const storeSnapshot = this.lookupInStore(this._environment, operation, fetchPolicy);
        const isNetwork = isNetworkPolicy(fetchPolicy, storeSnapshot);
        if (storeSnapshot != null) {
            onNext(operation, storeSnapshot.data, () => {
                if (!isNetwork) {
                    observer.complete();
                }
            });
        }
        // Cancel any previously running refetch.
        this._refetchSubscription && this._refetchSubscription.unsubscribe();

        if (isNetwork) {
            // Declare refetchSubscription before assigning it in .start(), since
            // synchronous completion may call callbacks .subscribe() returns.
            let refetchSubscription: Subscription;
            const reference = this._environment.retain(operation);
            const cleanup = (): void => {
                this._selectionReferences = this._selectionReferences.concat(reference);
                if (this._refetchSubscription === refetchSubscription) {
                    this._refetchSubscription = null;
                    this._isARequestInFlight = false;
                }
            };

            this._isARequestInFlight = true;
            fetchQuery(this._environment, operation)
                .do({
                    error: cleanup,
                    complete: cleanup,
                    unsubscribe: () => {
                        cleanup();
                        this.refreshHooks();
                    },
                })
                .subscribe({
                    ...observer,
                    next: () => {
                        const store = this._environment.lookup(operation.fragment);
                        onNext(operation, store.data, () => {});
                    },
                    start: (subscription) => {
                        refetchSubscription = subscription;
                        this._refetchSubscription = this._isARequestInFlight
                            ? refetchSubscription
                            : null;
                        observer.start && observer.start(subscription);
                    },
                });
            return {
                dispose: (): void => {
                    refetchSubscription && refetchSubscription.unsubscribe();
                },
            };
        }
        return {
            dispose: (): void => {},
        };
    }
}
