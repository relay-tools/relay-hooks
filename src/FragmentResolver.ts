import * as areEqual from 'fbjs/lib/areEqual';
import * as invariant from 'fbjs/lib/invariant';
import * as warning from 'fbjs/lib/warning';
import {
    __internal,
    getSelector,
    IEnvironment,
    Disposable,
    Snapshot,
    Variables,
    getVariablesFromFragment,
    OperationDescriptor,
    getFragmentIdentifier,
    PluralReaderSelector,
    ReaderSelector,
    SingularReaderSelector,
    ReaderFragment,
    getDataIDsFromFragment,
    RequestDescriptor,
    getPaginationMetadata,
    getPaginationVariables,
    getRefetchMetadata,
    getValueAtPath,
} from 'relay-runtime';
import { Fetcher, fetchResolver } from './FetchResolver';
import { getConnectionState, getStateFromConnection } from './getConnectionState';
import { FragmentNames, Options, OptionsLoadMore, PAGINATION_NAME, REFETCHABLE_NAME } from './RelayHooksTypes';
import { createOperation, forceCache } from './Utils';
const { getPromiseForActiveRequest } = __internal;

type SingularOrPluralSnapshot = Snapshot | Array<Snapshot>;

// eslint-disable-next-line @typescript-eslint/no-empty-function
function emptyVoid() {}

function isFetchLoading(fetch: Fetcher) {
    return fetch && fetch.getData().isLoading;
}

function lookupFragment(environment, selector): SingularOrPluralSnapshot {
    return selector.kind === 'PluralReaderSelector'
        ? selector.selectors.map((s) => environment.lookup(s))
        : environment.lookup(selector);
}

function getFragmentResult(snapshot: SingularOrPluralSnapshot): any {
    const missData = isMissingData(snapshot);
    if (Array.isArray(snapshot)) {
        return { snapshot, data: snapshot.map((s) => s.data), isMissingData: missData };
    }
    return { snapshot, data: snapshot.data, isMissingData: missData };
}

type FragmentResult = {
    snapshot?: SingularOrPluralSnapshot | null;
    data: any;
    isMissingData?: boolean;
    owner?: any;
};

function isMissingData(snapshot: SingularOrPluralSnapshot): boolean {
    if (Array.isArray(snapshot)) {
        return snapshot.some((s) => s.isMissingData);
    }
    return snapshot.isMissingData;
}

function _getAndSavePromiseForFragmentRequestInFlight(
    fragmentNode: ReaderFragment,
    fragmentOwner: RequestDescriptor,
    env: IEnvironment,
): Promise<void> | null {
    let networkPromise = getPromiseForActiveRequest(env, fragmentOwner);
    let pendingOperationName;

    if (networkPromise != null) {
        pendingOperationName = fragmentOwner.node.params.name;
    } else {
        const result = env.getOperationTracker().getPendingOperationsAffectingOwner(fragmentOwner);
        const pendingOperations = result?.pendingOperations;
        networkPromise = result?.promise ?? null;
        pendingOperationName = pendingOperations?.map((op) => op.node.params.name).join(',') ?? null;
    }

    if (!networkPromise) {
        return null;
    }

    if (pendingOperationName == null || pendingOperationName.length === 0) {
        pendingOperationName = 'Unknown pending operation';
    }

    // When the Promise for the request resolves, we need to make sure to
    // update the cache with the latest data available in the store before
    // resolving the Promise

    const fragmentName = fragmentNode.name;
    const promiseDisplayName =
        pendingOperationName === fragmentName
            ? `Relay(${pendingOperationName})`
            : `Relay(${pendingOperationName}:${fragmentName})`;

    (networkPromise as any).displayName = promiseDisplayName;
    return networkPromise;
}

export class FragmentResolver {
    _environment: IEnvironment;
    _fragment: ReaderFragment;
    _fragmentRef: any;
    _fragmentRefRefetch: any;
    _idfragment: any;
    _idfragmentrefetch: any;
    resolverData: FragmentResult;
    _disposable: Disposable;
    _selector: ReaderSelector;
    refreshHooks: any;
    fetcherRefecth: Fetcher;
    fetcherNext: Fetcher;
    fetcherPrevious: Fetcher;
    unmounted = false;
    name: string;
    refetchable = false;
    pagination = false;
    result: any;
    _subscribeResolve;
    forceUpdate;

