import * as React from 'react';
import { IEnvironment } from 'relay-runtime';
import { ReactRelayContext } from './ReactRelayContext';

export function useRelayEnvironment<TEnvironment extends IEnvironment = IEnvironment>(): TEnvironment {
    const { environment } = React.useContext(ReactRelayContext);
    return environment;
}
