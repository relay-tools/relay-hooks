import useOssFragment from './useOssFragment';
import { RefetchFunction } from './RelayHooksType';

type RefetchResult = [any, RefetchFunction];

const useRefetch = function(fragmentDef, fragmentRef: any): RefetchResult {
    const [data, { refetch }] = useOssFragment(fragmentDef, fragmentRef);

    return [data, refetch];
};

export default useRefetch;
