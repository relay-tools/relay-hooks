import * as React from 'react';
import { Environment } from 'relay-runtime';
import { ReactRelayContext } from './ReactRelayContext'; // eslint-disable-line @typescript-eslint/no-unused-vars

export const RelayEnvironmentProvider = function <TEnvironment extends Environment = Environment>(props: {
    children: React.ReactNode;
    environment: TEnvironment;
}): JSX.Element {
    const context = React.useMemo(() => ({ environment: props.environment }), [props.environment]);
    return <ReactRelayContext.Provider value={context}>{props.children}</ReactRelayContext.Provider>;
};
