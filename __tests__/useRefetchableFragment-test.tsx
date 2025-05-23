/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/order */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails oncall+relay
 * @flow
 * @format
 */

// flowlint ambiguous-object-type:error

'use strict';
let mockGetPromise = false;
const unsubscribe = jest.fn();
jest.doMock('relay-runtime', () => {
    const originalRuntime = jest.requireActual('relay-runtime');
    const originalInternal = originalRuntime.__internal;
    return {
        ...originalRuntime,
        __internal: {
            ...originalInternal,
            getPromiseForActiveRequest: (...args) => {
                if (mockGetPromise) {
                    return Promise.resolve();
                }
                return originalInternal.getPromiseForActiveRequest(...args);
            },
            fetchQuery: (...args) => {
                const observable = originalInternal.fetchQuery(...args);
                return {
                    subscribe: (observer) => {
                        return observable.subscribe({
                            ...observer,
                            start: (originalSubscription) => {
                                const observerStart = observer?.start;
                                observerStart &&
                                    observerStart({
                                        ...originalSubscription,
                                        unsubscribe: () => {
                                            originalSubscription.unsubscribe();
                                            unsubscribe();
                                        },
                                    });
                            },
                        });
                    },
                };
            },
        },
    };
});
jest.mock('scheduler', () => {
    return jest.requireActual('scheduler/unstable_mock');
});
jest.mock('fbjs/lib/warning', () => {
    const f: any = jest.fn();
    f.default = jest.fn();
    return f;
});
import * as React from 'react';
const Scheduler = require('scheduler');

import { getFragment, getRequest, graphql, OperationDescriptor, Variables } from 'relay-runtime';
const { useMemo, useState, useEffect } = React;
import * as TestRenderer from 'react-test-renderer';
import {
    useRefetchableFragment as useRefetchableFragmentNodeOriginal,
    RelayEnvironmentProvider,
    useRelayEnvironment,
    ReactRelayContext,
} from '../src';
import { act } from './internalAct';

const invariant = require('fbjs/lib/invariant');
const warning = require('fbjs/lib/warning');
const areEqual = require('fbjs/lib/areEqual');

const { FRAGMENT_OWNER_KEY, FRAGMENTS_KEY, ID_KEY, createOperationDescriptor } = require('relay-runtime');

