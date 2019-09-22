import {
    Subscription,
    IEnvironment,
    GraphQLTaggedNode,
    Observer,
    Observable,
    Variables,
    PageInfo,
    ReactConnectionMetadata,
    ConnectionMetadata,
    Disposable,
    ConnectionInterface,
    getFragmentOwners,
    CacheConfig,
    createOperationDescriptor,
    getRequest,
    getVariablesFromObject
} from 'relay-runtime';

export type RefetchOptions = {
    force?: boolean,
    fetchPolicy?: 'store-or-network' | 'network-only',
};

export type ObserverOrCallback = Observer<void> | ((error: Error) => any);
import * as ReactRelayQueryFetcher from 'react-relay/lib/ReactRelayQueryFetcher';
import * as invariant from 'fbjs/lib/invariant';
import * as warning from 'fbjs/lib/warning';
import * as areEqual from 'fbjs/lib/areEqual';
import * as forEachObject from 'fbjs/lib/forEachObject';
import { ContainerResult } from './RelayHooksType';



// Pagination
type FragmentVariablesGetter = (
    prevVars: Variables,
    totalCount: number,
) => Variables;

export type ConnectionConfig = {
    direction?: 'backward' | 'forward',
    getConnectionFromProps?: (props: Object) => ConnectionData,
    getFragmentVariables?: FragmentVariablesGetter,
    getVariables: (
        props: Object,
        paginationInfo: { count: number, cursor: string },
        fragmentVariables: Variables,
    ) => Variables,
    query: GraphQLTaggedNode,
};
export type ConnectionData = {
    edges?: ReadonlyArray<any>,
    pageInfo?: PageInfo,
};

const FORWARD = 'forward';

function findConnectionMetadata(fragments): ReactConnectionMetadata {
    let foundConnectionMetadata = null;
    let isRelayModern = false;
    for (const fragmentName in fragments) {
        const fragment = fragments[fragmentName];
        const connectionMetadata: Array<ConnectionMetadata> = (fragment.metadata &&
            fragment.metadata.connection as any);
        // HACK: metadata is always set to `undefined` in classic. In modern, even
        // if empty, it is set to null (never undefined). We use that knowlege to
        // check if we're dealing with classic or modern
        if (fragment.metadata !== undefined) {
            isRelayModern = true;
        }
        if (connectionMetadata) {
            invariant(
                connectionMetadata.length === 1,
                'ReactRelayPaginationContainer: Only a single @connection is ' +
                'supported, `%s` has %s.',
                fragmentName,
                connectionMetadata.length,
            );
            invariant(
                !foundConnectionMetadata,
                'ReactRelayPaginationContainer: Only a single fragment with ' +
                '@connection is supported.',
            );
            foundConnectionMetadata = {
                ...connectionMetadata[0],
                fragmentName,
            };
        }
    }
    invariant(
        !isRelayModern || foundConnectionMetadata !== null,
        'ReactRelayPaginationContainer: A @connection directive must be present.',
    );
    return foundConnectionMetadata || ({} as any);
}

function createGetConnectionFromProps(metadata: ReactConnectionMetadata) {
    const path = metadata.path;
    invariant(
        path,
        'ReactRelayPaginationContainer: Unable to synthesize a ' +
        'getConnectionFromProps function.',
    );
    return props => {
        let data = props[metadata.fragmentName];
        for (let i = 0; i < path.length; i++) {
            if (!data || typeof data !== 'object') {
                return null;
            }
            data = data[path[i]];
        }
        return data;
    };
}

function createGetFragmentVariables(
    metadata: ReactConnectionMetadata,
): FragmentVariablesGetter {
    const countVariable = metadata.count;
    invariant(
        countVariable,
        'ReactRelayPaginationContainer: Unable to synthesize a ' +
        'getFragmentVariables function.',
    );
    return (prevVars: Variables, totalCount: number) => ({
        ...prevVars,
        [countVariable]: totalCount,
    });
}


