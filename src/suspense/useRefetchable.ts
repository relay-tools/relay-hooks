import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { useRefetchable as useRefetchableInternal } from '../internal/useRefetchable';
import {
    RefetchableFunction,
    KeyType,
    KeyReturnType,
    $Call,
    ArrayKeyType,
    ArrayKeyReturnType,
} from '../RelayHooksType';

export function useRefetchable<
    TKey extends KeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): {
    data: $Call<KeyReturnType<TKey>>;
    refetch: RefetchableFunction<TOperationType['variables']>;
};
export function useRefetchable<
    TKey extends KeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): {
    data: $Call<KeyReturnType<TKey>> | null;
    refetch: RefetchableFunction<TOperationType['variables']>;
    isLoading: boolean;
};
export function useRefetchable<
    TKey extends ArrayKeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey,
): {
    data: ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>;
    refetch: RefetchableFunction<TOperationType['variables']>;
};
export function useRefetchable<
    TKey extends ArrayKeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentInput: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): {
    data: ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null;
    refetch: RefetchableFunction<TOperationType['variables']>;
} {
    return useRefetchableInternal(fragmentInput, fragmentRef, true);
}
