import useOssFragment from './useOssFragment';
import { GraphQLTaggedNode } from 'relay-runtime';

const useFragment = function(fragmentDef: GraphQLTaggedNode, fragmentRef: any): any {
    const [data] = useOssFragment(fragmentDef, fragmentRef);

    return data;
};

export default useFragment;
