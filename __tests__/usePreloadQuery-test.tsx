/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

import * as React from 'react';
import * as TestRenderer from 'react-test-renderer';

import { Environment, Network, Observable, RecordSource, Store } from 'relay-runtime';
import { createMockEnvironment, generateAndCompile } from 'relay-test-utils-internal';
import { usePreloadedQuery, loadQuery, loadLazyQuery, RelayEnvironmentProvider } from '../src';

const query = generateAndCompile(`
  query TestQuery($id: ID! = 4) {
    node(id: $id) {
      id
      ... on User {
        name
      }
    }
  }
`).TestQuery;
const params = query;

const response = {
    data: {
        node: {
            __typename: 'User',
            id: '4',
            name: 'Zuck',
        },
    },
    extensions: {
        is_final: true,
    },
};

const responseRefetch = {
    data: {
        node: {
            __typename: 'User',
            id: '4',
            name: 'Changed Name',
        },
    },
    extensions: {
        is_final: true,
    },
};

let dataSource;
let environment;
let fetch;
jest.useFakeTimers();

class ErrorBoundary extends React.Component<any, any> {
    state: { error: any } = { error: null };

    componentDidCatch(error) {
        this.setState({ error });
    }

    render() {
        const { children, fallback } = this.props;
        const { error } = this.state;
        if (error != null) {
            return fallback;
        } else {
            return children;
        }
    }
}

beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetch = jest.fn((_query, _variables, _cacheConfig) =>
        Observable.create((sink) => {
            dataSource = sink;
        }),
    );
    environment = new Environment({
        network: Network.create(fetch),
        store: new Store(new RecordSource()),
    });
});
describe('usePreloadQuery', () => {
    describe('suspense', () => {
        const prefetched = loadLazyQuery();
        afterEach(() => {
            //prefetched.dispose();
        });

        it('suspends while the query is pending', () => {
            prefetched.next(environment, params, { id: '4' });
            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <React.Suspense fallback="Fallback">
                        <Component prefetched={prefetched} />
                    </React.Suspense>
                </RelayEnvironmentProvider>,
            );
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Fallback');
            expect(data).toBe(undefined);
        });

        it('suspends while the query is pending (with default variables)', () => {
            prefetched.next(environment, params, {});
            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data?.props?.node?.name ?? 'Error: should have suspended';
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <React.Suspense fallback="Fallback">
                        <Component prefetched={prefetched} />
                    </React.Suspense>
                </RelayEnvironmentProvider>,
            );
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Fallback');
            expect(data).toBe(undefined);
        });

        it('renders synchronously if the query has already completed', () => {
            // TODO(T40983823): Fix usage of timers in tests
            environment.getStore().holdGC();

            prefetched.next(environment, params, { id: '4' });
            dataSource.next(response);
            dataSource.complete();

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <React.Suspense fallback="Fallback">
                        <Component prefetched={prefetched} />
                    </React.Suspense>
                </RelayEnvironmentProvider>,
            );
            TestRenderer.act(() => jest.runAllImmediates());

            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
            renderer.unmount();
        });

        it('renders synchronously if the query has already errored', () => {
            //prefetched.dispose();
            prefetched.next(environment, params, { id: '4' });
            const error = new Error('wtf');
            dataSource.error(error);

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <ErrorBoundary fallback="Error Boundary">
                        <React.Suspense fallback="Fallback">
                            <Component prefetched={prefetched} />
                        </React.Suspense>
                    </ErrorBoundary>
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Error Boundary');
        });

        it('updates asynchronously when the query completes', () => {
            prefetched.next(environment, params, { id: '4' });

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <React.Suspense fallback="Fallback">
                        <Component prefetched={prefetched} />
                    </React.Suspense>
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Fallback');
            expect(data).toBe(undefined);

            dataSource.next(response);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
            renderer.unmount();
        });

        it('refetches when a different fetchKey is passed', () => {
            prefetched.next(
                environment,
                params,
                { id: '4' },
                { fetchKey: 'Break Cache 0', fetchPolicy: 'network-only' },
            );
            expect(fetch).toBeCalledTimes(1); // 2

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <React.Suspense fallback="Fallback">
                        <Component prefetched={prefetched} />
                    </React.Suspense>
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Fallback');
            expect(data).toBe(undefined);

            dataSource.next(response);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });

            prefetched.next(
                environment,
                params,
                { id: '4' },
                { fetchKey: 'Break Cache 1', fetchPolicy: 'network-only' },
            );
            dataSource.next(responseRefetch);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Changed Name');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Changed Name',
                },
            });
            renderer.unmount();
        });

        it('refetches when consumed with a different environment', () => {
            prefetched.next(environment, params, { id: '4' }, { fetchPolicy: 'store-or-network' });
            expect(fetch).toBeCalledTimes(1);

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }

            const newEnvironment = createMockEnvironment();
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={newEnvironment}>
                    <React.Suspense fallback="Fallback">
                        <Component prefetched={prefetched} />
                    </React.Suspense>
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Fallback');
            expect(data).toBe(undefined);

            // There should be only one query in the newEnv
            expect(newEnvironment.mock.getAllOperations().length).toBe(1);
            // fetch from the initial env should still have 1 call
            expect(fetch).toBeCalledTimes(1);
            newEnvironment.mock.resolve(query, response);

            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
            renderer.unmount();
        });

        it('no refetch when the same fetchKey is passed', () => {
            prefetched.next(
                environment,
                params,
                { id: '4' },
                { fetchKey: 'Break Cache 0', fetchPolicy: 'network-only' },
            );

            expect(fetch).toBeCalledTimes(1);

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <React.Suspense fallback="Fallback">
                        <Component prefetched={prefetched} />
                    </React.Suspense>
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Fallback');
            expect(data).toBe(undefined);

            dataSource.next(response);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });

            prefetched.next(
                environment,
                params,
                { id: '4' },
                { fetchKey: 'Break Cache 0', fetchPolicy: 'network-only' },
            );
            dataSource.next(responseRefetch);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
            renderer.unmount();
        });

        it('updates asynchronously when the query errors', () => {
            prefetched.next(environment, params, { id: '4' });

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <ErrorBoundary fallback="Error Boundary">
                        <React.Suspense fallback="Fallback">
                            <Component prefetched={prefetched} />
                        </React.Suspense>
                    </ErrorBoundary>
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Fallback');
            expect(data).toBe(undefined);

            const error = new Error('wtf');
            dataSource.error(error);
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Error Boundary');
        });
    });

    describe('no suspense', () => {
        const loadingData = {
            cached: false,
            error: null,
            props: null,
            retry: expect.any(Function), // added
        };
        const prefetched = loadQuery();

        it('suspends while the query is pending', () => {
            prefetched.next(environment, params, { id: '4' });
            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual(null);
            expect(data).toEqual(loadingData);
        });

        it('suspends while the query is pending (with default variables)', () => {
            prefetched.next(environment, params, {});
            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual(null);
            expect(data).toEqual(loadingData);
            renderer.unmount();
        });

        it('renders synchronously if the query has already completed', () => {
            // TODO(T40983823): Fix usage of timers in tests
            environment.getStore().holdGC();

            prefetched.next(environment, params, { id: '4' });
            dataSource.next(response);
            dataSource.complete();
            jest.runAllTimers();

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                return data.props.node.name;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            TestRenderer.act(() => jest.runAllImmediates());

            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
            renderer.unmount();
        });

        it('renders synchronously if the query has already errored', () => {
            prefetched.next(environment, params, { id: '4' });
            const error = new Error('wtf');
            dataSource.error(error);
            jest.runAllTimers(); // relay-hooks for promise

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.error) {
                    return 'Error Boundary';
                }
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Error Boundary');
        });

        it('updates asynchronously when the query completes', () => {
            prefetched.next(environment, params, { id: '4' });

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.error) {
                    return 'Error Boundary';
                }
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual(null);
            expect(data).toEqual(loadingData);

            dataSource.next(response);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
        });

        it('refetches when a different fetchKey is passed', () => {
            prefetched.next(
                environment,
                params,
                { id: '4' },
                { fetchKey: 'Break Cache 0', fetchPolicy: 'network-only' },
            );

            expect(fetch).toBeCalledTimes(1); // 2

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.error) {
                    return 'Error Boundary';
                }
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual(null);
            expect(data).toEqual(loadingData);

            dataSource.next(response);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });

            prefetched.next(
                environment,
                params,
                { id: '4' },
                { fetchKey: 'Break Cache 1', fetchPolicy: 'network-only' },
            );
            dataSource.next(responseRefetch);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Changed Name');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Changed Name',
                },
            });
        });

        it('refetches when consumed with a different environment', () => {
            prefetched.next(environment, params, { id: '4' }, { fetchPolicy: 'store-or-network' });
            expect(fetch).toBeCalledTimes(1);

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.error) {
                    return 'Error Boundary';
                }
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }

            const newEnvironment = createMockEnvironment();
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={newEnvironment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual(null);
            expect(data).toEqual(loadingData);

            // There should be only one query in the newEnv
            expect(newEnvironment.mock.getAllOperations().length).toBe(1);
            // fetch from the initial env should still have 1 call
            expect(fetch).toBeCalledTimes(1);
            newEnvironment.mock.resolve(query, response);

            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
        });

        it('no refetch when the same fetchKey is passed', () => {
            prefetched.next(
                environment,
                params,
                { id: '4' },
                { fetchKey: 'Break Cache 0', fetchPolicy: 'network-only' },
            );

            expect(fetch).toBeCalledTimes(1);

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.error) {
                    return 'Error Boundary';
                }
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual(null);
            expect(data).toEqual(loadingData);

            dataSource.next(response);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
            prefetched.next(
                environment,
                params,
                { id: '4' },
                { fetchKey: 'Break Cache 0', fetchPolicy: 'network-only' },
            );
            dataSource.next(responseRefetch);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
        });

        it('updates asynchronously when the query errors', () => {
            prefetched.next(environment, params, { id: '4' });

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.error) {
                    return 'Error Boundary';
                }
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual(null);
            expect(data).toEqual(loadingData);

            const error = new Error('wtf');
            dataSource.error(error);
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Error Boundary');
        });

        it('issue-115', () => {
            prefetched.next(environment, params, { id: '4' });

            let data;
            function Component(props) {
                data = usePreloadedQuery(props.prefetched);
                if (data.error) {
                    return 'Error Boundary';
                }
                if (data.props && data.props.node) {
                    return data.props.node.name;
                }
                return data.props;
            }
            const renderer = TestRenderer.create(
                <RelayEnvironmentProvider environment={environment}>
                    <Component prefetched={prefetched} />
                </RelayEnvironmentProvider>,
            );
            // Ensure that useEffect runs
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual(null);
            expect(data).toEqual(loadingData);

            dataSource.next(response);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect(renderer.toJSON()).toEqual('Zuck');
            expect(data.props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });

            TestRenderer.act(() => renderer.unmount());
            TestRenderer.act(() => jest.runAllImmediates());
            prefetched.next(environment, params, { id: '4' });
            dataSource.next(response);
            dataSource.complete();
            TestRenderer.act(() => jest.runAllImmediates());
            expect((prefetched.getValue(environment) as any).props).toEqual({
                node: {
                    id: '4',
                    name: 'Zuck',
                },
            });
        });
    });
});
