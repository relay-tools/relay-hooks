/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @emails oncall+relay
 */

/* eslint-disable */

jest.mock('scheduler', () => jest.requireActual('scheduler/unstable_mock'));

import * as React from 'react';
import * as Scheduler from 'scheduler';
//import { ReactRelayContext } from "react-relay";

import { useQuery, RelayEnvironmentProvider, NETWORK_ONLY } from '../src';

import * as ReactTestRenderer from 'react-test-renderer';

//import readContext from "react-relay/lib/readContext";

function createHooks(component, options?: any) {
    let result;
    ReactTestRenderer.act(() => {
        result = ReactTestRenderer.create(component, options);
        jest.runAllImmediates();
    });
    return result;
}

function envResolveAct(environment, query, response) {
    ReactTestRenderer.act(() => {
        environment.mock.resolve(query, response);
        //jest.runAllImmediates();
    });
}

function rendererActProp(renderer, props) {
    ReactTestRenderer.act(() => {
        renderer.getInstance().setProps(props);
    });
}

import {
    createOperationDescriptor,
    Environment,
    Network,
    Observable,
    RecordSource,
    Store,
    ROOT_ID,
    graphql,
} from 'relay-runtime';
import { ROOT_TYPE } from 'relay-runtime/lib/store/RelayStoreUtils';
import { createMockEnvironment } from 'relay-test-utils-internal';

/*
function expectToBeRendered(renderFn, readyState) {
  // Ensure useEffect is called before other timers
  ReactTestRenderer.act(() => {
    jest.runAllImmediates();
  });
  expect(renderFn).toBeCalledTimes(1);
  expect(renderFn.mock.calls[0][0]).toEqual(readyState);
  renderFn.mockClear();
}*/

declare let expect: any;

const loadingState = {
    error: null,
    data: null,
    retry: expect.any(Function),
    isLoading: true,
};

function expectToBeRenderedStore(render, readyState) {
    const calls = render.mock.calls;
    // Ensure useEffect is called before other timers
    expect(calls.length).toBe(2);
    expect(calls[0][0]).toEqual({ ...readyState, isLoading: true });
    expect(calls[1][0]).toEqual({ ...readyState, isLoading: false });
    return { pass: true };
}

function expectToBeRendered(render, readyState, isLoading = false) {
    const calls = render.mock.calls;
    // Ensure useEffect is called before other timers
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toEqual({ ...readyState, isLoading });
    return { pass: true };
}
const QueryRendererHook = (props) => {
    const {
        render,
        fetchPolicy = NETWORK_ONLY,
        query,
        variables,
        cacheConfig,
        fetchKey,
        skip,
        onComplete,
        onResponse,
        UNSTABLE_renderPolicy,
    } = props;
    const relays = useQuery(query, variables, {
        networkCacheConfig: cacheConfig,
        fetchPolicy,
        fetchKey,
        skip,
        onComplete,
        onResponse,
        UNSTABLE_renderPolicy,
    });

    return <React.Fragment>{render(relays)}</React.Fragment>;
};

const ReactRelayQueryRenderer = (props) => (
    <RelayEnvironmentProvider environment={props.environment}>
        <QueryRendererHook {...props} />
    </RelayEnvironmentProvider>
);

