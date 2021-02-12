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
import * as ReactTestRenderer from 'react-test-renderer';

import { createOperationDescriptor, PayloadData, PayloadError } from 'relay-runtime';
import { createMockEnvironment, generateAndCompile } from 'relay-test-utils-internal';
import { useMutation, RelayEnvironmentProvider } from '../src';

const { useState, useMemo } = React;
let environment;
let render;
let setEnvironment;
let setMutation;
let commit;
let isInFlightFn;
let CommentCreateMutation;
let instance;
let renderSpy;

const data = {
    data: {
        commentCreate: {
            feedbackCommentEdge: {
                __typename: 'CommentsEdge',
                cursor: '<cursor>',
                node: {
                    id: '<id>',
                    body: {
                        text: '<text>',
                    },
                },
            },
        },
    },
};

const optimisticResponse = {
    commentCreate: {
        feedbackCommentEdge: {
            __typename: 'CommentsEdge',
            cursor: '<cursor>',
            node: {
                id: '<id>',
                body: {
                    text: 'optimistic <text>',
                },
            },
        },
    },
};

const variables = {
    input: {
        commentId: '<id>',
    },
};

function expectFragmentResult(data, error): void {
    // This ensures that useEffect runs
    ReactTestRenderer.act(() => jest.runAllImmediates());
    expect(renderSpy).toBeCalledTimes(1);
    const [dataRender, errorRender] = renderSpy.mock.calls[0];
    expect(data).toEqual(dataRender);
    expect(error).toEqual(errorRender);
    renderSpy.mockClear();
}

beforeEach(() => {
    environment = createMockEnvironment();
    isInFlightFn = jest.fn();
    renderSpy = jest.fn();

    ({ CommentCreateMutation } = generateAndCompile(`
    mutation CommentCreateMutation(
      $input: CommentCreateInput
    ) {
      commentCreate(input: $input) {
        feedbackCommentEdge {
          cursor
          node {
            id
            body {
              text
            }
          }
        }
      }
  }`));

    function Renderer({ initialMutation, commitInRender }): any {
        const [mutation, setMutationFn] = useState(initialMutation);
        setMutation = setMutationFn;
        const [commitFn, { loading: isMutationInFlight, data, error }] = useMutation(mutation);
        commit = commitFn;
        if (commitInRender) {
            // `commitInRender` never changes in the test
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useMemo(() => {
                commit({ variables });
            }, []);
        }
        isInFlightFn(isMutationInFlight);
        renderSpy(data, error);
        return null;
    }

    function Container(props: any): any {
        const [env, setEnv] = useState(props.environment);
        setEnvironment = setEnv;
        return (
            <RelayEnvironmentProvider environment={env}>
                <Renderer initialMutation={props.mutation} commitInRender={props.commitInRender} />
            </RelayEnvironmentProvider>
        );
    }

    render = function(env, mutation, commitInRender = false): any {
        ReactTestRenderer.act(() => {
            instance = ReactTestRenderer.create(
                <Container environment={env} mutation={mutation} commitInRender={commitInRender} />,
            );
        });
    };
});

it('returns correct in-flight state when the mutation is inflight and completes', () => {
    render(environment, CommentCreateMutation);
    expect(isInFlightFn).toBeCalledTimes(1);
    expect(isInFlightFn).toBeCalledWith(false);

    isInFlightFn.mockClear();
    commit({ variables });
    expect(isInFlightFn).toBeCalledTimes(1);
    expect(isInFlightFn).toBeCalledWith(true);

    isInFlightFn.mockClear();
    const operation = environment.executeMutation.mock.calls[0][0].operation;
    ReactTestRenderer.act(() => environment.mock.resolve(operation, data));
    expect(isInFlightFn).toBeCalledTimes(1);
    expect(isInFlightFn).toBeCalledWith(false);
});

it('returns correct in-flight state when commit called inside render', () => {
    render(environment, CommentCreateMutation, true);
    expect(isInFlightFn).toBeCalledTimes(2);
    expect(isInFlightFn).toHaveBeenNthCalledWith(2, true);
    isInFlightFn.mockClear();
    const operation = environment.executeMutation.mock.calls[0][0].operation;
    ReactTestRenderer.act(() => environment.mock.resolve(operation, data));
    expect(isInFlightFn).toBeCalledTimes(1);
    expect(isInFlightFn).toHaveBeenCalledWith(false);
});

