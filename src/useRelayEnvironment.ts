import * as React from 'react';
import { IEnvironment } from 'relay-runtime';
import { ReactRelayContext } from './ReactRelayContext';

export function useRelayEnvironment(): IEnvironment {
    const { environment } = React.useContext(ReactRelayContext);
    return environment;
}
