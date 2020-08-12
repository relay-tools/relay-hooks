import { useEffect, useState, useRef } from 'react';
import { GraphQLTaggedNode } from 'relay-runtime';
import { FragmentResolver } from './FragmentResolver';
import {
    ContainerResult,
    KeyType,
    KeyReturnType,
    $Call,
    ArrayKeyType,
    ArrayKeyReturnType,
} from './RelayHooksType';
import { useRelayEnvironment } from './useRelayEnvironment';

export function useOssFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [$Call<KeyReturnType<TKey>>, FragmentResolver];
export function useOssFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [$Call<KeyReturnType<TKey>> | null, FragmentResolver];
export function useOssFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>, FragmentResolver];
export function useOssFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null, FragmentResolver] {
    const environment = useRelayEnvironment();
    const [, forceUpdate] = useState<ContainerResult>(null);
    const ref = useRef<{ resolver: FragmentResolver }>(null);
    const unmountedRef = useRef(false);
    useEffect(() => {
        return (): void => {
            unmountedRef.current = true;
        };
    }, []);
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            resolver: new FragmentResolver((index) => {
                if (!unmountedRef.current) forceUpdate(index);
            }),
        };
    }

    const { resolver } = ref.current;

    useEffect(() => {
        return (): void => {
            resolver.dispose();
        };
    }, [resolver]);

    resolver.resolve(environment, fragmentNode, fragmentRef);

    const data = resolver.getData();

    return [data, resolver];
}