it('calls onCompleted when mutation responses contains server errors', () => {
    const onError = jest.fn();
    const onCompleted = jest.fn();
    render(environment, CommentCreateMutation);
    commit({ variables, onError, onCompleted });
    const operation = environment.executeMutation.mock.calls[0][0].operation;

    isInFlightFn.mockClear();
    renderSpy.mockClear();
    ReactTestRenderer.act(() =>
        environment.mock.resolve(operation, {
            data: data.data as PayloadData,
            errors: [
                {
                    message: '<error0>',
                },
                {
                    message: '<error1>',
                },
            ] as Array<PayloadError>,
        }),
    );
    expect(onError).toBeCalledTimes(1); // changed
    expect(onCompleted).toBeCalledTimes(0); // changed
    const errors = [
        {
            message: '<error0>',
        },
        {
            message: '<error1>',
        },
    ];
    expect(onError).toBeCalledWith(errors);
    expect(isInFlightFn).toBeCalledWith(false);
    expectFragmentResult(null, errors);
});
it('calls onError when mutation errors in commitMutation', () => {
    const onError = jest.fn();
    const onCompleted = jest.fn();
    const throwingUpdater = (): void => {
        throw new Error('<error0>');
    };
    render(environment, CommentCreateMutation);
    commit({ variables, onError, onCompleted, updater: throwingUpdater });

    isInFlightFn.mockClear();
    const operation = environment.executeMutation.mock.calls[0][0].operation;
    ReactTestRenderer.act(() => environment.mock.resolve(operation, data));
    expect(onError).toBeCalledTimes(1);
    expect(onError).toBeCalledWith(new Error('<error0>'));
    expect(onCompleted).toBeCalledTimes(0);
    expect(isInFlightFn).toBeCalledWith(false);
});

it('calls onComplete when mutation successfully resolved', () => {
    const onError = jest.fn();
    const onCompleted = jest.fn();
    render(environment, CommentCreateMutation);
    commit({ variables, onError, onCompleted });

    isInFlightFn.mockClear();
    const operation = environment.executeMutation.mock.calls[0][0].operation;
    ReactTestRenderer.act(() => environment.mock.resolve(operation, data));
    expect(onError).toBeCalledTimes(0);
    expect(onCompleted).toBeCalledTimes(1);
    expect(onCompleted).toBeCalledWith({
        commentCreate: {
            feedbackCommentEdge: {
                cursor: '<cursor>',
                node: {
                    id: '<id>',
                    body: {
                        text: '<text>',
                    },
                },
            },
        },
    });
    expect(isInFlightFn).toBeCalledWith(false);
});

describe('change useMutation input', () => {
    let newEnv;
    let CommentCreateMutation2;

    beforeEach(() => {
        newEnv = createMockEnvironment();
        ({ CommentCreateMutation2 } = generateAndCompile(`
      mutation CommentCreateMutation2(
        $input: CommentCreateInput
      ) {
        commentCreate(input: $input) {
          feedbackCommentEdge {
            cursor
            node {
              id
              body {
                text
              }
            }
          }
        }
    }`));
    });

    it('can fetch from the new environment when the environment changes', () => {
        render(environment, CommentCreateMutation);
        isInFlightFn.mockClear();
        commit({ variables });
        expect(environment.executeMutation).toBeCalledTimes(1);

        ReactTestRenderer.act(() => setEnvironment(newEnv));
        commit({ variables });
        expect(newEnv.executeMutation).toBeCalledTimes(1);
    });

    it('can fetch use the new query when the query changes', () => {
        render(environment, CommentCreateMutation);
        commit({ variables });

        ReactTestRenderer.act(() => setMutation(CommentCreateMutation2));
        commit({ variables });
        const secondOperation = createOperationDescriptor(CommentCreateMutation2, variables);
        expect(environment.executeMutation).toBeCalledTimes(2);
        expect(environment.executeMutation.mock.calls[1][0].operation.request).toEqual(
            secondOperation.request,
        );

        isInFlightFn.mockClear();
        ReactTestRenderer.act(() => {
            environment.mock.resolve(environment.executeMutation.mock.calls[0][0].operation, data);
            environment.mock.resolve(secondOperation, data);
        });
        expect(isInFlightFn).toBeCalledTimes(1);
        expect(isInFlightFn).toBeCalledWith(false);
    });
});

