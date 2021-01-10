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

/* eslint-disable */

import * as React from 'react';
import * as ReactTestRenderer from 'react-test-renderer';
import {
    usePagination,
    RelayEnvironmentProvider,
    useRelayEnvironment,
    RefetchOptions,
} from '../src';
import { forceCache } from '../src/Utils';

function createHooks(component, options?: any) {
    const result = ReactTestRenderer.create(component, options);
    ReactTestRenderer.act(() => {
        jest.runAllImmediates();
    });
    return result;
}

const ReactRelayPaginationContainer = {
    createContainer: (Component, spec, connectionConfigs) => (props: any) => {
        const { user, ...others } = props;
        const environment = useRelayEnvironment();
        const dataPag = usePagination(spec, user);
        const {
            data,
            hasNext: hasMoreHooks,
            isLoading,
            isLoadingNext,
            loadNext: loadMoreHooks,
            refetch: refetchConnectionHooks,
            errorNext,
        } = dataPag;
        const loadMore = (count, callback: (error: Error) => void, options?: RefetchOptions) => {
            // @ts-ignore
            return loadMoreHooks(count, {
                onComplete: callback,
            });
        };
        const refetchConnection = (count, callback, variables) => {
            const varia = {
                count,
                ...variables,
            };
            return refetchConnectionHooks(varia, { onComplete: callback });
        };
        return (
            <Component
                user={data}
                //hasMore={hasMoreHooks}
                //isLoadingNext={isLoadingNextNext}
                {...others}
                relay={{
                    environment,
                    refetchConnection,
                    hasMore: hasMoreHooks,
                    isLoadingNext,
                    loadMore,
                    isLoading,
                    errorNext,
                }}
            />
        );
    },
};

const {
    createReaderSelector,
    createOperationDescriptor,
    ConnectionHandler,
    ConnectionInterface,
} = require('relay-runtime');
const {
    createMockEnvironment,
    generateAndCompile,
    unwrapContainer,
} = require('relay-test-utils-internal');

