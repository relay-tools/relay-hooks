import { useState, useEffect, useContext, useRef } from "react";
import usePrevious from "./usePrevious";
import { ReactRelayContext } from 'react-relay';

import * as areEqual from 'fbjs/lib/areEqual';
import { UseQueryProps } from './RelayHooksType';


import UseQueryFetcher from './UseQueryFetcher';

type Reference = {
    queryFetcher: UseQueryFetcher,
}

function useDeepCompare<T>(value: T): T {
    const latestValue = useRef(value);
    if (!areEqual(latestValue.current, value)) {
      latestValue.current = value;
    }
    return latestValue.current;
  }



const useQuery = function (props: UseQueryProps)  {
    const { environment } = useContext(ReactRelayContext);
    const [, forceUpdate] = useState(null);
    const { query, variables, dataFrom } = props;
    const latestVariables = useDeepCompare(variables);
    const prev = usePrevious({ environment, query, latestVariables});
    
    const ref = useRef<Reference>();
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            queryFetcher: new UseQueryFetcher(forceUpdate),
        };
    }
    const { queryFetcher } = ref.current;
    useEffect(() => {
        return () => {
            queryFetcher.dispose()
        };
    }, []);

    

    if (!prev || prev.query !== query ||
        prev.environment !== environment ||
            prev.latestVariables!== latestVariables) {
                queryFetcher.execute(environment, query, variables, dataFrom);
    }

    return queryFetcher.getLastResult();
}

export default useQuery;