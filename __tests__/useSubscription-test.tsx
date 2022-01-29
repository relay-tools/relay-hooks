/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+relay
 * @format
 */

/* eslint-disable */
'use strict';

import * as React from 'react';
import { useMemo, useState } from 'react';
import * as ReactTestRenderer from 'react-test-renderer';
import { Environment, graphql } from 'relay-runtime';

import { createMockEnvironment } from 'relay-test-utils-internal';
import { RelayEnvironmentProvider } from '../src';

const dispose = jest.fn();
const requestSubscription = jest.fn((_passedEnv, _passedConfig) => ({
    dispose,
}));

const relayRuntime = require('relay-runtime');
relayRuntime.requestSubscription = requestSubscription;

const CommentCreateSubscription = graphql`
    subscription useSubscriptionTestCommentCreateSubscription(
        $input: CommentCreateSubscriptionInput
    ) {
        commentCreateSubscribe(input: $input) {
            feedbackCommentEdge {
                node {
                    id
                    body {
                        text
                    }
                }
            }
        }
    }
`;

let setEnvironment;

describe('useSubscription', () => {
    const mockEnv = createMockEnvironment();
    const config = {
        variables: {},
        subscription: CommentCreateSubscription,
    };

    const { useSubscription } = require('../src');

    const ContextProvider = ({ children }: { children: React.ReactNode }) => {
        const [env, _setEnv] = useState(mockEnv);
        const relayContext = useMemo(() => ({ environment: env }), [env]);

        setEnvironment = _setEnv;

        return (
            <RelayEnvironmentProvider environment={relayContext.environment}>
                {children}
            </RelayEnvironmentProvider>
        );
    };

    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(() => {
        jest.resetAllMocks();
    });

    function MyComponent(props: { env: Environment; skip?: boolean }): React.ReactElement {
        function InnerComponent(): React.ReactElement {
            useSubscription(config, { skip: props.skip });
            return <>Hello Relay!</>;
        }
        return (
            <ContextProvider>
                <InnerComponent />
            </ContextProvider>
        );
    }

    let componentInstance;
    const renderComponent = (props?: { skip: boolean }) =>
        ReactTestRenderer.act(() => {
            componentInstance = ReactTestRenderer.create(
                <MyComponent env={mockEnv} skip={props?.skip || false} />,
            );
        });

    it('should call requestSubscription when mounted', () => {
        renderComponent();
        expect(requestSubscription).toHaveBeenCalled();
    });

    it('should call requestSubscription(...).dispose when unmounted', () => {
        renderComponent();
        ReactTestRenderer.act(() => {
            componentInstance.unmount();
        });
        expect(dispose).toHaveBeenCalled();
    });

    it('should pass the current relay environment', () => {
        renderComponent();
        expect(requestSubscription.mock.calls[0][0]).toEqual(mockEnv);
    });

    it('should forward the config', () => {
        renderComponent();
        expect(requestSubscription.mock.calls[0][1]).toEqual(config);
    });

    it('should dispose and re-subscribe when the environment changes', () => {
        renderComponent();
        expect(requestSubscription).toHaveBeenCalledTimes(1);
        expect(dispose).not.toHaveBeenCalled();

        ReactTestRenderer.act(() => {
            componentInstance.update(<MyComponent env={createMockEnvironment()} />);
        });

        expect(dispose).toHaveBeenCalled();
        expect(requestSubscription).toHaveBeenCalledTimes(2);
    });

    it('should not subscribe when skip parameter is set to true', () => {
        renderComponent({ skip: true });
        expect(requestSubscription).toHaveBeenCalledTimes(0);
        expect(dispose).not.toHaveBeenCalled();
    });

    it('should subscribe when skip option is set to false', () => {
        renderComponent({ skip: false });
        expect(requestSubscription).toHaveBeenCalledTimes(1);
        expect(dispose).not.toHaveBeenCalled();
    });
});
