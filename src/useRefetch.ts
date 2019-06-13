import useOssFragment from "./useOssFragment";

const useRefetch = function (fragmentDef, fragmentRef: any, ):any {

    const {loadMore, hasMore, isLoading, refetchConnection, ...others} = useOssFragment(fragmentDef, fragmentRef);

    return others;
}

export default useRefetch;