import * as areEqual from 'fbjs/lib/areEqual';
import * as invariant from 'fbjs/lib/invariant';
import * as warning from 'fbjs/lib/warning';
import {
    PageInfo,
    Observer,
    Variables,
    ConnectionMetadata,
    ConnectionInterface,
    createRequestDescriptor,
    createReaderSelector,
    createOperationDescriptor,
    getRequest,
    GraphQLTaggedNode,
    OperationDescriptor,
    SingularReaderSelector,
} from 'relay-runtime';
import {
    STORE_OR_NETWORK,
    STORE_THEN_NETWORK,
    NETWORK_ONLY,
    FetchPolicy,
    FragmentVariablesGetter,
    FORWARD,
    PaginationData,
} from './RelayHooksType';

interface ConnectionData {
    edges?: ReadonlyArray<any> | null;
    pageInfo?: Partial<PageInfo> | null;
}

export interface ConnectionConfig<Props = object> {
    direction?: 'backward' | 'forward';
    getConnectionFromProps?: (props: Props) => ConnectionData | null | undefined;
    getFragmentVariables?: (prevVars: Variables, totalCount: number) => Variables;
    getVariables: (
        props: Props,
        paginationInfo: { count: number; cursor?: string | null },
        fragmentVariables: Variables,
    ) => Variables;
    query: GraphQLTaggedNode;
}
export type ReactConnectionMetadata = ConnectionMetadata & { fragmentName: string };

export type ObserverOrCallback = Observer<void> | ((error?: Error | null | undefined) => void);

export const isNetworkPolicy = (policy: FetchPolicy, storeSnapshot): boolean => {
    return (
        policy === NETWORK_ONLY ||
        policy === STORE_THEN_NETWORK ||
        (policy === STORE_OR_NETWORK && !storeSnapshot)
    );
};

export const isStorePolicy = (policy: FetchPolicy): boolean => {
    return policy !== NETWORK_ONLY;
};

// Fetcher
export function createOperation(
    gqlQuery: GraphQLTaggedNode,
    variables: Variables,
): OperationDescriptor {
    return createOperationDescriptor(getRequest(gqlQuery), variables);
}

// pagination utils

export function findConnectionMetadata(fragment): ReactConnectionMetadata {
    let foundConnectionMetadata = null;
    let isRelayModern = false;
    // for (const fragmentName in fragments) {
    //   const fragment = fragments[fragmentName];
    const connectionMetadata: Array<ConnectionMetadata> =
        fragment.metadata && (fragment.metadata.connection as any);
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
            fragment.name,
            connectionMetadata.length,
        );
        invariant(
            !foundConnectionMetadata,
            'ReactRelayPaginationContainer: Only a single fragment with ' +
                '@connection is supported.',
        );
        foundConnectionMetadata = {
            ...connectionMetadata[0],
            fragmentName: fragment.name,
        };
    }
    //}
    invariant(
        !isRelayModern || foundConnectionMetadata !== null,
        'ReactRelayPaginationContainer: A @connection directive must be present.',
    );
    return foundConnectionMetadata || ({} as any);
}

export function createGetConnectionFromProps(metadata: ReactConnectionMetadata): any {
    const path = metadata.path;
    invariant(
        path,
        'ReactRelayPaginationContainer: Unable to synthesize a ' +
            'getConnectionFromProps function.',
    );
    return (props): any => {
        let data = props;
        for (let i = 0; i < path.length; i++) {
            if (!data || typeof data !== 'object') {
                return null;
            }
            data = data[path[i]];
        }
        return data;
    };
}

export function createGetFragmentVariables(
    metadata: ReactConnectionMetadata,
): FragmentVariablesGetter {
    const countVariable = metadata.count;
    invariant(
        countVariable,
        'ReactRelayPaginationContainer: Unable to synthesize a ' + 'getFragmentVariables function.',
    );
    return (prevVars: Variables, totalCount: number): Variables => ({
        ...prevVars,
        [countVariable]: totalCount,
    });
}

/*eslint-disable */
export function toObserver(observerOrCallback: ObserverOrCallback): Observer<void> {
    return typeof observerOrCallback === 'function'
        ? {
              error: observerOrCallback,
              complete: observerOrCallback,
              unsubscribe: (subscription): void => {
                  typeof observerOrCallback === 'function' && observerOrCallback();
              },
          }
        : observerOrCallback || ({} as any);
}
/*eslint-enable */
export function getPaginationData(paginationData, fragment): PaginationData {
    if (!paginationData) {
        const metadata = findConnectionMetadata(fragment);
        const getConnectionFromProps = createGetConnectionFromProps(metadata);
        const direction = metadata.direction;
        invariant(
            direction,
            'ReactRelayPaginationContainer: Unable to infer direction of the ' +
                'connection, possibly because both first and last are provided.',
        );

        const getFragmentVariables = createGetFragmentVariables(metadata);

        return {
            direction,
            getConnectionFromProps,
            getFragmentVariables,
        };
    }
    return paginationData;
}

export function getNewSelector(request, s, variables): SingularReaderSelector {
    if (areEqual(variables, s.variables)) {
        // If we're not actually setting new variables, we don't actually want
        // to create a new fragment owner, since areEqualSelectors relies on
        // owner identity.
        // In fact, we don't even need to try to attempt to set a new selector.
        // When fragment ownership is not enabled, setSelector will also bail
        // out since the selector doesn't really change, so we're doing it here
        // earlier.
        return s;
    }
    // NOTE: We manually create the request descriptor here instead of
    // calling createOperationDescriptor() because we want to set a
    // descriptor with *unaltered* variables as the fragment owner.
    // This is a hack that allows us to preserve exisiting (broken)
    // behavior of RelayModern containers while using fragment ownership
    // to propagate variables instead of Context.
    // For more details, see the summary of D13999308
    const requestDescriptor = createRequestDescriptor(request, variables);
    const selector = createReaderSelector(s.node, s.dataID, variables, requestDescriptor);
    return selector;
}

export function _getConnectionData(
    { direction, getConnectionFromProps: defaultGetConnectionFromProps }: PaginationData,
    props: any,
    connectionConfig?: ConnectionConfig,
): {
    cursor: string;
    edgeCount: number;
    hasMore: boolean;
} {
    // Extract connection data and verify there are more edges to fetch
    const getConnectionFromProps =
        connectionConfig && connectionConfig.getConnectionFromProps
            ? connectionConfig.getConnectionFromProps
            : defaultGetConnectionFromProps; // todo
    const connectionData = getConnectionFromProps(props);
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
    const hasMore = direction === FORWARD ? pageInfo[HAS_NEXT_PAGE] : pageInfo[HAS_PREV_PAGE];
    const cursor = direction === FORWARD ? pageInfo[END_CURSOR] : pageInfo[START_CURSOR];
    if (typeof hasMore !== 'boolean' || (edges.length !== 0 && typeof cursor === 'undefined')) {
        warning(
            false,
            'ReactRelayPaginationContainer: Cannot paginate without %s fields in `%s`. ' +
                'Be sure to fetch %s (got `%s`) and %s (got `%s`).',
            PAGE_INFO,
            'useFragment pagination',
            direction === FORWARD ? HAS_NEXT_PAGE : HAS_PREV_PAGE,
            hasMore,
            direction === FORWARD ? END_CURSOR : START_CURSOR,
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

/*eslint-disable */
export function getRootVariablesForSelector(selector): Variables {
    return selector != null && selector.kind === 'PluralReaderSelector'
        ? selector.selectors[0]
            ? selector.selectors[0].owner.variables
            : {}
        : selector
        ? selector.owner.variables
        : {};
}
