import * as React from 'react';
import { IEnvironment } from 'relay-runtime';
import { operationQueryForm, initialCommit } from './Utils';

const FormContext = React.createContext(null);

export const RelayForm = function(props: {
    children: React.ReactNode;
    environment: IEnvironment;
}): JSX.Element {
    const { children, environment } = props;
    const context = React.useMemo(() => ({ environment }), [environment]);

    initialCommit(props.environment);

    React.useEffect(() => {
        const disposable = environment.retain(operationQueryForm);
        return disposable.dispose;
    }, [environment]);

    return <FormContext.Provider value={context}>{children}</FormContext.Provider>;
};

export function useRelayEnvironment(): IEnvironment {
    const { environment } = React.useContext(FormContext);
    return environment;
}
