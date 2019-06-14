import * as React from 'react';
import { ReactRelayContext } from 'react-relay';
import {
    Environment,
  } from 'relay-runtime';


const RelayEnvironmentProvider = function (props: {children: React.ReactNode, environment?: Environment})  {

    return <ReactRelayContext.Provider value={ { environment: props.environment }}>
        {props.children}
    </ReactRelayContext.Provider>

}

export default RelayEnvironmentProvider;