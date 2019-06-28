import { useState, useEffect, useContext } from "react";
import usePrevious from "./usePrevious";
import { ReactRelayContext } from 'react-relay';

import { Snapshot } from 'relay-runtime/lib/RelayStoreTypes';

import * as areEqual from 'fbjs/lib/areEqual';
import { UseQueryProps, RenderProps, OperationContextProps, STORE_THEN_NETWORK, NETWORK_ONLY, STORE_OR_NETWORK } from './RelayHooksType';


const useQuery = function (props: UseQueryProps)  {
    const { environment } = useContext(ReactRelayContext);
    const { query, variables } = props;
    const dataFrom = props.dataFrom || STORE_OR_NETWORK;
    const prev = usePrevious({ environment, query, variables});
    const queryFetcher = prev.queryFetcher;
    let [hooksProps, setHooksProps] = useState<RenderProps>( () => {
        return execute(environment, query, variables);
    });
    
    useEffect(() => {
        return () => {
            queryFetcher.dispose()
        };
    }, []);

    if (prev.query !== query ||
        prev.environment !== environment ||
        !areEqual(prev.variables, variables)) {
            hooksProps = execute(environment, query, variables);
    }

    function execute(environment, query, variables):RenderProps {
        if (!query) {
            queryFetcher.dispose();
            return getOperationContext({ operation: null, relay: {environment, variables} });
        } else {
            queryFetcher.disposeRequest();
            const { createOperationDescriptor, getRequest, } = environment.unstable_internal;
            const request = getRequest(query);
            const operation = createOperationDescriptor(request, variables);
            return getOperationContext({ operation: operation, relay: {environment, variables: operation.variables} });
        }
    }

    function getOperationContext(operationContext: OperationContextProps) {
        const operation = operationContext.operation;
        if (!operation) {
            return getResult({empty: true});
        }
        try {
            //const storeSnapshot = queryFetcher.lookupInStore(genericEnvironment, operation, props.dataFrom); //i need this
            const storeSnapshot = dataFrom !== NETWORK_ONLY ? queryFetcher.lookupInStore(environment, operation) : null;
            const isNetwork = (dataFrom === NETWORK_ONLY || 
                dataFrom === STORE_THEN_NETWORK ||
                (dataFrom === STORE_OR_NETWORK && !storeSnapshot));
            if ( isNetwork ) {
                queryFetcher._fetchOptions = null;
            }
            const querySnapshot = isNetwork ? queryFetcher.fetch({
                    cacheConfig: undefined,
                    dataFrom,
                    environment,
                    onDataChange: (params: { //TODO BETTER
                        error?: Error,
                        snapshot?: Snapshot,
                    }): void => {
                        const error = params.error == null ? null : params.error;
                        const snapshot = params.snapshot == null ? null : params.snapshot;
            
                        setHooksProps(getResult({ error, snapshot, cached: false }));
                    },
                    operation,
                }) : null;

            // Use network data first, since it may be fresher
            const snapshot = querySnapshot || storeSnapshot;
            return getResult({ error: null, snapshot, cached: !!storeSnapshot }); //relay
        } catch (error) {
            return getResult({ error: error, snapshot: null, cached: false }); //relay
        }
    }

    function getResult(result: { empty?: boolean, error?: Error, snapshot?: Snapshot, cached?: boolean}):RenderProps {
        if(!result) {
            return;
        }
        const renderProps = {
            error: null,
            props: result.empty ? {} : null, 
            retry: null,
            cached: false
        }
        if (result.snapshot || result.error || result.cached) {
            renderProps.props = result.snapshot ? result.snapshot.data : null;
            renderProps.error = result.error ? result.error : null;
            renderProps.cached = result.cached || false;
            renderProps.retry = () => {
                setHooksProps(execute(environment, props.query, props.variables));
            }
        } 
        if(hooksProps!==renderProps)
            return renderProps;    
    }

    /*const isServer = typeof window === 'undefined';
    if (isServer && prev && !prev.ssrExecute) {
        prev.ssrExecute = true;
        execute(environment, query, variables)
    }*/

   /*useMemo(() => {
          render?
    }, [hooksProps]);*/

    return hooksProps;

}

export default useQuery;