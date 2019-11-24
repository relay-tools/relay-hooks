import * as React from 'react';
import ReactRelayContext from './ReactRelayContext';
import { IEnvironment } from 'relay-runtime';

function useRelayEnvironment(): IEnvironment {
    const { environment } = React.useContext(ReactRelayContext);
    return environment;
}

export default useRelayEnvironment;
