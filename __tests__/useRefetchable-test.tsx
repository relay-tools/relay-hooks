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
import * as ReactTestRenderer from 'react-test-renderer';
import { useRefetchable, RelayEnvironmentProvider, useRelayEnvironment } from '../src';
import { act } from './internalAct';

const forceCache = { force: true };

function createHooks(component, options?: any) {
    const result = ReactTestRenderer.create(component, options);
    ReactTestRenderer.act(() => {
        jest.runAllImmediates();
    });
    return result;
}

const ReactRelayRefetchContainer = {
    createContainer: (Component, spec, query) => (props) => {
        const { user, ...others } = props;
        const environment = useRelayEnvironment();
        const { data, refetch: refetchHooks, isLoading, error } = useRefetchable(spec, user) as any;
        const refetch = (refetchVariables, renderVariables, observer, options) => {
            return refetchHooks(refetchVariables, {
                onComplete: observer?.complete ?? observer,
                fetchPolicy: options?.fetchPolicy,
            });
        };
        return (
            <Component error={error} isLoading={isLoading} user={data} {...others} relay={{ environment, refetch }} />
        );
    },
};

const { createReaderSelector, createOperationDescriptor, graphql } = require('relay-runtime');
const { createMockEnvironment } = require('relay-test-utils-internal');

