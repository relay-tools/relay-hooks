import { useEffect } from 'react';
import { GraphQLSubscriptionConfig, requestSubscription, OperationType } from 'relay-runtime';
import { useRelayEnvironment } from './useRelayEnvironment';

export type SubscriptionConfig = {
    skip?: boolean;
};

export type SkipSubscriptionConfig = {
    skip: true;
};

export interface SkipGraphQLSubscriptionConfig<TSubscription extends OperationType>
    extends Omit<GraphQLSubscriptionConfig<TSubscription>, 'variables' | 'subscription'> {
    subscription?: GraphQLSubscriptionConfig<TSubscription>['subscription'];
    variables?: TSubscription['variables'];
}

export function useSubscription<TSubscriptionPayload extends OperationType = OperationType>(
    config: GraphQLSubscriptionConfig<TSubscriptionPayload>,
    opts?: SubscriptionConfig,
): void;
export function useSubscription<TSubscriptionPayload extends OperationType = OperationType>(
    config: SkipGraphQLSubscriptionConfig<TSubscriptionPayload>,
    opts: SkipSubscriptionConfig,
): void;
export function useSubscription<TSubscriptionPayload extends OperationType = OperationType>(
    config: GraphQLSubscriptionConfig<TSubscriptionPayload>,
    opts?: SubscriptionConfig,
): void {
    const environment = useRelayEnvironment();
    const skip = opts && opts.skip;

    useEffect(() => {
        if (skip) {
            return;
        }
        const { dispose } = requestSubscription(environment, config);
        return dispose;
    }, [environment, config, skip]);
}
