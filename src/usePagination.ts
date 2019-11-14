import useOssFragment, { PaginationFunction } from './useOssFragment';

type PaginationResult = [any, PaginationFunction];

const usePagination = function(fragmentDef, fragmentRef: any): PaginationResult {
    const [data, { loadMore, hasMore, isLoading, refetchConnection }] = useOssFragment(fragmentDef, fragmentRef);

    return [data, { loadMore, hasMore, isLoading, refetchConnection }];
};

export default usePagination;
