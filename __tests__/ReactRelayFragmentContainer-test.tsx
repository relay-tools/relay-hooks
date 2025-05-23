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
import { useQuery, useFragment, RelayEnvironmentProvider, useRelayEnvironment, NETWORK_ONLY } from '../src';

function createHooks(component, options?: any) {
    let result;
    ReactTestRenderer.act(() => {
        result = ReactTestRenderer.create(component, options);
        jest.runAllImmediates();
    });
    return result;
}
const ReactRelayFragmentContainer = {
    createContainer: (Component, spec) => (props) => {
        const { user, ...others } = props;
        const environment = useRelayEnvironment();
        const data = useFragment(spec, user);
        return <Component user={data} {...others} relay={{ environment }} />;
    },
};

const QueryRendererHook = (props) => {
    const { render, fetchPolicy = NETWORK_ONLY, query, variables, cacheConfig } = props;
    const relays = useQuery(query, variables, {
        networkCacheConfig: cacheConfig,
        fetchPolicy,
    });

    return <React.Fragment>{render(relays)}</React.Fragment>;
};

const ReactRelayQueryRenderer = (props) => (
    <RelayEnvironmentProvider environment={props.environment}>
        <QueryRendererHook {...props} />
    </RelayEnvironmentProvider>
);

const { createReaderSelector, createOperationDescriptor, graphql } = require('relay-runtime');
const { createMockEnvironment } = require('relay-test-utils-internal');

