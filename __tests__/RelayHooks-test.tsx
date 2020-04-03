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
    useRefetch,
    useRefetchable,
} from '../src';

describe('useMemo resolver functions', () => {
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
            UserQueryWithCond,
            UserFragmentRefetchQuery,
        } = generateAndCompile(`

      fragment UserFragment on User 
      @refetchable(queryName: "UserFragmentRefetchQuery")
      @argumentDefinitions(
        cond: {type: "Boolean!", defaultValue: true}
      ) {
        id
        name @include(if: $cond)
      }


      query UserQuery(
        $id: ID!
      ) {
        node(id: $id) {
          ...UserFragment
        }
      }

      query UserQueryWithCond(
        $id: ID!
        $condGlobal: Boolean!
      ) {
        node(id: $id) {
          ...UserFragment @arguments(cond: $condGlobal)
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

            ReactTestRenderer.create(
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

            const instance = ReactTestRenderer.create(
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

            const instance = ReactTestRenderer.create(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            instance.unmount();
            const instance2 = ReactTestRenderer.create(
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
                const [data, refetchFunction] = usePagination(fragmentNode, fragmentRef);
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

            ReactTestRenderer.create(
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

            const instance = ReactTestRenderer.create(
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

            const instance = ReactTestRenderer.create(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            instance.unmount();
            const instance2 = ReactTestRenderer.create(
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

    describe('useRefetch', () => {
        beforeEach(() => {
            const ReactRelayContainer = {
                createContainer: (Component, spec, query) => (props) => {
                    const { user, ...others } = props;
                    const environment = useRelayEnvironment();
                    const [data, refetchFunction] = useRefetchJest(spec, user);
                    return <Component user={data} {...others} relay={{ environment }} />;
                },
            };

            function useRefetchJest(fragmentNode, fragmentRef) {
                const [data, refetchFunction] = useRefetch(fragmentNode, fragmentRef);
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

            ReactTestRenderer.create(
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

            const instance = ReactTestRenderer.create(
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

            const instance = ReactTestRenderer.create(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            renderSpy.mockClear();
            render.mockClear();

            instance.unmount();
            const instance2 = ReactTestRenderer.create(
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
                const [data, refetchFunction] = useRefetchable(fragmentNode, fragmentRef);
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

            ReactTestRenderer.create(
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

            const instance = ReactTestRenderer.create(
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

            const instance = ReactTestRenderer.create(
                <ContextSetter environment={environment}>
                    <TestContainer user={userPointer} />
                </ContextSetter>,
            );
            const before = renderSpy.mock.calls[0][1];
            console.log('data before', before);
            renderSpy.mockClear();
            render.mockClear();

            instance.unmount();
            const instance2 = ReactTestRenderer.create(
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
