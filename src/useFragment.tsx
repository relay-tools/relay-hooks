import { useEffect, useState, useRef } from "react";
import * as mapObject from 'fbjs/lib/mapObject';
import * as areEqual from 'fbjs/lib/areEqual';
import { RelayFeatureFlags, getFragment } from 'relay-runtime';

import { ContainerResult } from './RelayHooksType';
import {
    Disposable,
    IEnvironment,
    GraphQLTaggedNode,
    Observable,
    Observer,
    Variables,
    getFragmentOwners
} from 'relay-runtime';
import FragmentRefetch from "./FragmentRefetch";

export type RefetchOptions = {
    force?: boolean,
    fetchPolicy?: 'store-or-network' | 'network-only',
};

export type ObserverOrCallback = Observer<void> | ((error: Error) => any);

const usePrevious = function usePrevious(value): any {
    const ref = useRef();
    if (ref.current === null || ref.current === undefined) {
        const c:any = {fragmentRefetch: new FragmentRefetch()};
        ref.current = c;
    }
    useEffect(() => {
      value.fragmentRefetch = (ref.current as any).fragmentRefetch;
      ref.current = value;
    });
    return ref.current;
  }


const useFragment = function (hooksProps: any, fragmentSpec) {
    const { relay: relayHooks, ...others } = hooksProps;
    const { environment, variables } = relayHooks;
    const prev = usePrevious({ environment, variables, others });
    const [fragments, setFragments] = useState<any>(() => {
        RelayFeatureFlags.PREFER_FRAGMENT_OWNER_OVER_CONTEXT = true;
        const { getFragment: getFragmentFromTag } = environment.unstable_internal;
        return mapObject(fragmentSpec, getFragmentFromTag)
    });
    

    const [result, setResult] = useState<ContainerResult>(() => {
        return newResolver(relayHooks);
    });

    const { resolver, relay } = result;

    function newResolver(relay) {
        const {
            createFragmentSpecResolver,
        } = environment.unstable_internal;
        const res = createFragmentSpecResolver(
            relay,
            'useFragment',
            fragments,
            { ...others, ...others.props },
        )
        res.setCallback(() => {
            const newData = resolver.resolve();
            if (result.data !== newData) {
                setResult({ resolver: resolver, data: newData, relay: relay })
            }
        });
        return { resolver: res, data: res.resolve(), relay: relay };
    }

    useEffect(() => {
        return () => {
            resolver.dispose();
            prev && prev.fragmentRefetch.dispose();
        };
    }, []);

    useEffect(() => {
        if (prev && prev.others) {
            const { getDataIDsFromObject } = environment.unstable_internal;
            const prevIDs = getDataIDsFromObject(fragments, prev.others);
            const nextIDs = getDataIDsFromObject(fragments, others);
            if (prev.environment !== environment ||
                !areEqual(prev.variables, variables) ||
                !areEqual(prevIDs, nextIDs)) {
                resolver.dispose();
                setResult(newResolver(relay));
            } /*else {
                resolver.setProps(others);
                setResult({resolver, data: resolver.resolve()})
            }*/

        }
    }, [environment, variables, others]);

    function _getFragmentVariables(): Variables {
        const {
          getVariablesFromObject,
        } = environment.unstable_internal;
          return getVariablesFromObject(
            // NOTE: We pass empty operationVariables because we want to prefer
            // the variables from the fragment owner
            {},
            fragments,
            { ...others, ...others.props },
            getFragmentOwners(fragments, { ...others, ...others.props }),
          );
      }

    function refetch(taggedNode: GraphQLTaggedNode,
        refetchVariables:
            | Variables
            | ((fragmentVariables: Variables) => Variables),
        renderVariables: Variables,
        observerOrCallback: ObserverOrCallback,
        options: RefetchOptions, ) {
            return (prev.fragmentRefetch as FragmentRefetch).refetch(variables,
                environment,
                _getFragmentVariables(),
                taggedNode,
                refetchVariables,
                renderVariables,
                observerOrCallback,
                options,
                result,
                setResult
            );
    }

    return { ...result.data, relay: result.relay, refetch };
}

export default useFragment;

/**
 * use case?
      // Otherwise, for convenience short-circuit if all non-Relay props
      // are scalar and equal
      const keys = Object.keys(nextProps);
      for (let ii = 0; ii < keys.length; ii++) {
        const key = keys[ii];
        if (key === '__relayContext') {
          if (
            nextState.prevPropsContext.environment !==
              this.state.prevPropsContext.environment ||
            nextState.prevPropsContext.variables !==
              this.state.prevPropsContext.variables
          ) {
            return true;
          }
        } else {
          if (
            !fragments.hasOwnProperty(key) &&
            !isScalarAndEqual(nextProps[key], this.props[key])
          ) {
            return true;
          }
        }
      }
 */