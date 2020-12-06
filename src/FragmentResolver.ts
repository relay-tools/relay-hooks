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
} from 'relay-runtime';
import { Fetcher, fetchResolver } from './FetchResolver';
import { getConnectionState, getStateFromConnection } from './getConnectionState';
import { getPaginationMetadata } from './getPaginationMetadata';
import { getPaginationVariables } from './getPaginationVariables';
import { getRefetchMetadata } from './getRefetchMetadata';
import { getValueAtPath } from './getValueAtPath';
import { Options, OptionsLoadMore } from './RelayHooksType';
import { createOperation, forceCache } from './Utils';
const { getPromiseForActiveRequest } = __internal;

type SingularOrPluralSnapshot = Snapshot | Array<Snapshot>;

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
    snapshot: SingularOrPluralSnapshot | null;
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

export class FragmentResolver {
    _environment: IEnvironment;
    _fragment: ReaderFragment;
    _fragmentRef: any;
    _fragmentRefRefetch: any;
    _idfragment: any;
    _idfragmentrefetch: any;
    _result: FragmentResult;
    _disposable: Disposable = { dispose: () => {} };
    _selector: ReaderSelector;
    refreshHooks: any;
    fetcherRefecth: Fetcher;
    fetcherNext: Fetcher;
    fetcherPrevious: Fetcher;
    unmounted = false;
    name: string;

