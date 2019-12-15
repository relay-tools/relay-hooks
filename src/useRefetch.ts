import useOssFragment from './useOssFragment';
import { RefetchFunction } from './RelayHooksType';
import { GraphQLTaggedNode, OperationType } from 'relay-runtime';

import { KeyType, KeyReturnType, $Call, ArrayKeyType, ArrayKeyReturnType } from './RelayHooksType';

function useRefetch<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [$Call<KeyReturnType<TKey>>, RefetchFunction];
function useRefetch<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [$Call<KeyReturnType<TKey>> | null, RefetchFunction];
function useRefetch<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>, RefetchFunction];
function useRefetch<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null, RefetchFunction] {
    const [data, { refetch }] = useOssFragment(fragmentNode, fragmentRef);

    return [data, refetch];
}

export default useRefetch;
