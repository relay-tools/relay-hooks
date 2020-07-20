import { useEffect } from 'react';
import { GraphQLSubscriptionConfig, requestSubscription, OperationType } from 'relay-runtime';
import { useRelayEnvironment } from './useRelayEnvironment';

export function useSubscription<TSubscriptionPayload extends OperationType = OperationType>(
    config: GraphQLSubscriptionConfig<TSubscriptionPayload>,
): void {
    const environment = useRelayEnvironment();

    useEffect(() => {
        const { dispose } = requestSubscription(environment, config);
        return dispose;
    }, [environment, config]);
}