function toObserver(observerOrCallback: ObserverOrCallback): Observer<void> {
    return typeof observerOrCallback === 'function'
        ? {
            error: observerOrCallback,
            complete: observerOrCallback,
            unsubscribe: subscription => {
                typeof observerOrCallback === 'function' && observerOrCallback();
            },
        }
        : observerOrCallback || ({} as any);
}
class FragmentPagination {
    _refetchSubscription: Subscription;
    _queryFetcher: ReactRelayQueryFetcher;
    _isARequestInFlight: boolean;
    _hasFetched: boolean;
    _getConnectionFromProps: any
    _getFragmentVariables: any;
    _init: boolean;
    _direction: string;
    _refetchVariables: Variables;

    constructor() {
        this._queryFetcher = new ReactRelayQueryFetcher();
        this._isARequestInFlight = false;
        this._refetchSubscription = null;
        this._hasFetched = false;
    }

    init(prevResult: ContainerResult) {
        if (!this._init) {
            const metadata = findConnectionMetadata(prevResult.resolver._fragments);
            this._getConnectionFromProps =
                createGetConnectionFromProps(metadata);
            this._direction = metadata.direction;
            invariant(
                this._direction,
                'ReactRelayPaginationContainer: Unable to infer direction of the ' +
                'connection, possibly because both first and last are provided.',
            );

            this._getFragmentVariables = createGetFragmentVariables(metadata);

            this._init = true;
        }

    }

    dispose() {
        this._cleanup();
    }

    _cleanup() {
        this._hasFetched = false;
        if (this._refetchSubscription) {
            this._refetchSubscription.unsubscribe();
            this._refetchSubscription = null;
            this._isARequestInFlight = false;
        }
        if (this._queryFetcher) {
            this._queryFetcher.dispose();
        }
    }

    _getConnectionData(data: any): {
        cursor: string,
        edgeCount: number,
        hasMore: boolean,
    } {
        // Extract connection data and verify there are more edges to fetch
        const props = { ...data };
        const connectionData = this._getConnectionFromProps(props);
        if (connectionData == null) {
            return null;
        }
        const {
            EDGES,
            PAGE_INFO,
            HAS_NEXT_PAGE,
            HAS_PREV_PAGE,
            END_CURSOR,
            START_CURSOR,
        } = ConnectionInterface.get();

        invariant(
            typeof connectionData === 'object',
            'ReactRelayPaginationContainer: Expected `getConnectionFromProps()` in `%s`' +
            'to return `null` or a plain object with %s and %s properties, got `%s`.',
            'useFragment pagination',
            EDGES,
            PAGE_INFO,
            connectionData,
        );
        const edges = connectionData[EDGES];
        const pageInfo = connectionData[PAGE_INFO];
        if (edges == null || pageInfo == null) {
            return null;
        }
        invariant(
            Array.isArray(edges),
            'ReactRelayPaginationContainer: Expected `getConnectionFromProps()` in `%s`' +
            'to return an object with %s: Array, got `%s`.',
            'useFragment pagination',
            EDGES,
            edges,
        );
        invariant(
            typeof pageInfo === 'object',
            'ReactRelayPaginationContainer: Expected `getConnectionFromProps()` in `%s`' +
            'to return an object with %s: Object, got `%s`.',
            'useFragment pagination',
            PAGE_INFO,
            pageInfo,
        );
        const hasMore =
            this._direction === FORWARD
                ? pageInfo[HAS_NEXT_PAGE]
                : pageInfo[HAS_PREV_PAGE];
        const cursor =
            this._direction === FORWARD ? pageInfo[END_CURSOR] : pageInfo[START_CURSOR];
        if (
            typeof hasMore !== 'boolean' ||
            (edges.length !== 0 && typeof cursor === 'undefined')
        ) {
            warning(
                false,
                'ReactRelayPaginationContainer: Cannot paginate without %s fields in `%s`. ' +
                'Be sure to fetch %s (got `%s`) and %s (got `%s`).',
                PAGE_INFO,
                'useFragment pagination',
                this._direction === FORWARD ? HAS_NEXT_PAGE : HAS_PREV_PAGE,
                hasMore,
                this._direction === FORWARD ? END_CURSOR : START_CURSOR,
                cursor,
            );
            return null;
        }
        return {
            cursor,
            edgeCount: edges.length,
            hasMore,
        };
    }

