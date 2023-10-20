import { GraphQLTaggedNode } from 'relay-runtime';
import { KeyType, KeyReturnType, $Call, ArrayKeyType, ArrayKeyReturnType, FRAGMENT_NAME } from './RelayHooksTypes';
import { useOssFragment } from './useOssFragment';

export function useFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): $Call<KeyReturnType<TKey>>;
export function useFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
): $Call<KeyReturnType<TKey>> | null;
export function useFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>;
export function useFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
): ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>;
export function useFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null | undefined,
): ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> {
    const [data] = useOssFragment(fragmentNode, fragmentRef, false, FRAGMENT_NAME);
    return data;
}

export function useSuspenseFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): $Call<KeyReturnType<TKey>>;
export function useSuspenseFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): $Call<KeyReturnType<TKey>> | null;
export function useSuspenseFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>;
export function useSuspenseFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>;
export function useSuspenseFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> {
    const [data] = useOssFragment(fragmentNode, fragmentRef, true, FRAGMENT_NAME);
    return data;
}

export function useFragmentSubscription<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
    callback: (data: $Call<KeyReturnType<TKey>>) => void,
): void;
export function useFragmentSubscription<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    callback: (data: $Call<KeyReturnType<TKey>> | null) => void,
): void;
export function useFragmentSubscription<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
    callback: (data: ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>) => void,
): void;
export function useFragmentSubscription<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    callback: (data: ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>) => void,
): void;
export function useFragmentSubscription<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    callback: (data: ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>) => void,
): void {
    useOssFragment(fragmentNode, fragmentRef, false, FRAGMENT_NAME, callback);
}