    constructor(name: FragmentNames) {
        this.name = name;
        this.pagination = name === PAGINATION_NAME;
        this.refetchable = name === REFETCHABLE_NAME || this.pagination;

        if (this.refetchable) {
            this.fetcherRefecth = fetchResolver({
                doRetain: true,
            });
        }
        if (this.pagination) {
            this.fetcherNext = fetchResolver({});
            this.fetcherPrevious = fetchResolver({});
        }
        this.setForceUpdate();
        this.refreshHooks = (): void => {
            this.resolveResult();
            this.forceUpdate();
        };
    }

    setForceUpdate(forceUpdate = emptyVoid): void {
        this.forceUpdate = forceUpdate;
    }

    subscribeResolve(subscribeResolve: (data: any) => void): void {
        if (this._subscribeResolve && this._subscribeResolve != subscribeResolve) {
            subscribeResolve(this.getData());
        }
        this._subscribeResolve = subscribeResolve;
    }

    setUnmounted(): void {
        this.unmounted = true;
    }

    isEqualsFragmentRef(prevFragment, fragmentRef): boolean {
        if (this._fragmentRef !== fragmentRef) {
            const prevIDs = getDataIDsFromFragment(this._fragment, prevFragment);
            const nextIDs = getDataIDsFromFragment(this._fragment, fragmentRef);
            if (
                !areEqual(prevIDs, nextIDs) ||
                !areEqual(this.getFragmentVariables(fragmentRef), this.getFragmentVariables(prevFragment))
            ) {
                return false;
            }
        }
        return true;
    }

    dispose(): void {
        this.unsubscribe();
        this.fetcherNext && this.fetcherNext.dispose();
        this.fetcherPrevious && this.fetcherPrevious.dispose();
        this._idfragmentrefetch = null;
        this._fragmentRefRefetch = null;
        this.fetcherRefecth && this.fetcherRefecth.dispose();
    }

    getFragmentVariables(fRef = this._fragmentRef): Variables {
        return getVariablesFromFragment(this._fragment, fRef);
    }

    resolve(environment: IEnvironment, idfragment: string, fragment: ReaderFragment, fragmentRef): void {
        if (
            !this.resolverData ||
            this._environment !== environment ||
            (idfragment !== this._idfragment &&
                (!this._idfragmentrefetch || (this._idfragmentrefetch && idfragment !== this._idfragmentrefetch)))
        ) {
            this._fragment = fragment;
            this._fragmentRef = fragmentRef;
            this._idfragment = idfragment;
            this._selector = null;
            this.dispose();
            this._environment = environment;
            this.lookup(fragment, this._fragmentRef);
            this.resolveResult();
        }
    }

    lookup(fragment, fragmentRef): void {
        if (fragmentRef == null) {
            this.resolverData = { data: null };
            return;
        }
        const isPlural = fragment.metadata && fragment.metadata.plural && fragment.metadata.plural === true;
        if (isPlural) {
            if (fragmentRef.length === 0) {
                this.resolverData = { data: [] };
                return;
            }
        }
        this._selector = getSelector(fragment, fragmentRef);
        const snapshot = lookupFragment(this._environment, this._selector);

        this.resolverData = getFragmentResult(snapshot);
        const owner = this._selector
            ? this._selector.kind === 'PluralReaderSelector'
                ? (this._selector as any).selectors[0].owner
                : (this._selector as any).owner
            : null;
        this.resolverData.owner = owner;
        //this.subscribe();
    }

