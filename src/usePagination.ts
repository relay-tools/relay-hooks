import useOssFragment from './useOssFragment';
import { PaginationFunction } from './RelayHooksType';
import { GraphQLTaggedNode } from 'relay-runtime';

type PaginationResult = [any, PaginationFunction];

const usePagination = function(fragmentDef: GraphQLTaggedNode, fragmentRef: any): PaginationResult {
    const [data, { loadMore, hasMore, isLoading, refetchConnection }] = useOssFragment(
        fragmentDef,
        fragmentRef,
    );

    return [data, { loadMore, hasMore, isLoading, refetchConnection }];
};

export default usePagination;