    hasMore = (prevResult: ContainerResult): boolean => {
        this.init(prevResult);
        const connectionData = this._getConnectionData(prevResult.data);
        return !!(
            connectionData &&
            connectionData.hasMore &&
            connectionData.cursor
        );
    };

    isLoading = (): boolean => {
        return !!this._refetchSubscription;
    };

    refetchConnection = (
        environment: IEnvironment,
        connectionConfig: ConnectionConfig,
        props: any,
        prevResult: ContainerResult,
        setResult: any,
        totalCount: number,
        observerOrCallback: ObserverOrCallback,
        refetchVariables: Variables,
    ): Disposable => {
        this.init(prevResult);
        this._refetchVariables = refetchVariables;
        const paginatingVariables = {
            count: totalCount,
            cursor: null,
            totalCount,
        };
        const fetch = this._fetchPage(environment, prevResult, setResult, connectionConfig, props,
            paginatingVariables,
            toObserver(observerOrCallback),
            { force: true },
        );

        return { dispose: fetch.unsubscribe };
    };






    loadMore(environment: IEnvironment,
        connectionConfig: ConnectionConfig,
        props: any,
        pageSize: number,
        observerOrCallback: ObserverOrCallback,
        options: RefetchOptions,
        prevResult: ContainerResult,
        setResult: any) { //TODO Function
        this.init(prevResult);

        const observer = toObserver(observerOrCallback);
        const connectionData = this._getConnectionData(prevResult.data);
        if (!connectionData) {
            Observable.create(sink => sink.complete()).subscribe(observer);
            return null;
        }
        const totalCount = connectionData.edgeCount + pageSize;
        if (options && options.force) {
            return this.refetchConnection(environment, connectionConfig, props, prevResult, setResult,
                totalCount, observerOrCallback, undefined);
        }
        const { END_CURSOR, START_CURSOR } = ConnectionInterface.get();
        const cursor = connectionData.cursor;
        warning(
            cursor,
            'ReactRelayPaginationContainer: Cannot `loadMore` without valid `%s` (got `%s`)',
            this._direction === FORWARD ? END_CURSOR : START_CURSOR,
            cursor,
        );
        const paginatingVariables = {
            count: pageSize,
            cursor: cursor,
            totalCount,
        };
        const fetch = this._fetchPage(environment, prevResult, setResult, connectionConfig, props, paginatingVariables, observer, options);
        return { dispose: fetch.unsubscribe };
    };

