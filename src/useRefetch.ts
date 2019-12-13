import useOssFragment from './useOssFragment';
import { RefetchFunction } from './RelayHooksType';
import { GraphQLTaggedNode } from 'relay-runtime';

type RefetchResult = [any, RefetchFunction];

const useRefetch = function(fragmentDef: GraphQLTaggedNode, fragmentRef: any): RefetchResult {
    const [data, { refetch }] = useOssFragment(fragmentDef, fragmentRef);

    return [data, refetch];
};

export default useRefetch;
