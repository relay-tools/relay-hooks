import { useState, useEffect, useContext, useRef, useCallback } from "react";
import usePrevious from "./usePrevious";
import { ReactRelayContext } from 'react-relay';

import { Snapshot } from 'relay-runtime/lib/RelayStoreTypes';

import * as areEqual from 'fbjs/lib/areEqual';
import { UseQueryProps, RenderProps, OperationContextProps, STORE_THEN_NETWORK, NETWORK_ONLY, STORE_OR_NETWORK } from './RelayHooksType';

import * as ReactRelayQueryFetcher from 'react-relay/lib/ReactRelayQueryFetcher';

import UseQueryFetcher from './UseQueryFetcher';

type Reference = {
    queryFetcher: UseQueryFetcher,
}



const useQuery = function (props: UseQueryProps)  {
    const { environment } = useContext(ReactRelayContext);
    const [, forceUpdate] = useState();
    //const {current: { queryFetcher } } = useRef<Reference>({queryFetcher: new ReactRelayQueryFetcher()});
    const { query, variables, dataFrom } = props;
    const prev = usePrevious({ environment, query, variables});
    const ref = useRef<Reference>();
    if (ref.current === null || ref.current === undefined) {
        const qf = new UseQueryFetcher(forceUpdate);
        ref.current = {
            queryFetcher: qf,
        };
        qf.execute(environment, query, variables, dataFrom);
    }
    const { queryFetcher } = ref.current;
    useEffect(() => {
        return () => {
            queryFetcher.dispose()
        };
    }, []);

    const execute = useCallback(() => {
        if (prev !== undefined && (prev.query !== query ||
            prev.environment !== environment ||
            !areEqual(prev.variables, variables))) {
                queryFetcher.execute(environment, query, variables, dataFrom);
        } 
    }, [environment, query, variables]);
    
    execute();
    

    /*const isServer = typeof window === 'undefined';
    if (isServer && prev && !prev.ssrExecute) {
        prev.ssrExecute = true;
        execute(environment, query, variables)
    }*/

   /*useMemo(() => {
          render?
    }, [hooksProps]);*/

    

    return queryFetcher.getLastResult();
/*
    if (prev.query !== query ||
        prev.environment !== environment ||
        !areEqual(prev.variables, variables)) {
            return execute(environment, query, variables);
    } else {
        return hooksProps;
    }
*/
}

export default useQuery;