describe('ReactRelayQueryRenderer', () => {
    let TestQuery;
    let NextQuery;
    let CompleteTestQuery;
    let cacheConfig;
    let environment;
    let render;
    let store;
    let variables;

    const response = {
        data: {
            node: {
                __typename: 'User',
                id: '4',
                name: 'Zuck',
            },
        },
    };

    const responseComplete = {
        data: {
            node: {
                __typename: 'User',
                id: '4',
                name: 'Zuck',
                username: 'Zuck',
            },
        },
    };

    const responseErrors = {
        data: {
            node: {
                __typename: 'User',
                id: '4',
                name: 'Zuck',
            },
        },
        errors: [
            {
                message: 'error',
            },
        ],
    };

    class PropsSetter extends React.Component<any, any> {
        constructor(props) {
            super(props);
            this.state = {
                data: null,
            };
        }
        setProps(props) {
            this.setState({ props });
        }
        render() {
            const child: any = React.Children.only(this.props.children);
            if (this.state.props) {
                return React.cloneElement(child, this.state.props);
            }
            return child;
        }
    }

    beforeEach(() => {
        (Scheduler as any).unstable_clearLog();
        jest.resetModules();
        expect.extend({
            loadingRendered() {
                const calls = render.mock.calls;
                expect(calls.length).toBe(1);
                expect(calls[0][0]).toEqual(loadingState);
                return { pass: true };
            },
            toBeRendered(readyState) {
                const calls = render.mock.calls;
                expect(calls.length).toBe(1);
                expect(calls[0][0]).toEqual(readyState);
                return { pass: true };
            },
            errorRendered(error) {
                const calls = render.mock.calls;
                expect(calls.length).toBe(1);
                expect(calls[0][0]).toEqual({
                    error,
                    data: null,
                    retry: expect.any(Function),
                    isLoading: false,
                });
                return { pass: true };
            },
        });

        environment = createMockEnvironment();
        store = environment.getStore();
        TestQuery = graphql`
            query ReactRelayQueryRendererTestQuery($id: ID = "<default>") {
                node(id: $id) {
                    id
                    ...ReactRelayQueryRendererTestFragment
                }
            }
        `;

        CompleteTestQuery = graphql`
            query ReactRelayQueryRendererTestCompleteQuery($id: ID = "<default>") {
                node(id: $id) {
                    id
                    username
                    name
                    ...ReactRelayQueryRendererTestFragment
                }
            }
        `;

        NextQuery = graphql`
            query ReactRelayQueryRendererTestNextQuery($id: ID!) {
                node(id: $id) {
                    ... on User {
                        name
                    }
                }
            }
        `;

        graphql`
            fragment ReactRelayQueryRendererTestFragment on User {
                name
            }
        `;
        render = jest.fn(() => <div />);
        variables = { id: '4' };
    });

    afterEach(async () => {
        // wait for GC to run in setImmediate
        await Promise.resolve();
    });

    describe('when initialized', () => {
        it('check store and network', () => {
            environment.mockClear();
            environment.commitUpdate((_store) => {
                let root = _store.get(ROOT_ID);
                if (!root) {
                    root = _store.create(ROOT_ID, ROOT_TYPE);
                }
                const user = _store.create('4', 'User');
                user.setValue('4', 'id');
                user.setValue('Zuck', 'name');
                user.setValue('Zuck', 'username');
                root.setLinkedRecord(user, 'node', { id: '4' });
            });
            createHooks(
                <ReactRelayQueryRenderer
                    query={CompleteTestQuery}
                    fetchPolicy="store-and-network"
                    environment={environment}
                    render={render}
                    variables={variables}
                    cacheConfig={cacheConfig}
                />,
            );

            expect(environment.execute.mock.calls.length).toBe(1);
            const owner = createOperationDescriptor(CompleteTestQuery, variables);
            expectToBeRendered(
                render,
                {
                    error: null,
                    data: {
                        node: {
                            id: '4',
                            name: 'Zuck',
                            username: 'Zuck',

                            __id: '4',
                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },
                            __fragmentOwner: owner.request,
                        },
                    },
                    retry: expect.any(Function),
                },
                true,
            );
            render.mockClear();
            envResolveAct(environment, CompleteTestQuery, responseComplete);
            expectToBeRendered(render, {
                error: null,
                data: {
                    node: {
                        id: '4',
                        name: 'Zuck',
                        username: 'Zuck',

                        __id: '4',
                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },
                        __fragmentOwner: owner.request,
                    },
                },
                retry: expect.any(Function),
            });
        });

        it('check store and network partial', () => {
            environment.mockClear();
            environment.commitUpdate((_store) => {
                let root = _store.get(ROOT_ID);
                if (!root) {
                    root = _store.create(ROOT_ID, ROOT_TYPE);
                }
                const user = _store.create('4', 'User');
                user.setValue('4', 'id');
                user.setValue('Zuck', 'name');
                root.setLinkedRecord(user, 'node', { id: '4' });
            });
            createHooks(
                <ReactRelayQueryRenderer
                    query={CompleteTestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    UNSTABLE_renderPolicy={'partial'}
                    fetchPolicy={'store-and-network'}
                    variables={variables}
                />,
            );

            expect(environment.execute.mock.calls.length).toBe(1);
            const owner = createOperationDescriptor(CompleteTestQuery, variables);
            expectToBeRendered(
                render,
                {
                    error: null,
                    data: {
                        node: {
                            id: '4',
                            name: 'Zuck',
                            username: undefined,

                            __id: '4',
                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },
                            __fragmentOwner: owner.request,
                        },
                    },
                    retry: expect.any(Function),
                },
                true,
            );
            render.mockClear();
            envResolveAct(environment, CompleteTestQuery, responseComplete);
            expectToBeRendered(render, {
                error: null,
                data: {
                    node: {
                        id: '4',
                        name: 'Zuck',
                        username: 'Zuck',

                        __id: '4',
                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },
                        __fragmentOwner: owner.request,
                    },
                },
                retry: expect.any(Function),
            });
        });
        /*
        it('observe query polling store and network', () => {
            const onComplete = jest.fn(() => undefined);
            const newCacheConfig = {
                ...cacheConfig,
                poll: 1,
            };
            environment.mockClear();
            environment.commitUpdate((_store) => {
                let root = _store.get(ROOT_ID);
                if (!root) {
                    root = _store.create(ROOT_ID, ROOT_TYPE);
                }
                const user = _store.create('4', 'User');
                user.setValue('4', 'id');
                user.setValue('Zuck', 'name');
                root.setLinkedRecord(user, 'node', { id: '4' });
            });
            createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={newCacheConfig}
                        fetchPolicy={'store-and-network'}
                        environment={environment}
                        render={render}
                        variables={variables}
                        onComplete={onComplete}
                    />
                </PropsSetter>,
            );

            expect(environment.execute.mock.calls.length).toBe(1);
            expect(onComplete).not.toBeCalled();
            render.mockClear();
            envResolveAct(environment, TestQuery, response);
            expect(onComplete).not.toBeCalled();
            const owner = createOperationDescriptor(TestQuery, variables, newCacheConfig);
            expectToBeRendered(render, {
                error: null,
                data: {
                    node: {
                        id: '4',
                        

                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
                retry: expect.any(Function),
            });
        });
*/
        it('skip', () => {
            const renderer = createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                        skip={true}
                    />
                </PropsSetter>,
            );
            expect(environment.execute.mock.calls.length).toBe(0);
            environment.mockClear();
            render.mockClear();

            rendererActProp(renderer, {
                environment,
                query: TestQuery,
                render,
                variables,
                skip: false,
            });

            expect(environment.execute.mock.calls.length).toBe(1);
            render.mockClear();
            envResolveAct(environment, TestQuery, response);
            const owner = createOperationDescriptor(TestQuery, variables);
            expectToBeRendered(render, {
                error: null,
                data: {
                    node: {
                        id: '4',

                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
                retry: expect.any(Function),
            });
        });

        it('fetches the query', () => {
            createHooks(
                <ReactRelayQueryRenderer
                    query={TestQuery}
                    cacheConfig={cacheConfig}
                    environment={environment}
                    render={render}
                    variables={variables}
                />,
            );
            expect(environment.mock.isLoading(TestQuery, variables, cacheConfig)).toBe(true);
        });

        it('observe query', () => {
            const onComplete = jest.fn(() => undefined);
            createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                        onComplete={onComplete}
                    />
                </PropsSetter>,
            );

            expect(environment.execute.mock.calls.length).toBe(1);
            expect(onComplete).not.toBeCalled();
            render.mockClear();
            envResolveAct(environment, TestQuery, response);
            expect(onComplete).toBeCalled();
            const owner = createOperationDescriptor(TestQuery, variables);
            expectToBeRendered(render, {
                error: null,
                data: {
                    node: {
                        id: '4',

                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
                retry: expect.any(Function),
            });
        });

        it('observe query polling', () => {
            const onComplete = jest.fn(() => undefined);
            const newCacheConfig = {
                ...cacheConfig,
                poll: 1,
            };
            createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={newCacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                        onComplete={onComplete}
                    />
                </PropsSetter>,
            );

            expect(environment.execute.mock.calls.length).toBe(1);
            expect(onComplete).not.toBeCalled();
            render.mockClear();
            envResolveAct(environment, TestQuery, response);
            expect(onComplete).not.toBeCalled();
            const owner = createOperationDescriptor(TestQuery, variables, newCacheConfig);
            expectToBeRendered(render, {
                error: null,
                data: {
                    node: {
                        id: '4',

                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
                retry: expect.any(Function),
            });
        });

        describe('when constructor fires multiple times', () => {
            describe('when store does not have snapshot and fetch does not return snapshot', () => {
                it('fetches the query only once, renders loading state', () => {
                    environment.mockClear();
                    function Child(props) {
                        // NOTE the unstable_yield method will move to the static renderer.
                        // When React sync runs we need to update this.
                        Scheduler.log(props.children);
                        return props.children;
                    }

                    class Example extends React.Component {
                        render() {
                            return (
                                <React.Fragment>
                                    <Child>A</Child>
                                    <ReactRelayQueryRenderer
                                        query={TestQuery}
                                        cacheConfig={cacheConfig}
                                        environment={environment}
                                        render={render}
                                        variables={variables}
                                    />
                                    <Child>B</Child>
                                    <Child>C</Child>
                                </React.Fragment>
                            );
                        }
                    }
                    let renderer;
                    // https://github.com/facebook/react/issues/24392
                    React.startTransition(() => {
                        renderer = ReactTestRenderer.create(<Example />, {
                            unstable_isConcurrent: true,
                            unstable_concurrentUpdatesByDefault: true,
                        });
                    });

                    // Flush some of the changes, but don't commit
                    (Scheduler as any).unstable_flushNumberOfYields(2);

                    expect((Scheduler as any).unstable_clearLog()).toEqual(['A', 'B']);
                    expect(renderer.toJSON()).toEqual(null);
                    expect().loadingRendered();
                    expect(environment.execute.mock.calls.length).toBe(1);
                    render.mockClear();
                    // Interrupt with higher priority updates
                    renderer.unstable_flushSync(() => {
                        renderer.update(<Example />);
                    });

                    expect(environment.execute.mock.calls.length).toBe(1);
                    expect().loadingRendered();
                });
            });

            describe('when store has a snapshot', () => {
                it('fetches the query only once, renders snapshot from store', () => {
                    environment.mockClear();
                    environment.applyUpdate({
                        storeUpdater: (_store) => {
                            let root = _store.get(ROOT_ID);
                            if (!root) {
                                root = _store.create(ROOT_ID, ROOT_TYPE);
                            }
                            const user = _store.create('4', 'User');
                            user.setValue('4', 'id');
                            user.setValue('Zuck', 'name');
                            root.setLinkedRecord(user, 'node', { id: '4' });
                        },
                    });

                    function Child(props) {
                        // NOTE the unstable_yield method will move to the static renderer.
                        // When React sync runs we need to update this.
                        Scheduler.log(props.children);
                        return props.children;
                    }

                    class Example extends React.Component {
                        render() {
                            return (
                                <React.Fragment>
                                    <Child>A</Child>
                                    <ReactRelayQueryRenderer
                                        query={TestQuery}
                                        fetchPolicy="store-and-network"
                                        environment={environment}
                                        render={render}
                                        variables={variables}
                                    />
                                    <Child>B</Child>
                                    <Child>C</Child>
                                </React.Fragment>
                            );
                        }
                    }
                    let renderer;
                    // https://github.com/facebook/react/issues/24392
                    React.startTransition(() => {
                        renderer = ReactTestRenderer.create(<Example />, {
                            unstable_isConcurrent: true,
                            unstable_concurrentUpdatesByDefault: true,
                        });
                    });
                    const owner = createOperationDescriptor(TestQuery, variables);

                    // Flush some of the changes, but don't commit
                    (Scheduler as any).unstable_flushNumberOfYields(2);
                    expect((Scheduler as any).unstable_clearLog()).toEqual(['A', 'B']);
                    expect(renderer.toJSON()).toEqual(null);
                    expect({
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: owner.request,
                                __id: '4',
                            },
                        },
                        isLoading: true,
                        retry: expect.any(Function),
                    }).toBeRendered();
                    expect(environment.execute.mock.calls.length).toBe(1);
                    render.mockClear();

                    // Interrupt with higher priority updates
                    renderer.unstable_flushSync(() => {
                        renderer.update(<Example />);
                    });
                    expect(environment.execute.mock.calls.length).toBe(1);
                    expect({
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: owner.request,
                                __id: '4',
                            },
                        },
                        retry: expect.any(Function),
                        isLoading: true,
                    }).toBeRendered();
                });
            });
            describe('when fetch returns a response synchronously first time', () => {
                it('fetches the query once, always renders snapshot returned by fetch', () => {
                    const fetch = jest.fn().mockReturnValueOnce(response);
                    store = new Store(new RecordSource());
                    environment = new Environment({
                        network: Network.create(fetch),
                        store,
                    });

                    function Child(props) {
                        // NOTE the unstable_yieldValue method will move to the static renderer.
                        // When React sync runs we need to update this.
                        Scheduler.log(props.children);
                        return props.children;
                    }

                    class Example extends React.Component {
                        render() {
                            return (
                                <React.Fragment>
                                    <Child>A</Child>
                                    <ReactRelayQueryRenderer
                                        query={TestQuery}
                                        fetchPolicy="store-or-network" // changed, before store-and-network, now not exist anymore cached request in component
                                        environment={environment}
                                        render={render}
                                        variables={variables}
                                    />
                                    <Child>B</Child>
                                    <Child>C</Child>
                                </React.Fragment>
                            );
                        }
                    }
                    let renderer;
                    // https://github.com/facebook/react/issues/24392
                    React.startTransition(() => {
                        renderer = ReactTestRenderer.create(<Example />, {
                            unstable_isConcurrent: true,
                            unstable_concurrentUpdatesByDefault: true,
                        });
                    });
                    const owner = createOperationDescriptor(TestQuery, variables);

                    // Flush some of the changes, but don't commit
                    (Scheduler as any).unstable_flushNumberOfYields(2);
                    expect((Scheduler as any).unstable_clearLog()).toEqual(['A', 'B']);
                    expect(renderer.toJSON()).toEqual(null);
                    expect({
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: owner.request,
                                __id: '4',
                            },
                        },
                        isLoading: false,
                        retry: expect.any(Function),
                    }).toBeRendered();
                    expect(fetch.mock.calls.length).toBe(1);
                    render.mockClear();

                    // Interrupt with higher priority updates
                    renderer.unstable_flushSync(() => {
                        renderer.update(<Example />);
                    });
                    expect(fetch.mock.calls.length).toBe(1);
                    expect({
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: owner.request,
                                __id: '4',
                            },
                        },
                        isLoading: false,
                        retry: expect.any(Function),
                    }).toBeRendered();
                });
            });
            describe('when variables change before first result has completed', () => {
                it('correctly renders data for new variables', () => {
                    environment = createMockEnvironment();
                    let pendingRequests = [];
                    jest.spyOn(environment, 'execute').mockImplementation((request: any) => {
                        const nextRequest: any = { request };
                        pendingRequests = pendingRequests.concat([nextRequest]);
                        return Observable.create((sink) => {
                            nextRequest.resolve = (resp) => {
                                environment.commitPayload(request.operation, resp.data);
                                sink.next(resp);
                                sink.complete();
                            };
                        });
                    });
                    const renderer = createHooks(
                        <PropsSetter>
                            <ReactRelayQueryRenderer
                                environment={environment}
                                query={TestQuery}
                                render={render}
                                variables={variables}
                                cacheConfig={{ force: true }}
                            />
                        </PropsSetter>,
                    );
                    render.mockClear();
                    expect(environment.execute).toBeCalledTimes(1);
                    expect(pendingRequests.length).toEqual(1);

                    const firstRequest = pendingRequests[0];
                    const firstOwner = firstRequest.request.operation;
                    ReactTestRenderer.act(() => {
                        firstRequest.resolve(response);
                    });
                    expectToBeRendered(render, {
                        error: null,
                        data: {
                            node: {
                                id: '4',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: firstOwner.request,
                                __id: '4',
                            },
                        },
                        retry: expect.any(Function),
                    });
                    render.mockClear();

                    rendererActProp(renderer, {
                        variables: { id: '5' },
                    });
                    expect(environment.execute).toBeCalledTimes(2);
                    expect(pendingRequests.length).toEqual(2);

                    rendererActProp(renderer, {
                        variables: { id: '6' },
                    });
                    expect(environment.execute).toBeCalledTimes(3);
                    expect(pendingRequests.length).toEqual(3);

                    const secondRequest = pendingRequests[1];
                    const secondResponse = {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '5',
                                name: 'Other',
                            },
                        },
                    };
                    const thirdRequest = pendingRequests[2];
                    const thirdOwner = thirdRequest.request.operation;
                    const thirdResponse = {
                        data: {
                            node: {
                                __typename: 'User',
                                id: '6',
                                name: 'Third',
                            },
                        },
                    };

                    // Resolve the latest request first, and the earlier request last
                    // The query renderer should render the data from the latest
                    // request

                    ReactTestRenderer.act(() => {
                        thirdRequest.resolve(thirdResponse);
                        secondRequest.resolve(secondResponse);
                    });
                    expect(render.mock.calls.length).toEqual(3);
                    const lastRender = render.mock.calls[2][0];
                    expect(lastRender).toEqual({
                        error: null,
                        data: {
                            node: {
                                id: '6',

                                __fragments: {
                                    ReactRelayQueryRendererTestFragment: {},
                                },

                                __fragmentOwner: thirdOwner.request,
                                __id: '6',
                            },
                        },
                        isLoading: false,
                        retry: expect.any(Function),
                    });
                });
            });

            it('fetches the query with default variables', () => {
                createHooks(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={{}}
                    />,
                );
                variables = { id: '<default>' };
                expect(environment.mock.isLoading(TestQuery, variables, cacheConfig)).toBe(true);
            });

            it('renders with a default ready state', () => {
                createHooks(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect().loadingRendered();
            });

            it('if initial render set from store, skip loading state when data for query is already available', () => {
                environment.applyUpdate({
                    storeUpdater: (_store) => {
                        let root = _store.get(ROOT_ID);
                        if (!root) {
                            root = _store.create(ROOT_ID, ROOT_TYPE);
                        }
                        const user = _store.create('4', 'User');
                        user.setValue('4', 'id');
                        user.setValue('Zuck', 'name');
                        root.setLinkedRecord(user, 'node', { id: '4' });
                    },
                });

                createHooks(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        fetchPolicy="store-and-network"
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                const owner = createOperationDescriptor(TestQuery, variables);
                expect({
                    error: null,
                    data: {
                        node: {
                            id: '4',

                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },

                            __fragmentOwner: owner.request,
                            __id: '4',
                        },
                    },
                    isLoading: true,
                    retry: expect.any(Function),
                }).toBeRendered();
            });

            it('skip loading state when request could be resolved synchronously', () => {
                const fetch = () => response;
                store = new Store(new RecordSource());
                environment = new Environment({
                    network: Network.create(fetch),
                    store,
                });
                createHooks(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                const owner = createOperationDescriptor(TestQuery, variables);
                expect({
                    error: null,
                    data: {
                        node: {
                            id: '4',

                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },

                            __fragmentOwner: owner.request,
                            __id: '4',
                        },
                    },
                    isLoading: false,
                    retry: expect.any(Function),
                }).toBeRendered();
            });

            it('skip loading state when request failed synchronously', () => {
                const error = new Error('Mock Network Error');
                const fetch: any = () => error;
                store = new Store(new RecordSource());
                environment = new Environment({
                    network: Network.create(fetch),
                    store,
                });
                createHooks(
                    <ReactRelayQueryRenderer
                        query={TestQuery}
                        cacheConfig={cacheConfig}
                        environment={environment}
                        render={render}
                        variables={variables}
                    />,
                );
                expect(error).errorRendered();
            });
        });

        /*
  removed context test
    describe("context", () => {
      let relayContext;

      beforeEach(() => {
        function ContextGetter() {
          relayContext = readContext(ReactRelayContext);
          return null;
        }

        render = jest.fn(() => <ContextGetter />);
      });

      it("sets an environment on context", () => {
        expect.assertions(1);
        createHooks(
          <ReactRelayQueryRenderer
            environment={environment}
            query={TestQuery}
            render={render}
            variables={variables}
          />
        );
        envResolveAct(environment, TestQuery, response);

        expect(relayContext.environment).toBe(environment);
      });

      it("sets an environment on context with empty query", () => {
        variables = { foo: "bar" };
        createHooks(
          <ReactRelayQueryRenderer
            environment={environment}
            query={null}
            render={render}
            variables={variables}
          />
        );

        expect({
          error: null,
          data: {},
          retry: null
        }).toBeRendered();
        expect(relayContext.environment).toBe(environment);
      });

      it("updates the context when the environment changes", () => {
        expect.assertions(2);
        const renderer = createHooks(
          <PropsSetter>
            <ReactRelayQueryRenderer
              environment={environment}
              query={TestQuery}
              render={render}
              variables={variables}
            />
          </PropsSetter>
        );
        envResolveAct(environment, TestQuery, response);
        environment = createMockEnvironment();
        const previousContext = relayContext;
        rendererActProp(renderer, {
          environment,
          query: TestQuery,
          render,
          variables
        });

        expect(relayContext).not.toBe(previousContext);
        expect(relayContext.environment).toBe(environment);
      });

      it("updates the context when the query changes", () => {
        expect.assertions(2);
        const renderer = createHooks(
          <PropsSetter>
            <ReactRelayQueryRenderer
              environment={environment}
              query={TestQuery}
              render={render}
              variables={variables}
            />
          </PropsSetter>
        );
        envResolveAct(environment, TestQuery, response);
        TestQuery = { ...TestQuery };
        const previousContext = relayContext;
        rendererActProp(renderer, {
          environment,
          query: TestQuery,
          render,
          variables
        });

        expect(relayContext).not.toBe(previousContext);
        expect(relayContext.environment).toBe(environment);
      });

      it("updates the context when variables change", () => {
        expect.assertions(5);
        const renderer = createHooks(
          <PropsSetter>
            <ReactRelayQueryRenderer
              environment={environment}
              query={TestQuery}
              render={render}
              variables={variables}
            />
          </PropsSetter>
        );
        envResolveAct(environment, TestQuery, response);
        variables = {};
        const previousContext = relayContext;
        rendererActProp(renderer, {
          environment,
          query: TestQuery,
          render,
          variables
        });

        expect(relayContext).not.toBe(previousContext);
        expect(relayContext.environment).toBe(environment);

        render.mockClear();

        envResolveAct(environment, TestQuery, {
          data: {
            node: {
              __typename: "User",
              id: "<default>",
              name: "Default"
            }
          }
        });
        const owner = createOperationDescriptor(TestQuery, variables);
        expect({
          error: null,
          data: {
            node: {
              id: "<default>",
              __fragments: {
                ReactRelayQueryRendererTestFragment: {}
              },
              __fragmentOwner: owner.request,
              __id: "<default>"
            }
          },
          retry: expect.any(Function)
        }).toBeRendered();
      });

      it("does not update the context for equivalent variables", () => {
        expect.assertions(2);
        variables = { foo: ["bar"] };
        const renderer = createHooks(
          <PropsSetter>
            <ReactRelayQueryRenderer
              environment={environment}
              query={TestQuery}
              render={render}
              variables={variables}
            />
          </PropsSetter>
        );
        envResolveAct(environment, TestQuery, response);
        variables = simpleClone(variables);
        const previousContext = relayContext;
        rendererActProp(renderer, {
          environment,
          query: TestQuery,
          render,
          variables
        });

        expect(relayContext).toBe(previousContext);
        expect(relayContext.environment).toBe(environment);
      });
    });
  });
  */

        describe('when new props are received', () => {
            let renderer;

            beforeEach(() => {
                renderer = createHooks(
                    <PropsSetter>
                        <ReactRelayQueryRenderer
                            environment={environment}
                            query={TestQuery}
                            render={render}
                            variables={variables}
                        />
                    </PropsSetter>,
                );
            });

            it('does not update if all props are ===', () => {
                environment.mockClear();
                render.mockClear();

                // "update" with all === props
                rendererActProp(renderer, {
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.execute).not.toBeCalled();
                expect(render).toBeCalled(); // expect(render).not.toBeCalled(); changed hooks renderer with same result
            });

            it('does not update if variables are equivalent', () => {
                variables = { foo: [1] };
                renderer = createHooks(
                    <PropsSetter>
                        <ReactRelayQueryRenderer
                            environment={environment}
                            query={TestQuery}
                            render={render}
                            variables={variables}
                        />
                    </PropsSetter>,
                );
                environment.mockClear();
                render.mockClear();

                // Update with equivalent variables
                variables = { foo: [1] };
                rendererActProp(renderer, {
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.execute).not.toBeCalled();
                expect(render).toBeCalled(); // expect(render).not.toBeCalled(); changed hooks renderer with same result
            });

            it('updates if `render` prop changes', () => {
                render.mock.calls[0][0]; // changed, now retry is not null
                environment.mockClear();
                render.mockClear();

                // update with new render prop
                render = jest.fn(() => <div />);
                rendererActProp(renderer, {
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect().loadingRendered();
                expect(environment.execute).not.toBeCalled();
            });

            it('refetches if the `environment` prop changes', () => {
                expect.assertions(4);
                envResolveAct(environment, TestQuery, {
                    data: {
                        node: null,
                    },
                });
                render.mockClear();

                // Update with a different environment
                environment.mockClear();
                environment = createMockEnvironment();
                rendererActProp(renderer, {
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.mock.isLoading(TestQuery, variables, cacheConfig)).toBe(true);
                expect().loadingRendered();
            });

            it('refetches if the `variables` prop changes', () => {
                expect.assertions(4);
                envResolveAct(environment, TestQuery, {
                    data: {
                        node: null,
                    },
                });
                environment.mockClear();
                render.mockClear();

                // Update with different variables
                variables = { id: 'beast' };
                rendererActProp(renderer, {
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.mock.isLoading(TestQuery, variables, cacheConfig)).toBe(true);
                expect().loadingRendered();
            });

            it('refetches with default values if the `variables` prop changes', () => {
                expect.assertions(4);
                envResolveAct(environment, TestQuery, {
                    data: {
                        node: null,
                    },
                });
                environment.mockClear();
                render.mockClear();

                // Update with different variables
                variables = {}; // no `id`
                const expectedVariables = { id: '<default>' };
                rendererActProp(renderer, {
                    environment,
                    query: TestQuery,
                    render,
                    variables,
                });
                expect(environment.mock.isLoading(TestQuery, expectedVariables, cacheConfig)).toBe(true);
                expect().loadingRendered();
            });

            it('refetches if the `query` prop changes', () => {
                expect.assertions(4);
                envResolveAct(environment, TestQuery, {
                    data: {
                        node: null,
                    },
                });
                environment.mockClear();
                render.mockClear();

                rendererActProp(renderer, {
                    cacheConfig,
                    environment,
                    query: NextQuery,
                    render,
                    variables,
                });
                expect(environment.mock.isLoading(NextQuery, variables, cacheConfig)).toBe(true);
                expect().loadingRendered();
            });

            /*it("renders if the `query` prop changes to null", () => { // removed, now query is required
      expect.assertions(7);
      envResolveAct(environment, TestQuery, {
        data: {
          node: null
        }
      });
      const disposeHold = environment.retain.mock.dispose;
      expect(disposeHold).not.toBeCalled();
      const disposeUpdate = environment.subscribe.mock.dispose;
      expect(disposeUpdate).not.toBeCalled();

      environment.mockClear();
      render.mockClear();

      // Update with a null query
      rendererActProp(renderer, {
        cacheConfig,
        environment,
        query: null,
        render,
        variables
      });

      expect(disposeHold).toBeCalled();
      expect(disposeUpdate).toBeCalled();
      expect({
        error: null,
        data: {},
        retry: null
      }).toBeRendered();
    });*/
        });
    });

    describe('observe when the fetch fails', () => {
        it('observe error', () => {
            const onComplete = jest.fn(() => undefined);
            createHooks(
                <ReactRelayQueryRenderer
                    environment={environment}
                    query={TestQuery}
                    render={render}
                    variables={variables}
                    onComplete={onComplete}
                />,
            );
            render.mockClear();

            const error = new Error('fail');
            expect(onComplete).not.toBeCalled();
            ReactTestRenderer.act(() => {
                environment.mock.reject(TestQuery, error);
            });
            expect(onComplete).toBeCalledWith(error);
            expect(error).errorRendered();
        });
    });

    describe('when the fetch fails', () => {
        beforeEach(() => {
            createHooks(
                <ReactRelayQueryRenderer
                    environment={environment}
                    query={TestQuery}
                    render={render}
                    variables={variables}
                />,
            );
        });

        it('retains immediately', () => {
            expect.assertions(1);
            render.mockClear();
            environment.mock.reject(TestQuery, new Error('fail'));
            expect(environment.retain.mock.calls.length).toBe(1);
        });

        it('renders the error and retry', () => {
            expect.assertions(3);
            render.mockClear();
            const error = new Error('fail');

            ReactTestRenderer.act(() => {
                environment.mock.reject(TestQuery, error);
            });
            expect(error).errorRendered();
        });

        it('refetch the query if `retry`', () => {
            expect.assertions(6);
            render.mockClear();
            const error = new Error('network fails');

            ReactTestRenderer.act(() => {
                environment.mock.reject(TestQuery, error);
            });
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);

            render.mockClear();
            ReactTestRenderer.act(() => {
                readyState.retry();
            });
            // removed, now retry only try on network and forceupdate after call ending
            expect().loadingRendered();

            render.mockClear();
            envResolveAct(environment, TestQuery, response);
            const owner = createOperationDescriptor(TestQuery, variables);
            expectToBeRendered(render, {
                error: null,
                data: {
                    node: {
                        id: '4',

                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
                retry: expect.any(Function),
            });
        });
    });

    describe('with two identical query fetchers', () => {
        // Regression test for T32896427
        describe('when the fetch succeeds', () => {
            it('renders the query results', () => {
                const mockA = jest.fn().mockReturnValue('A');
                const mockB = jest.fn().mockReturnValue('B');
                class Example extends React.Component {
                    render() {
                        return (
                            <React.Fragment>
                                <ReactRelayQueryRenderer
                                    query={TestQuery}
                                    cacheConfig={cacheConfig}
                                    environment={environment}
                                    render={mockA}
                                    variables={variables}
                                />
                                <ReactRelayQueryRenderer
                                    query={TestQuery}
                                    cacheConfig={cacheConfig}
                                    environment={environment}
                                    render={mockB}
                                    variables={variables}
                                />
                            </React.Fragment>
                        );
                    }
                }
                const renderer = createHooks(<Example />);
                expect.assertions(5);
                mockA.mockClear();
                mockB.mockClear();
                envResolveAct(environment, TestQuery, response);
                const owner = createOperationDescriptor(TestQuery, variables);
                expectToBeRendered(mockA, {
                    error: null,
                    data: {
                        node: {
                            id: '4',

                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },

                            __fragmentOwner: owner.request,
                            __id: '4',
                        },
                    },
                    retry: expect.any(Function),
                });
                expectToBeRendered(mockB, {
                    error: null,
                    data: {
                        node: {
                            id: '4',

                            __fragments: {
                                ReactRelayQueryRendererTestFragment: {},
                            },

                            __fragmentOwner: owner.request,
                            __id: '4',
                        },
                    },
                    retry: expect.any(Function),
                });
                expect(renderer.toJSON()).toEqual(['A', 'B']);
            });
        });
    });

    describe('when the fetch succeeds', () => {
        beforeEach(() => {
            createHooks(
                <ReactRelayQueryRenderer
                    environment={environment}
                    query={TestQuery}
                    render={render}
                    variables={variables}
                />,
            );
        });

        it('retains the result', () => {
            expect.assertions(2);
            envResolveAct(environment, TestQuery, response);
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.dispose).not.toBeCalled();
        });

        it('publishes and notifies the store with changes', () => {
            expect.assertions(2);
            envResolveAct(environment, TestQuery, response);
            expect(store.publish).toBeCalled();
            expect(store.notify).toBeCalled();
        });

        it('renders the query results', () => {
            expect.assertions(2);
            render.mockClear();
            envResolveAct(environment, TestQuery, response);
            const owner = createOperationDescriptor(TestQuery, variables);
            expectToBeRendered(render, {
                error: null,
                data: {
                    node: {
                        id: '4',

                        __fragments: {
                            ReactRelayQueryRendererTestFragment: {},
                        },

                        __fragmentOwner: owner.request,
                        __id: '4',
                    },
                },
                retry: expect.any(Function),
            });
        });

        it('subscribes to the root fragment', () => {
            expect.assertions(4);
            envResolveAct(environment, TestQuery, response);
            expect(environment.subscribe).toBeCalled();
            expect(environment.subscribe.mock.calls[0][0].selector.dataID).toBe('client:root');
            expect(environment.subscribe.mock.calls[0][0].selector.node).toBe(TestQuery.fragment);
            expect(environment.subscribe.mock.calls[0][0].selector.variables).toEqual(variables);
        });
    });
    describe('when props change during a fetch', () => {
        let renderer;
        let nextProps;

        beforeEach(() => {
            variables = { id: '4' };
            renderer = createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                    />
                </PropsSetter>,
            );
            nextProps = {
                environment,
                query: NextQuery,
                render,
                variables,
            };
        });

        it('cancels the pending fetch', () => {
            const subscription = environment.execute.mock.subscriptions[0];
            expect(subscription.closed).toBe(false);
            rendererActProp(renderer, nextProps);
            expect(subscription.closed).toBe(true);
        });

        it('releases the pending selection', () => {
            envResolveAct(environment, TestQuery, response);
            const disposeHold = environment.retain.mock.dispose;
            expect(disposeHold).not.toBeCalled();
            rendererActProp(renderer, nextProps);
            envResolveAct(environment, NextQuery, response);
            expect(disposeHold).toBeCalled();
        });

        it('retains the new selection', () => {
            environment.mockClear();
            rendererActProp(renderer, nextProps);
            envResolveAct(environment, NextQuery, response);
            expect(environment.retain.mock.calls[0][0].root.dataID).toBe('client:root');
            expect(environment.retain.mock.calls[0][0].root.node).toBe(NextQuery.operation);
            expect(environment.retain.mock.calls[0][0].root.variables).toEqual(variables);
        });

        it('renders a pending state', () => {
            render.mockClear();
            rendererActProp(renderer, nextProps);
            expect().loadingRendered();
        });

        /*it("renders if the `query` prop changes to null", () => { removed, query is required
      const subscription = environment.execute.mock.subscriptions[0];
      expect(subscription.closed).toBe(false);
      envResolveAct(environment, TestQuery, response); // trigger retain
      const disposeHold = environment.retain.mock.dispose;
      expect(disposeHold).not.toBeCalled();

      environment.mockClear();
      render.mockClear();

      // Update with a null query
      rendererActProp(renderer, {
        cacheConfig,
        environment,
        query: null,
        render,
        variables
      });

      expect(subscription.closed).toBe(true);
      expect(disposeHold).toBeCalled();
      expect({
        error: null,
        data: {},
        retry: null
      }).toBeRendered();
    });*/
    });

    describe('when props change after a fetch fails', () => {
        let error;
        let renderer;
        let nextProps;

        beforeEach(() => {
            variables = { id: '4' };
            renderer = createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                    />
                </PropsSetter>,
            );
            error = new Error('fail');
            environment.mock.reject(TestQuery, error);
            render.mockClear();
            nextProps = {
                environment,
                query: NextQuery,
                render,
                variables,
            };
        });

        it('fetches the new query', () => {
            environment.mockClear();
            rendererActProp(renderer, nextProps);
            expect(environment.mock.isLoading(NextQuery, variables, cacheConfig)).toBe(true);
        });

        it('retains the new selection', () => {
            expect.assertions(5);
            environment.mockClear();
            rendererActProp(renderer, nextProps);
            envResolveAct(environment, NextQuery, {
                data: {
                    node: null,
                },
            });
            expect(environment.retain.mock.calls.length).toBe(1);
            expect(environment.retain.mock.calls[0][0].root.dataID).toBe('client:root');
            expect(environment.retain.mock.calls[0][0].root.node).toBe(NextQuery.operation);
            expect(environment.retain.mock.calls[0][0].root.variables).toEqual(variables);
            expect(environment.retain.mock.dispose).not.toBeCalled();
        });

        it('renders the pending state', () => {
            rendererActProp(renderer, nextProps);
            expect().loadingRendered();
        });

        it('publishes and notifies the store with changes', () => {
            expect.assertions(2);
            environment.mockClear();
            rendererActProp(renderer, nextProps);
            envResolveAct(environment, NextQuery, response);
            expect(store.publish).toBeCalled();
            expect(store.notify).toBeCalled();
        });
    });

    describe('when props change after a fetch succeeds', () => {
        let renderer;
        let nextProps;

        beforeEach(() => {
            renderer = createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                    />
                </PropsSetter>,
            );
            envResolveAct(environment, TestQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                    },
                },
            });
            render.mockClear();
            nextProps = {
                environment,
                query: NextQuery,
                render,
                variables,
            };
        });

        it('disposes the root fragment subscription', () => {
            const disposeUpdate = environment.subscribe.mock.dispose;
            expect(disposeUpdate).not.toBeCalled();
            rendererActProp(renderer, nextProps);
            expect(disposeUpdate).toBeCalled();
        });

        it('fetches the new query', () => {
            environment.mockClear();
            rendererActProp(renderer, nextProps);
            expect(environment.mock.isLoading(NextQuery, variables, cacheConfig)).toBe(true);
        });

        it('disposes the previous selection and retains the new one', () => {
            expect.assertions(6);
            const prevDispose = environment.retain.mock.dispose;
            environment.mockClear();
            rendererActProp(renderer, nextProps);
            envResolveAct(environment, NextQuery, {
                data: {
                    node: null,
                },
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls[0][0].root.dataID).toBe('client:root');
            expect(environment.retain.mock.calls[0][0].root.node).toBe(NextQuery.operation);
            expect(environment.retain.mock.calls[0][0].root.variables).toEqual(variables);
            expect(prevDispose).toBeCalled();
            expect(environment.retain.mock.dispose).not.toBeCalled();
        });

        it('renders the pending and previous state', () => {
            environment.mockClear();
            rendererActProp(renderer, nextProps);
            expect().loadingRendered();
        });

        it('publishes and notifies the store with changes', () => {
            expect.assertions(2);
            environment.mockClear();
            rendererActProp(renderer, nextProps);
            envResolveAct(environment, NextQuery, response);
            expect(store.publish).toBeCalled();
            expect(store.notify).toBeCalled();
        });
    });

    describe('when unmounted', () => {
        it('releases its reference if unmounted before fetch completes', () => {
            const renderer = createHooks(
                <ReactRelayQueryRenderer
                    environment={environment}
                    query={TestQuery}
                    render={render}
                    variables={variables}
                />,
            );
            ReactTestRenderer.act(() => {
                // added for execute useEffect retain
                jest.runAllImmediates();
            });
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            const dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            ReactTestRenderer.act(() => {
                renderer.unmount();
            });
            expect(dispose).toBeCalled();
        });

        it('releases its reference if unmounted after fetch completes', () => {
            const renderer = createHooks(
                <ReactRelayQueryRenderer
                    environment={environment}
                    query={TestQuery}
                    render={render}
                    variables={variables}
                />,
            );
            envResolveAct(environment, TestQuery, response);
            expect(environment.retain).toBeCalled();
            expect(environment.retain.mock.calls.length).toBe(1);
            const dispose = environment.retain.mock.dispose;
            expect(dispose).not.toBeCalled();
            ReactTestRenderer.act(() => {
                renderer.unmount();
            });
            expect(dispose).toBeCalled();
        });

        it('aborts a pending fetch', () => {
            const renderer = createHooks(
                <ReactRelayQueryRenderer
                    environment={environment}
                    query={TestQuery}
                    render={render}
                    variables={variables}
                />,
            );
            const subscription = environment.execute.mock.subscriptions[0];
            expect(subscription.closed).toBe(false);
            ReactTestRenderer.act(() => {
                renderer.unmount();
            });
            expect(subscription.closed).toBe(true);
        });
    });

    describe('multiple payloads', () => {
        let renderer;
        let nextProps;

        beforeEach(() => {
            renderer = createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                    />
                </PropsSetter>,
            );
            nextProps = {
                environment,
                query: NextQuery,
                render,
                variables,
            };
        });

        /*it("retains partially fulfilled results until next succesful request", () => {
      environment.mock.nextValue(TestQuery, response);
      const disposeHold = environment.retain.mock.dispose;
      expect(environment.retain).toBeCalled();
      expect(disposeHold).not.toBeCalled();
      environment.mock.reject(TestQuery, new Error("fail"));
      expect(disposeHold).not.toBeCalled();
      rendererActProp(renderer, nextProps);
      expect(disposeHold).not.toBeCalled();
      envResolveAct(environment, NextQuery, response);
      expect(disposeHold).toBeCalled();
    });*/
    });

    describe('async', () => {
        // Verify the component doesn't leak references if it doesn't finish mount.
        // @TODO T28041408 Test aborted mount using unstable_flushSync() rather than
        // throwing once the test renderer exposes such a method.
        it('should ignore data changes before mount', () => {
            class ErrorBoundary extends React.Component {
                state = { error: null };
                componentDidCatch(error) {
                    this.setState({ error });
                }
                render() {
                    return this.state.error === null ? this.props.children : null;
                }
            }

            render.mockImplementation(({ props }) => {
                const error: any = Error('Make mount fail intentionally');
                // Don't clutter the test console with React's error log
                error.suppressReactErrorLogging = true;
                throw error;
            });

            createHooks(
                <ErrorBoundary>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                    />
                </ErrorBoundary>,
            );

            envResolveAct(environment, TestQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '4',
                        name: 'Zuck',
                    },
                },
            });

            expect(render.mock.calls.length === 1 || render.mock.calls.length === 2).toBeTruthy();
        });
    });

    describe('When retry', () => {
        it('uses the latest variables after initial render', () => {
            const renderer = createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                    />
                </PropsSetter>,
            );
            envResolveAct(environment, TestQuery, response);
            environment.mockClear();

            rendererActProp(renderer, {
                cacheConfig,
                environment,
                query: TestQuery,
                render,
                variables: { id: '5' },
            });
            render.mockClear();
            envResolveAct(environment, TestQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '5',
                        name: 'Zuck',
                    },
                },
            });
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);
            expect(environment.execute).toBeCalledTimes(1);
            environment.mockClear();

            readyState.retry();
            expect(environment.execute).toBeCalledTimes(1);
            expect(environment.mock.getMostRecentOperation().request.variables).toEqual({
                id: '5',
            });
        });

        it('observe retry', () => {
            createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                    />
                </PropsSetter>,
            );
            render.mockClear();
            envResolveAct(environment, TestQuery, response);

            expect(render).toBeCalledTimes(1);
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);
            environment.mockClear();

            const onComplete = jest.fn(() => undefined);

            readyState.retry({ force: true }, { onComplete });
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(true);

            jest.runAllTimers();
            expect(onComplete).not.toBeCalled();
            envResolveAct(environment, TestQuery, {
                data: {
                    node: {
                        __typename: 'User',
                        id: '5',
                        name: 'Zuck',
                    },
                },
            });

            expect(onComplete).toBeCalled();
            environment.mockClear();
        });

        it('skips cache if `force` is set to true', () => {
            createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                    />
                </PropsSetter>,
            );
            render.mockClear();
            envResolveAct(environment, TestQuery, response);

            expect(render).toBeCalledTimes(1);
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);
            environment.mockClear();

            readyState.retry({ force: true });
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(true);
            jest.runAllTimers();
            environment.mockClear();
            readyState.retry();
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(false);
        });

        it('uses cache if `force` is set to false', () => {
            createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                        cacheConfig={{ force: true }}
                    />
                </PropsSetter>,
            );
            render.mockClear();
            envResolveAct(environment, TestQuery, response);

            expect(render).toBeCalledTimes(1);
            const readyState = render.mock.calls[0][0];
            expect(readyState.retry).not.toBe(null);
            environment.mockClear();

            readyState.retry({ force: false });
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(false);
            jest.runAllTimers();
            environment.mockClear();
            readyState.retry();
            expect(environment.mock.isLoading(TestQuery, variables, { force: true })).toBe(true);
        });
    });

    describe('fetch key', () => {
        let renderer;
        const fetchKey = 'fetchKey';

        beforeEach(() => {
            renderer = createHooks(
                <PropsSetter>
                    <ReactRelayQueryRenderer
                        environment={environment}
                        query={TestQuery}
                        render={render}
                        variables={variables}
                        fetchKey={fetchKey}
                        fetchPolicy="network-only"
                    />
                </PropsSetter>,
            );
        });

        it('does not refetches if the `fetchKey` prop not changes', () => {
            expect.assertions(2);
            expect(environment.execute.mock.calls.length).toBe(1);
            render.mockClear();
            environment.mockClear();

            rendererActProp(renderer, {
                environment,
                query: TestQuery,
                render,
                variables,
                fetchKey,
            });
            expect(environment.execute.mock.calls.length).toBe(0);
        });

        it('refetches if the `fetchKey` prop changes', () => {
            expect.assertions(2);
            expect(environment.execute.mock.calls.length).toBe(1);
            environment.mockClear();
            render.mockClear();

            rendererActProp(renderer, {
                environment,
                query: TestQuery,
                render,
                variables,
                fetchKey: 'refetchKey',
            });
            expect(environment.execute.mock.calls.length).toBe(1);
        });
    });

    it('renders the query results and call onResponse', () => {
        let response = null;
        const onResponse = (res) => {
            response = res;
        };

        createHooks(
            <ReactRelayQueryRenderer
                environment={environment}
                query={TestQuery}
                render={render}
                variables={variables}
                onResponse={onResponse}
            />,
        );

        expect.assertions(3);

        render.mockClear();
        ReactTestRenderer.act(() => {
            envResolveAct(environment, TestQuery, responseErrors);
        });
        const owner = createOperationDescriptor(TestQuery, variables);
        expectToBeRendered(render, {
            error: null,
            data: {
                node: {
                    id: '4',

                    __fragments: {
                        ReactRelayQueryRendererTestFragment: {},
                    },

                    __fragmentOwner: owner.request,
                    __id: '4',
                },
            },
            retry: expect.any(Function),
        });
        expect(response).toEqual(responseErrors);
    });
});