    checkAndSuspense(suspense): void {
        if (suspense && this.resolverData.isMissingData && this.resolverData.owner) {
            const fragmentOwner = this.resolverData.owner;
            const networkPromise = _getAndSavePromiseForFragmentRequestInFlight(
                this._fragment,
                fragmentOwner,
                this._environment,
            );
            const parentQueryName = fragmentOwner.node.params.name ?? 'Unknown Parent Query';
            if (networkPromise != null) {
                // When the Promise for the request resolves, we need to make sure to
                // update the cache with the latest data available in the store before
                // resolving the Promise
                const promise = networkPromise
                    .then(() => {
                        if (this._idfragmentrefetch) {
                            this.resolveResult();
                        } else {
                            this._idfragment = null;
                            this.dispose();
                        }
                        //;
                    })
                    .catch((_error: Error) => {
                        if (this._idfragmentrefetch) {
                            this.resolveResult();
                        } else {
                            this._idfragment = null;
                            this.dispose();
                        }
                    });

                // $FlowExpectedError[prop-missing] Expando to annotate Promises.
                (promise as any).displayName = 'Relay(' + parentQueryName + ')';
                this.unsubscribe();
                this.refreshHooks = emptyVoid;
                throw promise;
            }
            warning(
                false,
                'Relay: Tried reading fragment `%s` declared in ' +
                    '`%s`, but it has missing data and its parent query `%s` is not ' +
                    'being fetched.\n' +
                    'This might be fixed by by re-running the Relay Compiler. ' +
                    ' Otherwise, make sure of the following:\n' +
                    '* You are correctly fetching `%s` if you are using a ' +
                    '"store-only" `fetchPolicy`.\n' +
                    "* Other queries aren't accidentally fetching and overwriting " +
                    'the data for this fragment.\n' +
                    '* Any related mutations or subscriptions are fetching all of ' +
                    'the data for this fragment.\n' +
                    "* Any related store updaters aren't accidentally deleting " +
                    'data for this fragment.',
                this._fragment.name,
                this.name,
                parentQueryName,
                parentQueryName,
            );
        }
        this.fetcherRefecth && this.fetcherRefecth.checkAndSuspense(suspense);
    }

    getData(): any | null {
        return this.result;
    }

    resolveResult(): any {
        const { data } = this.resolverData;
        if (this.refetchable || this.pagination) {
            const { isLoading, error } = this.fetcherRefecth.getData();
            const refetch = this.refetch;
            if (!this.pagination) {
                // useRefetchable
                if ('production' !== process.env.NODE_ENV) {
                    getRefetchMetadata(this._fragment, this.name);
                }
                this.result = {
                    data,
                    isLoading,
                    error,
                    refetch,
                };
            } else {
                // usePagination
                const { connectionPathInFragmentData } = getPaginationMetadata(this._fragment, this.name);

                const connection = getValueAtPath(data, connectionPathInFragmentData);
                const { hasMore: hasNext } = getStateFromConnection('forward', this._fragment, connection);
                const { hasMore: hasPrevious } = getStateFromConnection('backward', this._fragment, connection);
                const { isLoading: isLoadingNext, error: errorNext } = this.fetcherNext.getData();
                const { isLoading: isLoadingPrevious, error: errorPrevious } = this.fetcherPrevious.getData();
                this.result = {
                    data,
                    hasNext,
                    isLoadingNext,
                    hasPrevious,
                    isLoadingPrevious,
                    isLoading,
                    errorNext,
                    errorPrevious,
                    error,
                    refetch,
                    loadNext: this.loadNext,
                    loadPrevious: this.loadPrevious,
                };
            }
        } else {
            // useFragment
            this.result = data;
        }
        this._subscribeResolve && this._subscribeResolve(this.result);
    }

    unsubscribe(): void {
        this._disposable && this._disposable.dispose();
    }