    constructor(name, forceUpdate) {
        this.name = name;
        this.refreshHooks = forceUpdate;

        const setLoading = (_loading): void => this.refreshHooks();
        this.fetcherRefecth = fetchResolver({
            setLoading,
            doRetain: true,
        });
        this.fetcherNext = fetchResolver({ setLoading });
        this.fetcherPrevious = fetchResolver({ setLoading });
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
                !areEqual(
                    this.getFragmentVariables(fragmentRef),
                    this.getFragmentVariables(prevFragment),
                )
            ) {
                return false;
            }
        }
        return true;
    }

    dispose(): void {
        this._disposable && this._disposable.dispose();
        this.fetcherNext.dispose();
        this.fetcherPrevious.dispose();
        this._idfragmentrefetch = null;
        this._fragmentRefRefetch = null;
        this.fetcherRefecth.dispose();
    }

    getFragmentVariables(fRef = this._fragmentRef): Variables {
        return getVariablesFromFragment(this._fragment, fRef);
    }

    getPromiseForPendingOperationAffectingOwner(
        environment: IEnvironment,
        request: RequestDescriptor,
    ): Promise<void> | null {
        return environment
            .getOperationTracker()
            .getPromiseForPendingOperationsAffectingOwner(request);
    }

    _getAndSavePromiseForFragmentRequestInFlight(
        fragmentOwner: RequestDescriptor,
    ): Promise<void> | null {
        const environment = this._environment;
        const networkPromise =
            getPromiseForActiveRequest(environment, fragmentOwner) ??
            this.getPromiseForPendingOperationAffectingOwner(environment, fragmentOwner);

        if (!networkPromise) {
            return null;
        }
        // When the Promise for the request resolves, we need to make sure to
        // update the cache with the latest data available in the store before
        // resolving the Promise
        const promise = networkPromise
            .then(() => {
                this._idfragment = null;
            })
            .catch((_error: Error) => {
                this._idfragment = null;
            });

        // $FlowExpectedError[prop-missing] Expando to annotate Promises.
        (promise as any).displayName = 'Relay(' + fragmentOwner.node.params.name + ')';
        return promise;
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
            this._fragment = fragment;
            this._fragmentRef = fragmentRef;
            this._idfragment = idfragment;
            this._result = null;
            this._selector = null;
            this.dispose();
            this._environment = environment;
            this.lookup(fragment, this._fragmentRef);
        }
    }

    lookup(fragment, fragmentRef): void {
        if (fragmentRef == null) {
            this._result = { data: null, snapshot: null };
            return;
        }
        const isPlural =
            fragment.metadata && fragment.metadata.plural && fragment.metadata.plural === true;
        if (isPlural) {
            if (fragmentRef.length === 0) {
                this._result = { data: [], snapshot: [] };
                return;
            }
        }
        this._selector = getSelector(fragment, fragmentRef);
        const snapshot = lookupFragment(this._environment, this._selector);

        this._result = getFragmentResult(snapshot);
        const owner = this._selector
            ? this._selector.kind === 'PluralReaderSelector'
                ? (this._selector as any).selectors[0].owner
                : (this._selector as any).owner
            : null;
        this._result.owner = owner;
        this.subscribe();
    }

    checkAndSuspense(suspense): void {
        if (suspense && this._result != null && this._result.isMissingData && this._result.owner) {
            const networkPromise = this._getAndSavePromiseForFragmentRequestInFlight(
                this._result.owner,
            );
            if (networkPromise != null) {
                this._disposable && this._disposable.dispose();
                throw networkPromise;
            }
            const parentQueryName = this._result.owner.node.params.name ?? 'Unknown Parent Query';
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
    }

    getData(): any | null {
        return this._result ? this._result.data : null;
    }

    getFragment(): ReaderFragment {
        return this._fragment;
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
                        this._result.isMissingData = false;
                        this.refreshHooks();
                    }),
                );
            });
        } else {
            dataSubscriptions.push(
                environment.subscribe(renderedSnapshot, (latestSnapshot) => {
                    this._result = getFragmentResult(latestSnapshot);
                    this._result.isMissingData = false;
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

    refetch = (variables: Variables, options?: Options): Disposable => {
        if (this.unmounted === true) {
            warning(
                false,
                'Relay: Unexpected call to `refetch` on unmounted component for fragment ' +
                    '`%s` in `%s`. It looks like some instances of your component are ' +
                    'still trying to fetch data but they already unmounted. ' +
                    'Please make sure you clear all timers, intervals, ' +
                    'async calls, etc that may trigger a fetch.',
                this._fragment.name,
                this.name,
            );
            return { dispose: (): void => {} };
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
                this.name,
                this.name,
            );
        }

        const {
            fragmentRefPathInResponse,
            identifierField,
            refetchableRequest,
        } = getRefetchMetadata(this._fragment, this.name);
        const fragmentData = this.getData();
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

        const onNext = (operation: OperationDescriptor, snapshot: Snapshot, fromStore): void => {
            const fragmentRef = getValueAtPath(snapshot.data, fragmentRefPathInResponse);
            const isEquals = this.isEqualsFragmentRef(
                this._fragmentRefRefetch || this._fragmentRef,
                fragmentRef,
            );
            const missData = fromStore && isMissingData(snapshot);
            if (!isEquals || missData) {
                this._fragmentRefRefetch = fragmentRef;
                this._idfragmentrefetch = getFragmentIdentifier(this._fragment, fragmentRef);
                this.lookup(this._fragment, fragmentRef);
                /*if (!missData) {
                    this.subscribe();
                }*/
                this._result.isMissingData = missData;
                this._result.owner = operation.request;
                this.refreshHooks();
            }
        };
        this.fetcherNext.dispose();
        this.fetcherPrevious.dispose();
        const operation = createOperation(refetchableRequest, refetchVariables, forceCache);
        return this.fetcherRefecth.fetch(
            this._environment,
            operation,
            options?.fetchPolicy,
            options?.onComplete,
            onNext,
            options?.UNSTABLE_renderPolicy,
        );
    };

    checkRefechAndSuspense = (suspense: boolean): void => {
        this.fetcherRefecth.checkAndSuspense(suspense);
    };

    isLoading = (direction?: 'backward' | 'forward'): boolean => {
        /* eslint-disable indent */
        const fetcher =
            direction === 'backward'
                ? this.fetcherPrevious
                : direction === 'forward'
                ? this.fetcherNext
                : this.fetcherRefecth;
        /* eslint-enable indent */
        return fetcher.getData().isLoading;
    };

    getPaginationData = (): boolean[] => {
        const { connectionPathInFragmentData } = getPaginationMetadata(this._fragment, this.name);

        const connection = getValueAtPath(this.getData(), connectionPathInFragmentData);
        const { hasMore: hasNext } = getStateFromConnection('forward', this._fragment, connection);
        const { hasMore: hasPrevious } = getStateFromConnection(
            'backward',
            this._fragment,
            connection,
        );
        return [
            hasNext,
            this.isLoading('forward'),
            hasPrevious,
            this.isLoading('backward'),
            this.isLoading(),
        ];
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
        const onComplete = options?.onComplete ?? ((): void => undefined);

        const fragmentData = this.getData();

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
            return { dispose: (): void => {} };
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
            return { dispose: (): void => {} };
        }
        const isRequestActive = (this._environment as any).isRequestActive(
            (this._selector as SingularReaderSelector).owner.identifier,
        );
        if (isRequestActive || fetcher.getData().isLoading === true || fragmentData == null) {
            onComplete(null);
            return { dispose: (): void => {} };
        }
        invariant(
            this._selector != null && this._selector.kind !== 'PluralReaderSelector',
            'Relay: Expected to be able to find a non-plural fragment owner for ' +
                "fragment `%s` when using `%s`. If you're seeing this, " +
                'this is likely a bug in Relay.',
            this._fragment.name,
            this.name,
        );

        const {
            paginationRequest,
            paginationMetadata,
            identifierField,
            connectionPathInFragmentData,
        } = getPaginationMetadata(this._fragment, this.name);
        const identifierValue =
            identifierField != null && fragmentData != null && typeof fragmentData === 'object'
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

        const onNext = (): void => {};

        const operation = createOperation(paginationRequest, paginationVariables, forceCache);
        return fetcher.fetch(
            this._environment,
            operation,
            options?.fetchPolicy,
            onComplete,
            onNext,
        );
    };
}