describe('useRefetchable', () => {
    let TestComponent;
    let TestContainer;
    let UserFragment;
    let UserQuery;
    let UserQueryWithCond;
    let UserFragmentRefetchQuery;

    let environment;
    let ownerUser1;
    let ownerUser1WithCondVar;
    let ownerUser2;
    let refetch;
    let render;
    let variables;
    let relayContext;

    class ContextSetter extends React.Component<any, any> {
        __relayContext: { environment: any };
        constructor(props) {
            super(props);

            this.__relayContext = {
                environment: props.environment,
            };

            this.state = {
                props: null,
            };
        }
        UNSAFE_componentWillReceiveProps(nextProps) {
            // eslint-disable-next-line no-shadow
            const { environment } = nextProps;
            if (environment !== this.__relayContext.environment) {
                this.__relayContext = { environment };
            }
        }
        setProps(props) {
            this.setState({ props });
        }
        setContext(env) {
            this.__relayContext = {
                environment: env,
            };
            this.setProps({});
        }
        render() {
            let child: any = React.Children.only(this.props.children);
            if (this.state.props) {
                child = React.cloneElement(child, this.state.props);
            }
            return (
                <RelayEnvironmentProvider environment={this.__relayContext.environment}>
                    {child}
                </RelayEnvironmentProvider>
            );
        }
    }
    beforeEach(() => {
        jest.runAllTimers();
        jest.resetModules();

        environment = createMockEnvironment();
        UserQuery = graphql`
            query useRefetchableTestUserUserQuery($id: ID!) {
                node(id: $id) {
                    ...useRefetchableTestUserUserFragment
                }
            }
        `;
        UserQueryWithCond = graphql`
            query useRefetchableTestUserWithCondQuery($id: ID!, $condGlobal: Boolean!) {
                node(id: $id) {
                    ...useRefetchableTestUserUserFragment @arguments(cond: $condGlobal)
                }
            }
        `;

        UserFragment = graphql`
            fragment useRefetchableTestUserUserFragment on User
            @refetchable(queryName: "useRefetchableTestUserUserFragmentRefetchQuery")
            @argumentDefinitions(cond: { type: "Boolean", defaultValue: true }) {
                id
                name @include(if: $cond)
            }
        `;
        UserFragmentRefetchQuery = UserFragment.metadata.refetch.operation;

        function ContextGetter({ refetch }) {
            const environment = useRelayEnvironment();
            relayContext = { environment, refetch };
            return null;
        }

        render = jest.fn((props) => {
            refetch = props.relay.refetch;
            return <ContextGetter refetch />;
        });
        variables = {};
        TestComponent = render;
        TestComponent.displayName = 'TestComponent';
        TestContainer = ReactRelayRefetchContainer.createContainer(TestComponent, UserFragment, UserQuery);

        // Pre-populate the store with data
        ownerUser1 = createOperationDescriptor(UserQuery, { id: '4' });
        environment.commitPayload(ownerUser1, {
            node: {
                id: '4',
                __typename: 'User',
                name: 'Zuck',
            },
        });
        ownerUser1WithCondVar = createOperationDescriptor(UserQueryWithCond, {
            id: '4',
            condGlobal: false,
        });
        environment.commitPayload(ownerUser1, {
            node: {
                id: '4',
                __typename: 'User',
            },
        });
        ownerUser2 = createOperationDescriptor(UserQuery, { id: '842472' });
        environment.commitPayload(ownerUser2, {
            node: {
                id: '842472',
                __typename: 'User',
                name: 'Joe',
            },
        });
    });

    it('passes non-fragment props to the component', () => {
        createHooks(
            <ContextSetter environment={environment}>
                <TestContainer bar={1} foo="foo" />
            </ContextSetter>,
        );
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            bar: 1,
            foo: 'foo',
            isLoading: false,
            error: null,
            relay: {
                environment: expect.any(Object),
                refetch: expect.any(Function),
            },
            user: null,
        });
        expect(environment.lookup.mock.calls.length).toBe(0);
        expect(environment.subscribe.mock.calls.length).toBe(0);
    });

    it('passes through null props', () => {
        createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={null} />
            </ContextSetter>,
        );
        // Data & Variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            isLoading: false,
            error: null,
            relay: {
                environment: expect.any(Object),
                refetch: expect.any(Function),
            },
            user: null,
        });
        // Does not subscribe to updates (id is unknown)
        expect(environment.subscribe.mock.calls.length).toBe(0);
    });

    it('passes through context', () => {
        createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={null} />
            </ContextSetter>,
        );
        expect(relayContext.environment).toBe(environment);
    });

    it('resolves & subscribes fragment props', () => {
        const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

        createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={userPointer} />
            </ContextSetter>,
        );
        // Data & Variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            user: {
                id: '4',
                name: 'Zuck',
            },
            isLoading: false,
            error: null,
            relay: {
                environment: expect.any(Object),
                refetch: expect.any(Function),
            },
        });
        // Subscribes for updates
        expect(environment.subscribe.mock.calls.length).toBe(1);
        expect(environment.subscribe.mock.calls[0][0]).toEqual({
            data: {
                id: '4',
                name: 'Zuck',
            },
            isMissingData: false,
            fieldErrors: null,
            missingLiveResolverFields: [],
            missingClientEdges: null,
            seenRecords: expect.any(Object),
            selector: createReaderSelector(UserFragment, '4', { cond: true }, ownerUser1.request),
        });
    });

    it('re-renders on subscription callback', () => {
        const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

        createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={userPointer} />
            </ContextSetter>,
        );
        const callback = environment.subscribe.mock.calls[0][1];
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        callback({
            dataID: '4',
            node: UserFragment,
            variables: { cond: true },
            data: {
                id: '4',
                name: 'Mark', // !== 'Zuck'
            },
            seenRecords: {},
        });

        // No need to resolve props or resubscribe
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
        // Data & Variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            user: {
                id: '4',
                name: 'Mark',
            },
            isLoading: false,
            error: null,
            relay: {
                environment: expect.any(Object),
                refetch: expect.any(Function),
            },
        });
    });

    it('resolves new props', () => {
        let userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={userPointer} />
            </ContextSetter>,
        );
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
        instance.getInstance().setProps({
            user: userPointer,
        });

        // New data & variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            user: {
                id: '842472',
                name: 'Joe',
            },
            isLoading: false,
            error: null,
            relay: {
                environment: expect.any(Object),
                refetch: expect.any(Function),
            },
        });
        // Container subscribes for updates on new props
        jest.runAllTimers();
        expect(environment.subscribe.mock.calls.length).toBe(1);
        expect(environment.subscribe.mock.calls[0][0]).toEqual({
            data: {
                id: '842472',
                name: 'Joe',
            },
            isMissingData: false,
            fieldErrors: null,
            missingLiveResolverFields: [],
            missingClientEdges: null,
            seenRecords: expect.any(Object),
            selector: createReaderSelector(UserFragment, '842472', { cond: true }, ownerUser2.request),
        });
    });

    it('resolves new props when ids dont change', () => {
        let userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={userPointer} />
            </ContextSetter>,
        );
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        userPointer = environment.lookup(ownerUser1WithCondVar.fragment, ownerUser1WithCondVar).data.node;
        instance.getInstance().setProps({
            user: userPointer,
        });

        // New data & variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            user: {
                id: '4',
                // Name is excluded since value of cond is now false
            },
            isLoading: false,
            error: null,
            relay: {
                environment: expect.any(Object),
                refetch: expect.any(Function),
            },
        });
        jest.runAllTimers();
        // Container subscribes for updates on new props
        expect(environment.subscribe.mock.calls.length).toBe(1);
        expect(environment.subscribe.mock.calls[0][0]).toEqual({
            data: {
                id: '4',
                // Name is excluded since value of cond is now false
            },
            isMissingData: false,
            fieldErrors: null,
            missingLiveResolverFields: [],
            missingClientEdges: null,
            seenRecords: expect.any(Object),
            selector: createReaderSelector(UserFragment, '4', { cond: false }, ownerUser1WithCondVar.request),
        });
    });

    it('resolves new props when ids dont change even after it has refetched', () => {
        let userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={userPointer} />
            </ContextSetter>,
        );
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        // Call refetch first
        const refetchVariables = {
            cond: false,
            id: '4',
        };
        refetch(refetchVariables, null, jest.fn());
        expect(environment.mock.isLoading(UserFragmentRefetchQuery, refetchVariables, forceCache)).toBe(true);

        environment.mock.resolve(UserFragmentRefetchQuery, {
            data: {
                node: {
                    id: '4',
                    __typename: 'User',
                },
            },
        });
        render.mockClear();
        environment.subscribe.mockClear();

        // Pass an updated user pointer that references different variables
        userPointer = environment.lookup(ownerUser1WithCondVar.fragment, ownerUser1WithCondVar).data.node;
        instance.getInstance().setProps({
            user: userPointer,
        });

        // New data & variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            user: {
                id: '4',
                // Name is excluded since value of cond is now false
            },
            isLoading: false,
            error: null,
            relay: {
                environment: expect.any(Object),
                refetch: expect.any(Function),
            },
        });
        jest.runAllTimers();
        // Container subscribes for updates on new props
        expect(environment.subscribe.mock.calls.length).toBe(1);
        expect(environment.subscribe.mock.calls[0][0]).toEqual({
            data: {
                id: '4',
                // Name is excluded since value of cond is now false
            },
            isMissingData: false,
            fieldErrors: null,
            missingLiveResolverFields: [],
            missingClientEdges: null,
            seenRecords: expect.any(Object),
            selector: createReaderSelector(UserFragment, '4', { cond: false }, ownerUser1WithCondVar.request),
        });
    });

    it('does not update for same props/data', () => {
        const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={userPointer} />
            </ContextSetter>,
        );

        const initialProps = render.mock.calls[0][0];
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        instance.getInstance().setProps({
            user: userPointer,
        });

        expect(JSON.stringify(render.mock.calls[0][0])).toEqual(JSON.stringify(initialProps)); //changed expect(render).toBeCalled();
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
    });

    it('does not update for equal scalar props', () => {
        const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
        const scalar = 42;
        const fn = () => null;
        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer fn={fn} nil={null} scalar={scalar} user={userPointer} />
            </ContextSetter>,
        );
        const initialProps = render.mock.calls[0][0];
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        instance.getInstance().setProps({
            fn,
            nil: null,
            scalar,
            user: userPointer,
        });

        expect(JSON.stringify(render.mock.calls[0][0])).toEqual(JSON.stringify(initialProps)); //changed expect(render).not.toBeCalled();
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
    });

    it('updates for unequal function props', () => {
        const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
        const scalar = 42;
        const fn = () => null;
        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer fn={fn} scalar={scalar} user={userPointer} />
            </ContextSetter>,
        );
        const initialProps = render.mock.calls[0][0];
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        const nextFn = () => null;
        instance.getInstance().setProps({
            fn: nextFn,
            scalar,
            user: userPointer,
        });

        expect(render.mock.calls.length).toBe(1);

        expect(JSON.stringify(render.mock.calls[0][0])).toEqual(
            JSON.stringify({
                ...initialProps,
                fn: nextFn,
            }),
        ); //changed
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
    });

    it('updates for unequal scalar props', () => {
        const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
        const scalar = 42;
        const fn = () => null;
        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer fn={fn} scalar={scalar} user={userPointer} />
            </ContextSetter>,
        );
        const initialProps = render.mock.calls[0][0];
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        instance.getInstance().setProps({
            fn,
            scalar: 43,
            user: userPointer,
        });

        expect(render.mock.calls.length).toBe(1);

        expect(JSON.stringify(render.mock.calls[0][0])).toEqual(
            JSON.stringify({
                ...initialProps,
                scalar: 43,
            }),
        ); //changed
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
    });

    it('always updates for non-scalar props', () => {
        const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer arr={[]} obj={{}} user={userPointer} />
            </ContextSetter>,
        );
        const initialProps = render.mock.calls[0][0];
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        const nextArr = [];
        const nextObj = {};
        instance.getInstance().setProps({
            arr: nextArr,
            obj: nextObj,
            user: userPointer,
        });

        expect(render.mock.calls.length).toBe(1);
        expect(JSON.stringify(render.mock.calls[0][0])).toEqual(JSON.stringify(initialProps)); //changed
        expect(render.mock.calls[0][0].arr).toBe(nextArr);
        expect(render.mock.calls[0][0].obj).toBe(nextObj);
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
    });

    describe('refetch()', () => {
        let instance;
        let references;

        beforeEach(() => {
            references = [];
            environment.retain = () => {
                const dispose = jest.fn();
                const ref = { dispose };
                references.push(ref);
                return ref;
            };
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            environment.mock.clearCache();
            instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
        });

        it('fetches the new variables', () => {
            const refetchVariables = {
                cond: false,
                id: '4',
            };
            refetch(refetchVariables, null, jest.fn());
            expect(environment.mock.isLoading(UserFragmentRefetchQuery, refetchVariables, forceCache)).toBe(true);
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                    },
                },
            });
        });

        it('reads data from the store without sending a network request when data is available in store and using store-or-network', () => {
            expect.assertions(4);
            const refetchVariables = {
                cond: false,
                id: '4',
            };
            const refetchOptions = {
                fetchPolicy: 'store-or-network',
            };
            expect(render.mock.calls.length).toBe(1);
            refetch(refetchVariables, null, jest.fn(), refetchOptions);
            expect(render.mock.calls.length).toBe(2);
            expect(environment.mock.isLoading(UserFragmentRefetchQuery, refetchVariables, forceCache)).toBe(false);
            expect(environment.execute).toBeCalledTimes(0);
        });

        it('calls the callback when the fetch succeeds', () => {
            expect.assertions(2);
            const callback = jest.fn();
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, callback);
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                    },
                },
            });
            expect(callback.mock.calls.length).toBe(1);
            expect(callback).toBeCalledWith(null);
        });

        /* Now the callback is called only on success (complete) or error
        it('calls the callback when the fetch succeeds after every update', () => {
            const callback = jest.fn();
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, callback);
            environment.mock.nextValue(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                    },
                },
            });
            expect(callback.mock.calls.length).toBe(1);
            expect(callback).toBeCalledWith();

            environment.mock.nextValue(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                    },
                },
            });
            expect(callback.mock.calls.length).toBe(2);
            expect(callback).toBeCalledWith();

            environment.mock.complete(UserFragmentRefetchQuery);
            expect(callback.mock.calls.length).toBe(2);
        });
        */
        it('calls the callback when the fetch fails', () => {
            expect.assertions(2);
            const callback = jest.fn();
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, callback);
            const error = new Error('oops');
            environment.mock.reject(UserFragmentRefetchQuery, error);
            expect(callback.mock.calls.length).toBe(1);
            expect(callback).toBeCalledWith(error);
        });

        /* now refetch set cacheConfig { force: true }
        it('calls the callback even if the response is cached', () => {
            const refetchVariables = {
                cond: false,
                id: '4',
            };
            environment.mock.cachePayload(UserFragmentRefetchQuery, refetchVariables, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        name: 'Zuck',
                    },
                },
            });
            const callback = jest.fn();
            refetch(refetchVariables, null, callback);
            expect(callback).toHaveBeenCalled();
        });
        */

        it('returns false for isLoading if the response comes from cache', () => {
            const refetchVariables = {
                cond: false,
                id: '4',
            };
            const fetchedVariables = { id: '4' };
            environment.mock.cachePayload(UserQuery, fetchedVariables, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        name: 'Zuck',
                    },
                },
            });
            refetch(refetchVariables, null, jest.fn());
            expect(environment.mock.isLoading(UserQuery, fetchedVariables)).toBe(false);
        });

        it('renders with the results of the new variables on success', () => {
            expect.assertions(8);
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0].user.name).toBe('Zuck');
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, jest.fn());
            expect(render.mock.calls.length).toBe(2);
            expect(render.mock.calls[1][0].isLoading).toBe(true);
            expect(render.mock.calls[1][0].user.name).toBe('Zuck');
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        name: 'Zuck',
                    },
                },
            });
            expect(render.mock.calls.length).toBe(3);
            expect(render.mock.calls[2][0].isLoading).toBe(false);
            expect(render.mock.calls[2][0].user.name).toBe(undefined);
        });

        it('does not update variables on failure', () => {
            expect.assertions(11);
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0].user.name).toBe('Zuck');

            const callback = jest.fn();
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, callback);
            expect(render.mock.calls.length).toBe(2);
            expect(render.mock.calls[1][0].isLoading).toBe(true);
            expect(render.mock.calls[1][0].user.name).toBe('Zuck');
            const error = new Error('oops');
            environment.mock.reject(UserFragmentRefetchQuery, error);
            expect(render.mock.calls.length).toBe(3);
            expect(render.mock.calls[2][0].error).toBe(error);
            expect(render.mock.calls[2][0].isLoading).toBe(false);
            expect(render.mock.calls[2][0].user.name).toBe('Zuck');
            expect(callback.mock.calls.length).toBe(1);
            expect(callback).toBeCalledWith(error);
        });

        it('continues the fetch if new props refer to the same records', () => {
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, jest.fn());
            const subscription = environment.execute.mock.subscriptions[0];
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(subscription.closed).toBe(false);
        });

        it('cancels the fetch if new props refer to different records', () => {
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, jest.fn());
            const subscription = environment.execute.mock.subscriptions[0];
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({ user: userPointer });
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(subscription.closed).toBe(true);
        });

        it('holds refetch results if new props refer to the same records', () => {
            expect.assertions(2);
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(references.length).toBe(1);
            expect(references[0].dispose).not.toBeCalled();
        });
        it('releases refetch results if new props refer to different records', () => {
            expect.assertions(2);
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(references.length).toBe(1);
            expect(references[0].dispose).toBeCalled();
        });

        it('releases refetch results if unmounted', () => {
            expect.assertions(2);
            variables = {
                cond: false,
                id: '4',
            };
            refetch(variables, null, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                    },
                },
            });
            ReactTestRenderer.act(() => {
                instance.unmount();
            });
            expect(references.length).toBe(1);
            expect(references[0].dispose).toBeCalled();
        });

        it('cancels previous request when a new refetch occurs first', () => {
            const refetchVariables = {
                cond: false,
                id: '4',
            };
            refetch(refetchVariables, null, jest.fn());
            const subscription1 = environment.execute.mock.subscriptions[0];

            const refetchVariables2 = {
                cond: false,
                id: '11',
            };
            refetch(refetchVariables2, null, jest.fn());
            const subscription2 = environment.execute.mock.subscriptions[1];

            expect(subscription1.closed).toBe(true);
            expect(subscription2.closed).toBe(false);
        });

        it('does not cancel current request if previous request is disposed', () => {
            const refetchVariables = {
                cond: false,
                id: '4',
            };
            const disposable1 = refetch(refetchVariables, null, jest.fn());
            const subscription1 = environment.execute.mock.subscriptions[0];
            expect(subscription1.closed).toBe(false);

            const refetchVariables2 = {
                cond: false,
                id: '11',
            };
            const disposable2 = refetch(refetchVariables2, null, jest.fn());
            const subscription2 = environment.execute.mock.subscriptions[1];
            expect(subscription1.closed).toBe(true);
            expect(subscription2.closed).toBe(false);

            disposable1.dispose();
            expect(subscription1.closed).toBe(true);
            expect(subscription2.closed).toBe(false);

            disposable2.dispose();
            expect(subscription1.closed).toBe(true);
            expect(subscription2.closed).toBe(true);
        });

        it('should not refetch data is container unmounted', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            class TestContainerWrapper extends React.Component {
                state = {
                    mounted: true,
                };
                componentDidMount() {
                    setTimeout(() => {
                        this.setState({ mounted: false });
                    }, 1);
                }
                render() {
                    return this.state.mounted ? <TestContainer user={userPointer} /> : null;
                }
            }

            instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainerWrapper />
                </ContextSetter>,
            );
            jest.runOnlyPendingTimers();
            const callback = jest.fn();
            refetch({}, null, callback);
            expect(callback).not.toBeCalled();
        });
    });
    /* removed
  it("can be unwrapped in tests", () => {
    class TestUnwrapping extends React.Component {
      render() {
        return <div>Unwrapped</div>;
      }
    }

    const TestUnwrappingContainer = ReactRelayRefetchContainer.createContainer(
      TestUnwrapping,
      {
        user: () => UserFragment
      }
    );

    const UnwrappedComponent = unwrapContainer(TestUnwrappingContainer);

    const renderer = createHooks(
      <UnwrappedComponent user={{ id: "4", name: "Mark" }} />
    );

    expect(renderer.toJSON()).toMatchSnapshot();
  });*/
});