describe('useRefetchableFragmentNode', () => {
    let environment;
    let gqlQuery;
    let gqlQueryNestedFragment;
    let gqlRefetchQuery;
    let gqlQueryWithArgs;
    let gqlQueryWithLiteralArgs;
    let gqlRefetchQueryWithArgs;
    let gqlFragment;
    let gqlFragmentWithArgs;
    let query;
    let queryNestedFragment;
    let refetchQuery;
    let queryWithArgs;
    let queryWithLiteralArgs;
    let refetchQueryWithArgs;
    let variables;
    let variablesNestedFragment;
    let forceUpdate;
    let setEnvironment;
    let setOwner;
    let fetchPolicy;
    let renderPolicy;
    let createMockEnvironment;
    let renderFragment;
    let renderSpy;
    let refetch;
    let Renderer;

    class ErrorBoundary extends React.Component<any, any> {
        state = { error: null };
        componentDidCatch(error) {
            this.setState({ error });
        }

        render() {
            const { children, fallback } = this.props;
            const { error } = this.state;
            if (error) {
                return React.createElement(fallback, { error });
            }
            return children;
        }
    }

    function useRefetchableFragmentNode(fragmentNode, fragmentRef) {
        const { data, refetch: refetchFunction } = useRefetchableFragmentNodeOriginal(fragmentNode, fragmentRef);
        refetch = refetchFunction;
        renderSpy(data, refetch);
        return data;
    }

    function assertCall(expected, idx) {
        const actualData = renderSpy.mock.calls[idx][0];

        expect(actualData).toEqual(expected.data);
    }

    function expectFragmentResults(expectedCalls: ReadonlyArray<{ data: any }>) {
        // This ensures that useEffect runs
        act(() => jest.runAllImmediates());
        expect(renderSpy).toBeCalledTimes(expectedCalls.length);
        expectedCalls.forEach((expected, idx) => assertCall(expected, idx));
        renderSpy.mockClear();
    }

    function createFragmentRef(
        id,
        owner,
        __isWithinUnmatchedTypeRefinement = false,
        fragmentName = 'useRefetchableFragmentTestNestedUserFragment',
    ) {
        return {
            [ID_KEY]: id,
            [FRAGMENTS_KEY]: {
                [fragmentName]: {},
            },
            [FRAGMENT_OWNER_KEY]: owner.request,
        };
    }

    beforeEach(() => {
        // Set up mocks
        jest.resetModules();
        jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
        renderSpy = jest.fn();

        fetchPolicy = 'store-or-network';
        renderPolicy = 'partial';

        ({ createMockEnvironment } = require('relay-test-utils-internal'));

        // Set up environment and base data
        environment = createMockEnvironment();
        graphql`
            fragment useRefetchableFragmentTestNestedUserFragment on User {
                username
            }
        `;
        gqlFragmentWithArgs = getFragment(graphql`
            fragment useRefetchableFragmentTestUserFragmentWithArgs on User
            @refetchable(queryName: "useRefetchableFragmentTestUserFragmentWithArgsRefetchQuery")
            @argumentDefinitions(scaleLocal: { type: "Float!" }) {
                id
                name
                profile_picture(scale: $scaleLocal) {
                    uri
                }
                ...useRefetchableFragmentTestNestedUserFragment
            }
        `);
        gqlFragment = getFragment(graphql`
            fragment useRefetchableFragmentTestUserFragment on User
            @refetchable(queryName: "useRefetchableFragmentTestUserFragmentRefetchQuery") {
                id
                name
                profile_picture(scale: $scale) {
                    uri
                }
                ...useRefetchableFragmentTestNestedUserFragment
            }
        `);
        gqlQuery = getRequest(graphql`
            query useRefetchableFragmentTestUserQuery($id: ID!, $scale: Float!) {
                node(id: $id) {
                    ...useRefetchableFragmentTestUserFragment
                }
            }
        `);
        gqlQueryNestedFragment = getRequest(graphql`
            query useRefetchableFragmentTestUserQueryNestedFragmentQuery($id: ID!, $scale: Float!) {
                node(id: $id) {
                    actor {
                        ...useRefetchableFragmentTestUserFragment
                    }
                }
            }
        `);
        gqlQueryWithArgs = getRequest(graphql`
            query useRefetchableFragmentTestUserQueryWithArgsQuery($id: ID!, $scale: Float!) {
                node(id: $id) {
                    ...useRefetchableFragmentTestUserFragmentWithArgs @arguments(scaleLocal: $scale)
                }
            }
        `);
        gqlQueryWithLiteralArgs = getRequest(graphql`
            query useRefetchableFragmentTestUserQueryWithLiteralArgsQuery($id: ID!) {
                node(id: $id) {
                    ...useRefetchableFragmentTestUserFragmentWithArgs @arguments(scaleLocal: 16)
                }
            }
        `);
        gqlRefetchQuery = require('./__generated__/useRefetchableFragmentTestUserFragmentRefetchQuery.graphql').default;
        gqlRefetchQueryWithArgs =
            require('./__generated__/useRefetchableFragmentTestUserFragmentWithArgsRefetchQuery.graphql').default;
        variables = { id: '1', scale: 16 };
        variablesNestedFragment = { id: '<feedbackid>', scale: 16 };

        invariant(
            areEqual(gqlFragment.metadata?.refetch?.operation, gqlRefetchQuery),
            'useRefetchableFragment-test: Expected refetchable fragment metadata to contain operation.',
        );
        invariant(
            areEqual(gqlFragmentWithArgs.metadata?.refetch?.operation, gqlRefetchQueryWithArgs),
            'useRefetchableFragment-test: Expected refetchable fragment metadata to contain operation.',
        );

        query = createOperationDescriptor(gqlQuery, variables, { force: true });
        queryNestedFragment = createOperationDescriptor(gqlQueryNestedFragment, variablesNestedFragment, {
            force: true,
        });
        refetchQuery = createOperationDescriptor(gqlRefetchQuery, variables, {
            force: true,
        });
        queryWithArgs = createOperationDescriptor(gqlQueryWithArgs, variables, {
            force: true,
        });
        queryWithLiteralArgs = createOperationDescriptor(
            gqlQueryWithLiteralArgs,
            {
                id: variables.id,
            },
            { force: true },
        );
        refetchQueryWithArgs = createOperationDescriptor(gqlRefetchQueryWithArgs, variables, {
            force: true,
        });
        environment.commitPayload(query, {
            node: {
                __typename: 'User',
                id: '1',
                name: 'Alice',
                username: 'useralice',
                profile_picture: null,
            },
        });

        // Set up renderers
        Renderer = (props) => null;

        const Container = (props: { userRef?: any; owner: OperationDescriptor; fragment: any }) => {
            // We need a render a component to run a Hook
            const [owner, _setOwner] = useState<OperationDescriptor>(props.owner);
            const [_, _setCount] = useState(0);
            const fragment = props.fragment ?? gqlFragment;
            const artificialUserRef = useMemo(
                () => ({
                    [ID_KEY]: owner.request.variables.id ?? owner.request.variables.nodeID,
                    [FRAGMENTS_KEY]: {
                        [fragment.name]: {},
                    },
                    [FRAGMENT_OWNER_KEY]: owner.request,
                }),
                [owner, fragment.name],
            );
            const userRef = props.hasOwnProperty('userRef') ? props.userRef : artificialUserRef;

            forceUpdate = _setCount;
            setOwner = _setOwner;

            const userData = useRefetchableFragmentNode(fragment, userRef);
            return <Renderer user={userData} />;
        };

        const ContextProvider = ({ children }) => {
            const [env, _setEnv] = useState(environment);
            const relayContext = useMemo(() => ({ environment: env }), [env]);

            setEnvironment = _setEnv;

            return <ReactRelayContext.Provider value={relayContext}>{children}</ReactRelayContext.Provider>;
        };

        const Fallback = (): any => {
            useEffect(() => {
                Scheduler.unstable_yieldValue('Fallback');
            });

            return 'Fallback';
        };

        renderFragment = (args?: { isConcurrent?: boolean; owner?: any; userRef?: any; fragment?: any }): any => {
            const { isConcurrent = false, ...props } = args ?? ({} as any);
            let renderer;
            TestRenderer.act(() => {
                renderer = TestRenderer.create(
                    <ErrorBoundary fallback={({ error }): any => `Error: ${error.message}`}>
                        <React.Suspense fallback={<Fallback />}>
                            <ContextProvider>
                                <Container owner={query} {...props} />
                            </ContextProvider>
                        </React.Suspense>
                    </ErrorBoundary>,
                    // any[prop-missing] - error revealed when flow-typing ReactTestRenderer
                    { unstable_isConcurrent: isConcurrent } as any,
                );
                jest.runAllImmediates();
            });
            return renderer;
        };
    });

    afterEach(() => {
        environment.mockClear();
        renderSpy.mockClear();
        warning.mockClear();
        unsubscribe.mockClear();
        mockGetPromise = false;
    });

    describe('initial render', () => {
        // The bulk of initial render behavior is covered in useFragmentNode-test,
        // so this suite covers the basic cases as a sanity check.
        it('should throw error if fragment is plural', () => {
            jest.spyOn(console, 'error').mockImplementationOnce(() => {});

            const UserFragment = getFragment(graphql`
                fragment useRefetchableFragmentTest4Fragment on User @relay(plural: true) {
                    id
                }
            `);
            const renderer = renderFragment({ fragment: UserFragment });
            expect(renderer.toJSON().includes('Remove `@relay(plural: true)` from fragment')).toEqual(true);
        });

        it('should throw error if fragment is missing @refetchable directive', () => {
            jest.spyOn(console, 'error').mockImplementationOnce(() => {});

            const UserFragment = getFragment(graphql`
                fragment useRefetchableFragmentTest5Fragment on User {
                    id
                }
            `);
            const renderer = renderFragment({ fragment: UserFragment });
            expect(
                renderer.toJSON().includes('Did you forget to add a @refetchable directive to the fragment?'),
            ).toEqual(true);
        });

        it('should render fragment without error when data is available', () => {
            renderFragment();
            expectFragmentResults([
                {
                    data: {
                        id: '1',
                        name: 'Alice',
                        profile_picture: null,
                        ...createFragmentRef('1', query),
                    },
                },
            ]);
        });

        it('should render fragment without error when ref is null', () => {
            renderFragment({ userRef: null });
            expectFragmentResults([{ data: null }]);
        });

        it('should render fragment without error when ref is undefined', () => {
            renderFragment({ userRef: undefined });
            expectFragmentResults([{ data: null }]);
        });

        it('should update when fragment data changes', () => {
            renderFragment();
            expectFragmentResults([
                {
                    data: {
                        id: '1',
                        name: 'Alice',
                        profile_picture: null,
                        ...createFragmentRef('1', query),
                    },
                },
            ]);

            act(() => {
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        // Update name
                        name: 'Alice in Wonderland',
                    },
                });
            });
            expectFragmentResults([
                {
                    data: {
                        id: '1',
                        // Assert that name is updated
                        name: 'Alice in Wonderland',
                        profile_picture: null,
                        ...createFragmentRef('1', query),
                    },
                },
            ]);
        });

        it('should throw a promise if data is missing for fragment and request is in flight', () => {
            // This prevents console.error output in the test, which is expected
            jest.spyOn(console, 'error').mockImplementationOnce(() => {});

            mockGetPromise = true;

            const missingDataVariables = { ...variables, id: '4' };
            const missingDataQuery = createOperationDescriptor(gqlQuery, missingDataVariables, {
                force: true,
            });
            // Commit a payload with name and profile_picture are missing
            TestRenderer.act(() => {
                environment.commitPayload(missingDataQuery, {
                    node: {
                        __typename: 'User',
                        id: '4',
                    },
                });
            });

            const renderer = renderFragment({ owner: missingDataQuery });
            expect(renderer.toJSON()).toEqual('Fallback');
        });
    });

    describe('refetch', () => {
        let release;

        beforeEach(() => {
            jest.resetModules();

            ({ createMockEnvironment } = require('relay-test-utils-internal'));

            release = jest.fn();
            environment.retain.mockImplementation((...args) => {
                return {
                    dispose: release,
                };
            });
        });

        function expectRequestIsInFlight(expected, requestEnvironment = environment) {
            expect(requestEnvironment.execute).toBeCalledTimes(expected.requestCount);
            expect(
                requestEnvironment.mock.isLoading(
                    expected.gqlRefetchQuery ?? gqlRefetchQuery,
                    expected.refetchVariables,
                    { force: true },
                ),
            ).toEqual(expected.inFlight);
        }

        function expectFragmentIsRefetching(
            renderer,
            expected: {
                refetchVariables: Variables;
                refetchQuery?: OperationDescriptor;
                gqlRefetchQuery?: any;
            },
            env = environment,
            retain = true,
        ) {
            expect(renderSpy).toBeCalledTimes(0);
            renderSpy.mockClear();

            // Assert refetch query was fetched
            expectRequestIsInFlight({ ...expected, inFlight: true, requestCount: 1 }, env);

            // Assert component suspended
            expect(renderSpy).toBeCalledTimes(0);
            expect(renderer.toJSON()).toEqual('Fallback');

            // Assert query is tentatively retained while component is suspended
            if (retain) {
                expect(env.retain).toBeCalledTimes(1);
                expect(env.retain.mock.calls[0][0]).toEqual(expected.refetchQuery ?? refetchQuery);
            }
        }

        it('does not refetch and warns if component has unmounted', () => {
            const renderer = renderFragment();
            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([{ data: initialUser }]);

            TestRenderer.act(() => {
                renderer.unmount();
            });
            TestRenderer.act(() => {
                refetch({ id: '4' });
            });

            expect(warning).toHaveBeenCalledTimes(1);
            expect(
                // any[prop-missing]
                warning.mock.calls[0][1].includes('Relay: Unexpected call to `refetch` on unmounted component'),
            ).toEqual(true);
            expect(environment.execute).toHaveBeenCalledTimes(0);
        });

        it('warns if fragment ref passed to useRefetchableFragmentNode() was null', () => {
            renderFragment({ userRef: null });
            expectFragmentResults([{ data: null }]);

            TestRenderer.act(() => {
                refetch({ id: '4' });
            });

            expect(warning).toHaveBeenCalledTimes(1);
            expect(
                // any[prop-missing]
                warning.mock.calls[0][1].includes(
                    'Relay: Unexpected call to `refetch` while using a null fragment ref',
                ),
            ).toEqual(true);
            expect(environment.execute).toHaveBeenCalledTimes(1);
        });
        /*
        it('warns if refetch scheduled at high priority', () => {
            renderFragment();
            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([{ data: initialUser }]);

            TestRenderer.act(() => {
                Scheduler.unstable_runWithPriority(Scheduler.unstable_ImmediatePriority, () => {
                    refetch({ id: '4' });
                });
            });

            expect(warning).toHaveBeenCalledTimes(1);
            expect(
                // any[prop-missing]
                warning.mock.calls[0][1].includes(
                    'Relay: Unexpected call to `refetch` at a priority higher than expected',
                ),
            ).toEqual(true);
            expect(environment.execute).toHaveBeenCalledTimes(1);
        });
*/
        it('throws error when error occurs during refetch', () => {
            jest.spyOn(console, 'error').mockImplementationOnce(() => {});

            const callback = jest.fn();
            const renderer = renderFragment();
            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([{ data: initialUser }]);

            TestRenderer.act(() => {
                refetch({ id: '4' }, { onComplete: callback });
            });

            // Assert that fragment is refetching with the right variables and
            // suspends upon refetch
            const refetchVariables = {
                id: '4',
                scale: 16,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });
            expectFragmentIsRefetching(renderer, {
                refetchVariables,
                refetchQuery,
            });

            // Mock network error
            TestRenderer.act(() => {
                environment.mock.reject(gqlRefetchQuery, new Error('Oops'));
            });
            TestRenderer.act(() => {
                jest.runAllImmediates();
            });

            // Assert error is caught in Error boundary
            expect(renderer.toJSON()).toEqual('Error: Oops');
            expect(callback).toBeCalledTimes(1);
            expect(callback.mock.calls[0][0]).toMatchObject({ message: 'Oops' });

            // Assert refetch query wasn't retained
            TestRenderer.act(() => {
                jest.runAllTimers();
            });
            expect(release).toBeCalledTimes(1);
            expect(environment.retain).toBeCalledTimes(1);
        });

        it('refetches new variables correctly when refetching new id', () => {
            const renderer = renderFragment();
            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([{ data: initialUser }]);

            TestRenderer.act(() => {
                refetch({ id: '4' });
            });

            // Assert that fragment is refetching with the right variables and
            // suspends upon refetch
            const refetchVariables = {
                id: '4',
                scale: 16,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });
            expectFragmentIsRefetching(renderer, {
                refetchVariables,
                refetchQuery,
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            username: 'usermark',
                        },
                    },
                });
            });

            // Assert fragment is rendered with new data
            const refetchedUser = {
                id: '4',
                name: 'Mark',
                profile_picture: {
                    uri: 'scale16',
                },
                ...createFragmentRef('4', refetchQuery),
            };
            //expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
            expectFragmentResults([{ data: refetchedUser }]);

            // Assert refetch query was retained
            expect(release).not.toBeCalled();
            expect(environment.retain).toBeCalledTimes(1);
            expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
        });

        it('refetches new variables correctly when refetching same id', () => {
            const renderer = renderFragment();
            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([{ data: initialUser }]);

            TestRenderer.act(() => {
                refetch({ scale: 32 });
            });

            // Assert that fragment is refetching with the right variables and
            // suspends upon refetch
            const refetchVariables = {
                id: '1',
                scale: 32,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });
            expectFragmentIsRefetching(renderer, {
                refetchVariables,
                refetchQuery,
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            profile_picture: {
                                uri: 'scale32',
                            },
                            username: 'useralice',
                        },
                    },
                });
            });

            // Assert fragment is rendered with new data
            const refetchedUser = {
                id: '1',
                name: 'Alice',
                profile_picture: {
                    uri: 'scale32',
                },
                ...createFragmentRef('1', refetchQuery),
            };
            // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
            expectFragmentResults([{ data: refetchedUser }]);

            // Assert refetch query was retained
            expect(release).not.toBeCalled();
            expect(environment.retain).toBeCalledTimes(1);
            expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
        });

        it('with correct id from refetchable fragment when using nested fragment', () => {
            // Populate store with data for query using nested fragment
            TestRenderer.act(() => {
                environment.commitPayload(queryNestedFragment, {
                    node: {
                        __typename: 'Feedback',
                        id: '<feedbackid>',
                        actor: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            username: 'useralice',
                            profile_picture: null,
                        },
                    },
                });
            });

            // Get fragment ref for user using nested fragment
            const userRef = (environment.lookup(queryNestedFragment.fragment).data as any)?.node?.actor;

            const renderer = renderFragment({ owner: queryNestedFragment, userRef });
            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', queryNestedFragment),
            };
            expectFragmentResults([{ data: initialUser }]);

            TestRenderer.act(() => {
                refetch({ scale: 32 });
            });

            // Assert that fragment is refetching with the right variables and
            // suspends upon refetch
            const refetchVariables = {
                // The id here should correspond to the user id, and not the
                // feedback id from the query variables (i.e. `<feedbackid>`)
                id: '1',
                scale: 32,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });
            expectFragmentIsRefetching(renderer, {
                refetchVariables,
                refetchQuery,
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            profile_picture: {
                                uri: 'scale32',
                            },
                            username: 'useralice',
                        },
                    },
                });
            });

            // Assert fragment is rendered with new data
            const refetchedUser = {
                id: '1',
                name: 'Alice',
                profile_picture: {
                    uri: 'scale32',
                },
                ...createFragmentRef('1', refetchQuery),
            };
            // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
            expectFragmentResults([{ data: refetchedUser }]);

            // Assert refetch query was retained
            expect(release).not.toBeCalled();
            expect(environment.retain).toBeCalledTimes(1);
            expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
        });

        it('refetches new variables correctly when using @arguments', () => {
            const userRef = environment.lookup(queryWithArgs.fragment).data?.node;
            const renderer = renderFragment({
                fragment: gqlFragmentWithArgs,
                userRef,
            });
            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', queryWithArgs),
            };
            expectFragmentResults([{ data: initialUser }]);

            TestRenderer.act(() => {
                refetch({ scaleLocal: 32 });
            });

            // Assert that fragment is refetching with the right variables and
            // suspends upon refetch
            const refetchVariables = {
                id: '1',
                scaleLocal: 32,
            };
            refetchQueryWithArgs = createOperationDescriptor(gqlRefetchQueryWithArgs, refetchVariables, {
                force: true,
            });
            expectFragmentIsRefetching(renderer, {
                refetchVariables,
                refetchQuery: refetchQueryWithArgs,
                gqlRefetchQuery: gqlRefetchQueryWithArgs,
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQueryWithArgs, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            profile_picture: {
                                uri: 'scale32',
                            },
                            username: 'useralice',
                        },
                    },
                });
            });

            // Assert fragment is rendered with new data
            const refetchedUser = {
                id: '1',
                name: 'Alice',
                profile_picture: {
                    uri: 'scale32',
                },
                ...createFragmentRef('1', refetchQueryWithArgs),
            };
            // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
            expectFragmentResults([{ data: refetchedUser }]);

            // Assert refetch query was retained
            expect(release).not.toBeCalled();
            expect(environment.retain).toBeCalledTimes(1);
            expect(environment.retain.mock.calls[0][0]).toEqual(refetchQueryWithArgs);
        });

        it('refetches new variables correctly when using @arguments with literal values', () => {
            const userRef = environment.lookup(queryWithLiteralArgs.fragment).data?.node;
            const renderer = renderFragment({
                fragment: gqlFragmentWithArgs,
                userRef,
            });
            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', queryWithLiteralArgs),
            };
            expectFragmentResults([{ data: initialUser }]);

            TestRenderer.act(() => {
                refetch({ id: '4' });
            });

            // Assert that fragment is refetching with the right variables and
            // suspends upon refetch
            const refetchVariables = {
                id: '4',
                scaleLocal: 16,
            };
            refetchQueryWithArgs = createOperationDescriptor(gqlRefetchQueryWithArgs, refetchVariables, {
                force: true,
            });
            expectFragmentIsRefetching(renderer, {
                refetchVariables,
                refetchQuery: refetchQueryWithArgs,
                gqlRefetchQuery: gqlRefetchQueryWithArgs,
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQueryWithArgs, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            username: 'usermark',
                        },
                    },
                });
            });

            // Assert fragment is rendered with new data
            const refetchedUser = {
                id: '4',
                name: 'Mark',
                profile_picture: {
                    uri: 'scale16',
                },
                ...createFragmentRef('4', refetchQueryWithArgs),
            };
            // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
            expectFragmentResults([{ data: refetchedUser }]);

            // Assert refetch query was retained
            expect(release).not.toBeCalled();
            expect(environment.retain).toBeCalledTimes(1);
            expect(environment.retain.mock.calls[0][0]).toEqual(refetchQueryWithArgs);
        });

        it('subscribes to changes in refetched data', () => {
            renderFragment();
            renderSpy.mockClear();
            TestRenderer.act(() => {
                refetch({ id: '4' });
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            username: 'usermark',
                        },
                    },
                });
            });

            // Assert fragment is rendered with new data
            const refetchVariables = {
                id: '4',
                scale: 16,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });
            const refetchedUser = {
                id: '4',
                name: 'Mark',
                profile_picture: {
                    uri: 'scale16',
                },
                ...createFragmentRef('4', refetchQuery),
            };
            // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
            expectFragmentResults([{ data: refetchedUser }]);

            // Assert refetch query was retained
            expect(release).not.toBeCalled();
            expect(environment.retain).toBeCalledTimes(1);
            expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);

            // Update refetched data
            environment.commitPayload(refetchQuery, {
                node: {
                    __typename: 'User',
                    id: '4',
                    name: 'Mark Updated',
                },
            });

            // Assert that refetched data is updated
            expectFragmentResults([
                {
                    data: {
                        id: '4',
                        // Name is updated
                        name: 'Mark Updated',
                        profile_picture: {
                            uri: 'scale16',
                        },
                        ...createFragmentRef('4', refetchQuery),
                    },
                },
            ]);
        });
        /*
        it('resets to parent data when environment changes', () => {
            renderFragment();
            renderSpy.mockClear();
            TestRenderer.act(() => {
                refetch({ id: '4' });
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            username: 'usermark',
                        },
                    },
                });
            });

            // Assert fragment is rendered with new data
            const refetchVariables = {
                id: '4',
                scale: 16,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });
            const refetchedUser = {
                id: '4',
                name: 'Mark',
                profile_picture: {
                    uri: 'scale16',
                },
                ...createFragmentRef('4', refetchQuery),
            };
            // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
            expectFragmentResults([{ data: refetchedUser }]);

            // Assert refetch query was retained
            expect(release).not.toBeCalled();
            expect(environment.retain).toBeCalledTimes(1);
            expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);

            // Set new environment
            const newEnvironment = createMockEnvironment();
            newEnvironment.commitPayload(query, {
                node: {
                    __typename: 'User',
                    id: '1',
                    name: 'Alice in a different env',
                    username: 'useralice',
                    profile_picture: null,
                },
            });
            TestRenderer.act(() => {
                setEnvironment(newEnvironment);
            });

            // Assert that parent data is rendered
            const expectedUser = {
                id: '1',
                name: 'Alice in a different env',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([
                { data: expectedUser },
                { data: expectedUser },
                { data: expectedUser },
            ]);

            // Assert refetch query was released
            expect(release).toBeCalledTimes(1);
            expect(environment.retain).toBeCalledTimes(1);

            // Update data in new environment
            TestRenderer.act(() => {
                newEnvironment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice Updated',
                    },
                });
            });

            // Assert that data in new environment is updated
            expectFragmentResults([
                {
                    data: {
                        id: '1',
                        name: 'Alice Updated',
                        profile_picture: null,
                        ...createFragmentRef('1', query),
                    },
                },
            ]);
        });
*/
        it('resets to parent data when parent fragment ref changes', () => {
            renderFragment();
            renderSpy.mockClear();
            TestRenderer.act(() => {
                refetch({ id: '4' });
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            username: 'usermark',
                        },
                    },
                });
            });

            // Assert fragment is rendered with new data
            const refetchVariables = {
                id: '4',
                scale: 16,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });
            const refetchedUser = {
                id: '4',
                name: 'Mark',
                profile_picture: {
                    uri: 'scale16',
                },
                ...createFragmentRef('4', refetchQuery),
            };
            // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
            expectFragmentResults([{ data: refetchedUser }]);

            // Assert refetch query was retained
            expect(release).not.toBeCalled();
            expect(environment.retain).toBeCalledTimes(1);
            expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);

            // Pass new parent fragment ref with different variables
            const newVariables = { ...variables, scale: 32 };
            const newQuery = createOperationDescriptor(gqlQuery, newVariables, {
                force: true,
            });
            environment.commitPayload(newQuery, {
                node: {
                    __typename: 'User',
                    id: '1',
                    name: 'Alice',
                    username: 'useralice',
                    profile_picture: {
                        uri: 'uri32',
                    },
                },
            });
            TestRenderer.act(() => {
                setOwner(newQuery);
            });

            // Assert that parent data is rendered
            const expectedUser = {
                id: '1',
                name: 'Alice',
                profile_picture: {
                    uri: 'uri32',
                },
                ...createFragmentRef('1', newQuery),
            };
            /*expectFragmentResults([ original relay
                { data: expectedUser },
                //{ data: expectedUser },
                { data: expectedUser },
            ]);*/

            expectFragmentResults([{ data: expectedUser }]);

            // Assert refetch query was released
            expect(release).toBeCalledTimes(1);
            expect(environment.retain).toBeCalledTimes(1);

            // Update new parent data
            TestRenderer.act(() => {
                environment.commitPayload(newQuery, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice Updated',
                    },
                });
            });

            // Assert that new data from parent is updated
            expectFragmentResults([
                {
                    data: {
                        id: '1',
                        name: 'Alice Updated',
                        profile_picture: {
                            uri: 'uri32',
                        },
                        ...createFragmentRef('1', newQuery),
                    },
                },
            ]);
        });
        /*
        it('warns if data retured has different __typename', () => {
            const renderer = renderFragment();

            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([{ data: initialUser }]);

            const refetchVariables = {
                id: '1',
                scale: 32,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });

            renderSpy.mockClear();
            environment.execute.mockClear();
            environment.retain.mockClear();
            release.mockClear();

            TestRenderer.act(() => {
                refetch({ scale: 32 }, { fetchPolicy: 'network-only' });
            });

            expectFragmentIsRefetching(renderer, {
                refetchVariables,
                refetchQuery,
            });

            // Mock network response
            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'MessagingParticipant',
                            id: '1',
                            name: 'Alice',
                            profile_picture: {
                                uri: 'scale32',
                            },
                            username: 'useralice',
                        },
                    },
                });
            });

            TestRenderer.act(() => {
                jest.runAllImmediates();
            });

            // any[prop-missing]
            const warningCalls = warning.mock.calls.filter((call) => call[0] === false);
            expect(warningCalls.length).toEqual(2); // the other warnings are from FragmentResource.js
            expect(
                warningCalls[1][1].includes(
                    'Relay: Call to `refetch` returned data with a different __typename:',
                ),
            ).toEqual(true);
        });

        it('warns if a different id is returned', () => {
            const renderer = renderFragment();

            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([{ data: initialUser }]);

            const refetchVariables = {
                id: '1',
                scale: 32,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });

            renderSpy.mockClear();
            environment.execute.mockClear();
            environment.retain.mockClear();
            release.mockClear();

            TestRenderer.act(() => {
                refetch({ scale: 32 }, { fetchPolicy: 'network-only' });
            });

            expectFragmentIsRefetching(renderer, {
                refetchVariables,
                refetchQuery,
            });

            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '2',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale32',
                            },
                            username: 'usermark',
                        },
                    },
                });
            });

            TestRenderer.act(() => {
                jest.runAllImmediates();
            });

            // any[prop-missing]
            const warningCalls = warning.mock.calls.filter((call) => call[0] === false);
            expect(warningCalls.length).toEqual(2);
            expect(
                warningCalls[0][1].includes(
                    'Relay: Call to `refetch` returned a different id, expected',
                ),
            ).toEqual(true);
        });
*/
        it("doesn't warn if refetching on a different id than the current one in display", () => {
            renderFragment();

            const initialUser = {
                id: '1',
                name: 'Alice',
                profile_picture: null,
                ...createFragmentRef('1', query),
            };
            expectFragmentResults([{ data: initialUser }]);

            const refetchVariables = {
                id: '1',
                scale: 32,
            };
            refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                force: true,
            });

            renderSpy.mockClear();
            environment.execute.mockClear();
            environment.retain.mockClear();
            release.mockClear();

            TestRenderer.act(() => {
                refetch({ id: '2', scale: 32 }, { fetchPolicy: 'network-only' });
                jest.runAllImmediates();
            });

            TestRenderer.act(() => {
                refetch({ id: '3', scale: 32 }, { fetchPolicy: 'network-only' });
            });

            TestRenderer.act(() => {
                environment.mock.resolve(gqlRefetchQuery, {
                    data: {
                        node: {
                            __typename: 'User',
                            id: '3',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale32',
                            },
                            username: 'usermark',
                        },
                    },
                });
            });

            TestRenderer.act(() => {
                jest.runAllTimers();
            });

            expect(
                // any[prop-missing]
                warning.mock.calls.filter((call) => call[0] === false).length,
            ).toEqual(0);
        });

        describe('multiple refetches', () => {
            let fetchSpy;
            beforeEach(() => {
                fetchSpy = jest.fn();
                const internalRuntime = require('relay-runtime').__internal;
                const originalFetchQuery = internalRuntime.fetchQuery;
                jest.spyOn(internalRuntime, 'fetchQuery').mockImplementation((...args) => {
                    const originalObservable = originalFetchQuery(...args);
                    return {
                        ...originalObservable,
                        subscribe: (...subscribeArgs) => {
                            fetchSpy(...args);
                            return originalObservable.subscribe(...subscribeArgs);
                        },
                    };
                });
            });

            it('refetches correctly when refetching multiple times in a row', () => {
                const renderer = renderFragment();
                const initialUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', query),
                };
                expectFragmentResults([{ data: initialUser }]);

                const refetchVariables = {
                    id: '1',
                    scale: 32,
                };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                const refetchedUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: {
                        uri: 'scale32',
                    },
                    ...createFragmentRef('1', refetchQuery),
                };

                const doAndAssertRefetch = (fragmentResults, retain = true) => {
                    renderSpy.mockClear();
                    environment.execute.mockClear();
                    environment.retain.mockClear();

                    TestRenderer.act(() => {
                        // We use fetchPolicy network-only to ensure the call to refetch
                        // always suspends
                        refetch({ scale: 32 }, { fetchPolicy: 'network-only' });
                    });

                    // Assert that fragment is refetching with the right variables and
                    // suspends upon refetch
                    expectFragmentIsRefetching(
                        renderer,
                        {
                            refetchVariables,
                            refetchQuery,
                        },
                        undefined,
                        retain,
                    );

                    // Mock network response
                    TestRenderer.act(() => {
                        environment.mock.resolve(gqlRefetchQuery, {
                            data: {
                                node: {
                                    __typename: 'User',
                                    id: '1',
                                    name: 'Alice',
                                    profile_picture: {
                                        uri: 'scale32',
                                    },
                                    username: 'useralice',
                                },
                            },
                        });
                    });

                    // Assert fragment is rendered with new data
                    expectFragmentResults(fragmentResults);

                    // Assert refetch query was retained
                    if (retain) {
                        expect(environment.retain).toBeCalledTimes(1);
                        expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
                    }
                };

                // Refetch once
                // doAndAssertRefetch([{ data: refetchedUser }, { data: refetchedUser }]); relay original
                doAndAssertRefetch([{ data: refetchedUser }]);
                // Refetch twice
                doAndAssertRefetch([{ data: refetchedUser }], false);
                //expect(release).toBeCalledTimes(1);
            });
            /*
            it('refetches correctly when a second refetch starts while the first is one suspended', () => {
                const renderer = renderFragment();
                renderSpy.mockClear();
                TestRenderer.act(() => {
                    refetch(
                        { id: '1' },
                        { fetchPolicy: 'network-only', UNSTABLE_renderPolicy: renderPolicy },
                    );
                });

                // Assert request is started
                const refetchVariables1 = { id: '1', scale: 16 };
                const refetchQuery1 = createOperationDescriptor(
                    gqlRefetchQuery,
                    refetchVariables1,
                    { force: true },
                );

                // Assert we suspend on intial refetch request
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery1,
                    refetchVariables: refetchVariables1,
                });

                // Call refetch a second time
                environment.execute.mockClear();
                environment.retain.mockClear();
                const refetchVariables2 = { id: '4', scale: 16 };
                const refetchQuery2 = createOperationDescriptor(
                    gqlRefetchQuery,
                    refetchVariables2,
                    { force: true },
                );
                TestRenderer.act(() => {
                    refetch(
                        { id: '4' },
                        { fetchPolicy: 'network-only', UNSTABLE_renderPolicy: renderPolicy },
                    );
                });

                // Assert we suspend on the second refetch request
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery2,
                    refetchVariables: refetchVariables2,
                });

                // Mock response for initial refetch request
                TestRenderer.act(() => {
                    environment.mock.resolve(refetchQuery1, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '1',
                                name: 'User 1',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                                username: 'user1',
                            },
                        },
                    });
                });

                // Assert that we are still suspended the second refetch request
                // since that one hasn't resolved and that's the latest one we want
                // to render
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery2,
                    refetchVariables: refetchVariables2,
                });

                // Mock response for second refetch request
                TestRenderer.act(() => {
                    environment.mock.resolve(refetchQuery2, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '4',
                                name: 'Mark',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                                username: 'usermark',
                            },
                        },
                    });
                });

                // Assert component is rendered with data from second request
                const refetchedUser = {
                    id: '4',
                    name: 'Mark',
                    profile_picture: { uri: 'scale16' },
                    ...createFragmentRef('4', refetchQuery2),
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                expect(fetchSpy).toBeCalledTimes(2);
            });

            it('does not re-issue initial refetch request if second refetch is interrupted by high-pri update', () => {
                const renderer = renderFragment();
                renderSpy.mockClear();
                TestRenderer.act(() => {
                    refetch(
                        { id: '1' },
                        { fetchPolicy: 'network-only', UNSTABLE_renderPolicy: renderPolicy },
                    );
                });

                // Assert request is started
                const refetchVariables1 = { id: '1', scale: 16 };
                const refetchQuery1 = createOperationDescriptor(
                    gqlRefetchQuery,
                    refetchVariables1,
                    { force: true },
                );

                // Assert we suspend on intial refetch request
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery1,
                    refetchVariables: refetchVariables1,
                });

                // Call refetch a second time
                environment.execute.mockClear();
                environment.retain.mockClear();
                const refetchVariables2 = { id: '4', scale: 16 };
                const refetchQuery2 = createOperationDescriptor(
                    gqlRefetchQuery,
                    refetchVariables2,
                    { force: true },
                );
                TestRenderer.act(() => {
                    refetch(
                        { id: '4' },
                        { fetchPolicy: 'network-only', UNSTABLE_renderPolicy: renderPolicy },
                    );
                });

                // Assert we suspend on the second refetch request
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery2,
                    refetchVariables: refetchVariables2,
                });

                // Schedule a high-pri update while the component is
                // suspended on pagination
                TestRenderer.act(() => {
                    Scheduler.unstable_runWithPriority(
                        Scheduler.unstable_UserBlockingPriority,
                        () => {
                            forceUpdate((prev) => prev + 1);
                        },
                    );
                });

                // Assert that we are still suspended the second refetch request
                // since that one hasn't resolved and that's the latest one we want
                // to render
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery2,
                    refetchVariables: refetchVariables2,
                });

                // Mock response for initial refetch request
                TestRenderer.act(() => {
                    environment.mock.resolve(refetchQuery1, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '1',
                                name: 'User 1',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                                username: 'user1',
                            },
                        },
                    });
                });

                // Assert that we are still suspended the second refetch request
                // since that one hasn't resolved and that's the latest one we want
                // to render
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery2,
                    refetchVariables: refetchVariables2,
                });

                // Mock response for second refetch request
                TestRenderer.act(() => {
                    environment.mock.resolve(refetchQuery2, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '4',
                                name: 'Mark',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                                username: 'usermark',
                            },
                        },
                    });
                });

                // Assert component is rendered with data from second request
                const refetchedUser = {
                    id: '4',
                    name: 'Mark',
                    profile_picture: { uri: 'scale16' },
                    ...createFragmentRef('4', refetchQuery2),
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                expect(fetchSpy).toBeCalledTimes(2);
            });

            it('refetches correctly when switching between multiple refetches', () => {
                const renderer = renderFragment();
                renderSpy.mockClear();
                TestRenderer.act(() => {
                    refetch(
                        { id: '1' },
                        { fetchPolicy: 'network-only', UNSTABLE_renderPolicy: renderPolicy },
                    );
                });

                // Assert request is started
                const refetchVariables1 = { id: '1', scale: 16 };
                const refetchQuery1 = createOperationDescriptor(
                    gqlRefetchQuery,
                    refetchVariables1,
                    { force: true },
                );

                // Assert we suspend on intial refetch request
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery1,
                    refetchVariables: refetchVariables1,
                });

                // Call refetch a second time
                environment.execute.mockClear();
                environment.retain.mockClear();
                const refetchVariables2 = { id: '4', scale: 16 };
                const refetchQuery2 = createOperationDescriptor(
                    gqlRefetchQuery,
                    refetchVariables2,
                    { force: true },
                );
                TestRenderer.act(() => {
                    refetch(
                        { id: '4' },
                        { fetchPolicy: 'network-only', UNSTABLE_renderPolicy: renderPolicy },
                    );
                });

                // Assert we suspend on the second refetch request
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery2,
                    refetchVariables: refetchVariables2,
                });

                // Switch back to initial refetch
                environment.retain.mockClear();
                TestRenderer.act(() => {
                    refetch(
                        { id: '1' },
                        { fetchPolicy: 'network-only', UNSTABLE_renderPolicy: renderPolicy },
                    );
                });

                // Mock response for second refetch request
                TestRenderer.act(() => {
                    environment.mock.resolve(refetchQuery2, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '4',
                                name: 'Mark',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                                username: 'usermark',
                            },
                        },
                    });
                });

                // Assert that we are still suspended the initial refetch request
                // since that one hasn't resolved and that's the latest one we want
                // to render
                expectFragmentIsRefetching(renderer, {
                    refetchQuery: refetchQuery1,
                    refetchVariables: refetchVariables1,
                });

                // Mock response for initial refetch request
                TestRenderer.act(() => {
                    environment.mock.resolve(refetchQuery1, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '1',
                                name: 'User 1',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                                username: 'user1',
                            },
                        },
                    });
                });

                // Assert component is rendered with data from second request
                const refetchedUser = {
                    id: '1',
                    name: 'User 1',
                    profile_picture: { uri: 'scale16' },
                    ...createFragmentRef('1', refetchQuery1),
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                expect(fetchSpy).toBeCalledTimes(3);
            });

            it('does not dispose ongoing request if refetch is called again', () => {
                const renderer = renderFragment();
                renderSpy.mockClear();
                TestRenderer.act(() => {
                    refetch(
                        { id: '1' },
                        {
                            fetchPolicy: 'store-and-network',
                            UNSTABLE_renderPolicy: renderPolicy,
                        },
                    );
                });

                // Assert request is started
                const refetchVariables1 = { id: '1', scale: 16 };
                const refetchQuery1 = createOperationDescriptor(
                    gqlRefetchQuery,
                    refetchVariables1,
                    { force: true },
                );
                expectRequestIsInFlight({
                    inFlight: true,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables: refetchVariables1,
                });

                // Component renders immediately even though request is in flight
                // since data is cached
                const refetchingUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', refetchQuery1),
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchingUser }]);

                // Call refetch a second time
                environment.execute.mockClear();
                const refetchVariables2 = { id: '4', scale: 16 };
                TestRenderer.act(() => {
                    refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                });

                // Assert first request is not canceled
                expectRequestIsInFlight({
                    inFlight: true,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables: refetchVariables1,
                });

                // Assert second request is started
                expectRequestIsInFlight({
                    inFlight: true,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables: refetchVariables2,
                });
                // Assert component suspended
                expect(renderSpy).toBeCalledTimes(0);
                expect(renderer.toJSON()).toEqual('Fallback');

                expect(fetchSpy).toBeCalledTimes(2);
            });
            */
        });

        describe('fetchPolicy', () => {
            describe('store-or-network', () => {
                beforeEach(() => {
                    fetchPolicy = 'store-or-network';
                });

                describe('renderPolicy: partial', () => {
                    beforeEach(() => {
                        renderPolicy = 'partial';
                    });
                    it("doesn't start network request if refetch query is fully cached", () => {
                        renderFragment();
                        renderSpy.mockClear();
                        TestRenderer.act(() => {
                            refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert request is not started
                        const refetchVariables = { ...variables };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        expectRequestIsInFlight({
                            inFlight: false,
                            requestCount: 0,
                            gqlRefetchQuery,
                            refetchVariables,
                        });

                        // Assert component renders immediately since data is cached
                        const refetchedUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                            //...createFragmentRef('1', refetchQuery), //original relay
                        };
                        expectFragmentResults([{ data: refetchedUser }]); //original relay
                    });

                    it('starts network request if refetch query is not fully cached and suspends if fragment has missing data', () => {
                        const renderer = renderFragment();
                        const initialUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                        };
                        expectFragmentResults([{ data: initialUser }]);

                        TestRenderer.act(() => {
                            refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert that fragment is refetching with the right variables and
                        // suspends upon refetch
                        const refetchVariables = {
                            id: '4',
                            scale: 16,
                        };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        expectFragmentIsRefetching(renderer, {
                            refetchVariables,
                            refetchQuery,
                        });

                        // Mock network response
                        TestRenderer.act(() => {
                            environment.mock.resolve(gqlRefetchQuery, {
                                data: {
                                    node: {
                                        __typename: 'User',
                                        id: '4',
                                        name: 'Mark',
                                        profile_picture: {
                                            uri: 'scale16',
                                        },
                                        username: 'usermark',
                                    },
                                },
                            });
                        });

                        // Assert fragment is rendered with new data
                        const refetchedUser = {
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            ...createFragmentRef('4', refetchQuery),
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchedUser }]);
                    });

                    it("starts network request if refetch query is not fully cached and doesn't suspend if fragment doesn't have missing data", () => {
                        // Cache user with missing username
                        const refetchVariables = { id: '4', scale: 16 };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        environment.commitPayload(refetchQuery, {
                            node: {
                                __typename: 'User',
                                id: '4',
                                name: 'Mark',
                                profile_picture: null,
                            },
                        });

                        renderFragment();
                        renderSpy.mockClear();
                        TestRenderer.act(() => {
                            refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert request is started
                        expectRequestIsInFlight({
                            inFlight: true,
                            requestCount: 1,
                            gqlRefetchQuery,
                            refetchVariables,
                        });

                        // Assert component renders immediately since data is cached
                        const refetchedUser = {
                            id: '4',
                            name: 'Mark',
                            profile_picture: null,
                            ...createFragmentRef('4', refetchQuery),
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchedUser }]);
                    });
                });

                describe('renderPolicy: full', () => {
                    beforeEach(() => {
                        renderPolicy = 'full';
                    });
                    it("doesn't start network request if refetch query is fully cached", () => {
                        renderFragment();
                        renderSpy.mockClear();
                        TestRenderer.act(() => {
                            refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert request is not started
                        const refetchVariables = { ...variables };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        expectRequestIsInFlight({
                            inFlight: false,
                            requestCount: 0,
                            gqlRefetchQuery,
                            refetchVariables,
                        });

                        // Assert component renders immediately since data is cached
                        const refetchedUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                            //...createFragmentRef('1', refetchQuery), //original relay
                        };
                        expectFragmentResults([{ data: refetchedUser }]); //original relay
                    });

                    it('starts network request if refetch query is not fully cached and suspends if fragment has missing data', () => {
                        const renderer = renderFragment();
                        const initialUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                        };
                        expectFragmentResults([{ data: initialUser }]);

                        TestRenderer.act(() => {
                            refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert that fragment is refetching with the right variables and
                        // suspends upon refetch
                        const refetchVariables = {
                            id: '4',
                            scale: 16,
                        };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        expectFragmentIsRefetching(renderer, {
                            refetchVariables,
                            refetchQuery,
                        });

                        // Mock network response
                        TestRenderer.act(() => {
                            environment.mock.resolve(gqlRefetchQuery, {
                                data: {
                                    node: {
                                        __typename: 'User',
                                        id: '4',
                                        name: 'Mark',
                                        profile_picture: {
                                            uri: 'scale16',
                                        },
                                        username: 'usermark',
                                    },
                                },
                            });
                        });

                        // Assert fragment is rendered with new data
                        const refetchedUser = {
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            ...createFragmentRef('4', refetchQuery),
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchedUser }]);
                    });

                    it("starts network request if refetch query is not fully cached and suspends even if fragment doesn't have missing data", () => {
                        // Cache user with missing username
                        const refetchVariables = { id: '4', scale: 16 };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        environment.commitPayload(refetchQuery, {
                            node: {
                                __typename: 'User',
                                id: '4',
                                name: 'Mark',
                                profile_picture: null,
                            },
                        });

                        const renderer = renderFragment();
                        const initialUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                        };
                        expectFragmentResults([{ data: initialUser }]);

                        TestRenderer.act(() => {
                            refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        expectFragmentIsRefetching(renderer, {
                            refetchVariables,
                            refetchQuery,
                        });

                        // Mock network response
                        TestRenderer.act(() => {
                            environment.mock.resolve(gqlRefetchQuery, {
                                data: {
                                    node: {
                                        __typename: 'User',
                                        id: '4',
                                        name: 'Mark',
                                        profile_picture: {
                                            uri: 'scale16',
                                        },
                                        username: 'usermark',
                                    },
                                },
                            });
                        });

                        // Assert fragment is rendered with new data
                        const refetchedUser = {
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            ...createFragmentRef('4', refetchQuery),
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchedUser }]);
                    });
                });
            });

            describe('store-and-network', () => {
                beforeEach(() => {
                    fetchPolicy = 'store-and-network';
                });

                describe('renderPolicy: partial', () => {
                    beforeEach(() => {
                        renderPolicy = 'partial';
                    });

                    it('starts network request if refetch query is fully cached', () => {
                        renderFragment();
                        renderSpy.mockClear();
                        TestRenderer.act(() => {
                            refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert request is not started
                        const refetchVariables = { ...variables };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        expectRequestIsInFlight({
                            inFlight: true,
                            requestCount: 1,
                            gqlRefetchQuery,
                            refetchVariables,
                        });

                        // Assert component renders immediately since data is cached
                        const refetchingUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                            //...createFragmentRef('1', refetchQuery), //original relay
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchingUser }]);
                    });

                    it('starts network request if refetch query is not fully cached and suspends if fragment has missing data', () => {
                        const renderer = renderFragment();
                        const initialUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                        };
                        expectFragmentResults([{ data: initialUser }]);

                        TestRenderer.act(() => {
                            refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert that fragment is refetching with the right variables and
                        // suspends upon refetch
                        const refetchVariables = {
                            id: '4',
                            scale: 16,
                        };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        expectFragmentIsRefetching(renderer, {
                            refetchVariables,
                            refetchQuery,
                        });
                        // Mock network response
                        TestRenderer.act(() => {
                            environment.mock.resolve(gqlRefetchQuery, {
                                data: {
                                    node: {
                                        __typename: 'User',
                                        id: '4',
                                        name: 'Mark',
                                        profile_picture: {
                                            uri: 'scale16',
                                        },
                                        username: 'usermark',
                                    },
                                },
                            });
                        });

                        // Assert fragment is rendered with new data
                        const refetchedUser = {
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            ...createFragmentRef('4', refetchQuery),
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchedUser }]);
                    });

                    it("starts network request if refetch query is not fully cached and doesn't suspend if fragment doesn't have missing data", () => {
                        // Cache user with missing username
                        const refetchVariables = { id: '4', scale: 16 };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        environment.commitPayload(refetchQuery, {
                            node: {
                                __typename: 'User',
                                id: '4',
                                name: 'Mark',
                                profile_picture: null,
                            },
                        });

                        renderFragment();
                        renderSpy.mockClear();
                        TestRenderer.act(() => {
                            refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert request is started
                        expectRequestIsInFlight({
                            inFlight: true,
                            requestCount: 1,
                            gqlRefetchQuery,
                            refetchVariables,
                        });

                        // Assert component renders immediately since data is cached
                        const refetchingUser = {
                            id: '4',
                            name: 'Mark',
                            profile_picture: null,
                            ...createFragmentRef('4', refetchQuery),
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchingUser }]);
                    });
                });

                describe('renderPolicy: full', () => {
                    beforeEach(() => {
                        renderPolicy = 'full';
                    });

                    it('starts network request if refetch query is fully cached', () => {
                        renderFragment();
                        renderSpy.mockClear();
                        TestRenderer.act(() => {
                            refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert request is not started
                        const refetchVariables = { ...variables };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        expectRequestIsInFlight({
                            inFlight: true,
                            requestCount: 1,
                            gqlRefetchQuery,
                            refetchVariables,
                        });

                        // Assert component renders immediately since data is cached
                        const refetchingUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                            //...createFragmentRef('1', refetchQuery), //original relay
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchingUser }]);
                    });

                    it('starts network request if refetch query is not fully cached and suspends if fragment has missing data', () => {
                        const renderer = renderFragment();
                        const initialUser = {
                            id: '1',
                            name: 'Alice',
                            profile_picture: null,
                            ...createFragmentRef('1', query),
                        };
                        expectFragmentResults([{ data: initialUser }]);

                        TestRenderer.act(() => {
                            refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert that fragment is refetching with the right variables and
                        // suspends upon refetch
                        const refetchVariables = {
                            id: '4',
                            scale: 16,
                        };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        expectFragmentIsRefetching(renderer, {
                            refetchVariables,
                            refetchQuery,
                        });

                        // Mock network response
                        TestRenderer.act(() => {
                            environment.mock.resolve(gqlRefetchQuery, {
                                data: {
                                    node: {
                                        __typename: 'User',
                                        id: '4',
                                        name: 'Mark',
                                        profile_picture: {
                                            uri: 'scale16',
                                        },
                                        username: 'usermark',
                                    },
                                },
                            });
                        });

                        // Assert fragment is rendered with new data
                        const refetchedUser = {
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            ...createFragmentRef('4', refetchQuery),
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchedUser }]);
                    });

                    it("starts network request if refetch query is not fully cached and doesn't suspend if fragment doesn't have missing data", () => {
                        // Cache user with missing username
                        const refetchVariables = { id: '4', scale: 16 };
                        refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, { force: true });
                        environment.commitPayload(refetchQuery, {
                            node: {
                                __typename: 'User',
                                id: '4',
                                name: 'Mark',
                                profile_picture: null,
                            },
                        });

                        const renderer = renderFragment();
                        renderSpy.mockClear();
                        TestRenderer.act(() => {
                            refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                        });

                        // Assert component suspended
                        expectFragmentIsRefetching(renderer, {
                            refetchVariables,
                            refetchQuery,
                        });

                        // Mock network response
                        TestRenderer.act(() => {
                            environment.mock.resolve(gqlRefetchQuery, {
                                data: {
                                    node: {
                                        __typename: 'User',
                                        id: '4',
                                        name: 'Mark',
                                        profile_picture: {
                                            uri: 'scale16',
                                        },
                                        username: 'usermark',
                                    },
                                },
                            });
                        });

                        // Assert fragment is rendered with new data
                        const refetchedUser = {
                            id: '4',
                            name: 'Mark',
                            profile_picture: {
                                uri: 'scale16',
                            },
                            ...createFragmentRef('4', refetchQuery),
                        };
                        // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                        expectFragmentResults([{ data: refetchedUser }]);
                    });
                });
            });

            describe('network-only', () => {
                beforeEach(() => {
                    fetchPolicy = 'network-only';
                });

                it('starts network request and suspends if refetch query is fully cached', () => {
                    const renderer = renderFragment();
                    const initialUser = {
                        id: '1',
                        name: 'Alice',
                        profile_picture: null,
                        ...createFragmentRef('1', query),
                    };
                    expectFragmentResults([{ data: initialUser }]);

                    TestRenderer.act(() => {
                        refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                    });

                    // Assert that fragment is refetching with the right variables and
                    // suspends upon refetch
                    const refetchVariables = {
                        ...variables,
                    };
                    refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                        force: true,
                    });
                    expectFragmentIsRefetching(renderer, {
                        refetchVariables,
                        refetchQuery,
                    });

                    // Mock network response
                    TestRenderer.act(() => {
                        environment.mock.resolve(gqlRefetchQuery, {
                            data: {
                                node: {
                                    __typename: 'User',
                                    id: '1',
                                    name: 'Alice Update',
                                    profile_picture: null,
                                    username: 'useralice',
                                },
                            },
                        });
                    });

                    // Assert fragment is rendered with new data
                    const refetchedUser = {
                        ...initialUser,
                        ...createFragmentRef('1', query), // original relay refetchQuery
                        name: 'Alice Update',
                    };
                    // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                    expectFragmentResults([{ data: refetchedUser }]);
                });

                it('starts network request and suspends if refetch query is not fully cached', () => {
                    const renderer = renderFragment();
                    const initialUser = {
                        id: '1',
                        name: 'Alice',
                        profile_picture: null,
                        ...createFragmentRef('1', query),
                    };
                    expectFragmentResults([{ data: initialUser }]);

                    TestRenderer.act(() => {
                        refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                    });

                    // Assert that fragment is refetching with the right variables and
                    // suspends upon refetch
                    const refetchVariables = {
                        id: '4',
                        scale: 16,
                    };
                    refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                        force: true,
                    });
                    expectFragmentIsRefetching(renderer, {
                        refetchVariables,
                        refetchQuery,
                    });

                    // Mock network response
                    TestRenderer.act(() => {
                        environment.mock.resolve(gqlRefetchQuery, {
                            data: {
                                node: {
                                    __typename: 'User',
                                    id: '4',
                                    name: 'Mark',
                                    profile_picture: {
                                        uri: 'scale16',
                                    },
                                    username: 'usermark',
                                },
                            },
                        });
                    });

                    // Assert fragment is rendered with new data
                    const refetchedUser = {
                        id: '4',
                        name: 'Mark',
                        profile_picture: {
                            uri: 'scale16',
                        },
                        ...createFragmentRef('4', refetchQuery),
                    };
                    // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                    expectFragmentResults([{ data: refetchedUser }]);
                });
            });

            describe('store-only', () => {
                beforeEach(() => {
                    fetchPolicy = 'store-only';
                });

                it("doesn't start network request if refetch query is fully cached", () => {
                    renderFragment();
                    renderSpy.mockClear();
                    TestRenderer.act(() => {
                        refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                    });

                    // Assert request is not started
                    const refetchVariables = { ...variables };
                    refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                        force: true,
                    });
                    expectRequestIsInFlight({
                        inFlight: false,
                        requestCount: 0,
                        gqlRefetchQuery,
                        refetchVariables,
                    });

                    // Assert component renders immediately since data is cached
                    const refetchingUser = {
                        id: '1',
                        name: 'Alice',
                        profile_picture: null,
                        ...createFragmentRef('1', query),
                        //...createFragmentRef('1', refetchQuery), //original relay
                    };
                    expectFragmentResults([{ data: refetchingUser }]); // original relay
                });

                it("doesn't start network request if refetch query is not fully cached", () => {
                    renderFragment();
                    renderSpy.mockClear();
                    TestRenderer.act(() => {
                        refetch({ id: '4' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                    });

                    // Assert request is not started
                    const refetchVariables = { id: '4', scale: 32 };
                    refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                        force: true,
                    });
                    expectRequestIsInFlight({
                        inFlight: false,
                        requestCount: 0,
                        gqlRefetchQuery,
                        refetchVariables,
                    });

                    // Assert component renders immediately with empty daa
                    //expectFragmentResults([{ data: null }, { data: null }]); original relay
                    expectFragmentResults([{ data: null }]);
                });
            });
        });

        describe('disposing', () => {
            const fetchPolicy = 'store-and-network';

            afterEach(() => {
                jest.dontMock('relay-runtime');
            });
            /*
            it('disposes ongoing request if environment changes', () => {
                renderFragment();
                renderSpy.mockClear();
                TestRenderer.act(() => {
                    refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                });

                // Assert request is started
                const refetchVariables = { id: '1', scale: 16 };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectRequestIsInFlight({
                    inFlight: true,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });

                // Component renders immediately even though request is in flight
                // since data is cached
                const refetchingUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', refetchQuery),
                };

                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchingUser }]);

                // Set new environment
                const newEnvironment = createMockEnvironment();
                newEnvironment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice in a different env',
                        username: 'useralice',
                        profile_picture: null,
                    },
                });
                TestRenderer.act(() => {
                    setEnvironment(newEnvironment);
                });

                // Assert request was canceled
                expect(unsubscribe).toBeCalledTimes(1);
                expectRequestIsInFlight({
                    inFlight: false,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });

                // Assert newly rendered data
                const expectedUser = {
                    id: '1',
                    name: 'Alice in a different env',
                    profile_picture: null,
                    ...createFragmentRef('1', query),
                };
                expectFragmentResults([
                    { data: expectedUser },
                    { data: expectedUser },
                    { data: expectedUser },
                ]);
            });
*/
            it('disposes ongoing request if fragment ref changes', () => {
                renderFragment();
                renderSpy.mockClear();
                TestRenderer.act(() => {
                    refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                });

                // Assert request is started
                const refetchVariables = { id: '1', scale: 16 };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectRequestIsInFlight({
                    inFlight: true,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });

                // Component renders immediately even though request is in flight
                // since data is cached
                const refetchingUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', query),
                    //...createFragmentRef('1', newQuery), original relay
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchingUser }]);

                // Pass new parent fragment ref with different variables
                const newVariables = { ...variables, scale: 32 };
                const newQuery = createOperationDescriptor(gqlQuery, newVariables, {
                    force: true,
                });
                environment.commitPayload(newQuery, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        username: 'useralice',
                        profile_picture: {
                            uri: 'uri32',
                        },
                    },
                });
                TestRenderer.act(() => {
                    setOwner(newQuery);
                });

                // Assert request was canceled
                expect(unsubscribe).toBeCalledTimes(1);
                expectRequestIsInFlight({
                    inFlight: false,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });

                // Assert newly rendered data
                const expectedUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: {
                        uri: 'uri32',
                    },
                    ...createFragmentRef('1', newQuery),
                };
                /*expectFragmentResults([ original relay
                { data: expectedUser },
                //{ data: expectedUser },
                { data: expectedUser },
            ]);*/

                expectFragmentResults([{ data: expectedUser }]);
            });

            it('disposes of ongoing request on unmount when refetch suspends', () => {
                const renderer = renderFragment();
                renderSpy.mockClear();
                TestRenderer.act(() => {
                    refetch({ id: '2' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                });

                // Assert request is started
                const refetchVariables = { id: '2', scale: 16 };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });

                expectFragmentIsRefetching(renderer, {
                    refetchVariables,
                    refetchQuery,
                });

                TestRenderer.act(() => {
                    renderer.unmount();
                });

                // Assert request was canceled
                expect(unsubscribe).toBeCalledTimes(1);
                expectRequestIsInFlight({
                    inFlight: false,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });
            });

            it('disposes of ongoing request on unmount when refetch does not suspend', () => {
                const renderer = renderFragment();
                renderSpy.mockClear();
                TestRenderer.act(() => {
                    refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                });

                // Assert request is started
                const refetchVariables = { id: '1', scale: 16 };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectRequestIsInFlight({
                    inFlight: true,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });

                // Component renders immediately even though request is in flight
                // since data is cached
                const refetchingUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', query),
                    //...createFragmentRef('1', refetchQuery), original relay
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchingUser }]);

                TestRenderer.act(() => {
                    renderer.unmount();
                });

                // Assert request was canceled
                expect(unsubscribe).toBeCalledTimes(1); // original relay 2
                expectRequestIsInFlight({
                    inFlight: false,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });
            });

            it('disposes ongoing request if it is manually disposed', () => {
                renderFragment();
                renderSpy.mockClear();
                let disposable;
                TestRenderer.act(() => {
                    disposable = refetch({ id: '1' }, { fetchPolicy, UNSTABLE_renderPolicy: renderPolicy });
                });

                // Assert request is started
                const refetchVariables = { id: '1', scale: 16 };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectRequestIsInFlight({
                    inFlight: true,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });

                // Component renders immediately even though request is in flight
                // since data is cached
                const refetchingUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', query),
                    //...createFragmentRef('1', refetchQuery), original relay
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchingUser }]);

                disposable && disposable.dispose();

                // Assert request was canceled
                expect(unsubscribe).toBeCalledTimes(1);
                expectRequestIsInFlight({
                    inFlight: false,
                    requestCount: 1,
                    gqlRefetchQuery,
                    refetchVariables,
                });
            });
        });

        describe('refetching @fetchable types', () => {
            beforeEach(() => {
                gqlFragment = getFragment(graphql`
                    fragment useRefetchableFragmentTest1Fragment on NonNodeStory
                    @refetchable(queryName: "useRefetchableFragmentTest1FragmentRefetchQuery") {
                        actor {
                            name
                        }
                    }
                `);

                gqlQuery = getRequest(graphql`
                    query useRefetchableFragmentTest1Query($id: ID!) {
                        nonNodeStory(id: $id) {
                            ...useRefetchableFragmentTest1Fragment
                        }
                    }
                `);

                variables = { id: 'a' };
                gqlRefetchQuery =
                    require('./__generated__/useRefetchableFragmentTest1FragmentRefetchQuery.graphql').default;
                invariant(
                    areEqual(gqlFragment.metadata?.refetch?.operation, gqlRefetchQuery),
                    'useRefetchableFragment-test: Expected refetchable fragment metadata to contain operation.',
                );

                refetchQuery = createOperationDescriptor(gqlRefetchQuery, variables, {
                    force: true,
                });
                query = createOperationDescriptor(gqlQuery, variables, { force: true });

                environment.commitPayload(query, {
                    nonNodeStory: {
                        __typename: 'NonNodeStory',
                        id: 'a',
                        actor: { name: 'Alice', __typename: 'User', id: '1' },
                        fetch_id: 'fetch:a',
                    },
                });
            });

            it('refetches new variables correctly when refetching new id', () => {
                const renderer = renderFragment();
                const initialUser = {
                    actor: { name: 'Alice' },
                    fetch_id: 'fetch:a',
                };
                expectFragmentResults([
                    {
                        data: initialUser,
                    },
                ]);

                TestRenderer.act(() => {
                    refetch({ id: 'fetch:b' });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    id: 'fetch:b',
                };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    refetchVariables,
                    refetchQuery,
                });

                // Mock network response
                TestRenderer.act(() => {
                    environment.mock.resolve(gqlRefetchQuery, {
                        data: {
                            fetch__NonNodeStory: {
                                __typename: 'NonNodeStory',
                                id: 'b',
                                actor: { name: 'Mark', __typename: 'User', id: '4' },
                                fetch_id: 'fetch:b',
                            },
                        },
                    });
                });

                // Assert fragment is rendered with new data
                const refetchedUser = {
                    actor: { name: 'Mark' },
                    fetch_id: 'fetch:b',
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                // Assert refetch query was retained
                expect(release).not.toBeCalled();
                expect(environment.retain).toBeCalledTimes(1);
                expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
            });

            it('refetches new variables correctly when refetching same id', () => {
                const renderer = renderFragment();
                const initialUser = {
                    actor: { name: 'Alice' },
                    fetch_id: 'fetch:a',
                };
                expectFragmentResults([
                    {
                        data: initialUser,
                    },
                ]);

                TestRenderer.act(() => {
                    refetch({}, { fetchPolicy: 'network-only' });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    id: 'fetch:a',
                };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    refetchVariables,
                    refetchQuery,
                });

                // Mock network response
                TestRenderer.act(() => {
                    environment.mock.resolve(gqlRefetchQuery, {
                        data: {
                            fetch__NonNodeStory: {
                                __typename: 'NonNodeStory',
                                id: 'a',
                                actor: { name: 'Alice (updated)', __typename: 'User', id: '1' },
                                fetch_id: 'fetch:a',
                            },
                        },
                    });
                });

                // Assert fragment is rendered with new data
                const refetchedUser = {
                    actor: { name: 'Alice (updated)' },
                    fetch_id: 'fetch:a',
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                // Assert refetch query was retained
                expect(release).not.toBeCalled();
                expect(environment.retain).toBeCalledTimes(1);
                expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
            });

            it('refetches new variables correctly when refetching after the id from the parent has changed', () => {
                // add data for second query
                const query2 = createOperationDescriptor(
                    gqlQuery,
                    {
                        id: 'b',
                    },
                    { force: true },
                );
                environment.commitPayload(query2, {
                    nonNodeStory: {
                        __typename: 'NonNodeStory',
                        id: 'b',
                        actor: { name: 'Zuck', __typename: 'User', id: '4' },
                        fetch_id: 'fetch:b',
                    },
                });

                const renderer = renderFragment();
                const initialUser = {
                    actor: { name: 'Alice' },
                    fetch_id: 'fetch:a',
                };
                expectFragmentResults([
                    {
                        data: initialUser,
                    },
                ]);

                TestRenderer.act(() => {
                    setOwner(query2);
                });

                const nextUser = {
                    actor: { name: 'Zuck' },
                    fetch_id: 'fetch:b',
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: nextUser }]);
                TestRenderer.act(() => {
                    refetch({}, { fetchPolicy: 'network-only' });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    id: 'fetch:b',
                };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    refetchVariables,
                    refetchQuery,
                });

                // Mock network response
                TestRenderer.act(() => {
                    environment.mock.resolve(gqlRefetchQuery, {
                        data: {
                            fetch__NonNodeStory: {
                                __typename: 'NonNodeStory',
                                id: 'b',
                                actor: { name: 'Zuck (updated)', __typename: 'User', id: '4' },
                                fetch_id: 'fetch:b',
                            },
                        },
                    });
                });

                // Assert fragment is rendered with new data
                const refetchedUser = {
                    actor: { name: 'Zuck (updated)' },
                    fetch_id: 'fetch:b',
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                // Assert refetch query was retained
                expect(release).not.toBeCalled();
                expect(environment.retain).toBeCalledTimes(1);
                expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
            });
        });

        describe('when id variable has a different variable name in original query', () => {
            beforeEach(() => {
                graphql`
                    fragment useRefetchableFragmentTest2Fragment on User {
                        username
                    }
                `;
                gqlFragment = getFragment(graphql`
                    fragment useRefetchableFragmentTest3Fragment on User
                    @refetchable(queryName: "useRefetchableFragmentTest3FragmentRefetchQuery") {
                        id
                        name
                        profile_picture(scale: $scale) {
                            uri
                        }
                        ...useRefetchableFragmentTest2Fragment
                    }
                `);
                gqlQuery = getRequest(graphql`
                    query useRefetchableFragmentTest2Query($nodeID: ID!, $scale: Float!) {
                        node(id: $nodeID) {
                            ...useRefetchableFragmentTest3Fragment
                        }
                    }
                `);
                gqlRefetchQuery =
                    require('./__generated__/useRefetchableFragmentTest3FragmentRefetchQuery.graphql').default;
                variables = { nodeID: '1', scale: 16 };
                invariant(
                    areEqual(gqlFragment.metadata?.refetch?.operation, gqlRefetchQuery),
                    'useRefetchableFragment-test: Expected refetchable fragment metadata to contain operation.',
                );

                query = createOperationDescriptor(gqlQuery, variables, { force: true });
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, variables, {
                    force: true,
                });

                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        username: 'useralice',
                        profile_picture: null,
                    },
                });
            });

            it('refetches new variables correctly when refetching new id', () => {
                const renderer = renderFragment();
                const initialUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', query, false, 'useRefetchableFragmentTest2Fragment'),
                };
                expectFragmentResults([
                    {
                        data: initialUser,
                    },
                ]);

                TestRenderer.act(() => {
                    refetch({ id: '4' });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    id: '4',
                    scale: 16,
                };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    refetchVariables,
                    refetchQuery,
                });

                // Mock network response
                TestRenderer.act(() => {
                    environment.mock.resolve(gqlRefetchQuery, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '4',
                                name: 'Mark',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                                username: 'usermark',
                            },
                        },
                    });
                });

                // Assert fragment is rendered with new data
                const refetchedUser = {
                    id: '4',
                    name: 'Mark',
                    profile_picture: {
                        uri: 'scale16',
                    },
                    ...createFragmentRef('4', refetchQuery, false, 'useRefetchableFragmentTest2Fragment'),
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                // Assert refetch query was retained
                expect(release).not.toBeCalled();
                expect(environment.retain).toBeCalledTimes(1);
                expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
            });

            it('refetches new variables correctly when refetching same id', () => {
                const renderer = renderFragment();
                const initialUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', query, false, 'useRefetchableFragmentTest2Fragment'),
                };
                expectFragmentResults([
                    {
                        data: initialUser,
                    },
                ]);

                TestRenderer.act(() => {
                    refetch({ scale: 32 });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    id: '1',
                    scale: 32,
                };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    refetchVariables,
                    refetchQuery,
                });

                // Mock network response
                TestRenderer.act(() => {
                    environment.mock.resolve(gqlRefetchQuery, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '1',
                                name: 'Alice',
                                profile_picture: {
                                    uri: 'scale32',
                                },
                                username: 'useralice',
                            },
                        },
                    });
                });

                // Assert fragment is rendered with new data
                const refetchedUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: {
                        uri: 'scale32',
                    },
                    ...createFragmentRef('1', refetchQuery, false, 'useRefetchableFragmentTest2Fragment'),
                };
                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                // Assert refetch query was retained
                expect(release).not.toBeCalled();
                expect(environment.retain).toBeCalledTimes(1);
                expect(environment.retain.mock.calls[0][0]).toEqual(refetchQuery);
            });
        });

        describe('internal environment option', () => {
            let newRelease;
            let newEnvironment;

            beforeEach(() => {
                ({ createMockEnvironment } = require('relay-test-utils-internal'));
                newEnvironment = createMockEnvironment();
                newRelease = jest.fn();
                newEnvironment.retain.mockImplementation((...args) => {
                    return {
                        dispose: newRelease,
                    };
                });
            });
            /*
            it('reloads new data into new environment, and renders successfully', () => {
                const renderer = renderFragment();
                const initialUser = {
                    id: '1',
                    name: 'Alice',
                    profile_picture: null,
                    ...createFragmentRef('1', query),
                };
                // initial data on default environment
                expectFragmentResults([{ data: initialUser }]);

                TestRenderer.act(() => {
                    refetch(
                        { id: '1' },
                        {
                            __environment: newEnvironment,
                        },
                    );
                });
                const refetchVariables = {
                    id: '1',
                    scale: 16,
                };
                refetchQuery = createOperationDescriptor(gqlRefetchQuery, refetchVariables, {
                    force: true,
                });

                // Fetch on newEnvironment
                expectFragmentIsRefetching(
                    renderer,
                    {
                        refetchVariables,
                        refetchQuery,
                    },
                    newEnvironment,
                );

                TestRenderer.act(() => {
                    newEnvironment.mock.resolve(gqlRefetchQuery, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '1',
                                name: 'Mark',
                                username: 'usermark',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                            },
                        },
                    });
                });
                TestRenderer.act(() => jest.runAllImmediates());

                // Data should be loaded on the newEnvironment
                const dataInSource = {
                    __id: '1',
                    __typename: 'User',
                    'profile_picture(scale:16)': {
                        __ref: 'client:1:profile_picture(scale:16)',
                    },
                    id: '1',
                    name: 'Mark',
                    username: 'usermark',
                };
                const source = newEnvironment.getStore().getSource();
                expect(source.get('1')).toEqual(dataInSource);

                // Assert refetch query was retained
                expect(newRelease).not.toBeCalled();
                expect(newEnvironment.retain).toBeCalledTimes(1);
                expect(newEnvironment.retain.mock.calls[0][0]).toEqual(refetchQuery);

                // Should be able to use the new data if switched to new environment
                renderSpy.mockClear();
                newRelease.mockClear();
                TestRenderer.act(() => {
                    setEnvironment(newEnvironment);
                });
                // refetch on the same newEnvironment after switching should not be reset
                expect(release).not.toBeCalled();

                const refetchedUser = {
                    id: '1',
                    name: 'Mark',
                    profile_picture: {
                        uri: 'scale16',
                    },
                    ...createFragmentRef('1', refetchQuery),
                };

                // expectFragmentResults([{ data: refetchedUser }, { data: refetchedUser }]); original relay
                expectFragmentResults([{ data: refetchedUser }]);

                // Refetch on another enironment afterwards should work
                renderSpy.mockClear();
                environment.execute.mockClear();
                const anotherNewEnvironment = createMockEnvironment();
                TestRenderer.act(() => jest.runAllImmediates());

                TestRenderer.act(() => {
                    refetch(
                        { id: '1' },
                        {
                            __environment: anotherNewEnvironment,
                        },
                    );
                });
                expectFragmentIsRefetching(
                    renderer,
                    {
                        refetchVariables,
                        refetchQuery,
                    },
                    anotherNewEnvironment,
                );

                TestRenderer.act(() => {
                    anotherNewEnvironment.mock.resolve(gqlRefetchQuery, {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '1',
                                name: 'Mark',
                                username: 'usermark',
                                profile_picture: {
                                    uri: 'scale16',
                                },
                            },
                        },
                    });
                });
                expect(
                    anotherNewEnvironment
                        .getStore()
                        .getSource()
                        .get('1'),
                ).toEqual(dataInSource);
            });*/
        });
    });
});