describe('ReactRelayPaginationContainer', () => {
    let TestComponent;
    let TestContainer;
    let UserFragment;
    let UserQuery;

    let environment;
    let getConnectionFromProps;
    let getVariables;
    let hasMore;
    let isLoadingNext;
    let loadMore;
    let ownerUser1;
    let ownerUser1WithOtherVar;
    let ownerUser2;
    let refetchConnection;
    let render;
    let variables;
    let UserFragmentRefetchQuery;

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

        environment = createMockEnvironment({
            handlerProvider: () => ConnectionHandler,
        });
        ({ UserFragment, UserQuery, UserFragmentRefetchQuery } = generateAndCompile(`
      query UserQuery(
        $after: ID
        $count: Int!
        $id: ID!
        $orderby: [String]
        $isViewerFriend: Boolean
      ) {
        node(id: $id) {
          id
          __typename
          ...UserFragment @arguments(isViewerFriendLocal: $isViewerFriend, orderby: $orderby)
        }
      }

      fragment UserFragment on User
      @refetchable(queryName: "UserFragmentRefetchQuery")
        @argumentDefinitions(
          isViewerFriendLocal: {type: "Boolean", defaultValue: false}
          orderby: {type: "[String]"}
        ) {
        id
        friends(
          after: $after,
          first: $count,
          orderby: $orderby,
          isViewerFriend: $isViewerFriendLocal
        ) @connection(key: "UserFragment_friends") {
          edges {
            node {
              id
            }
          }
        }
      }
    `));

        UserFragment.metadata.refetch.operation = UserFragmentRefetchQuery;

        render = jest.fn((props) => {
            ({ hasMore, isLoadingNext, loadMore, refetchConnection } = props.relay);
            return <div />;
        });
        variables = {
            after: null,
            count: 1,
            id: '4',
            orderby: ['name'],
            isViewerFriend: false,
        };

        getConnectionFromProps = jest.fn((user) => user.friends);
        getVariables = jest.fn((user, { count, cursor }, fragmentVariables) => {
            return {
                ...fragmentVariables,
                id: user.id,
                after: cursor,
                count,
            };
        });
        TestComponent = render;
        TestComponent.displayName = 'TestComponent';
        TestContainer = ReactRelayPaginationContainer.createContainer(TestComponent, UserFragment, {
            direction: 'forward',
            getConnectionFromProps,
            getFragmentVariables: (vars, totalCount) => ({
                ...vars,
                isViewerFriendLocal: vars.isViewerFriend,
                count: totalCount,
            }),
            getVariables,
            query: UserQuery,
        });
        // Pre-populate the store with data
        ownerUser1 = createOperationDescriptor(UserQuery, variables);
        environment.commitPayload(ownerUser1, {
            node: {
                id: '4',
                __typename: 'User',
                friends: {
                    edges: [
                        {
                            cursor: 'cursor:1',
                            node: {
                                __typename: 'User',
                                id: 'node:1',
                            },
                        },
                    ],
                    pageInfo: {
                        endCursor: 'cursor:1',
                        hasNextPage: true,
                    },
                },
            },
        });
        ownerUser1WithOtherVar = createOperationDescriptor(UserQuery, {
            ...variables,
            isViewerFriend: true,
        });
        environment.commitPayload(ownerUser1WithOtherVar, {
            node: {
                id: '4',
                __typename: 'User',
                friends: {
                    edges: [],
                    pageInfo: {
                        endCursor: null,
                        hasNextPage: false,
                    },
                },
            },
        });
        ownerUser2 = createOperationDescriptor(UserQuery, {
            ...variables,
            id: '842472',
        });
        environment.commitPayload(ownerUser2, {
            node: {
                id: '842472',
                __typename: 'User',
                friends: {
                    edges: [],
                    pageInfo: {
                        endCursor: null,
                        hasNextPage: false,
                    },
                },
            },
        });
    });

    /*it('generates a name for containers', () => {
    expect(TestContainer.$$typeof).toBe(Symbol.for('react.forward_ref'));
    expect(TestContainer.render.displayName).toBe('Relay(TestComponent)');
  });

  it('throws for invalid fragments', () => {
    expect(() => {
      ReactRelayPaginationContainer.createContainer(TestComponent, {
        foo: null,
      });
    }).toThrowError(
      'Could not create Relay Container for `TestComponent`. ' +
        'The value of fragment `foo` was expected to be a fragment, ' +
        'got `null` instead.',
    );
  });*/

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
            relay: {
                environment: expect.any(Object),
                hasMore: false,
                isLoadingNext: false,
                isLoading: false,
                errorNext: null,
                loadMore: expect.any(Function),
                refetchConnection: expect.any(Function),
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
            relay: {
                environment: expect.any(Object),
                hasMore: false,
                isLoadingNext: false,
                isLoading: false,
                errorNext: null,
                loadMore: expect.any(Function),
                refetchConnection: expect.any(Function),
            },
            user: null,
        });
        // Does not subscribe to updates (id is unknown)
        expect(environment.subscribe.mock.calls.length).toBe(0);
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
                friends: {
                    edges: [
                        {
                            cursor: 'cursor:1',
                            node: {
                                __typename: 'User',
                                id: 'node:1',
                            },
                        },
                    ],
                    pageInfo: {
                        endCursor: 'cursor:1',
                        hasNextPage: true,
                    },
                },
            },
            relay: {
                environment: expect.any(Object),
                hasMore: true,
                isLoadingNext: false,
                isLoading: false,
                errorNext: null,
                loadMore: expect.any(Function),
                refetchConnection: expect.any(Function),
            },
        });
        // Subscribes for updates
        expect(environment.subscribe.mock.calls.length).toBe(1);
        expect(environment.subscribe.mock.calls[0][0]).toEqual({
            data: expect.any(Object),
            isMissingData: false,
            missingRequiredFields: null,
            seenRecords: expect.any(Object),
            selector: createReaderSelector(
                UserFragment,
                '4',
                {
                    after: null,
                    count: 1,
                    orderby: ['name'],
                    isViewerFriendLocal: false,
                },
                ownerUser1.request,
            ),
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
            variables,
            data: {
                id: '4',
                friends: null, // set to null
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
                friends: null,
            },
            relay: {
                environment: expect.any(Object),
                hasMore: false,
                isLoadingNext: false,
                isLoading: false,
                errorNext: null,
                loadMore: expect.any(Function),
                refetchConnection: expect.any(Function),
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
                friends: {
                    edges: [],
                    pageInfo: {
                        endCursor: null,
                        hasNextPage: false,
                    },
                },
            },
            relay: {
                environment: expect.any(Object),
                hasMore: false,
                isLoadingNext: false,
                isLoading: false,
                errorNext: null,
                loadMore: expect.any(Function),
                refetchConnection: expect.any(Function),
            },
        });
        jest.runAllTimers();
        // Container subscribes for updates on new props
        expect(environment.subscribe.mock.calls.length).toBe(1);
        expect(environment.subscribe.mock.calls[0][0]).toEqual({
            data: expect.any(Object),
            isMissingData: false,
            missingRequiredFields: null,
            seenRecords: expect.any(Object),
            selector: createReaderSelector(
                UserFragment,
                '842472',
                {
                    after: null,
                    count: 1,
                    orderby: ['name'],
                    isViewerFriendLocal: false,
                },
                ownerUser2.request,
            ),
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

        userPointer = environment.lookup(ownerUser1WithOtherVar.fragment, ownerUser1WithOtherVar)
            .data.node;
        instance.getInstance().setProps({
            user: userPointer,
        });

        // Data & Variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            user: {
                id: '4',
                friends: {
                    edges: [],
                    pageInfo: {
                        endCursor: null,
                        hasNextPage: false,
                    },
                },
            },
            relay: {
                environment: expect.any(Object),
                hasMore: false,
                isLoadingNext: false,
                isLoading: false,
                errorNext: null,
                loadMore: expect.any(Function),
                refetchConnection: expect.any(Function),
            },
        });

        jest.runAllTimers();
        // Subscribes for updates
        expect(environment.subscribe.mock.calls.length).toBe(1);
        expect(environment.subscribe.mock.calls[0][0]).toEqual({
            data: expect.any(Object),
            isMissingData: false,
            missingRequiredFields: null,
            seenRecords: expect.any(Object),
            selector: createReaderSelector(
                UserFragment,
                '4',
                {
                    after: null,
                    count: 1,
                    orderby: ['name'],
                    isViewerFriendLocal: true,
                },
                ownerUser1WithOtherVar.request,
            ),
        });
    });

    it('resolves new props when ids dont change after paginating', () => {
        let userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

        const instance = createHooks(
            <ContextSetter environment={environment}>
                <TestContainer user={userPointer} />
            </ContextSetter>,
        );

        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        // Paginate first
        loadMore(1, jest.fn());
        environment.mock.resolve(UserFragmentRefetchQuery, {
            data: {
                node: {
                    id: '4',
                    __typename: 'User',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:2',
                                node: {
                                    __typename: 'User',
                                    id: 'node:2',
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:2',
                            hasNextPage: true,
                        },
                    },
                },
            },
        });
        expect(render.mock.calls.length).toBe(3);
        expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);
        expect(render.mock.calls[0][0].relay.isLoadingNext).toBe(true);
        expect(render.mock.calls[1][0].user.friends.edges.length).toBe(2);
        expect(render.mock.calls[1][0].relay.isLoadingNext).toBe(true);
        expect(render.mock.calls[2][0].user.friends.edges.length).toBe(2);
        expect(render.mock.calls[2][0].relay.isLoadingNext).toBe(false);
        render.mockClear();
        environment.subscribe.mockClear();

        // Pass an updated user pointer that references different variables
        userPointer = environment.lookup(ownerUser1WithOtherVar.fragment, ownerUser1WithOtherVar)
            .data.node;
        instance.getInstance().setProps({
            user: userPointer,
        });
        jest.runAllTimers();

        // Data & Variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            user: {
                id: '4',
                friends: {
                    edges: [],
                    pageInfo: {
                        endCursor: null,
                        hasNextPage: false,
                    },
                },
            },
            relay: {
                environment: expect.any(Object),
                hasMore: false,
                isLoadingNext: false,
                isLoading: false,
                errorNext: null,
                loadMore: expect.any(Function),
                refetchConnection: expect.any(Function),
            },
        });
        jest.runAllTimers();
        // Subscribes for updates
        expect(environment.subscribe.mock.calls.length).toBe(1);
        expect(environment.subscribe.mock.calls[0][0]).toEqual({
            data: expect.any(Object),
            isMissingData: false,
            missingRequiredFields: null,
            seenRecords: expect.any(Object),
            selector: createReaderSelector(
                UserFragment,
                '4',
                {
                    after: null,
                    count: 1,
                    orderby: ['name'],
                    isViewerFriendLocal: true,
                },
                ownerUser1WithOtherVar.request,
            ),
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

        expect(JSON.stringify(render.mock.calls[0][0])).toEqual(JSON.stringify(initialProps)); //changed expect(render).toBeCalled();
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
        ); // changed
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
        ); // changed
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
        expect(JSON.stringify(render.mock.calls[0][0])).toEqual(JSON.stringify(initialProps)); // changed
        expect(render.mock.calls[0][0].arr).toBe(nextArr);
        expect(render.mock.calls[0][0].obj).toBe(nextObj);
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
    });

    /* removed
  it('fails if missing @connection directive', () => {
    ({UserFragment, UserQuery} = generateAndCompile(`
      query UserQuery(
        $after: ID
        $count: Int!
        $id: ID!
        $orderby: [String]
      ) {
        node(id: $id) {
          id
          ...UserFragment
        }
      }

      fragment UserFragment on User {
        friends(after: $after, first: $count, orderby: $orderby) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    `));

    expect(() => {
      ReactRelayPaginationContainer.createContainer(
        TestComponent,
        {
          user: () => UserFragment,
        },
        {
          direction: 'forward',
          getConnectionFromProps,
          getFragmentVariables: (vars, totalCount) => ({
            ...vars,
            count: totalCount,
          }),
          getVariables,
          query: UserQuery,
        },
      );
    }).toThrowError(
      'ReactRelayPaginationContainer: A @connection directive must be present.',
    );
  });
*/
    it('does not fail invariant if one fragment has a @connection directive', () => {
        let ViewerFragment;
        ({
            UserFragment,
            UserQuery,
            ViewerFragment,
            UserFragmentRefetchQuery,
        } = generateAndCompile(`
      query UserQuery(
        $after: ID
        $count: Int!
        $id: ID!
        $orderby: [String]
      ) {
        viewer {
          ...ViewerFragment
        }
        node(id: $id) {
          id
          ...UserFragment
        }
      }

      fragment ViewerFragment on Viewer {
        actor{
          id
        }
      }

      fragment UserFragment on User
    @refetchable(queryName: "UserFragmentRefetchQuery") {
        friends(after: $after, first: $count, orderby: $orderby) @connection(
          key: "UserFragment_friends"
        ) {
          edges {
            node {
              id
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    `));

        UserFragment.metadata.refetch.operation = UserFragmentRefetchQuery;

        TestContainer = ReactRelayPaginationContainer.createContainer(
            TestComponent,
            UserFragment,
            /*{
        user: () => UserFragment,
        viewer: () => ViewerFragment,
      },*/
            {
                direction: 'forward',
                getConnectionFromProps,
                getFragmentVariables: (vars, totalCount) => ({
                    ...vars,
                    count: totalCount,
                }),
                getVariables,
                query: UserQuery,
            },
        );

        expect(() => {
            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer />
                </ContextSetter>,
            );
        }).not.toThrow();
    });

    describe('hasMore()', () => {
        it('returns true if there are more items', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0]).toEqual({
                user: {
                    id: '4',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:1',
                                node: {
                                    __typename: 'User',
                                    id: 'node:1',
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:1',
                            hasNextPage: true,
                        },
                    },
                },
                relay: {
                    environment: expect.any(Object),
                    hasMore: true,
                    isLoadingNext: false,
                    isLoading: false,
                    errorNext: null,
                    loadMore: expect.any(Function),
                    refetchConnection: expect.any(Function),
                },
            });
        });

        it('returns false if there are no edges', () => {
            environment.commitPayload(ownerUser2, {
                node: {
                    id: 'noedges',
                    __typename: 'User',
                    friends: {
                        edges: null,
                        pageInfo: {
                            endCursor: '<cursor>',
                            hasNextPage: true,
                        },
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0]).toEqual({
                user: {
                    id: 'noedges',
                    friends: {
                        edges: null,
                        pageInfo: {
                            endCursor: '<cursor>',
                            hasNextPage: true,
                        },
                    },
                },
                relay: {
                    environment: expect.any(Object),
                    hasMore: false,
                    isLoadingNext: false,
                    isLoading: false,
                    errorNext: null,
                    loadMore: expect.any(Function),
                    refetchConnection: expect.any(Function),
                },
            });
        });

        it('returns false if the end cursor is null-ish', () => {
            environment.commitPayload(ownerUser2, {
                node: {
                    id: 'cursornull-ish',
                    __typename: 'User',
                    friends: {
                        edges: [],
                        pageInfo: {
                            endCursor: null,
                            hasNextPage: true,
                        },
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0]).toEqual({
                user: {
                    id: 'cursornull-ish',
                    friends: {
                        edges: [],
                        pageInfo: {
                            endCursor: null,
                            hasNextPage: true,
                        },
                    },
                },
                relay: {
                    environment: expect.any(Object),
                    hasMore: false,
                    isLoadingNext: false,
                    isLoading: false,
                    errorNext: null,
                    loadMore: expect.any(Function),
                    refetchConnection: expect.any(Function),
                },
            });
        });

        it('returns false if pageInfo.hasNextPage is false-ish', () => {
            environment.commitPayload(ownerUser2, {
                node: {
                    id: 'hasNextPage-false-ish',
                    __typename: 'User',
                    friends: {
                        edges: [],
                        pageInfo: {
                            endCursor: '<cursor>',
                            hasNextPage: false,
                        },
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0]).toEqual({
                user: {
                    id: 'hasNextPage-false-ish',
                    friends: {
                        edges: [],
                        pageInfo: {
                            endCursor: '<cursor>',
                            hasNextPage: false,
                        },
                    },
                },
                relay: {
                    environment: expect.any(Object),
                    hasMore: false,
                    isLoadingNext: false,
                    isLoading: false,
                    errorNext: null,
                    loadMore: expect.any(Function),
                    refetchConnection: expect.any(Function),
                },
            });
        });

        it('updates after pagination (if more results)', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            ReactTestRenderer.create(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);

            render.mockClear();
            ReactTestRenderer.act(() => {
                loadMore(1, jest.fn());
            });

            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '4',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:2',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:2',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:2',
                                hasNextPage: true, // <-- has more results
                            },
                        },
                    },
                },
            });
            expect(render.mock.calls.length).toBe(3);
            expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);
            expect(render.mock.calls[0][0].relay.isLoadingNext).toBe(true);
            expect(render.mock.calls[1][0].user.friends.edges.length).toBe(2);
            expect(render.mock.calls[1][0].relay.isLoadingNext).toBe(true);
            expect(render.mock.calls[2][0].user.friends.edges.length).toBe(2);
            expect(render.mock.calls[2][0].relay.isLoadingNext).toBe(false);
            expect(render.mock.calls[2][0].relay.hasMore).toBe(true);
        });

        it('updates after pagination (if no more results)', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            ReactTestRenderer.create(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);

            render.mockClear();
            ReactTestRenderer.act(() => {
                loadMore(1, jest.fn());
            });

            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '4',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:2',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:2',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:2',
                                hasNextPage: false, // <-- end of list
                            },
                        },
                    },
                },
            });
            expect(render.mock.calls.length).toBe(3);
            expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);
            expect(render.mock.calls[0][0].relay.isLoadingNext).toBe(true);
            expect(render.mock.calls[1][0].user.friends.edges.length).toBe(2);
            expect(render.mock.calls[1][0].relay.isLoadingNext).toBe(true);
            expect(render.mock.calls[2][0].user.friends.edges.length).toBe(2);
            expect(render.mock.calls[2][0].relay.isLoadingNext).toBe(false);
            expect(render.mock.calls[2][0].relay.hasMore).toBe(false);
        });
    });

    describe('isLoadingNext()', () => {
        beforeEach(() => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            environment.mock.clearCache();
            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
        });

        it('returns false initially', () => {
            expect(render.mock.calls[0][0].relay.isLoadingNext).toBe(false);
        });

        it('returns true when a fetch is pending', () => {
            loadMore(10, jest.fn());
            expect(render.mock.calls[1][0].relay.isLoadingNext).toBe(true);
        });

        /*
        it('returns false if a fetch is cancelled', () => {
            const { dispose } = loadMore(10, jest.fn());
            expect(render.mock.calls[1][0].relay.isLoadingNext).toBe(true);
            dispose();
            expect(render.mock.calls[2][0].relay.isLoadingNext).toBe(false);
        });*/

        it('returns false once a fetch completes', () => {
            expect.assertions(1);
            loadMore(1, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        // The resuls don't matter, only that the fetch resolved
                        friends: null,
                    },
                },
            });
            expect(render.mock.calls[3][0].relay.isLoadingNext).toBe(false);
        });

        /*
        it('returns false in the loadMore callback', () => {
            expect.assertions(2);
            loadMore(1, () => {
                expect(isLoadingNext()).toBe(false);
            });
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        // The resuls don't matter, only that the fetch resolved
                        friends: null,
                    },
                },
            });
            expect(isLoadingNext()).toBe(false);
        });

        it('returns false if a cached response exists', () => {
            environment.mock.cachePayload(
                UserQuery,
                {
                    after: 'cursor:1',
                    count: 1,
                    id: '4',
                    orderby: ['name'],
                    isViewerFriend: false,
                },
                {
                    data: {
                        node: {
                            id: '4',
                            __typename: 'User',
                            friends: {
                                edges: [
                                    {
                                        cursor: 'cursor:2',
                                        node: {
                                            __typename: 'User',
                                            id: 'node:2',
                                        },
                                    },
                                ],
                                pageInfo: {
                                    endCursor: 'cursor:2',
                                    hasNextPage: true,
                                    hasPreviousPage: false,
                                    startCursor: 'cursor:2',
                                },
                            },
                        },
                    },
                },
            );
            loadMore(1, jest.fn());
            expect(isLoadingNext()).toBe(false);
        });
        */
    });

    describe('loadMore()', () => {
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

        /*
        it('returns null if there are no more items to fetch', () => {
            // Simulate empty connection data
            getConnectionFromProps.mockImplementation(() => null);
            variables = {
                after: 'cursor:1',
                count: 1,
                id: '4',
            };
            expect(loadMore(1, jest.fn())).toBe(null);
            expect(environment.mock.isLoading(UserFragmentRefetchQuery, variables)).toBe(false);
        });
        

        it('still calls callback if even if there are no more items to fetch', () => {
            // Simulate empty connection data
            getConnectionFromProps.mockImplementation(() => null);
            variables = {
                after: 'cursor:1',
                count: 1,
                id: '4',
            };
            let callbackCalled = false;
            expect(loadMore(1, () => (callbackCalled = true))).toBe(null);
            expect(environment.mock.isLoading(UserFragmentRefetchQuery, variables)).toBe(false);
            expect(callbackCalled).toBe(true);
        });
        */

        it('returns a disposable that can be called to cancel the fetch', () => {
            variables = {
                after: 'cursor:1',
                count: 1,
                id: '4',
            };
            const { dispose } = loadMore(1, jest.fn());
            const subscription = environment.execute.mock.subscriptions[0];
            expect(subscription.closed).toBe(false);
            dispose();
            expect(subscription.closed).toBe(true);
        });

        it('fetches the new variables', () => {
            variables = {
                after: 'cursor:1',
                count: 1,
                id: '4',
                orderby: ['name'],
                isViewerFriendLocal: false,
            };
            loadMore(1, jest.fn());
            expect(
                environment.mock.isLoading(UserFragmentRefetchQuery, variables, forceCache),
            ).toBe(true);
        });

        it('calls the callback when the fetch succeeds', () => {
            expect.assertions(2);
            const callback = jest.fn();
            variables = {
                after: 'cursor:1',
                count: 1,
                id: '4',
                orderby: ['name'],
                isViewerFriend: false,
            };
            loadMore(1, callback);
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: null,
                },
            });
            expect(callback.mock.calls.length).toBe(1);
            expect(callback.mock.calls[0][0]).toBe(null);
        });

        it('calls the callback when the fetch fails', () => {
            expect.assertions(2);
            const callback = jest.fn();
            loadMore(1, callback);
            const error = new Error('oops');
            environment.mock.reject(UserFragmentRefetchQuery, error);
            expect(callback.mock.calls.length).toBe(1);
            expect(callback).toBeCalledWith(error);
        });

        it('renders with the results of the new variables on success', () => {
            expect.assertions(5);
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);
            loadMore(1, jest.fn());
            expect(render.mock.calls.length).toBe(2);
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:2',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:2',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:2',
                                hasNextPage: true,
                            },
                        },
                    },
                },
            });
            expect(render.mock.calls.length).toBe(4);
            expect(render.mock.calls[3][0].user.friends.edges.length).toBe(2);
        });

        it('does not update variables on failure', () => {
            expect.assertions(5);
            render.mockClear();
            loadMore(1, jest.fn());
            const error = new Error('oops');
            environment.mock.reject(UserFragmentRefetchQuery, error);
            expect(render.mock.calls.length).toBe(2);
            expect(render.mock.calls[0][0].relay.isLoadingNext).toBe(true);
            expect(render.mock.calls[0][0].relay.errorNext).toBe(null);
            expect(render.mock.calls[1][0].relay.isLoadingNext).toBe(false);
            expect(render.mock.calls[1][0].relay.errorNext).toBe(error);
        });

        it('continues the fetch if new props refer to the same records', () => {
            loadMore(1, jest.fn());
            const subscription = environment.execute.mock.subscriptions[0];
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(subscription.closed).toBe(false);
        });

        it('cancels the fetch if new props refer to different records', () => {
            loadMore(1, jest.fn());
            const subscription = environment.execute.mock.subscriptions[0];
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(subscription.closed).toBe(true);
        });
        /*
        it('holds pagination results if new props refer to the same records', () => {
            expect.assertions(2);
            loadMore(1, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        // The resuls don't matter, only that their results are retained
                        friends: null,
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(references.length).toBe(1);
            expect(references[0].dispose).not.toBeCalled();
        });

        it('releases pagination results if new props refer to different records', () => {
            expect.assertions(2);
            loadMore(1, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        // The resuls don't matter, only that their results are retained
                        friends: null,
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(references.length).toBe(1);
            expect(references[0].dispose).toBeCalled();
        });

        it('releases pagination results if unmounted', () => {
            expect.assertions(2);
            loadMore(1, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        // The resuls don't matter, only that their results are retained
                        friends: null,
                    },
                },
            });
            instance.unmount();
            expect(references.length).toBe(1);
            expect(references[0].dispose).toBeCalled();
        });*/

        it('should not load more data if container is unmounted', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            variables = {};
            instance.unmount();
            const callback = jest.fn();
            loadMore(1, callback);
            expect(callback).not.toBeCalled();
        });
    });

    describe('refetchConnection()', () => {
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
            instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
        });

        it('returns a disposable that can be called to cancel the fetch', () => {
            variables = {
                count: 1,
                id: '4',
            };
            const { dispose } = refetchConnection(1, jest.fn());
            const subscription = environment.execute.mock.subscriptions[0];
            expect(subscription.closed).toBe(false);
            dispose();
            expect(subscription.closed).toBe(true);
        });

        it('fetches the new variables', () => {
            variables = {
                after: null,
                count: 1,
                id: '4',
                orderby: ['name'],
                isViewerFriendLocal: false,
            };
            refetchConnection(1, jest.fn());
            expect(
                environment.mock.isLoading(UserFragmentRefetchQuery, variables, forceCache),
            ).toBe(true);
        });

        it('calls the callback when the fetch succeeds', () => {
            expect.assertions(2);
            const callback = jest.fn();
            variables = {
                count: 1,
                id: '4',
            };
            refetchConnection(1, callback);
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: null,
                },
            });
            expect(callback.mock.calls.length).toBe(1);
            expect(callback.mock.calls[0][0]).toBe(null);
        });

        it('calls the callback when the fetch fails', () => {
            expect.assertions(2);
            const callback = jest.fn();
            refetchConnection(1, callback);
            const error = new Error('oops');
            environment.mock.reject(UserFragmentRefetchQuery, error);
            expect(callback.mock.calls.length).toBe(1);
            expect(callback).toBeCalledWith(error);
        });

        it('renders with the results of the new variables on success', () => {
            expect.assertions(6);
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);
            refetchConnection(1, jest.fn());
            expect(render.mock.calls.length).toBe(2);
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '4',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:2',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:2',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:2',
                                hasNextPage: true,
                            },
                        },
                    },
                },
            });
            expect(render.mock.calls.length).toBe(4);
            expect(render.mock.calls[3][0].user.friends.edges.length).toBe(1);
            expect(render.mock.calls[3][0].user.friends.edges[0].node.id).toBe('node:2');
        });
        /* removed
    it('renders with the results of the new variables after components received updated props (not related to the connection)', () => {
      expect.assertions(9);
      expect(render.mock.calls.length).toBe(1);
      // By default friends list should have 1 item
      expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);
      // Let's refetch with new variables
      refetchConnection(1, jest.fn(), {
        isViewerFriend: true,
      });
      expect(render.mock.calls.length).toBe(1);
      environment.mock.resolve(UserFragmentRefetchQuery, {
        data: {
          node: {
            __typename: 'User',
            id: '4',
            friends: {
              edges: [],
              pageInfo: {
                endCursor: null,
                hasNextPage: false,
              },
            },
          },
        },
      });
      expect(render.mock.calls.length).toBe(2);
      expect(render.mock.calls[1][0].user.friends.edges.length).toBe(0);
      expect(render.mock.calls[1][0]).toEqual({
        user: {
          id: '4',
          friends: {
            edges: [],
            pageInfo: {
              endCursor: null,
              hasNextPage: false,
            },
          },
        },
        relay: {
          environment: expect.any(Object),
          hasMore: false,
          isLoadingNext: false,
          loadMore: expect.any(Function),
          refetchConnection: expect.any(Function),
        },
      });

      // This should trigger cWRP in the ReactRelayPaginationContainer
      instance.getInstance().setProps({
        someProp: 'test',
      });
      expect(render.mock.calls.length).toBe(3);
      expect(render.mock.calls[2][0].user.friends.edges.length).toBe(0);
      expect(render.mock.calls[2][0]).toEqual({
        user: {
          id: '4',
          friends: {
            edges: [],
            pageInfo: {
              endCursor: null,
              hasNextPage: false,
            },
          },
        },
        relay: {
          environment: expect.any(Object),
          hasMore: false,
          isLoadingNext: false,
          loadMore: expect.any(Function),
          refetchConnection: expect.any(Function),
        },
        someProp: 'test',
      });
    });
*/
        it('does not update variables on failure', () => {
            expect.assertions(3);
            render.mockClear();
            refetchConnection(1, jest.fn());
            environment.mock.reject(UserFragmentRefetchQuery, new Error('oops'));
            expect(render.mock.calls.length).toBe(2);
            expect(render.mock.calls[0][0].relay.isLoading).toBe(true);
            expect(render.mock.calls[1][0].relay.isLoading).toBe(false);
        });

        it('continues the fetch if new props refer to the same records', () => {
            refetchConnection(1, jest.fn());
            const subscription = environment.execute.mock.subscriptions[0];
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(subscription.closed).toBe(false);
        });

        it('cancels the fetch if new props refer to different records', () => {
            refetchConnection(1, jest.fn());
            const subscription = environment.execute.mock.subscriptions[0];
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(subscription.closed).toBe(true);
        });

        it('holds pagination results if new props refer to the same records', () => {
            expect.assertions(2);
            refetchConnection(1, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        // The resuls don't matter, only that their results are retained
                        friends: null,
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(references.length).toBe(1);
            expect(references[0].dispose).not.toBeCalled();
        });

        it('releases pagination results if new props refer to different records', () => {
            expect.assertions(2);
            refetchConnection(1, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        // The resuls don't matter, only that their results are retained
                        friends: null,
                    },
                },
            });
            const userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({ user: userPointer });
            expect(references.length).toBe(1);
            expect(references[0].dispose).toBeCalled();
        });

        it('releases pagination results if unmounted', () => {
            expect.assertions(2);
            refetchConnection(1, jest.fn());
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        // The resuls don't matter, only that their results are retained
                        friends: null,
                    },
                },
            });
            instance.unmount();
            expect(references.length).toBe(1);
            expect(references[0].dispose).toBeCalled();
        });

        it('rerenders with the results of new overridden variables', () => {
            expect.assertions(8);
            expect(render.mock.calls.length).toBe(1);
            expect(render.mock.calls[0][0].user.friends.edges.length).toBe(1);
            refetchConnection(1, jest.fn(), { orderby: ['last_name'] });
            expect(render.mock.calls.length).toBe(2);
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:7',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:7',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:7',
                                hasNextPage: true,
                            },
                        },
                    },
                },
            });
            expect(references.length).toBe(1);
            expect(references[0].dispose).not.toBeCalled();
            expect(render.mock.calls.length).toBe(4);
            expect(render.mock.calls[3][0].user.friends.edges.length).toBe(1);
            expect(render.mock.calls[3][0]).toEqual({
                user: {
                    id: '4',
                    friends: {
                        edges: [
                            {
                                cursor: 'cursor:7',
                                node: {
                                    __typename: 'User',
                                    id: 'node:7',
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: 'cursor:7',
                            hasNextPage: true,
                        },
                    },
                },
                relay: {
                    environment: expect.any(Object),
                    hasMore: true,
                    isLoadingNext: false,
                    isLoading: false,
                    errorNext: null,
                    loadMore: expect.any(Function),
                    refetchConnection: expect.any(Function),
                },
            });
        });

        it('paginates with the results of new refetch/overridden variables', () => {
            refetchConnection(1, jest.fn(), {
                orderby: ['last_name'],
                isViewerFriendLocal: true,
            });
            environment.mock.resolve(UserFragmentRefetchQuery, {
                data: {
                    node: {
                        id: '4',
                        __typename: 'User',
                        friends: {
                            edges: [
                                {
                                    cursor: 'cursor:7',
                                    node: {
                                        __typename: 'User',
                                        id: 'node:7',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: 'cursor:7',
                                hasNextPage: true,
                            },
                        },
                    },
                },
            });

            loadMore(2, jest.fn());
            variables = {
                after: 'cursor:7',
                count: 2,
                orderby: ['last_name'],
                isViewerFriendLocal: true,
                id: '4',
            };
            expect(
                environment.mock.isLoading(UserFragmentRefetchQuery, variables, forceCache),
            ).toBe(true);
        });

        it('should not refetch connection if container is unmounted', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;
            instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            instance.unmount();
            const callback = jest.fn();
            refetchConnection(1, callback);
            expect(callback).not.toBeCalled();
        });
    });
    /*it('can be unwrapped in tests', () => {
    class TestUnwrapping extends React.Component {
      render() {
        return <div>Unwrapped</div>;
      }
    }

    const TestUnwrappingContainer = ReactRelayPaginationContainer.createContainer(
      TestUnwrapping,
      {
        user: () => UserFragment,
      },
      {
        direction: 'forward',
        getConnectionFromProps,
        getFragmentVariables: (vars, totalCount) => ({
          ...vars,
          count: totalCount,
        }),
        getVariables,
        query: UserQuery,
      },
    );

    const UnwrappedComponent = unwrapContainer(TestUnwrappingContainer);

    const renderer = createHooks(
      <UnwrappedComponent user={{id: '4', name: 'Mark'}} />,
    );

    expect(renderer.toJSON()).toMatchSnapshot();
  });*/
});
