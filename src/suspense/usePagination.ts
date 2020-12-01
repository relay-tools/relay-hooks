import { useMemo } from 'react';
import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { KeyType, KeyTypeData, ReturnTypePaginationSuspense } from '../RelayHooksType';
import { useOssFragment } from '../useOssFragment';

export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePaginationSuspense<TQuery, TKey, KeyTypeData<TKey>>;
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePaginationSuspense<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    const [data, resolver] = useOssFragment(fragmentNode, fragmentRef, true);

    const [loadPrevious, loadNext, refetch] = useMemo(
        () => [resolver.loadPrevious, resolver.loadNext, resolver.refetch],
        [resolver],
    );
    const [hasNext, isLoadingNext, hasPrevious, isLoadingPrevious] = resolver.getPaginationData();
    return {
        data,
        loadNext,
        loadPrevious,
        refetch,
        hasNext,
        isLoadingNext,
        hasPrevious,
        isLoadingPrevious,
    };
}
