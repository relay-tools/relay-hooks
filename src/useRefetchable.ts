import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { KeyType, KeyTypeData, ReturnTypeRefetchNode } from './RelayHooksType';
import { useOssFragment } from './useOssFragment';

export function useRefetchable<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypeRefetchNode<TQuery, TKey, KeyTypeData<TKey>>;
export function useRefetchable<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypeRefetchNode<TQuery, TKey, KeyTypeData<TKey> | null> {
    const [data, resolver] = useOssFragment(fragmentInput, fragmentRef, false);

    return [data, resolver.refetch, resolver.isLoading()];
}