describe('ReactRelayFragmentContainer', () => {
    let TestComponent;
    let TestContainer;
    let UserFragment;
    let UserQuery;
    let UserQueryWithCond;

    let environment;
    let ownerUser1;
    let ownerUser1WithCondVar;
    let ownerUser2;
    let render;
    let spec;
    let variables;

    class ContextSetter extends React.Component<any, any> {
        __relayContext: { environment: any };
        constructor(props) {
            super(props);
            this.__relayContext = {
                environment: props.environment,
            };
            this.state = { props: null };
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

        //({ UserFragment, UserQuery, UserQueryWithCond }
        UserQuery = graphql`
            query ReactRelayFragmentContainerTestUserQuery($id: ID!) {
                node(id: $id) {
                    ...ReactRelayFragmentContainerTestUserFragment
                }
            }
        `;

        UserQueryWithCond = graphql`
            query ReactRelayFragmentContainerTestUserWithCondQuery($id: ID!, $condGlobal: Boolean!) {
                node(id: $id) {
                    ...ReactRelayFragmentContainerTestUserFragment @arguments(cond: $condGlobal)
                }
            }
        `;
        UserFragment = graphql`
            fragment ReactRelayFragmentContainerTestUserFragment on User
            @argumentDefinitions(cond: { type: "Boolean!", defaultValue: true }) {
                id
                name @include(if: $cond)
            }
        `;

        render = jest.fn(() => <div />);
        spec = {
            user: () => UserFragment,
        };
        variables = { rootVariable: 'root' };
        TestComponent = render;
        TestComponent.displayName = 'TestComponent';
        TestContainer = ReactRelayFragmentContainer.createContainer(TestComponent, UserFragment);

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
    /*
  it("passes non-fragment props to the component", () => {
    createHooks(
      // changed, add user {null}
      <ContextSetter environment={environment}>
        <TestContainer bar={1} foo="foo" user={null} />
      </ContextSetter>
    );
    expect(render.mock.calls.length).toBe(1);
    expect(render.mock.calls[0][0]).toEqual({
      bar: 1,
      foo: "foo",
      relay: {
        environment: environment
      },
      user: null
    });
    expect(environment.lookup.mock.calls.length).toBe(0);
    expect(environment.subscribe.mock.calls.length).toBe(0);
  });
  
  it("passes through null props", () => {
    createHooks(
      <ContextSetter environment={environment}>
        <TestContainer user={null} />
      </ContextSetter>
    );
    // Data & Variables are passed to component
    expect(render.mock.calls.length).toBe(1);
    expect(render.mock.calls[0][0]).toEqual({
      relay: {
        environment: environment
      },
      user: null
    });
    // Does not subscribe to updates (id is unknown)
    expect(environment.subscribe.mock.calls.length).toBe(0);
  });
*/
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
            relay: {
                environment: environment,
            },
            user: {
                id: '4',
                name: 'Zuck',
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
            relay: {
                environment: environment,
            },
            user: {
                id: '4',
                name: 'Mark',
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
            relay: {
                environment: environment,
            },
            user: {
                id: '842472',
                name: 'Joe',
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
        jest.runAllTimers();

        // New data & variables are passed to component
        expect(render.mock.calls.length).toBe(1);
        expect(render.mock.calls[0][0]).toEqual({
            relay: {
                environment: environment,
            },
            user: {
                id: '4',
                // Name is excluded since value of cond is now false
            },
        });
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
        render.mockClear();
        environment.lookup.mockClear();
        environment.subscribe.mockClear();

        instance.getInstance().setProps({
            user: userPointer,
        });

        expect(render).toBeCalled(); // not
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
    });
    /* removed, useFragment don't check other props
  it("does not update for equal scalar props", () => {
    const userPointer = environment.lookup(ownerUser1.fragment, ownerUser1).data
      .node;
    const scalar = 42;
    const fn = () => null;
    const instance = createHooks(
      <ContextSetter environment={environment}>
        <TestContainer fn={fn} nil={null} scalar={scalar} user={userPointer} />
      </ContextSetter>
    );
    render.mockClear();
    environment.lookup.mockClear();
    environment.subscribe.mockClear();

    instance.getInstance().setProps({
      fn,
      nil: null,
      scalar,
      user: userPointer
    });

    expect(render).not.toBeCalled();
    expect(environment.lookup).not.toBeCalled();
    expect(environment.subscribe).not.toBeCalled();
  });
*/
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
        expect(render.mock.calls[0][0]).toEqual({
            ...initialProps,
            fn: nextFn,
        });
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
        expect(render.mock.calls[0][0]).toEqual({
            ...initialProps,
            scalar: 43,
        });
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
        expect(render.mock.calls[0][0]).toEqual(initialProps);
        expect(render.mock.calls[0][0].arr).toBe(nextArr);
        expect(render.mock.calls[0][0].obj).toBe(nextObj);
        expect(environment.lookup).not.toBeCalled();
        expect(environment.subscribe).not.toBeCalled();
    });

    /* removed
  test("throw for @inline fragments", () => {
    const { InlineUserFragment } = generateAndCompile(`
      fragment InlineUserFragment on User @inline {
        id
      }
    `);
    expect(() => {
      ReactRelayFragmentContainer.createContainer(() => <div />, {
        user: () => InlineUserFragment
      });
    }).toThrow(
      "RelayModernGraphQLTag: Expected a fragment, got " +
        '`{"kind":"InlineDataFragment","name":"InlineUserFragment"}`.'
    );
  });

  it("does not proxy instance methods", () => {
    class TestNoProxy extends React.Component {
      render() {
        return <div />;
      }

      instanceMethod(arg) {
        return arg + arg;
      }
    }

    const TestNoProxyContainer = ReactRelayFragmentContainer.createContainer(
      TestNoProxy,
      {
        user: () => UserFragment
      }
    );

    let containerRef;
    let componentRef;

    createHooks(
      <ContextSetter environment={environment} variables={{}}>
        <TestNoProxyContainer
          user={null}
          ref={ref => {
            containerRef = ref;
          }}
          componentRef={ref => {
            componentRef = ref;
          }}
        />
      </ContextSetter>
    );

    expect(componentRef.instanceMethod("foo")).toEqual("foofoo");

    expect(() => containerRef.instanceMethod("foo")).toThrow();
  });
  it("can be unwrapped in tests", () => {
    class TestUnwrapping extends React.Component {
      render() {
        return <div>Unwrapped</div>;
      }
    }

    const TestUnwrappingContainer = ReactRelayFragmentContainer.createContainer(
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
