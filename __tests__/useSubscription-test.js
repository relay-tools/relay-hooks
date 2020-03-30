/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+relay
 * @format
 */

'use strict';

const React = require('react');
const { useMemo, useRef, useState } = React;
const ReactTestRenderer = require('react-test-renderer');

const { createMockEnvironment, generateAndCompile } = require('relay-test-utils-internal');

const { CommentCreateSubscription } = generateAndCompile(`
  subscription CommentCreateSubscription(
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
`);

let setEnvironment;

describe('useSubscription', () => {
    const mockEnv = createMockEnvironment();
    const config = {
        variables: {},
        subscription: CommentCreateSubscription,
    };
    const dispose = jest.fn();
    const requestSubscription = jest.fn((_passedEnv, _passedConfig) => ({
        dispose,
    }));
    const relayRuntime = require('relay-runtime');
    jest.mock('relay-runtime', () => {
        return {
            ...relayRuntime,
            requestSubscription,
        };
    });
    const { useSubscription, ReactRelayContext } = require('../lib');

    const ContextProvider = ({ children }) => {
        const [env, _setEnv] = useState(mockEnv);
        const relayContext = useMemo(() => ({ environment: env }), [env]);

        setEnvironment = _setEnv;

        return (
            <ReactRelayContext.Provider value={relayContext}>{children}</ReactRelayContext.Provider>
        );
    };

    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(() => {
        jest.resetAllMocks();
    });

    function MyComponent({ env }) {
        function InnerComponent() {
            useSubscription(config);
            return 'Hello Relay!';
        }
        return (
            <ContextProvider>
                <InnerComponent />
            </ContextProvider>
        );
    }

    let componentInstance;
    const renderComponent = () =>
        ReactTestRenderer.act(() => {
            componentInstance = ReactTestRenderer.create(<MyComponent env={mockEnv} />);
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
});
