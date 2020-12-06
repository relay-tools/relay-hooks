import * as warning from 'fbjs/lib/warning';
import { useEffect, useRef, useMemo } from 'react';
import { GraphQLTaggedNode, getFragmentIdentifier, getFragment } from 'relay-runtime';
import { FragmentResolver } from './FragmentResolver';
import { KeyType, KeyReturnType, $Call, ArrayKeyType, ArrayKeyReturnType } from './RelayHooksType';
import { useForceUpdate } from './useForceUpdate';
import { useRelayEnvironment } from './useRelayEnvironment';

export function useOssFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
    suspense: boolean,
    name: string,
): [$Call<KeyReturnType<TKey>>, FragmentResolver];
export function useOssFragment<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    suspense: boolean,
    name: string,
): [$Call<KeyReturnType<TKey>> | null, FragmentResolver];
export function useOssFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
    suspense: boolean,
    name: string,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>, FragmentResolver];
export function useOssFragment<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    suspense: boolean,
    name: string,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null, FragmentResolver] {
    const environment = useRelayEnvironment();
    const forceUpdate = useForceUpdate();
    const ref = useRef<{ resolver: FragmentResolver }>(null);
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            resolver: new FragmentResolver(name, forceUpdate),
        };
    }

    const { resolver } = ref.current;

    useEffect(() => {
        return (): void => {
            ref.current.resolver.setUnmounted();
        };
    }, []);

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

    resolver.checkAndSuspense(suspense);

    const data = resolver.getData();

    if ('production' !== process.env.NODE_ENV) {
        if (
            fragmentRef != null &&
            (data === undefined ||
                (Array.isArray(data) &&
                    data.length > 0 &&
                    data.every((data) => data === undefined)))
        ) {
            warning(
                false,
                'Relay: Expected to have been able to read non-null data for ' +
                    'fragment `%s` declared in ' +
                    '`%s`, since fragment reference was non-null. ' +
                    "Make sure that that `%s`'s parent isn't " +
                    'holding on to and/or passing a fragment reference for data that ' +
                    'has been deleted.',
                fragment,
                'useOssFragment',
                'useOssFragment',
            );
        }
    }

    return [data, resolver];
}
