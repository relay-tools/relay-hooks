import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { getRefetchMetadata } from './getRefetchMetadata';
import {
    KeyType,
    KeyTypeData,
    ReturnTypeRefetchNode,
    ReturnTypeRefetchSuspenseNode,
} from './RelayHooksType';
import { useOssFragment } from './useOssFragment';

function useInternalRefetchable<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
    suspense: boolean,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypeRefetchNode<TQuery, TKey, KeyTypeData<TKey>>;
function useInternalRefetchable<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    suspense: boolean,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypeRefetchNode<TQuery, TKey, KeyTypeData<TKey> | null> {
    const [data, resolver] = useOssFragment(fragmentInput, fragmentRef, suspense, 'useRefetchable');
    if ('production' !== process.env.NODE_ENV) {
        getRefetchMetadata(resolver.getFragment(), 'useRefetchable()');
    }
    resolver.checkRefechAndSuspense(suspense);
    return [data, resolver.refetch, resolver.isLoading()];
}

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
    return useInternalRefetchable(fragmentInput, fragmentRef, false);
}

export function useRefetchableFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypeRefetchSuspenseNode<TQuery, TKey, KeyTypeData<TKey>>;
export function useRefetchableFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypeRefetchSuspenseNode<TQuery, TKey, KeyTypeData<TKey> | null> {
    return (useInternalRefetchable(
        fragmentInput,
        fragmentRef,
        true,
    ) as any) as ReturnTypeRefetchSuspenseNode<TQuery, TKey, KeyTypeData<TKey>>;
}
