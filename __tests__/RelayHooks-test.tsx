/* eslint-disable */
import * as React from 'react';
import * as ReactTestRenderer from 'react-test-renderer';

import { createOperationDescriptor } from 'relay-runtime';
import { createMockEnvironment, generateAndCompile } from 'relay-test-utils-internal';
import {
    useOssFragment,
    RelayEnvironmentProvider,
    useRelayEnvironment,
    usePagination,
    useRefetchable,
} from '../src';

function createHooks(component, options?: any) {
    const result = ReactTestRenderer.create(component, options);
    ReactTestRenderer.act(() => {
        jest.runAllImmediates();
    });
    return result;
}

describe('useMemo resolver functions', () => {
    let TestComponent;
    let TestContainer;
    let UserFragment;
    let UserQuery;
    let UserFragmentRefetchQuery;

    let environment;
    let ownerUser1;
    let ownerUser2;
    let refetch;
    let render;
    let variables;
    let relayContext;
    let renderSpy;

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
        jest.resetModules();
        renderSpy = jest.fn();
        environment = createMockEnvironment();
        ({
            UserFragment,
            UserQuery,
            UserFragmentRefetchQuery,
        } = generateAndCompile(`

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
    `));

        // Manually set the refetchable operation for the test.
        UserFragment.metadata.refetch.operation = UserFragmentRefetchQuery;

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

        // Pre-populate the store with data
        ownerUser1 = createOperationDescriptor(UserQuery, { id: '4' });
        environment.commitPayload(ownerUser1, {
            node: {
                id: '4',
                __typename: 'User',
                name: 'Zuck',
            },
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

    describe('useOssFragment', () => {
        beforeEach(() => {
            const ReactRelayContainer = {
                createContainer: (Component, spec, query) => (props) => {
                    const { user, ...others } = props;
                    const environment = useRelayEnvironment();
                    const [data, refetchFunction] = useOssFragmentJest(spec, user);
                    return <Component user={data} {...others} relay={{ environment }} />;
                },
            };

            function useOssFragmentJest(fragmentNode, fragmentRef) {
                const [data, refetchFunction] = useOssFragment(fragmentNode, fragmentRef);
                renderSpy(data, refetchFunction);
                return [data, refetchFunction];
            }
            TestContainer = ReactRelayContainer.createContainer(
                TestComponent,
                UserFragment,
                UserQuery,
            );
        });
        it('re-renders on subscription callbac', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const callback = environment.subscribe.mock.calls[0][1];
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

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
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).toBe(after);
        });

        it('re-renders on change props', () => {
            let userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            const instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({
                user: userPointer,
            });
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).toBe(after);
        });

        it('unmount', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            const instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            instance.unmount();
            const instance2 = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).not.toBe(after);
        });
    });

    describe('usePagination', () => {
        beforeEach(() => {
            const ReactRelayContainer = {
                createContainer: (Component, spec, query) => (props) => {
                    const { user, ...others } = props;
                    const environment = useRelayEnvironment();
                    const [data, refetchFunction] = usePaginationJest(spec, user);
                    return <Component user={data} {...others} relay={{ environment }} />;
                },
            };

            function usePaginationJest(fragmentNode, fragmentRef) {
                const { data, refetch} = usePagination(fragmentNode, fragmentRef);
                renderSpy(data, refetch);
                return [data, refetch];
            }
            TestContainer = ReactRelayContainer.createContainer(
                TestComponent,
                UserFragment,
                UserQuery,
            );
        });
        it('re-renders on subscription callbac', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const callback = environment.subscribe.mock.calls[0][1];
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

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
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).toBe(after);
        });

        it('re-renders on change props', () => {
            let userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            const instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({
                user: userPointer,
            });
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).toBe(after);
        });

        it('unmount', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            const instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            instance.unmount();
            const instance2 = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).not.toBe(after);
        });
    });

    describe('useRefetchable', () => {
        beforeEach(() => {
            const ReactRelayContainer = {
                createContainer: (Component, spec, query) => (props) => {
                    const { user, ...others } = props;
                    const environment = useRelayEnvironment();
                    const [data, refetchFunction] = useRefetchableJest(spec, user);
                    return <Component user={data} {...others} relay={{ environment }} />;
                },
            };

            function useRefetchableJest(fragmentNode, fragmentRef) {
                const {data, refetch} = useRefetchable(fragmentNode, fragmentRef);
                renderSpy(data, refetch);
                return [data, refetch];
            }
            TestContainer = ReactRelayContainer.createContainer(
                TestComponent,
                UserFragment,
                UserQuery,
            );
        });
        it('re-renders on subscription callbac', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const callback = environment.subscribe.mock.calls[0][1];
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

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
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).toBe(after);
        });

        it('re-renders on change props', () => {
            let userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            const instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            userPointer = environment.lookup(ownerUser2.fragment, ownerUser2).data.node;
            instance.getInstance().setProps({
                user: userPointer,
            });
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).toBe(after);
        });

        it('unmount', () => {
            const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data.node;

            const instance = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            instance.unmount();
            const instance2 = createHooks(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            // Data & Variables are passed to component
            const after = renderSpy.mock.calls[0][1];
            expect(render.mock.calls.length).toBe(1);
            expect(before).not.toBe(after);
        });
    });
});
