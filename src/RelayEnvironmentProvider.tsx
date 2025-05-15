import * as React from 'react';
import { IEnvironment } from 'relay-runtime';
import { ReactRelayContext } from './ReactRelayContext'; // eslint-disable-line @typescript-eslint/no-unused-vars

export function RelayEnvironmentProvider(props: {
    children: React.ReactNode;
    environment: IEnvironment;
}): React.ReactElement {
    const context = React.useMemo(() => ({ environment: props.environment }), [props.environment]);
    return <ReactRelayContext.Provider value={context}>{props.children}</ReactRelayContext.Provider>;
}
