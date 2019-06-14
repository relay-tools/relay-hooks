import { useState, useEffect, useContext } from "react";
import usePrevious from "./usePrevious";
import { ReactRelayContext } from 'react-relay';

import {
    IEnvironment,
    RelayContext,
    Snapshot,
} from 'relay-runtime/lib/RelayStoreTypes';

import * as areEqual from 'fbjs/lib/areEqual';
import { UseQueryProps, RenderProps, OperationContextProps, STORE_THEN_NETWORK, NETWORK_ONLY, STORE_OR_NETWORK } from './RelayHooksType';


const useQuery = function (props: UseQueryProps)  {
    const { environment } = useContext(ReactRelayContext);
    const { query, variables } = props;
    const dataFrom = props.dataFrom || STORE_OR_NETWORK;
    const prev = usePrevious({ environment, query, variables});
    const queryFetcher = prev.queryFetcher;
    const [hooksProps, setHooksProps] = useState<RenderProps>( { 
        error: null,
        props: null, 
        retry: null,
        cached: false
    });
    
    useEffect(() => {
        return () => {
            queryFetcher.dispose()
        };
    }, []);

    useEffect(() => {
        if (prev.query !== query ||
            prev.environment !== environment ||
      !areEqual(prev.variables, variables) ) {
          execute(environment, query, variables)
      }
    }, [environment, query, variables]);

    function execute(environment, query, variables) {
        if (!query) {
            queryFetcher.dispose();
            setOperationContext({ operation: null, relay: {environment, variables} });
        } else {
            queryFetcher.disposeRequest();
            const { createOperationDescriptor, getRequest, } = environment.unstable_internal;
            const request = getRequest(query);
            const operation = createOperationDescriptor(request, variables);
            setOperationContext({ operation: operation, relay: {environment, variables: operation.variables} });
        }
    }

    function setOperationContext(operationContext: OperationContextProps) {
        const operation = operationContext.operation;
        if (!operation) {
            setResult({empty: true});
            return;
        }
        try {
            //const storeSnapshot = queryFetcher.lookupInStore(genericEnvironment, operation, props.dataFrom); //i need this
            const storeSnapshot = dataFrom !== NETWORK_ONLY ? queryFetcher.lookupInStore(environment, operation) : null;

            const querySnapshot = (dataFrom === NETWORK_ONLY || 
                dataFrom === STORE_THEN_NETWORK ||
                (dataFrom === STORE_OR_NETWORK && !storeSnapshot)) ? queryFetcher.fetch({
                    cacheConfig: undefined,
                    dataFrom,
                    environment,
                    onDataChange: !queryFetcher._fetchOptions ? (params: { //TODO BETTER
                        error?: Error,
                        snapshot?: Snapshot,
                    }): void => {
                        const error = params.error == null ? null : params.error;
                        const snapshot = params.snapshot == null ? null : params.snapshot;
            
                        setResult({ error, snapshot, cached: false });
                    } : undefined,
                    operation,
                }) : null;

            // Use network data first, since it may be fresher
            const snapshot = querySnapshot || storeSnapshot;
            setResult({ error: null, snapshot, cached: !!storeSnapshot }); //relay
        } catch (error) {
            setResult({ error: error, snapshot: null, cached: false }); //relay
        }
    }

    function setResult(result: { empty?: boolean, error?: Error, snapshot?: Snapshot, cached?: boolean}) {
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
            renderProps.props = result.snapshot ? result.snapshot.data : null,
            renderProps.error = result.error ? result.error : null,
            renderProps.cached = result.cached || false,
            renderProps.retry = () => {
                execute(environment, props.query, props.variables);
            }
        } 
        if(hooksProps!==renderProps)
            setHooksProps(renderProps);    
    }

   /*useMemo(() => {
          render?
    }, [hooksProps]);*/

    return hooksProps;

}

export default useQuery;