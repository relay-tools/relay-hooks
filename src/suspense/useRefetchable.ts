import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { KeyType, ReturnTypeRefetchSuspenseNode, KeyTypeData } from '../RelayHooksType';
import { useOssFragment } from '../useOssFragment';

export function useRefetchable<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypeRefetchSuspenseNode<TQuery, TKey, KeyTypeData<TKey>>;
export function useRefetchable<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypeRefetchSuspenseNode<TQuery, TKey, KeyTypeData<TKey> | null> {
    const [data, resolver] = useOssFragment(fragmentInput, fragmentRef, true);

    return [data, resolver.refetch];
}