    subscribe(): void {
        const environment = this._environment;
        const renderedSnapshot = this.resolverData.snapshot;
        this.unsubscribe();
        const dataSubscriptions = [];
        if (renderedSnapshot) {
            if (Array.isArray(renderedSnapshot)) {
                renderedSnapshot.forEach((snapshot, idx) => {
                    dataSubscriptions.push(
                        environment.subscribe(snapshot, (latestSnapshot) => {
                            this.resolverData.snapshot[idx] = latestSnapshot;
                            this.resolverData.data[idx] = latestSnapshot.data;
                            this.resolverData.isMissingData = isMissingData(this.resolverData.snapshot);
                            const isLoading =
                                isFetchLoading(this.fetcherRefecth) ||
                                isFetchLoading(this.fetcherNext) ||
                                isFetchLoading(this.fetcherPrevious);
                            if (!isLoading) this.refreshHooks();
                        }),
                    );
                });
            } else {
                dataSubscriptions.push(
                    environment.subscribe(renderedSnapshot, (latestSnapshot) => {
                        this.resolverData = getFragmentResult(latestSnapshot);
                        const isLoading =
                            isFetchLoading(this.fetcherRefecth) ||
                            isFetchLoading(this.fetcherNext) ||
                            isFetchLoading(this.fetcherPrevious);
                        if (!isLoading) this.refreshHooks();
                    }),
                );
            }
        }

        this._disposable = {
            dispose: (): void => {
                dataSubscriptions.map((s) => s.dispose());
                this._disposable = undefined;
            },
        };
    }

