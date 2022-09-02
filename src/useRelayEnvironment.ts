import * as React from 'react';
import { IEnvironment } from 'relay-runtime';
import { ReactRelayContext } from './ReactRelayContext';

export function useRelayEnvironment<
    TEnvironment extends IEnvironment = IEnvironment
>(): TEnvironment {
    const context = React.useContext(ReactRelayContext);
    return context.environment as TEnvironment;
}
