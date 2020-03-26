import { useEffect } from 'react';
import { GraphQLSubscriptionConfig, requestSubscription } from 'relay-runtime';
import useRelayEnvironment from './useRelayEnvironment';

export function useSubscription<TSubscriptionPayload>(
    config: GraphQLSubscriptionConfig<TSubscriptionPayload>,
): void {
    const environment = useRelayEnvironment();

    useEffect(() => {
        const { dispose } = requestSubscription(environment, config);
        return dispose;
    }, [environment, config]);
}

export default useSubscription;