    refetch = (variables: Variables, options: Options = {}): Disposable => {
        const name = this.name;
        if (this.unmounted === true) {
            warning(
                false,
                'Relay: Unexpected call to `refetch` on unmounted component for fragment ' +
                    '`%s` in `%s`. It looks like some instances of your component are ' +
                    'still trying to fetch data but they already unmounted. ' +
                    'Please make sure you clear all timers, intervals, ' +
                    'async calls, etc that may trigger a fetch.',
                this._fragment.name,
                name,
            );
            return { dispose: emptyVoid };
        }
        if (this._selector == null) {
            warning(
                false,
                'Relay: Unexpected call to `refetch` while using a null fragment ref ' +
                    'for fragment `%s` in `%s`. When calling `refetch`, we expect ' +
                    "initial fragment data to be non-null. Please make sure you're " +
                    'passing a valid fragment ref to `%s` before calling ' +
                    '`refetch`, or make sure you pass all required variables to `refetch`.',
                this._fragment.name,
                name,
                name,
            );
        }

        const { fragmentRefPathInResponse, identifierField, refetchableRequest } = getRefetchMetadata(
            this._fragment,
            name,
        );
        const fragmentData = this.getData().data;
        const identifierValue =
            identifierField != null && fragmentData != null && typeof fragmentData === 'object'
                ? fragmentData[identifierField]
                : null;

        let parentVariables;
        let fragmentVariables;
        if (this._selector == null) {
            parentVariables = {};
            fragmentVariables = {};
        } else if (this._selector.kind === 'PluralReaderSelector') {
            parentVariables = (this._selector as PluralReaderSelector).selectors[0]?.owner.variables ?? {};
            fragmentVariables = (this._selector as PluralReaderSelector).selectors[0]?.variables ?? {};
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
                    'Relay: Expected result to have a string  ' + '`%s` in order to refetch, got `%s`.',
                    identifierField,
                    identifierValue,
                );
            }
            refetchVariables.id = identifierValue;
        }

        const onNext = (operation: OperationDescriptor, snapshot: Snapshot, doUpdate: boolean): void => {
            const fragmentRef = getValueAtPath(snapshot.data, fragmentRefPathInResponse);
            const isEquals = this.isEqualsFragmentRef(this._fragmentRefRefetch || this._fragmentRef, fragmentRef);
            const missData = isMissingData(snapshot); //fromStore && isMissingData(snapshot);
            if (!isEquals || missData) {
                this._fragmentRefRefetch = fragmentRef;
                this._idfragmentrefetch = getFragmentIdentifier(this._fragment, fragmentRef);
                this.lookup(this._fragment, fragmentRef);
                this.subscribe();
                /*if (!missData) {
                    this.subscribe();
                }*/
                this.resolverData.isMissingData = missData;
                this.resolverData.owner = operation.request;
            }
            if (doUpdate) this.refreshHooks();
        };
        if (this.pagination) {
            this.fetcherNext.dispose();
            this.fetcherPrevious.dispose();
        }
        const complete = (error, doUpdate) => {
            if (doUpdate) {
                this.refreshHooks();
            }
            options.onComplete && options.onComplete(error);
        };

        const operation = createOperation(refetchableRequest, refetchVariables, forceCache);
        const disposable = this.fetcherRefecth.fetch(
            this._environment,
            operation,
            options.fetchPolicy,
            complete,
            onNext,
            options.onResponse,
            options.UNSTABLE_renderPolicy,
        );
        this.refreshHooks();
        return disposable;
    };

    loadPrevious = (count: number, options?: OptionsLoadMore): Disposable => {
        return this.loadMore('backward', count, options);
    };

    loadNext = (count: number, options?: OptionsLoadMore): Disposable => {
        return this.loadMore('forward', count, options);
    };

    loadMore = (direction: 'backward' | 'forward', count: number, options: OptionsLoadMore = {}): Disposable => {
        const onComplete = options.onComplete ?? emptyVoid;

        const fragmentData = this.getData().data;
        const emptyDispose = { dispose: emptyVoid };

        const fetcher = direction === 'backward' ? this.fetcherPrevious : this.fetcherNext;
        if (this.unmounted === true) {
            // Bail out and warn if we're trying to paginate after the component
            // has unmounted
            warning(
                false,
                'Relay: Unexpected fetch on unmounted component for fragment ' +
                    '`%s` in `%s`. It looks like some instances of your component are ' +
                    'still trying to fetch data but they already unmounted. ' +
                    'Please make sure you clear all timers, intervals, ' +
                    'async calls, etc that may trigger a fetch.',
                this._fragment.name,
                this.name,
            );
            return emptyDispose;
        }
        if (this._selector == null) {
            warning(
                false,
                'Relay: Unexpected fetch while using a null fragment ref ' +
                    'for fragment `%s` in `%s`. When fetching more items, we expect ' +
                    "initial fragment data to be non-null. Please make sure you're " +
                    'passing a valid fragment ref to `%s` before paginating.',
                this._fragment.name,
                this.name,
                this.name,
            );
            onComplete(null);
            return emptyDispose;
        }
        const isRequestActive = (this._environment as any).isRequestActive(
            (this._selector as SingularReaderSelector).owner.identifier,
        );
        if (isRequestActive || fetcher.getData().isLoading === true || fragmentData == null) {
            onComplete(null);
            return emptyDispose;
        }
        invariant(
            this._selector != null && this._selector.kind !== 'PluralReaderSelector',
            'Relay: Expected to be able to find a non-plural fragment owner for ' +
                "fragment `%s` when using `%s`. If you're seeing this, " +
                'this is likely a bug in Relay.',
            this._fragment.name,
            this.name,
        );

        const { paginationRequest, paginationMetadata, identifierField, connectionPathInFragmentData } =
            getPaginationMetadata(this._fragment, this.name);
        const identifierValue =
            identifierField != null && fragmentData != null && typeof fragmentData === 'object'
                ? fragmentData[identifierField]
                : null;

        const parentVariables = (this._selector as SingularReaderSelector).owner.variables;
        const fragmentVariables = (this._selector as SingularReaderSelector).variables;
        const extraVariables = options.UNSTABLE_extraVariables;
        const baseVariables = {
            ...parentVariables,
            ...fragmentVariables,
        };
        const { cursor } = getConnectionState(direction, this._fragment, fragmentData, connectionPathInFragmentData);
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
                    'Relay: Expected result to have a string  ' + '`%s` in order to refetch, got `%s`.',
                    identifierField,
                    identifierValue,
                );
            }
            paginationVariables.id = identifierValue;
        }
        const onNext = (o, s, doUpdate): void => {
            if (doUpdate) this.refreshHooks();
        };

        const complete = (error, doUpdate) => {
            if (doUpdate) this.refreshHooks();
            onComplete(error);
        };

        const operation = createOperation(paginationRequest, paginationVariables, forceCache);
        const disposable = fetcher.fetch(
            this._environment,
            operation,
            undefined, //options?.fetchPolicy,
            complete,
            onNext,
            options.onResponse,
        );
        this.refreshHooks();
        return disposable;
    };
}
