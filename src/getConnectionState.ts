import * as invariant from 'fbjs/lib/invariant';
import { ConnectionInterface, ReaderFragment, getValueAtPath } from 'relay-runtime';

export function getStateFromConnection(
    direction: string,
    fragmentNode: ReaderFragment,
    connection: any | null,
): {
    cursor: string | null;
    hasMore: boolean;
} {
    if (connection == null) {
        return { cursor: null, hasMore: false };
    }
    const { EDGES, PAGE_INFO, HAS_NEXT_PAGE, HAS_PREV_PAGE, END_CURSOR, START_CURSOR } = ConnectionInterface.get();

    invariant(
        typeof connection === 'object',
        'Relay: Expected connection in fragment `%s` to have been `null`, or ' +
            'a plain object with %s and %s properties. Instead got `%s`.',
        fragmentNode.name,
        EDGES,
        PAGE_INFO,
        connection,
    );

    const edges = connection[EDGES];
    const pageInfo = connection[PAGE_INFO];
    if (edges == null || pageInfo == null) {
        return { cursor: null, hasMore: false };
    }

    invariant(
        Array.isArray(edges),
        'Relay: Expected connection in fragment `%s` to have a plural `%s` field. ' + 'Instead got `%s`.',
        fragmentNode.name,
        EDGES,
        edges,
    );
    invariant(
        typeof pageInfo === 'object',
        'Relay: Expected connection in fragment `%s` to have a `%s` field. ' + 'Instead got `%s`.',
        fragmentNode.name,
        PAGE_INFO,
        pageInfo,
    );

    const cursor = direction === 'forward' ? pageInfo[END_CURSOR] ?? null : pageInfo[START_CURSOR] ?? null;
    invariant(
        cursor === null || typeof cursor === 'string',
        'Relay: Expected page info for connection in fragment `%s` to have a ' + 'valid `%s`. Instead got `%s`.',
        fragmentNode.name,
        START_CURSOR,
        cursor,
    );

    let hasMore;
    if (direction === 'forward') {
        hasMore = cursor != null && pageInfo[HAS_NEXT_PAGE] === true;
    } else {
        hasMore = cursor != null && pageInfo[HAS_PREV_PAGE] === true;
    }

    return { cursor, hasMore };
}

export function getConnectionState(
    direction: string,
    fragmentNode: ReaderFragment,
    fragmentData: any,
    connectionPathInFragmentData: ReadonlyArray<string | number>,
): {
    cursor: string | null;
    hasMore: boolean;
} {
    const connection = getValueAtPath(fragmentData, connectionPathInFragmentData);
    return getStateFromConnection(direction, fragmentNode, connection);
}
