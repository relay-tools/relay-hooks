import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { usePagination as usePaginationIntenal } from '../internal/usePagination';
import { KeyType, KeyTypeData, LoadMoreFn, RefetchFnDynamic } from '../RelayHooksType';
export interface ReturnType<
    TQuery extends OperationType,
    TKey extends KeyType | null,
    TFragmentData
> {
    data: TFragmentData;
    loadNext: LoadMoreFn<TQuery>;
    loadPrevious: LoadMoreFn<TQuery>;
    hasNext: boolean;
    hasPrevious: boolean;
    isLoading: boolean;
    isLoadingNext: boolean;
    isLoadingPrevious: boolean;
    refetch: RefetchFnDynamic<TQuery, TKey>;
}

export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnType<TQuery, TKey, KeyTypeData<TKey>>;
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnType<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    return usePaginationIntenal(fragmentNode, fragmentRef, true);
}
