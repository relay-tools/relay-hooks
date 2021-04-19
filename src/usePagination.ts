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
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePagination<TQuery, TKey, KeyTypeData<TKey>>;
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePagination<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    const [data] = useOssFragment(fragmentNode, fragmentRef, false, PAGINATION_NAME);
    return data;
}

export function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePaginationSuspense<TQuery, TKey, KeyTypeData<TKey>>;
export function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePaginationSuspense<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    const [data] = useOssFragment(fragmentNode, fragmentRef, true, PAGINATION_NAME);
    return data;
}

export function useTransientPagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
    callback: (data: ReturnTypePagination<TQuery, TKey, KeyTypeData<TKey>>) => void,
): // tslint:disable-next-line no-unnecessary-generics
void;
export function useTransientPagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    callback: (data: ReturnTypePagination<TQuery, TKey | null, KeyTypeData<TKey> | null>) => void,
): // tslint:disable-next-line no-unnecessary-generics
void {
    useOssFragment(fragmentNode, fragmentRef, false, PAGINATION_NAME, callback);
}
