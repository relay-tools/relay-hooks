/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable max-len */
/* eslint-disable no-duplicate-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/camelcase */
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
jest.mock('fbjs/lib/warning', () => {
    const f: any = jest.fn();
    f.default = jest.fn();
    return f;
});

const unsubscribe = jest.fn();
jest.doMock('relay-runtime', () => {
    const originalRuntime = jest.requireActual('relay-runtime');
    const originalInternal = originalRuntime.__internal;
    return {
        ...originalRuntime,
        __internal: {
            ...originalInternal,
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

import * as invariant from 'fbjs/lib/invariant';
import * as areEqual from 'fbjs/lib/areEqual';

import * as React from 'react';

import { useMemo, useState } from 'react';
import * as TestRenderer from 'react-test-renderer';
import {
    getFragment,
    getRequest,
    graphql,
    OperationDescriptor,
    Variables,
    Network,
    Observable,
    RecordSource,
    Store,
} from 'relay-runtime';
import {
    ConnectionHandler,
    FRAGMENT_OWNER_KEY,
    FRAGMENTS_KEY,
    ID_KEY,
    createOperationDescriptor,
    CacheConfig,
    RequestParameters,
    Environment,
} from 'relay-runtime';
import { ReactRelayContext, usePaginationFragment as usePaginationFragmentOriginal } from '../src';
const warning = require('fbjs/lib/warning');

type Direction = 'forward' | 'backward';

describe('usePaginationFragment', () => {
    let environment;
    let initialUser;
    let gqlQuery;
    let gqlQueryNestedFragment;
    let gqlQueryWithoutID;
    let gqlQueryWithLiteralArgs;
    let gqlQueryWithStreaming;
    let gqlPaginationQuery;
    let gqlPaginationQueryWithStreaming;
    let gqlFragment;
    let gqlFragmentWithStreaming;
    let query;
    let queryNestedFragment;
    let queryWithoutID;
    let queryWithLiteralArgs;
    let queryWithStreaming;
    let paginationQuery;
    let variables;
    let variablesNestedFragment;
    let variablesWithoutID;
    let setEnvironment;
    let setOwner;
    let renderFragment;
    let renderSpy;
    let generateAndCompile;
    let loadNext;
    let refetch;
    let Renderer;
    let dataSource;
    let unsubscribe;
    let fetch;

    function resolveQuery(payload: any) {
        TestRenderer.act(() => {
            dataSource.next(payload);
        });

        TestRenderer.act(() => {
            dataSource.complete();
        });
    }

    function createMockEnvironment() {
        const source = RecordSource.create();
        const store = new Store(source);
        const fetchFn = jest.fn((_query: RequestParameters, _variables: Variables, _cacheConfig: CacheConfig) => {
            return Observable.create((sink: any) => {
                dataSource = sink;
                unsubscribe = jest.fn<[], any>();
                // $FlowFixMe[incompatible-call]
                return unsubscribe;
            });
        });
        const environment = new Environment({
            getDataID: (data: any, typename: string) => {
                // This is the default, but making it explicit in case we need to override
                return data.id;
            },
            // $FlowFixMe[invalid-tuple-arity] Error found while enabling LTI on this file
            // $FlowFixMe[incompatible-call] error found when enabling Flow LTI mode
            network: Network.create(fetchFn),
            store,
            handlerProvider: (_name) => {
                return ConnectionHandler;
            },
        });
        // $FlowFixMe[method-unbinding]
        const originalRetain = environment.retain;
        // $FlowFixMe[cannot-write]
        environment.retain = jest.fn((...args: any) => originalRetain.apply(environment, args));
        return [environment, fetchFn];
    }

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

    function usePaginationFragment(fragmentNode, fragmentRef) {
        const { data, ...result } = usePaginationFragmentOriginal(fragmentNode, fragmentRef);
        loadNext = result.loadNext;
        refetch = result.refetch;
        renderSpy(data, result);
        return { data, ...result };
    }

    function assertCall(expected, idx) {
        const actualData = renderSpy.mock.calls[idx][0];
        const actualResult = renderSpy.mock.calls[idx][1];
        const actualIsLoadingNext = actualResult.isLoadingNext;
        const actualIsLoadingPrevious = actualResult.isLoadingPrevious;
        const actualHasNext = actualResult.hasNext;
        const actualHasPrevious = actualResult.hasPrevious;
        const actualErrorNext = actualResult.errorNext;
        expect(actualData).toEqual(expected.data);
        expect(actualIsLoadingNext).toEqual(expected.isLoadingNext);
        expect(actualIsLoadingPrevious).toEqual(expected.isLoadingPrevious);
        expect(actualHasNext).toEqual(expected.hasNext);
        expect(actualHasPrevious).toEqual(expected.hasPrevious);
        expected.errorNext && expect(actualErrorNext).toEqual(expected.errorNext);
    }

    function expectFragmentResults(
        expectedCalls: ReadonlyArray<{
            data: any;
            isLoadingNext: boolean;
            isLoadingPrevious: boolean;
            hasNext: boolean;
            hasPrevious: boolean;
            errorNext?: Error | null;
        }>,
    ) {
        // This ensures that useEffect runs
        TestRenderer.act(() => jest.runAllImmediates());
        expect(renderSpy).toBeCalledTimes(expectedCalls.length);
        expectedCalls.forEach((expected, idx) => assertCall(expected, idx));
        renderSpy.mockClear();
    }

    function createFragmentRef(id, owner) {
        return {
            [ID_KEY]: id,
            [FRAGMENTS_KEY]: {
                usePaginationFragmentTestNestedUserFragment: {},
            },
            [FRAGMENT_OWNER_KEY]: owner.request,
        };
    }

    beforeEach(() => {
        // Set up mocks
        jest.resetModules();
        jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
        renderSpy = jest.fn();

        //({ createMockEnvironment } = require('relay-test-utils-internal'));

        // Set up environment and base data
        //TestRenderer.act(() => {
        [environment, fetch] = createMockEnvironment();
        //});
        graphql`
            fragment usePaginationFragmentTestNestedUserFragment on User {
                username
            }
        `;
        gqlFragment = getFragment(graphql`
            fragment usePaginationFragmentTestUserFragment on User
            @refetchable(queryName: "usePaginationFragmentTestUserFragmentPaginationQuery")
            @argumentDefinitions(
                isViewerFriendLocal: { type: "Boolean", defaultValue: false }
                orderby: { type: "[String]" }
                scale: { type: "Float" }
            ) {
                id
                name
                friends(
                    after: $after
                    first: $first
                    before: $before
                    last: $last
                    orderby: $orderby
                    isViewerFriend: $isViewerFriendLocal
                    scale: $scale
                ) @connection(key: "UserFragment_friends", filters: ["orderby", "isViewerFriend"]) {
                    edges {
                        node {
                            id
                            name
                            ...usePaginationFragmentTestNestedUserFragment
                        }
                    }
                }
            }
        `);
        gqlFragmentWithStreaming = getFragment(graphql`
            fragment usePaginationFragmentTestUserFragmentWithStreaming on User
            @refetchable(queryName: "usePaginationFragmentTestUserFragmentStreamingPaginationQuery")
            @argumentDefinitions(
                isViewerFriendLocal: { type: "Boolean", defaultValue: false }
                orderby: { type: "[String]" }
                scale: { type: "Float" }
            ) {
                id
                name
                friends(
                    after: $after
                    first: $first
                    before: $before
                    last: $last
                    orderby: $orderby
                    isViewerFriend: $isViewerFriendLocal
                    scale: $scale
                )
                    @stream_connection(
                        initial_count: 1
                        key: "UserFragment_friends"
                        filters: ["orderby", "isViewerFriend"]
                    ) {
                    edges {
                        node {
                            id
                            name
                            ...usePaginationFragmentTestNestedUserFragment
                        }
                    }
                }
            }
        `);
        gqlQuery = getRequest(graphql`
            query usePaginationFragmentTestUserQuery(
                $id: ID!
                $after: ID
                $first: Int
                $before: ID
                $last: Int
                $orderby: [String]
                $isViewerFriend: Boolean
            ) {
                node(id: $id) {
                    ...usePaginationFragmentTestUserFragment
                        @arguments(isViewerFriendLocal: $isViewerFriend, orderby: $orderby)
                }
            }
        `);
        gqlQueryNestedFragment = getRequest(graphql`
            query usePaginationFragmentTestUserNestedFragmentQuery(
                $id: ID!
                $after: ID
                $first: Int
                $before: ID
                $last: Int
                $orderby: [String]
                $isViewerFriend: Boolean
            ) {
                node(id: $id) {
                    actor {
                        ...usePaginationFragmentTestUserFragment
                            @arguments(isViewerFriendLocal: $isViewerFriend, orderby: $orderby)
                    }
                }
            }
        `);
        gqlQueryWithoutID = getRequest(graphql`
            query usePaginationFragmentTestUserWithoutIDQuery(
                $after: ID
                $first: Int
                $before: ID
                $last: Int
                $orderby: [String]
                $isViewerFriend: Boolean
            ) {
                viewer {
                    actor {
                        ...usePaginationFragmentTestUserFragment
                            @arguments(isViewerFriendLocal: $isViewerFriend, orderby: $orderby)
                    }
                }
            }
        `);
        gqlQueryWithLiteralArgs = getRequest(graphql`
            query usePaginationFragmentTestUserWithLiteralArgsQuery(
                $id: ID!
                $after: ID
                $first: Int
                $before: ID
                $last: Int
            ) {
                node(id: $id) {
                    ...usePaginationFragmentTestUserFragment @arguments(isViewerFriendLocal: true, orderby: ["name"])
                }
            }
        `);
        gqlQueryWithStreaming = getRequest(graphql`
            query usePaginationFragmentTestUserWithStreamingQuery(
                $id: ID!
                $after: ID
                $first: Int
                $before: ID
                $last: Int
                $orderby: [String]
                $isViewerFriend: Boolean
            ) {
                node(id: $id) {
                    ...usePaginationFragmentTestUserFragmentWithStreaming
                        @arguments(isViewerFriendLocal: $isViewerFriend, orderby: $orderby)
                }
            }
        `);
        variablesWithoutID = {
            after: null,
            first: 1,
            before: null,
            last: null,
            isViewerFriend: false,
            orderby: ['name'],
        };
        variables = {
            ...variablesWithoutID,
            id: '1',
        };
        variablesNestedFragment = {
            ...variablesWithoutID,
            id: '<feedbackid>',
        };
        // eslint-disable-next-line prettier/prettier
        gqlPaginationQuery =
            require('./__generated__/usePaginationFragmentTestUserFragmentPaginationQuery.graphql').default;
        // eslint-disable-next-line prettier/prettier
        gqlPaginationQueryWithStreaming =
            require('./__generated__/usePaginationFragmentTestUserFragmentStreamingPaginationQuery.graphql').default;

        invariant(
            areEqual(gqlFragment.metadata?.refetch?.operation, gqlPaginationQuery),
            'useRefetchableFragment-test: Expected refetchable fragment metadata to contain operation.',
        );
        invariant(
            areEqual(gqlFragmentWithStreaming.metadata?.refetch?.operation, gqlPaginationQueryWithStreaming),
            'useRefetchableFragment-test: Expected refetchable fragment metadata to contain operation.',
        );

        query = createOperationDescriptor(gqlQuery, variables, { force: true });
        queryNestedFragment = createOperationDescriptor(gqlQueryNestedFragment, variablesNestedFragment, {
            force: true,
        });
        queryWithoutID = createOperationDescriptor(gqlQueryWithoutID, variablesWithoutID, {
            force: true,
        });
        queryWithLiteralArgs = createOperationDescriptor(gqlQueryWithLiteralArgs, variables, {
            force: true,
        });
        queryWithStreaming = createOperationDescriptor(gqlQueryWithStreaming, variables, {
            force: true,
        });
        paginationQuery = createOperationDescriptor(gqlPaginationQuery, variables, {
            force: true,
        });
        environment.commitPayload(query, {
            node: {
                __typename: 'User',
                id: '1',
                name: 'Alice',
                friends: {
                    edges: [
                        {
                            cursor: 'cursor:1',
                            node: {
                                __typename: 'User',
                                id: 'node:1',
                                name: 'name:node:1',
                                username: 'username:node:1',
                            },
                        },
                    ],
                    pageInfo: {
                        endCursor: 'cursor:1',
                        hasNextPage: true,
                        hasPreviousPage: false,
                        startCursor: 'cursor:1',
                    },
                },
            },
        });
        environment.commitPayload(queryWithoutID, {
            viewer: {
                actor: {
                    __typename: 'User',
                    id: '1',
                    name: 'Alice',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    username: 'username:node:1',
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:1',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                },
            },
        });
        environment.commitPayload(queryWithLiteralArgs, {
            node: {
                __typename: 'User',
                id: '1',
                name: 'Alice',
                friends: {
                    edges: [
                        {
                            cursor: 'cursor:1',
                            node: {
                                __typename: 'User',
                                id: 'node:1',
                                name: 'name:node:1',
                                username: 'username:node:1',
                            },
                        },
                    ],
                    pageInfo: {
                        endCursor: 'cursor:1',
                        hasNextPage: true,
                        hasPreviousPage: false,
                        startCursor: 'cursor:1',
                    },
                },
            },
        });

        // Set up renderers
        Renderer = (props) => null;

        const Container = (props: { userRef?: any; owner: any; fragment?: any }) => {
            // We need a render a component to run a Hook
            const [owner, _setOwner] = useState(props.owner);
            const [_, _setCount] = useState(0);
            const fragment = props.fragment ?? gqlFragment;
            const nodeUserRef = useMemo(() => environment.lookup(owner.fragment).data?.node, [owner]);
            const ownerOperationRef = useMemo(
                () => ({
                    [ID_KEY]: owner.request.variables.id ?? owner.request.variables.nodeID,
                    [FRAGMENTS_KEY]: {
                        [fragment.name]: {},
                    },
                    [FRAGMENT_OWNER_KEY]: owner.request,
                }),
                [owner, fragment.name],
            );
            const userRef = props.hasOwnProperty('userRef') ? props.userRef : nodeUserRef ?? ownerOperationRef;

            setOwner = _setOwner;

            const { data: userData } = usePaginationFragment(fragment, userRef as any);
            return <Renderer user={userData} />;
        };

        const ContextProvider = ({ children }) => {
            const [env, _setEnv] = useState(environment);
            const relayContext = useMemo(() => ({ environment: env }), [env]);

            setEnvironment = _setEnv;

            return <ReactRelayContext.Provider value={relayContext}>{children}</ReactRelayContext.Provider>;
        };

        renderFragment = (args?: { isConcurrent?: boolean; owner?: any; userRef?: any; fragment?: any }): any => {
            const { isConcurrent = false, ...props } = args ?? {};
            let renderer;
            TestRenderer.act(() => {
                renderer = TestRenderer.create(
                    <ErrorBoundary
                        fallback={({ error }) => {
                            return `Error: ${error.message}`;
                        }}
                    >
                        <React.Suspense fallback="Fallback">
                            <ContextProvider>
                                <Container owner={query} {...props} />
                            </ContextProvider>
                        </React.Suspense>
                    </ErrorBoundary>,
                    // any[prop-missing] - error revealed when flow-typing ReactTestRenderer
                    { unstable_isConcurrent: isConcurrent },
                );
            });
            return renderer;
        };

        initialUser = {
            id: '1',
            name: 'Alice',
            friends: {
                edges: [
                    {
                        cursor: 'cursor:1',
                        node: {
                            __typename: 'User',
                            id: 'node:1',
                            name: 'name:node:1',
                            ...createFragmentRef('node:1', query),
                        },
                    },
                ],
                pageInfo: {
                    endCursor: 'cursor:1',
                    hasNextPage: true,
                    hasPreviousPage: false,
                    startCursor: 'cursor:1',
                },
            },
        };
    });

    afterEach(() => {
        //environment.mockClear();
        renderSpy.mockClear();
        warning.mockClear();
    });

    describe('initial render', () => {
        // The bulk of initial render behavior is covered in useFragmentNode-test,
        // so this suite covers the basic cases as a sanity check.
        it('should throw error if fragment is plural', () => {
            jest.spyOn(console, 'error').mockImplementationOnce(() => {});

            const UserFragment = getFragment(graphql`
                fragment usePaginationFragmentTest1Fragment on User @relay(plural: true) {
                    id
                }
            `);
            const renderer = renderFragment({ fragment: UserFragment });
            expect(renderer.toJSON().includes('Remove `@relay(plural: true)` from fragment')).toEqual(true);
        });

        it('should throw error if fragment is missing @refetchable directive', () => {
            jest.spyOn(console, 'error').mockImplementationOnce(() => {});

            const query = getRequest(graphql`
                query usePaginationFragmentTest2UserConnectionQuery($id: ID!) {
                    node(id: $id) {
                        ...usePaginationFragmentTest2UserFragment
                    }
                }
            `);

            const UserFragment = getFragment(graphql`
                fragment usePaginationFragmentTest2UserFragment on User {
                    id
                }
            `);
            const owner = createOperationDescriptor(query, variables, {
                force: true,
            });
            const renderer = renderFragment({ fragment: UserFragment, owner });
            expect(
                renderer.toJSON().includes('Did you forget to add a @refetchable directive to the fragment?'),
            ).toEqual(true);
        });

        it('should throw error if fragment is missing @connection directive', () => {
            jest.spyOn(console, 'error').mockImplementationOnce(() => {});

            const query = getRequest(graphql`
                query usePaginationFragmentTest3UserConnectionQuery($id: ID!) {
                    node(id: $id) {
                        ...usePaginationFragmentTest3UserFragment
                    }
                }
            `);

            const UserFragment = getFragment(graphql`
                fragment usePaginationFragmentTest3UserFragment on User
                @refetchable(queryName: "usePaginationFragmentTest3UserFragmentRefetchQuery") {
                    id
                }
            `);
            //UserFragment.metadata.refetch.operation = UserFragmentRefetchQuery;
            const owner = createOperationDescriptor(query, variables, {
                force: true,
            });
            const renderer = renderFragment({ fragment: UserFragment, owner });
            expect(
                renderer
                    .toJSON()
                    .includes('Did you forget to add a @connection directive to the connection field in the fragment?'),
            ).toEqual(true);
        });

        it('should render fragment without error when data is available', () => {
            renderFragment();
            expectFragmentResults([
                {
                    data: initialUser,
                    isLoadingNext: false,
                    isLoadingPrevious: false,

                    hasNext: true,
                    hasPrevious: false,
                },
            ]);
        });

        it('should render fragment without error when ref is null', () => {
            renderFragment({ userRef: null });
            expectFragmentResults([
                {
                    data: null,
                    isLoadingNext: false,
                    isLoadingPrevious: false,

                    hasNext: false,
                    hasPrevious: false,
                },
            ]);
        });

        it('should render fragment without error when ref is undefined', () => {
            renderFragment({ userRef: undefined });
            expectFragmentResults([
                {
                    data: null,
                    isLoadingNext: false,
                    isLoadingPrevious: false,
                    hasNext: false,
                    hasPrevious: false,
                },
            ]);
        });

        it('should update when fragment data changes', () => {
            renderFragment();
            expectFragmentResults([
                {
                    data: initialUser,
                    isLoadingNext: false,
                    isLoadingPrevious: false,
                    hasNext: true,
                    hasPrevious: false,
                },
            ]);

            // Update parent record
            TestRenderer.act(() => {
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
                        ...initialUser,
                        // Assert that name is updated
                        name: 'Alice in Wonderland',
                    },
                    isLoadingNext: false,
                    isLoadingPrevious: false,
                    hasNext: true,
                    hasPrevious: false,
                },
            ]);

            // Update edge
            TestRenderer.act(() => {
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: 'node:1',
                        // Update name
                        name: 'name:node:1-updated',
                    },
                });
            });
            expectFragmentResults([
                {
                    data: {
                        ...initialUser,
                        name: 'Alice in Wonderland',
                        friends: {
                            ...initialUser.friends,
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        // Assert that name is updated
                                        name: 'name:node:1-updated',
                                        ...createFragmentRef('node:1', query),
                                    },
                                },
                            ],
                        },
                    },
                    isLoadingNext: false,
                    isLoadingPrevious: false,
                    hasNext: true,
                    hasPrevious: false,
                },
            ]);
        });

        /*it('should throw a promise if data is missing for fragment and request is in flight', () => {
            // This prevents console.error output in the test, which is expected
            jest.spyOn(console, 'error').mockImplementationOnce(() => {});
            jest.spyOn(
                require('relay-runtime').__internal,
                'getPromiseForActiveRequest',
            ).mockImplementationOnce(() => Promise.resolve());

            const missingDataVariables = { ...variables, id: '4' };
            const missingDataQuery = createOperationDescriptor(gqlQuery, missingDataVariables, {
                force: true,
            });
            // Commit a payload with name and profile_picture are missing
            environment.commitPayload(missingDataQuery, {
                node: {
                    __typename: 'User',
                    id: '4',
                },
            });

            const renderer = renderFragment({ owner: missingDataQuery });
            expect(renderer.toJSON()).toEqual('Fallback');
        });*/
    });

    describe('pagination', () => {
        let release;

        beforeEach(() => {
            jest.resetModules();

            release = jest.fn();
            environment.retain.mockImplementation((...args) => {
                return {
                    dispose: release,
                };
            });
        });
        /*
        function expectRequestIsInFlight(expected) {
            expect(environment.execute).toBeCalledTimes(expected.requestCount);
            expect(
                environment.mock.isLoading(
                    expected.gqlPaginationQuery ?? gqlPaginationQuery,
                    expected.paginationVariables,
                    { force: true },
                ),
            ).toEqual(expected.inFlight);
        }*/
        function expectRequestIsInFlight(expected: any) {
            expect(fetch).toBeCalledTimes(expected.requestCount);
            const fetchCall = fetch.mock.calls.find((call) => {
                /*console.log(
                    'call',
                    call,
                    call[0] === (expected.gqlPaginationQuery ?? gqlPaginationQuery).params,
                    areEqual(call[1], expected.paginationVariables),
                    areEqual(call[2], { force: true }),
                );

                console.log('call[0]', call[0], expected.gqlPaginationQuery.params, gqlPaginationQuery.params);*/
                return (
                    //call[0] === (expected.gqlPaginationQuery ?? gqlPaginationQuery).params &&
                    areEqual(call[0], (expected.gqlPaginationQuery ?? gqlPaginationQuery).params) &&
                    areEqual(call[1], expected.paginationVariables) &&
                    areEqual(call[2], { force: true })
                );
            });
            //console.log('fetchCall', fetchCall, expected.inFlight);
            const isInFlight = fetchCall != null;
            expect(isInFlight).toEqual(expected.inFlight);
        }

        function expectFragmentIsLoadingMore(
            renderer,
            direction: Direction,
            expected: {
                data: any;
                hasNext: boolean;
                hasPrevious: boolean;
                paginationVariables: Variables;
                gqlPaginationQuery?: any;
            },
        ) {
            // Assert fragment sets isLoading to true
            expect(renderSpy).toBeCalledTimes(1);
            assertCall(
                {
                    data: expected.data,
                    isLoadingNext: direction === 'forward',
                    isLoadingPrevious: direction === 'backward',
                    hasNext: expected.hasNext,
                    hasPrevious: expected.hasPrevious,
                },
                0,
            );
            renderSpy.mockClear();

            // Assert refetch query was fetched
            expectRequestIsInFlight({ ...expected, inFlight: true, requestCount: 1 });
        }

        // TODO
        // - backward pagination
        // - simultaneous pagination
        // - TODO(T41131846): Fetch/Caching policies for loadMore / when network
        //   returns or errors synchronously
        // - TODO(T41140071): Handle loadMore while refetch is in flight and vice-versa

        describe('loadNext', () => {
            const direction = 'forward';

            //beforeEach(() => {
            //    unsubscribe.mockClear();
            //});

            it('does not load more if component has unmounted', () => {
                const renderer = renderFragment();
                warning.mockClear();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    renderer.unmount();
                });
                TestRenderer.act(() => {
                    loadNext(1);
                });

                expect(warning).toHaveBeenCalledTimes(1);
                expect(
                    (warning as any).mock.calls[0][1].includes('Relay: Unexpected fetch on unmounted component'),
                ).toEqual(true);
                expect(fetch).toHaveBeenCalledTimes(0);
            });

            it('does not load more if fragment ref passed to usePaginationFragment() was null', () => {
                warning.mockClear();

                renderFragment({ userRef: null });
                expectFragmentResults([
                    {
                        data: null,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1);
                });

                expect(warning).toHaveBeenCalledTimes(1);
                expect(
                    (warning as any).mock.calls[0][1].includes(
                        'Relay: Unexpected fetch while using a null fragment ref',
                    ),
                ).toEqual(true);
                expect(fetch).toHaveBeenCalledTimes(0);
            });

            it('does not load more if request is already in flight', () => {
                const callback = jest.fn();
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                expect(callback).toBeCalledTimes(0);

                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                expect(fetch).toBeCalledTimes(1);
                expect(callback).toBeCalledTimes(1);
                expect(renderSpy).toBeCalledTimes(0);
            });

            it('does not load more if parent query is already active (i.e. during streaming)', () => {
                // This prevents console.error output in the test, which is expected
                jest.spyOn(console, 'error').mockImplementationOnce(() => {});
                const {
                    __internal: { fetchQuery },
                } = require('relay-runtime');

                fetchQuery(environment, query).subscribe({});

                const callback = jest.fn();
                //environment.execute.mockClear();
                fetch.mockClear();
                renderFragment();

                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                expect(fetch).toBeCalledTimes(0);
                expect(callback).toBeCalledTimes(1);
                expect(renderSpy).toBeCalledTimes(0);
            });

            it('cancels load more if component unmounts', () => {
                const callback = jest.fn();
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(unsubscribe).toHaveBeenCalledTimes(0);

                TestRenderer.act(() => {
                    renderer.unmount();
                });
                expect(unsubscribe).toHaveBeenCalledTimes(1);
                expect(fetch).toBeCalledTimes(1);
                expect(callback).toBeCalledTimes(0);
                expect(renderSpy).toBeCalledTimes(0);
            });

            it('cancels load more if refetch is called', () => {
                unsubscribe.mockClear();
                const callback = jest.fn();
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(unsubscribe).toHaveBeenCalledTimes(0);
                const loadNextUnsubscribe = unsubscribe;
                TestRenderer.act(() => {
                    refetch({ id: '4' });
                });
                expect(fetch).toBeCalledTimes(2); // loadNext and refetch
                expect(loadNextUnsubscribe).toHaveBeenCalledTimes(1); // loadNext is cancelled
                expect(unsubscribe).toHaveBeenCalledTimes(0); // refetch is not cancelled
                expect(callback).toBeCalledTimes(0);
                expect(renderSpy).toBeCalledTimes(0);
            });

            it('attempts to load more even if there are no more items to load', () => {
                (environment.getStore().getSource() as any).clear();
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        username: 'username:node:1',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:1',
                                hasNextPage: false,
                                hasPreviousPage: false,
                                startCursor: 'cursor:1',
                            },
                        },
                    },
                });
                const callback = jest.fn();

                const renderer = renderFragment();
                const expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        pageInfo: expect.objectContaining({ hasNextPage: false }),
                    },
                };
                expectFragmentResults([
                    {
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });

                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: expectedUser,
                    hasNext: false,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [],
                                pageInfo: {
                                    startCursor: null,
                                    endCursor: null,
                                    hasNextPage: null,
                                    hasPreviousPage: null,
                                },
                            },
                        },
                    },
                });
                expectFragmentResults([
                    {
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });

            it('loads and renders next items in connection', () => {
                const callback = jest.fn();
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:2',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:2',
                                            name: 'name:node:2',
                                            username: 'username:node:2',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    startCursor: 'cursor:2',
                                    endCursor: 'cursor:2',
                                    hasNextPage: true,
                                    hasPreviousPage: true,
                                },
                            },
                        },
                    },
                });

                const expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', query),
                                },
                            },
                            {
                                cursor: 'cursor:2',
                                node: {
                                    __typename: 'User',
                                    id: 'node:2',
                                    name: 'name:node:2',
                                    ...createFragmentRef('node:2', query),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:2',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: expectedUser,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });

            it('loads more correctly using fragment variables from literal @argument values', () => {
                let expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', queryWithLiteralArgs),
                                },
                            },
                        ],
                    },
                };

                const callback = jest.fn();
                const renderer = renderFragment({ owner: queryWithLiteralArgs });
                expectFragmentResults([
                    {
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: true,
                    orderby: ['name'],
                    scale: null,
                };
                expect(paginationVariables.isViewerFriendLocal).not.toBe(variables.isViewerFriend);
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: expectedUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:2',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:2',
                                            name: 'name:node:2',
                                            username: 'username:node:2',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    startCursor: 'cursor:2',
                                    endCursor: 'cursor:2',
                                    hasNextPage: true,
                                    hasPreviousPage: true,
                                },
                            },
                        },
                    },
                });

                expectedUser = {
                    ...expectedUser,
                    friends: {
                        ...expectedUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', queryWithLiteralArgs),
                                },
                            },
                            {
                                cursor: 'cursor:2',
                                node: {
                                    __typename: 'User',
                                    id: 'node:2',
                                    name: 'name:node:2',
                                    ...createFragmentRef('node:2', queryWithLiteralArgs),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:2',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: expectedUser,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });

            it('loads more correctly when original variables do not include an id', () => {
                const callback = jest.fn();
                const viewer = environment.lookup(queryWithoutID.fragment).data?.viewer;
                const userRef = typeof viewer === 'object' && viewer != null ? viewer?.actor : null;
                invariant(userRef != null, 'Expected to have cached test data');

                let expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', queryWithoutID),
                                },
                            },
                        ],
                    },
                };

                const renderer = renderFragment({ owner: queryWithoutID, userRef });
                expectFragmentResults([
                    {
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: expectedUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:2',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:2',
                                            name: 'name:node:2',
                                            username: 'username:node:2',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    startCursor: 'cursor:2',
                                    endCursor: 'cursor:2',
                                    hasNextPage: true,
                                    hasPreviousPage: true,
                                },
                            },
                        },
                    },
                });

                expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', queryWithoutID),
                                },
                            },
                            {
                                cursor: 'cursor:2',
                                node: {
                                    __typename: 'User',
                                    id: 'node:2',
                                    name: 'name:node:2',
                                    ...createFragmentRef('node:2', queryWithoutID),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:2',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: expectedUser,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });

            it('loads more with correct id from refetchable fragment when using a nested fragment', () => {
                const callback = jest.fn();

                // Populate store with data for query using nested fragment
                environment.commitPayload(queryNestedFragment, {
                    node: {
                        __typename: 'Feedback',
                        id: '<feedbackid>',
                        actor: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:1',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:1',
                                            name: 'name:node:1',
                                            username: 'username:node:1',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:1',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:1',
                                },
                            },
                        },
                    },
                });

                // Get fragment ref for user using nested fragment
                const userRef = (environment.lookup(queryNestedFragment.fragment).data as any)?.node?.actor;

                initialUser = {
                    id: '1',
                    name: 'Alice',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', queryNestedFragment),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:1',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };

                const renderer = renderFragment({ owner: queryNestedFragment, userRef });
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    // The id here should correspond to the user id, and not the
                    // feedback id from the query variables (i.e. `<feedbackid>`)
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:2',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:2',
                                            name: 'name:node:2',
                                            username: 'username:node:2',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    startCursor: 'cursor:2',
                                    endCursor: 'cursor:2',
                                    hasNextPage: true,
                                    hasPreviousPage: true,
                                },
                            },
                        },
                    },
                });

                const expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', queryNestedFragment),
                                },
                            },
                            {
                                cursor: 'cursor:2',
                                node: {
                                    __typename: 'User',
                                    id: 'node:2',
                                    name: 'name:node:2',
                                    ...createFragmentRef('node:2', queryNestedFragment),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:2',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: expectedUser,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });

            it('calls callback with error when error occurs during fetch', () => {
                const callback = jest.fn();
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                const error = new Error('Oops');

                TestRenderer.act(() => dataSource.error(error));

                // We pass the error in the callback, but do not throw during render
                // since we want to continue rendering the existing items in the
                // connection
                expect(callback).toBeCalledTimes(1);
                expect(callback).toBeCalledWith(error);
                /*expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                        errorNext: error,
                    },
                ]);*/
            });

            it('preserves pagination request if re-rendered with same fragment ref', () => {
                const callback = jest.fn();
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                TestRenderer.act(() => {
                    setOwner({ ...query });
                });

                // Assert that request is still in flight after re-rendering
                // with new fragment ref that points to the same data.
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:2',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:2',
                                            name: 'name:node:2',
                                            username: 'username:node:2',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    startCursor: 'cursor:2',
                                    endCursor: 'cursor:2',
                                    hasNextPage: true,
                                    hasPreviousPage: true,
                                },
                            },
                        },
                    },
                });

                const expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', query),
                                },
                            },
                            {
                                cursor: 'cursor:2',
                                node: {
                                    __typename: 'User',
                                    id: 'node:2',
                                    name: 'name:node:2',
                                    ...createFragmentRef('node:2', query),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:2',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: expectedUser,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });

            describe('extra variables', () => {
                it('loads and renders the next items in the connection when passing extra variables', () => {
                    const callback = jest.fn();
                    const renderer = renderFragment();
                    expectFragmentResults([
                        {
                            data: initialUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);

                    TestRenderer.act(() => {
                        loadNext(1, {
                            onComplete: callback,
                            // Pass extra variables that are different from original request
                            UNSTABLE_extraVariables: { scale: 2.0 },
                        });
                    });
                    const paginationVariables = {
                        id: '1',
                        after: 'cursor:1',
                        first: 1,
                        before: null,
                        last: null,
                        isViewerFriendLocal: false,
                        orderby: ['name'],
                        // Assert that value from extra variables is used
                        scale: 2.0,
                    };
                    expectFragmentIsLoadingMore(renderer, direction, {
                        data: initialUser,
                        hasNext: true,
                        hasPrevious: false,
                        paginationVariables,
                        gqlPaginationQuery,
                    });
                    expect(callback).toBeCalledTimes(0);

                    resolveQuery({
                        data: {
                            node: {
                                __typename: 'User',
                                id: '1',
                                name: 'Alice',
                                friends: {
                                    edges: [
                                        {
                                            cursor: 'cursor:2',
                                            node: {
                                                __typename: 'User',
                                                id: 'node:2',
                                                name: 'name:node:2',
                                                username: 'username:node:2',
                                            },
                                        },
                                    ],
                                    pageInfo: {
                                        startCursor: 'cursor:2',
                                        endCursor: 'cursor:2',
                                        hasNextPage: true,
                                        hasPreviousPage: true,
                                    },
                                },
                            },
                        },
                    });

                    const expectedUser = {
                        ...initialUser,
                        friends: {
                            ...initialUser.friends,
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        ...createFragmentRef('node:1', query),
                                    },
                                },
                                {
                                    cursor: 'cursor:2',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:2',
                                        name: 'name:node:2',
                                        ...createFragmentRef('node:2', query),
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:2',
                                hasNextPage: true,
                                hasPreviousPage: false,
                                startCursor: 'cursor:1',
                            },
                        },
                    };
                    expectFragmentResults([
                        {
                            // First update has updated connection
                            data: expectedUser,
                            isLoadingNext: true,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                        {
                            // Second update sets isLoading flag back to false
                            data: expectedUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);
                    expect(callback).toBeCalledTimes(1);
                });

                it('loads the next items in the connection and ignores any pagination vars passed as extra vars', () => {
                    const callback = jest.fn();
                    const renderer = renderFragment();
                    expectFragmentResults([
                        {
                            data: initialUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);

                    TestRenderer.act(() => {
                        loadNext(1, {
                            onComplete: callback,
                            // Pass pagination vars as extra variables
                            UNSTABLE_extraVariables: { first: 100, after: 'foo' },
                        });
                    });
                    const paginationVariables = {
                        id: '1',
                        // Assert that pagination vars from extra variables are ignored
                        after: 'cursor:1',
                        first: 1,
                        before: null,
                        last: null,
                        isViewerFriendLocal: false,
                        orderby: ['name'],
                        scale: null,
                    };
                    expectFragmentIsLoadingMore(renderer, direction, {
                        data: initialUser,
                        hasNext: true,
                        hasPrevious: false,
                        paginationVariables,
                        gqlPaginationQuery,
                    });
                    expect(callback).toBeCalledTimes(0);

                    resolveQuery({
                        data: {
                            node: {
                                __typename: 'User',
                                id: '1',
                                name: 'Alice',
                                friends: {
                                    edges: [
                                        {
                                            cursor: 'cursor:2',
                                            node: {
                                                __typename: 'User',
                                                id: 'node:2',
                                                name: 'name:node:2',
                                                username: 'username:node:2',
                                            },
                                        },
                                    ],
                                    pageInfo: {
                                        startCursor: 'cursor:2',
                                        endCursor: 'cursor:2',
                                        hasNextPage: true,
                                        hasPreviousPage: true,
                                    },
                                },
                            },
                        },
                    });

                    const expectedUser = {
                        ...initialUser,
                        friends: {
                            ...initialUser.friends,
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        ...createFragmentRef('node:1', query),
                                    },
                                },
                                {
                                    cursor: 'cursor:2',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:2',
                                        name: 'name:node:2',
                                        ...createFragmentRef('node:2', query),
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:2',
                                hasNextPage: true,
                                hasPreviousPage: false,
                                startCursor: 'cursor:1',
                            },
                        },
                    };
                    expectFragmentResults([
                        {
                            // First update has updated connection
                            data: expectedUser,
                            isLoadingNext: true,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                        {
                            // Second update sets isLoading flag back to false
                            data: expectedUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);
                    expect(callback).toBeCalledTimes(1);
                });
            });

            describe('disposing', () => {
                beforeEach(() => {
                    unsubscribe.mockClear();
                });

                it('disposes ongoing request if environment changes', () => {
                    const callback = jest.fn();
                    const renderer = renderFragment();
                    expectFragmentResults([
                        {
                            data: initialUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);

                    TestRenderer.act(() => {
                        loadNext(1, { onComplete: callback });
                    });

                    // Assert request is started
                    const paginationVariables = {
                        id: '1',
                        after: 'cursor:1',
                        first: 1,
                        before: null,
                        last: null,
                        isViewerFriendLocal: false,
                        orderby: ['name'],
                        scale: null,
                    };
                    expectFragmentIsLoadingMore(renderer, direction, {
                        data: initialUser,
                        hasNext: true,
                        hasPrevious: false,
                        paginationVariables,
                        gqlPaginationQuery,
                    });
                    const loadNextUnsubscribe = unsubscribe;
                    expect(callback).toBeCalledTimes(0);

                    // Set new environment
                    const [newEnvironment, newFetch] = createMockEnvironment();
                    fetch.mockClear();
                    fetch = newFetch;
                    newEnvironment.commitPayload(query, {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice in a different environment',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:1',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:1',
                                            name: 'name:node:1',
                                            username: 'username:node:1',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:1',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:1',
                                },
                            },
                        },
                    });
                    TestRenderer.act(() => {
                        setEnvironment(newEnvironment);
                    });

                    // Assert request was canceled
                    expect(loadNextUnsubscribe).toBeCalledTimes(1);
                    // changing environments resets, we don't try to auto-paginate just bc a request was pending
                    expect(fetch).toBeCalledTimes(0);

                    // Assert newly rendered data
                    expectFragmentResults([
                        /*{
                            data: {
                                ...initialUser,
                                name: 'Alice in a different environment',
                            },
                            isLoadingNext: true,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },*/
                        {
                            data: {
                                ...initialUser,
                                name: 'Alice in a different environment',
                            },
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);
                });

                it('disposes ongoing request if fragment ref changes', () => {
                    const callback = jest.fn();
                    const renderer = renderFragment();
                    expectFragmentResults([
                        {
                            data: initialUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);

                    TestRenderer.act(() => {
                        loadNext(1, { onComplete: callback });
                    });

                    // Assert request is started
                    const paginationVariables = {
                        id: '1',
                        after: 'cursor:1',
                        first: 1,
                        before: null,
                        last: null,
                        isViewerFriendLocal: false,
                        orderby: ['name'],
                        scale: null,
                    };
                    expectFragmentIsLoadingMore(renderer, direction, {
                        data: initialUser,
                        hasNext: true,
                        hasPrevious: false,
                        paginationVariables,
                        gqlPaginationQuery,
                    });
                    expect(callback).toBeCalledTimes(0);

                    // Pass new parent fragment ref with different variables
                    const newVariables = { ...variables, isViewerFriend: true };
                    const newQuery = createOperationDescriptor(gqlQuery, newVariables, {
                        force: true,
                    });
                    environment.commitPayload(newQuery, {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:1',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:1',
                                            name: 'name:node:1',
                                            username: 'username:node:1',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:1',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:1',
                                },
                            },
                        },
                    });

                    fetch.mockClear();
                    TestRenderer.act(() => {
                        setOwner(newQuery);
                    });

                    // Assert request was canceled
                    expect(unsubscribe).toBeCalledTimes(1);
                    // changing fragment ref resets, we don't try to auto-paginate just bc a request was pending
                    expect(fetch).toBeCalledTimes(0);

                    // Assert newly rendered data
                    const expectedUser = {
                        ...initialUser,
                        friends: {
                            ...initialUser.friends,
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        // Assert fragment ref points to owner with new variables
                                        ...createFragmentRef('node:1', newQuery),
                                    },
                                },
                            ],
                        },
                    };
                    expectFragmentResults([
                        /*{
                            data: expectedUser,
                            isLoadingNext: true,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },*/
                        {
                            data: expectedUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);
                });

                it('disposes ongoing request on unmount', () => {
                    unsubscribe.mockClear();
                    const callback = jest.fn();
                    const renderer = renderFragment();
                    expectFragmentResults([
                        {
                            data: initialUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);

                    TestRenderer.act(() => {
                        loadNext(1, { onComplete: callback });
                    });

                    // Assert request is started
                    const paginationVariables = {
                        id: '1',
                        after: 'cursor:1',
                        first: 1,
                        before: null,
                        last: null,
                        isViewerFriendLocal: false,
                        orderby: ['name'],
                        scale: null,
                    };
                    expectFragmentIsLoadingMore(renderer, direction, {
                        data: initialUser,
                        hasNext: true,
                        hasPrevious: false,
                        paginationVariables,
                        gqlPaginationQuery,
                    });
                    expect(callback).toBeCalledTimes(0);

                    TestRenderer.act(() => {
                        renderer.unmount();
                        jest.runAllImmediates();
                    });

                    // Assert request was canceled
                    expect(unsubscribe).toBeCalledTimes(1);
                    expect(fetch).toBeCalledTimes(1); // the loadNext call
                });

                it('disposes ongoing request if it is manually disposed', () => {
                    const callback = jest.fn();
                    const renderer = renderFragment();
                    expectFragmentResults([
                        {
                            data: initialUser,
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);

                    let disposable;
                    TestRenderer.act(() => {
                        disposable = loadNext(1, { onComplete: callback });
                    });

                    // Assert request is started
                    const paginationVariables = {
                        id: '1',
                        after: 'cursor:1',
                        first: 1,
                        before: null,
                        last: null,
                        isViewerFriendLocal: false,
                        orderby: ['name'],
                        scale: null,
                    };
                    expectFragmentIsLoadingMore(renderer, direction, {
                        data: initialUser,
                        hasNext: true,
                        hasPrevious: false,
                        paginationVariables,
                        gqlPaginationQuery,
                    });
                    expect(callback).toBeCalledTimes(0);

                    expect(disposable).toBeTruthy();
                    disposable?.dispose();

                    // Assert request was canceled
                    expect(unsubscribe).toBeCalledTimes(1);
                    expect(fetch).toBeCalledTimes(1); // the loadNext call
                    expect(renderSpy).toHaveBeenCalledTimes(0);
                });
            });

            describe('when parent query is streaming', () => {
                beforeEach(() => {
                    //({ createMockEnvironment } = require('relay-test-utils-internal'));
                    const [newEnvironment, newFetch] = createMockEnvironment();
                    environment = newEnvironment;
                    fetch.mockClear();
                    fetch = newFetch;
                    environment.commitPayload(query, {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                        },
                    });
                });
                /*
                it('does not start pagination request even if query is no longer active but loadNext is bound to snapshot of data while query was active', () => {
                    const {
                        __internal: { fetchQuery },
                    } = require('relay-runtime');

                    // Start parent query and assert it is active
                    fetchQuery(environment, queryWithStreaming).subscribe({});
                    expect(
                        environment.isRequestActive(queryWithStreaming.request.identifier),
                    ).toEqual(true);

                    // Render initial fragment
                    const instance = renderFragment({
                        fragment: gqlFragmentWithStreaming,
                        owner: queryWithStreaming,
                    });
                    expect(instance.toJSON()).toEqual(null);
                    renderSpy.mockClear();

                    // Resolve first payload
                    TestRenderer.act(() => {
                        environment.mock.nextValue(gqlQueryWithStreaming, {
                            data: {
                                node: {
                                    __typename: 'User',
                                    id: '1',
                                    name: 'Alice',
                                    friends: {
                                        edges: [
                                            {
                                                cursor: 'cursor:1',
                                                node: {
                                                    __typename: 'User',
                                                    id: 'node:1',
                                                    name: 'name:node:1',
                                                    username: 'username:node:1',
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                            extensions: {
                                is_final: false,
                            },
                        });
                    });
                    // Ensure request is still active
                    expect(
                        environment.isRequestActive(queryWithStreaming.request.identifier),
                    ).toEqual(true);

                    // Assert fragment rendered with correct data
                    expectFragmentResults([
                        {
                            data: {
                                ...initialUser,
                                friends: {
                                    edges: [
                                        {
                                            cursor: 'cursor:1',
                                            node: {
                                                __typename: 'User',
                                                id: 'node:1',
                                                name: 'name:node:1',
                                                ...createFragmentRef('node:1', queryWithStreaming),
                                            },
                                        },
                                    ],
                                    // Assert pageInfo is currently null
                                    pageInfo: {
                                        endCursor: null,
                                        hasNextPage: false,
                                        hasPreviousPage: false,
                                        startCursor: null,
                                    },
                                },
                            },
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: false,
                            hasPrevious: false,
                        },
                    ]);

                    // Capture the value of loadNext at this moment, which will
                    // would use the page info from the current fragment snapshot.
                    // At the moment of this snapshot the parent request is still active,
                    // so calling `capturedLoadNext` should be a no-op, otherwise it
                    // would attempt a pagination with the incorrect cursor as null.
                    const capturedLoadNext = loadNext;

                    // Resolve page info
                    TestRenderer.act(() => {
                        environment.mock.nextValue(gqlQueryWithStreaming, {
                            data: {
                                pageInfo: {
                                    endCursor: 'cursor:1',
                                    hasNextPage: true,
                                },
                            },
                            label: 'UserFragmentWithStreaming$defer$UserFragment_friends$pageInfo',
                            path: ['node', 'friends'],
                            extensions: {
                                is_final: true,
                            },
                        });
                    });
                    // Ensure request is no longer active since final payload has been
                    // received
                    expect(
                        environment.isRequestActive(queryWithStreaming.request.identifier),
                    ).toEqual(false);

                    // Assert fragment rendered with correct data
                    expectFragmentResults([
                        {
                            data: {
                                ...initialUser,
                                friends: {
                                    edges: [
                                        {
                                            cursor: 'cursor:1',
                                            node: {
                                                __typename: 'User',
                                                id: 'node:1',
                                                name: 'name:node:1',
                                                ...createFragmentRef('node:1', queryWithStreaming),
                                            },
                                        },
                                    ],
                                    // Assert pageInfo is updated
                                    pageInfo: {
                                        endCursor: 'cursor:1',
                                        hasNextPage: true,
                                        hasPreviousPage: false,
                                        startCursor: null,
                                    },
                                },
                            },
                            isLoadingNext: false,
                            isLoadingPrevious: false,
                            hasNext: true,
                            hasPrevious: false,
                        },
                    ]);

                    environment.execute.mockClear();
                    renderSpy.mockClear();
                    // Call `capturedLoadNext`, which should be a no-op since it's
                    // bound to the snapshot of the fragment taken while the query is
                    // still active and pointing to incomplete page info.
                    TestRenderer.act(() => {
                        capturedLoadNext(1);
                    });

                    // Assert that calling `capturedLoadNext` is a no-op
                    expect(fetch).toBeCalledTimes(0);
                    expect(renderSpy).toBeCalledTimes(0);

                    // Calling `loadNext`, should be fine since it's bound to the
                    // latest fragment snapshot with the latest page info and when
                    // the request is no longer active
                    TestRenderer.act(() => {
                        loadNext(1);
                    });

                    // Assert that calling `loadNext` starts the request
                    expect(fetch).toBeCalledTimes(1);
                    expect(renderSpy).toBeCalledTimes(1);
                });*/
            });
        });

        describe('hasNext', () => {
            const direction = 'forward';

            it('returns true if it has more items', () => {
                (environment.getStore().getSource() as any).clear();
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        username: 'username:node:1',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:1',
                                hasNextPage: true,
                                hasPreviousPage: false,
                                startCursor: 'cursor:1',
                            },
                        },
                    },
                });

                renderFragment();
                expectFragmentResults([
                    {
                        data: {
                            ...initialUser,
                            friends: {
                                ...initialUser.friends,
                                pageInfo: expect.objectContaining({ hasNextPage: true }),
                            },
                        },
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext is true
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
            });

            it('returns false if edges are null', () => {
                (environment.getStore().getSource() as any).clear();
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        friends: {
                            edges: null,
                            pageInfo: {
                                endCursor: 'cursor:1',
                                hasNextPage: true,
                                hasPreviousPage: false,
                                startCursor: 'cursor:1',
                            },
                        },
                    },
                });

                renderFragment();
                expectFragmentResults([
                    {
                        data: {
                            ...initialUser,
                            friends: {
                                ...initialUser.friends,
                                edges: null,
                                pageInfo: expect.objectContaining({ hasNextPage: true }),
                            },
                        },
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext is false
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);
            });

            it('returns false if edges are undefined', () => {
                (environment.getStore().getSource() as any).clear();
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        friends: {
                            edges: undefined,
                            pageInfo: {
                                endCursor: 'cursor:1',
                                hasNextPage: true,
                                hasPreviousPage: false,
                                startCursor: 'cursor:1',
                            },
                        },
                    },
                });

                renderFragment();
                expectFragmentResults([
                    {
                        data: {
                            ...initialUser,
                            friends: {
                                ...initialUser.friends,
                                edges: undefined,
                                pageInfo: expect.objectContaining({ hasNextPage: true }),
                            },
                        },
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext is false
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);
            });

            it('returns false if end cursor is null', () => {
                (environment.getStore().getSource() as any).clear();
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        username: 'username:node:1',
                                    },
                                },
                            ],
                            pageInfo: {
                                // endCursor is null
                                endCursor: null,
                                // but hasNextPage is still true
                                hasNextPage: true,
                                hasPreviousPage: false,
                                startCursor: null,
                            },
                        },
                    },
                });

                renderFragment();
                expectFragmentResults([
                    {
                        data: {
                            ...initialUser,
                            friends: {
                                ...initialUser.friends,
                                pageInfo: expect.objectContaining({
                                    endCursor: null,
                                    hasNextPage: true,
                                }),
                            },
                        },
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext is false
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);
            });

            it('returns false if end cursor is undefined', () => {
                (environment.getStore().getSource() as any).clear();
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        username: 'username:node:1',
                                    },
                                },
                            ],
                            pageInfo: {
                                // endCursor is undefined
                                endCursor: undefined,
                                // but hasNextPage is still true
                                hasNextPage: true,
                                hasPreviousPage: false,
                                startCursor: undefined,
                            },
                        },
                    },
                });

                renderFragment();
                expectFragmentResults([
                    {
                        data: {
                            ...initialUser,
                            friends: {
                                ...initialUser.friends,
                                pageInfo: expect.objectContaining({
                                    endCursor: null,
                                    hasNextPage: true,
                                }),
                            },
                        },
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext is false
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);
            });

            it('returns false if pageInfo.hasNextPage is false-ish', () => {
                (environment.getStore().getSource() as any).clear();
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        username: 'username:node:1',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:1',
                                hasNextPage: null,
                                hasPreviousPage: false,
                                startCursor: 'cursor:1',
                            },
                        },
                    },
                });

                renderFragment();
                expectFragmentResults([
                    {
                        data: {
                            ...initialUser,
                            friends: {
                                ...initialUser.friends,
                                pageInfo: expect.objectContaining({
                                    hasNextPage: null,
                                }),
                            },
                        },
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext is false
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);
            });

            it('returns false if pageInfo.hasNextPage is false', () => {
                (environment.getStore().getSource() as any).clear();
                environment.commitPayload(query, {
                    node: {
                        __typename: 'User',
                        id: '1',
                        name: 'Alice',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:1',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:1',
                                        name: 'name:node:1',
                                        username: 'username:node:1',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:1',
                                hasNextPage: false,
                                hasPreviousPage: false,
                                startCursor: 'cursor:1',
                            },
                        },
                    },
                });

                renderFragment();
                expectFragmentResults([
                    {
                        data: {
                            ...initialUser,
                            friends: {
                                ...initialUser.friends,
                                pageInfo: expect.objectContaining({
                                    hasNextPage: false,
                                }),
                            },
                        },
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext is false
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);
            });

            it('updates after pagination if more results are available', () => {
                const callback = jest.fn();
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,

                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:2',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:2',
                                            name: 'name:node:2',
                                            username: 'username:node:2',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    startCursor: 'cursor:2',
                                    endCursor: 'cursor:2',
                                    hasNextPage: true,
                                    hasPreviousPage: true,
                                },
                            },
                        },
                    },
                });

                const expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', query),
                                },
                            },
                            {
                                cursor: 'cursor:2',
                                node: {
                                    __typename: 'User',
                                    id: 'node:2',
                                    name: 'name:node:2',
                                    ...createFragmentRef('node:2', query),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:2',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: expectedUser,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        // Assert hasNext reflects server response
                        hasNext: true,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext reflects server response
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });

            it('updates after pagination if no more results are available', () => {
                const callback = jest.fn();
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:1',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, direction, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:2',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:2',
                                            name: 'name:node:2',
                                            username: 'username:node:2',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    startCursor: 'cursor:2',
                                    endCursor: 'cursor:2',
                                    hasNextPage: false,
                                    hasPreviousPage: true,
                                },
                            },
                        },
                    },
                });

                const expectedUser = {
                    ...initialUser,
                    friends: {
                        ...initialUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', query),
                                },
                            },
                            {
                                cursor: 'cursor:2',
                                node: {
                                    __typename: 'User',
                                    id: 'node:2',
                                    name: 'name:node:2',
                                    ...createFragmentRef('node:2', query),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:2',
                            hasNextPage: false,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: expectedUser,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        // Assert hasNext reflects server response
                        hasNext: false,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        // Assert hasNext reflects server response
                        hasNext: false,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });
        });

        describe('refetch', () => {
            // The bulk of refetch behavior is covered in useRefetchableFragmentNode-test,
            // so this suite covers the pagination-related test cases.
            function expectRefetchRequestIsInFlight(expected: {
                data: mixed;
                gqlRefetchQuery?: any;
                hasNext: boolean;
                hasPrevious: boolean;
                inFlight: boolean;
                refetchQuery?: OperationDescriptor;
                refetchVariables: Variables;
                requestCount: number;
            }) {
                expect(fetch).toBeCalledTimes(expected.requestCount);
                const fetchCall = fetch.mock.calls.find((call) => {
                    return (
                        areEqual(call[0], (expected.gqlRefetchQuery ?? gqlPaginationQuery).params) &&
                        areEqual(call[1], expected.refetchVariables) &&
                        areEqual(call[2], { force: true })
                    );
                });
                const isInFlight = fetchCall != null;
                expect(isInFlight).toEqual(expected.inFlight);
            }

            function expectFragmentIsRefetching(
                renderer: any,
                expected: {
                    data: any;
                    hasNext: boolean;
                    hasPrevious: boolean;
                    refetchVariables: Variables;
                    refetchQuery?: OperationDescriptor;
                    gqlRefetchQuery?: any;
                },
            ) {
                expect(renderSpy).toBeCalledTimes(0);
                renderSpy.mockClear();

                // Assert refetch query was fetched
                expectRefetchRequestIsInFlight({
                    ...expected,
                    inFlight: true,
                    requestCount: 1,
                });

                // Assert component suspended
                expect(renderSpy).toBeCalledTimes(0);
                expect(renderer.toJSON()).toEqual('Fallback');

                // Assert query is retained by loadQuery and
                // tentatively retained while component is suspended
                // $FlowFixMe[method-unbinding] added when improving typing for this parameters
                expect(environment.retain).toBeCalledTimes(1);
                // $FlowFixMe[method-unbinding] added when improving typing for this parameters
                expect(environment.retain.mock.calls[0][0]).toEqual(expected.refetchQuery ?? paginationQuery);
            }

            it('refetches new variables correctly when refetching new id', () => {
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    refetch({ id: '4' });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    after: null,
                    first: 1,
                    before: null,
                    last: null,
                    id: '4',
                    isViewerFriendLocal: false,
                    orderby: ['name'],
                    scale: null,
                };
                paginationQuery = createOperationDescriptor(gqlPaginationQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    refetchVariables,
                    refetchQuery: paginationQuery,
                });

                // Mock network response
                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '4',
                            name: 'Mark',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:100',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:100',
                                            name: 'name:node:100',
                                            username: 'username:node:100',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:100',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:100',
                                },
                            },
                        },
                    },
                });

                // Assert fragment is rendered with new data
                const expectedUser = {
                    id: '4',
                    name: 'Mark',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:100',
                                node: {
                                    __typename: 'User',
                                    id: 'node:100',
                                    name: 'name:node:100',
                                    ...createFragmentRef('node:100', paginationQuery),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:100',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:100',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                // Assert refetch query was retained by loadQuery and the component
                expect(release).not.toBeCalled();
                // $FlowFixMe[method-unbinding] added when improving typing for this parameters
                expect(environment.retain).toBeCalledTimes(1);
                // $FlowFixMe[method-unbinding] added when improving typing for this parameters
                expect(environment.retain.mock.calls[0][0]).toEqual(paginationQuery);
            });

            it('refetches new variables correctly when refetching same id', () => {
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    refetch({ isViewerFriendLocal: true, orderby: ['lastname'] });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    after: null,
                    first: 1,
                    before: null,
                    last: null,
                    id: '1',
                    isViewerFriendLocal: true,
                    orderby: ['lastname'],
                    scale: null,
                };
                paginationQuery = createOperationDescriptor(gqlPaginationQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    refetchVariables,
                    refetchQuery: paginationQuery,
                });

                // Mock network response
                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:100',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:100',
                                            name: 'name:node:100',
                                            username: 'username:node:100',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:100',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:100',
                                },
                            },
                        },
                    },
                });

                // Assert fragment is rendered with new data
                const expectedUser = {
                    id: '1',
                    name: 'Alice',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:100',
                                node: {
                                    __typename: 'User',
                                    id: 'node:100',
                                    name: 'name:node:100',
                                    ...createFragmentRef('node:100', paginationQuery),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:100',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:100',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                // Assert refetch query was retained
                expect(release).not.toBeCalled();
                expect(environment.retain).toBeCalledTimes(1);
                expect(environment.retain.mock.calls[0][0]).toEqual(paginationQuery);
            });

            it('refetches with correct id from refetchable fragment when using nested fragment', () => {
                // Populate store with data for query using nested fragment
                environment.commitPayload(queryNestedFragment, {
                    node: {
                        __typename: 'Feedback',
                        id: '<feedbackid>',
                        actor: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:1',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:1',
                                            name: 'name:node:1',
                                            username: 'username:node:1',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:1',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:1',
                                },
                            },
                        },
                    },
                });

                // Get fragment ref for user using nested fragment
                const userRef = (environment.lookup(queryNestedFragment.fragment).data as any)?.node?.actor;

                initialUser = {
                    id: '1',
                    name: 'Alice',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                    name: 'name:node:1',
                                    ...createFragmentRef('node:1', queryNestedFragment),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:1',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:1',
                        },
                    },
                };

                const renderer = renderFragment({ owner: queryNestedFragment, userRef });
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    refetch({ isViewerFriendLocal: true, orderby: ['lastname'] });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    after: null,
                    first: 1,
                    before: null,
                    last: null,
                    // The id here should correspond to the user id, and not the
                    // feedback id from the query variables (i.e. `<feedbackid>`)
                    id: '1',
                    isViewerFriendLocal: true,
                    orderby: ['lastname'],
                    scale: null,
                };
                paginationQuery = createOperationDescriptor(gqlPaginationQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    refetchVariables,
                    refetchQuery: paginationQuery,
                });

                // Mock network response
                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:100',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:100',
                                            name: 'name:node:100',
                                            username: 'username:node:100',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:100',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:100',
                                },
                            },
                        },
                    },
                });

                // Assert fragment is rendered with new data
                const expectedUser = {
                    id: '1',
                    name: 'Alice',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:100',
                                node: {
                                    __typename: 'User',
                                    id: 'node:100',
                                    name: 'name:node:100',
                                    ...createFragmentRef('node:100', paginationQuery),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:100',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:100',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                // Assert refetch query was retained
                expect(release).not.toBeCalled();
                expect(environment.retain).toBeCalledTimes(1);
                expect(environment.retain.mock.calls[0][0]).toEqual(paginationQuery);
            });

            it('loads more items correctly after refetching', () => {
                const renderer = renderFragment();
                expectFragmentResults([
                    {
                        data: initialUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    refetch({ isViewerFriendLocal: true, orderby: ['lastname'] });
                });

                // Assert that fragment is refetching with the right variables and
                // suspends upon refetch
                const refetchVariables = {
                    after: null,
                    first: 1,
                    before: null,
                    last: null,
                    id: '1',
                    isViewerFriendLocal: true,
                    orderby: ['lastname'],
                    scale: null,
                };
                paginationQuery = createOperationDescriptor(gqlPaginationQuery, refetchVariables, {
                    force: true,
                });
                expectFragmentIsRefetching(renderer, {
                    data: initialUser,
                    hasNext: true,
                    hasPrevious: false,
                    refetchVariables,
                    refetchQuery: paginationQuery,
                });

                // Mock network response
                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:100',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:100',
                                            name: 'name:node:100',
                                            username: 'username:node:100',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:100',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:100',
                                },
                            },
                        },
                    },
                });

                // Assert fragment is rendered with new data
                const expectedUser = {
                    id: '1',
                    name: 'Alice',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:100',
                                node: {
                                    __typename: 'User',
                                    id: 'node:100',
                                    name: 'name:node:100',
                                    ...createFragmentRef('node:100', paginationQuery),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:100',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:100',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        data: expectedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                // Assert refetch query was retained
                expect(release).not.toBeCalled();
                expect(environment.retain).toBeCalledTimes(1);
                expect(environment.retain.mock.calls[0][0]).toEqual(paginationQuery);

                // Paginate after refetching
                fetch.mockClear();
                TestRenderer.act(() => {
                    loadNext(1);
                });
                const paginationVariables = {
                    id: '1',
                    after: 'cursor:100',
                    first: 1,
                    before: null,
                    last: null,
                    isViewerFriendLocal: true,
                    orderby: ['lastname'],
                    scale: null,
                };
                expectFragmentIsLoadingMore(renderer, 'forward', {
                    data: expectedUser,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });

                resolveQuery({
                    data: {
                        node: {
                            __typename: 'User',
                            id: '1',
                            name: 'Alice',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:200',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:200',
                                            name: 'name:node:200',
                                            username: 'username:node:200',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    startCursor: 'cursor:200',
                                    endCursor: 'cursor:200',
                                    hasNextPage: true,
                                    hasPreviousPage: true,
                                },
                            },
                        },
                    },
                });

                const paginatedUser = {
                    ...expectedUser,
                    friends: {
                        ...expectedUser.friends,
                        edges: [
                            {
                                cursor: 'cursor:100',
                                node: {
                                    __typename: 'User',
                                    id: 'node:100',
                                    name: 'name:node:100',
                                    ...createFragmentRef('node:100', paginationQuery),
                                },
                            },
                            {
                                cursor: 'cursor:200',
                                node: {
                                    __typename: 'User',
                                    id: 'node:200',
                                    name: 'name:node:200',
                                    ...createFragmentRef('node:200', paginationQuery),
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:200',
                            hasNextPage: true,
                            hasPreviousPage: false,
                            startCursor: 'cursor:100',
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: paginatedUser,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: paginatedUser,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
            });
        });

        describe('paginating @fetchable types', () => {
            let gqlRefetchQuery;

            beforeEach(() => {
                gqlQuery = getRequest(graphql`
                    query usePaginationFragmentTestStoryQuery($id: ID!) {
                        nonNodeStory(id: $id) {
                            ...usePaginationFragmentTestStoryFragment
                        }
                    }
                `);

                gqlFragment = getFragment(graphql`
                    fragment usePaginationFragmentTestStoryFragment on NonNodeStory
                    @argumentDefinitions(count: { type: "Int", defaultValue: 10 }, cursor: { type: "ID" })
                    @refetchable(queryName: "usePaginationFragmentTestStoryFragmentRefetchQuery") {
                        comments(first: $count, after: $cursor) @connection(key: "StoryFragment_comments") {
                            edges {
                                node {
                                    id
                                }
                            }
                        }
                    }
                `);
                gqlPaginationQuery =
                    require('./__generated__/usePaginationFragmentTestStoryFragmentRefetchQuery.graphql').default;
                const fetchVariables = { id: 'a' };
                //gqlRefetchQuery = generated.StoryFragmentRefetchQuery;
                invariant(
                    areEqual(gqlFragment.metadata?.refetch?.operation, gqlPaginationQuery),
                    'useRefetchableFragment-test: Expected refetchable fragment metadata to contain operation.',
                );

                query = createOperationDescriptor(gqlQuery, fetchVariables, {
                    force: true,
                });

                environment.commitPayload(query, {
                    nonNodeStory: {
                        __typename: 'NonNodeStory',
                        id: 'a',
                        fetch_id: 'fetch:a',
                        comments: {
                            edges: [
                                {
                                    cursor: 'edge:0',
                                    node: {
                                        __typename: 'Comment',
                                        id: 'comment:0',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'edge:0',
                                hasNextPage: true,
                            },
                        },
                    },
                });
            });

            it('loads and renders next items in connection', () => {
                const callback = jest.fn();
                const renderer = renderFragment();
                const initialData = {
                    fetch_id: 'fetch:a',
                    comments: {
                        edges: [
                            {
                                cursor: 'edge:0',
                                node: {
                                    __typename: 'Comment',
                                    id: 'comment:0',
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'edge:0',
                            hasNextPage: true,
                        },
                    },
                };
                expectFragmentResults([
                    {
                        data: initialData,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);

                TestRenderer.act(() => {
                    loadNext(1, { onComplete: callback });
                });
                const paginationVariables = {
                    id: 'fetch:a',
                    cursor: 'edge:0',
                    count: 1,
                };
                expectFragmentIsLoadingMore(renderer, 'forward', {
                    data: initialData,
                    hasNext: true,
                    hasPrevious: false,
                    paginationVariables,
                    gqlPaginationQuery,
                });
                expect(callback).toBeCalledTimes(0);

                resolveQuery({
                    data: {
                        fetch__NonNodeStory: {
                            id: 'a',
                            fetch_id: 'fetch:a',
                            comments: {
                                edges: [
                                    {
                                        cursor: 'edge:1',
                                        node: {
                                            __typename: 'Comment',
                                            id: 'comment:1',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'edge:1',
                                    hasNextPage: true,
                                },
                            },
                        },
                    },
                });

                const expectedData = {
                    ...initialData,
                    comments: {
                        edges: [
                            ...initialData.comments.edges,
                            {
                                cursor: 'edge:1',
                                node: {
                                    __typename: 'Comment',
                                    id: 'comment:1',
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'edge:1',
                            hasNextPage: true,
                        },
                    },
                };
                expectFragmentResults([
                    {
                        // First update has updated connection
                        data: expectedData,
                        isLoadingNext: true,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                    {
                        // Second update sets isLoading flag back to false
                        data: expectedData,
                        isLoadingNext: false,
                        isLoadingPrevious: false,
                        hasNext: true,
                        hasPrevious: false,
                    },
                ]);
                expect(callback).toBeCalledTimes(1);
            });
        });
    });
});
