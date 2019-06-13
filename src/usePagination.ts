import useOssFragment from "./useOssFragment";

const usePagination = function (fragmentDef, fragmentRef: any, ):any {

    const {refetch, ...others} = useOssFragment(fragmentDef, fragmentRef);

    return others;
}

export default usePagination;