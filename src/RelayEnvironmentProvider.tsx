import * as React from 'react';
import { Environment, RelayFeatureFlags } from 'relay-runtime';
import ReactRelayContext from './ReactRelayContext'; // eslint-disable-line @typescript-eslint/no-unused-vars

const RelayEnvironmentProvider = function(props: {
    children: React.ReactNode;
    environment?: Environment;
}): JSX.Element {
    RelayFeatureFlags.PREFER_FRAGMENT_OWNER_OVER_CONTEXT = true;
    return (
        <ReactRelayContext.Provider value={{ environment: props.environment, variables: {} }}>
            {props.children}
        </ReactRelayContext.Provider>
    );
};

export default RelayEnvironmentProvider;