    _fetchPage(
        environment: IEnvironment,
        prevResult: ContainerResult,
        setResult: any,
        connectionConfig: ConnectionConfig,
        propsFragment: any,
        paginatingVariables: {
            count: number,
            cursor: string,
            totalCount: number,
        },
        observer: Observer<void>,
        options: RefetchOptions,
    ): Subscription {
        //const { componentRef: _, __relayContext, ...restProps } = this.props;
        const resolver = prevResult.resolver;
        const props = prevResult.data && prevResult.data.frag ? prevResult.data.frag : {};
        const fragments = prevResult.resolver._fragments;
        let rootVariables;
        let fragmentVariables;
        const fragmentOwners = getFragmentOwners(fragments, propsFragment);
        // NOTE: rootVariables are spread down below in a couple of places,
        // so we compute them here from the fragment owners.
        // For extra safety, we make sure the rootVariables include the
        // variables from all owners in this fragmentSpec, even though they
        // should all point to the same owner
        forEachObject(fragments, (__, key) => {
            const fragmentOwner = fragmentOwners[key];
            const fragmentOwnerVariables = Array.isArray(fragmentOwner)
                ? fragmentOwner[0].variables || {}
                : fragmentOwner.variables || {};
            rootVariables = {
                ...rootVariables,
                ...fragmentOwnerVariables,
            };
        });
        fragmentVariables = getVariablesFromObject(
            // NOTE: We pass empty operationVariables because we want to prefer
            // the variables from the fragment owner
            {},
            fragments,
            propsFragment,
            fragmentOwners,
        );
        fragmentVariables = {
            ...rootVariables,
            ...fragmentVariables,
            ...this._refetchVariables,
        };
        let fetchVariables = connectionConfig.getVariables(
            props,
            {
                count: paginatingVariables.count,
                cursor: paginatingVariables.cursor,
            },
            fragmentVariables,
        );
        invariant(
            typeof fetchVariables === 'object' && fetchVariables !== null,
            'ReactRelayPaginationContainer: Expected `getVariables()` to ' +
            'return an object, got `%s` in `%s`.',
            fetchVariables,
            'useFragment pagination',
        );
        fetchVariables = {
            ...fetchVariables,
            ...this._refetchVariables,
        };
        fragmentVariables = {
            ...fetchVariables,
            ...fragmentVariables,
        };

        const cacheConfig: CacheConfig = options
            ? { force: !!options.force }
            : undefined;
        const request = getRequest(connectionConfig.query);
        const operation = createOperationDescriptor(request, fetchVariables);

        let refetchSubscription = null;

        if (this._refetchSubscription) {
            this._refetchSubscription.unsubscribe();
        }
        this._hasFetched = true;

        const onNext = (payload, complete) => {
            const contextVariables = {
                ...fragmentVariables,
            };
            const prevData = resolver.resolve();
            resolver.setVariables(
                this._getFragmentVariables(
                    fragmentVariables,
                    paginatingVariables.totalCount,
                ),
                operation.node,
            );
            const nextData = resolver.resolve();

            // Workaround slightly different handling for connection in different
            // core implementations:
            // - Classic core requires the count to be explicitly incremented
            // - Modern core automatically appends new items, updating the count
            //   isn't required to see new data.
            //
            // `setState` is only required if changing the variables would change the
            // resolved data.
            // TODO #14894725: remove PaginationContainer equal check
            if (!areEqual(prevData, nextData)) {

                //res.setVariables(contextVariables, operation.node);
                setResult({
                    resolver: resolver, data: nextData, relay: {
                        environment: environment,
                        variables: contextVariables,
                    }
                })
                const callComplete = async () => {
                    complete();
                }
                callComplete();
                /*this.setState(
                    {
                        data: nextData,
                        contextForChildren: {
                            environment: this.props.__relayContext.environment,
                            variables: contextVariables,
                        },
                    },
                    complete,
                );*/
            } else {
                complete();
            }
        };

        const cleanup = () => {
            if (this._refetchSubscription === refetchSubscription) {
                this._refetchSubscription = null;
                this._isARequestInFlight = false;
            }
        };

        this._isARequestInFlight = true;
        refetchSubscription = this._queryFetcher
            .execute({
                environment,
                operation,
                cacheConfig,
                preservePreviousReferences: true,
            })
            .mergeMap(payload =>
                Observable.create(sink => {
                    onNext(payload, () => {
                        sink.next(); // pass void to public observer's `next`
                        sink.complete();
                    });
                }),
            )
            // use do instead of finally so that observer's `complete` fires after cleanup
            .do({
                error: cleanup,
                complete: cleanup,
                unsubscribe: cleanup,
            })
            .subscribe(observer || {});

        this._refetchSubscription = this._isARequestInFlight
            ? refetchSubscription
            : null;

        return refetchSubscription;
    }



}

export default FragmentPagination;
