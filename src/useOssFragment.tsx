import { useEffect, useState, useRef, useMemo } from 'react';
import { GraphQLTaggedNode, getFragmentIdentifier, getFragment } from 'relay-runtime';
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
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            resolver: new FragmentResolver(forceUpdate),
        };
    }

    const { resolver } = ref.current;

    useEffect(() => {
        return (): void => {
            resolver.dispose();
        };
    }, [resolver]);

    const fragment = useMemo(() => {
        return getFragment(fragmentNode);
    }, [fragmentNode]);

    const idfragment = useMemo(() => {
        return getFragmentIdentifier(fragment, fragmentRef);
    }, [fragment, fragmentRef]);

    resolver.resolve(environment, idfragment, fragment, fragmentRef);

    const data = resolver.getData();

    return [data, resolver];
}
