import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import {
    KeyType,
    KeyTypeData,
    PAGINATION_NAME,
    ReturnTypePagination,
    ReturnTypePaginationSuspense,
} from './RelayHooksTypes';
import { useOssFragment } from './useOssFragment';

export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): ReturnTypePagination<TQuery, TKey, KeyTypeData<TKey>>;
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
): ReturnTypePagination<TQuery, TKey | null, KeyTypeData<TKey> | null>;
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
): ReturnTypePagination<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    const [data] = useOssFragment(fragmentNode, fragmentRef, false, PAGINATION_NAME);
    return data;
}

export function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): ReturnTypePaginationSuspense<TQuery, TKey, KeyTypeData<TKey>>;
export function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
): ReturnTypePaginationSuspense<TQuery, TKey | null, KeyTypeData<TKey> | null>;
export function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
): ReturnTypePaginationSuspense<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    const [data] = useOssFragment(fragmentNode, fragmentRef, true, PAGINATION_NAME);
    return data;
}

export function usePaginationSubscription<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
    callback: (data: ReturnTypePagination<TQuery, TKey, KeyTypeData<TKey>>) => void,
): void;
export function usePaginationSubscription<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
    callback: (data: ReturnTypePagination<TQuery, TKey | null, KeyTypeData<TKey> | null>) => void,
): void;
export function usePaginationSubscription<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
    callback: (data: ReturnTypePagination<TQuery, TKey | null, KeyTypeData<TKey> | null>) => void,
): void {
    useOssFragment(fragmentNode, fragmentRef, false, PAGINATION_NAME, callback);
}
