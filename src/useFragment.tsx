import { useEffect, useState, useRef } from "react";
import * as mapObject from 'fbjs/lib/mapObject';
import * as areEqual from 'fbjs/lib/areEqual';

import { ContainerResult } from './RelayHooksType';




function usePrevious(value): any {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
}

const useFragment = function (hooksProps: any, fragmentSpec) {
    const { relay, ...others } = hooksProps;
    const { environment, variables } = relay;
    const prev = usePrevious({ environment, variables, others });
    const [fragments, setFragments] = useState<any>(() => {
        const { getFragment: getFragmentFromTag } = environment.unstable_internal;
        return mapObject(fragmentSpec, getFragmentFromTag)
    });

    const [result, setResult] = useState<ContainerResult>(() => {
        return newResolver();
    });

    const { resolver } = result;

    function newResolver(){
        const {
            createFragmentSpecResolver,
        } = environment.unstable_internal;
        const res = createFragmentSpecResolver(
            relay,
            'useFragment',
            fragments,
            {...others, ...others.props},
        )
        res.setCallback(() => {
            const newData = res.resolve();
            if(result.data!==newData) {
                setResult({resolver: res, data: newData})
            }
        });
        return {resolver: res, data: res.resolve()};
    }

    useEffect(() => {
        return () => {
            resolver.dispose()
        };
    }, []);

    useEffect(() => {
        if(prev) {
            const { getDataIDsFromObject } = environment.unstable_internal;
            const prevIDs = getDataIDsFromObject(fragments, prev.others);
            const nextIDs = getDataIDsFromObject(fragments, others);
            if (prev.environment !== environment ||
            !areEqual(prev.variables, variables) || 
            !areEqual(prevIDs, nextIDs)) {
                resolver.dispose();
                setResult(newResolver());
            } /*else {
                resolver.setProps(others);
                setResult({resolver, data: resolver.resolve()})
            }*/
            
        }
    }, [environment, variables, others]);

    return {...result.data, relay};
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