describe('unmount', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    });

    it('does not setState on commit after unmount', () => {
        render(environment, CommentCreateMutation);
        ReactTestRenderer.act(() => instance.unmount());

        isInFlightFn.mockClear();
        commit({ variables });
        expect(isInFlightFn).toBeCalledTimes(0);
        expect(console.error).toBeCalledTimes(0);
    });

    it('does not setState on complete after unmount', () => {
        render(environment, CommentCreateMutation);
        commit({ variables });
        ReactTestRenderer.act(() => instance.unmount());

        isInFlightFn.mockClear();
        const operation = environment.executeMutation.mock.calls[0][0].operation;
        ReactTestRenderer.act(() => environment.mock.resolve(operation, data));
        expect(isInFlightFn).toBeCalledTimes(0);
        expect(console.error).toBeCalledTimes(0);
    });

    it('does not dispose previous in-flight mutaiton ', () => {
        const onCompleted = jest.fn();
        render(environment, CommentCreateMutation);
        commit({ variables, onCompleted });
        ReactTestRenderer.act(() => instance.unmount());
        const operation = environment.executeMutation.mock.calls[0][0].operation;
        ReactTestRenderer.act(() => environment.mock.resolve(operation, data));
        expect(onCompleted).toBeCalledTimes(1);
        expect(onCompleted).toBeCalledWith({
            commentCreate: {
                feedbackCommentEdge: {
                    cursor: '<cursor>',
                    node: {
                        id: '<id>',
                        body: {
                            text: '<text>',
                        },
                    },
                },
            },
        });
    });
});

describe('optimistic response', () => {
    it('calls onCompleted when mutation responses contains server errors', () => {
        const onError = jest.fn();
        const onCompleted = jest.fn();

        render(environment, CommentCreateMutation);
        renderSpy.mockClear();
        commit({ variables, onError, onCompleted, optimisticResponse });

        expectFragmentResult(optimisticResponse, null);
        const operation = environment.executeMutation.mock.calls[0][0].operation;

        isInFlightFn.mockClear();
        renderSpy.mockClear();
        ReactTestRenderer.act(() =>
            environment.mock.resolve(operation, {
                data: data.data as PayloadData,
                errors: [
                    {
                        message: '<error0>',
                    },
                    {
                        message: '<error1>',
                    },
                ] as Array<PayloadError>,
            }),
        );
        expect(onError).toBeCalledTimes(1); // changed
        expect(onCompleted).toBeCalledTimes(0); // changed
        const errors = [
            {
                message: '<error0>',
            },
            {
                message: '<error1>',
            },
        ];
        expect(onError).toBeCalledWith(errors);
        expect(isInFlightFn).toBeCalledWith(false);
        expectFragmentResult(null, errors);
    });

    it('calls onComplete when mutation successfully resolved', () => {
        const onError = jest.fn();
        const onCompleted = jest.fn();
        render(environment, CommentCreateMutation);

        renderSpy.mockClear();
        commit({ variables, onError, onCompleted, optimisticResponse });

        expectFragmentResult(optimisticResponse, null);

        isInFlightFn.mockClear();
        const operation = environment.executeMutation.mock.calls[0][0].operation;
        ReactTestRenderer.act(() => environment.mock.resolve(operation, data));
        const result = {
            commentCreate: {
                feedbackCommentEdge: {
                    cursor: '<cursor>',
                    node: {
                        id: '<id>',
                        body: {
                            text: '<text>',
                        },
                    },
                },
            },
        };
        expect(onError).toBeCalledTimes(0);
        expect(onCompleted).toBeCalledTimes(1);
        expect(onCompleted).toBeCalledWith(result);
        expect(isInFlightFn).toBeCalledWith(false);
        expectFragmentResult(result, null);
    });
});
