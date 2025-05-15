/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-var-requires */
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

'use strict';
jest.mock('fbjs/lib/warning', () => {
    const f: any = jest.fn();
    f.default = jest.fn();
    return f;
});
// eslint-disable-next-line no-unused-vars
import * as React from 'react';
import * as TestRenderer from 'react-test-renderer';
import {
    FRAGMENT_OWNER_KEY,
    FRAGMENTS_KEY,
    ID_KEY,
    createOperationDescriptor,
    RelayFeatureFlags,
    graphql,
} from 'relay-runtime';

(RelayFeatureFlags as any).ENABLE_REQUIRED_DIRECTIVES = true;
import { createMockEnvironment } from 'relay-test-utils-internal';

//import * as Scheduler from 'scheduler';
import { ReactRelayContext, useSuspenseFragment as useFragmentNodeOriginal } from '../src';
const warning = require('fbjs/lib/warning');

let environment;
let singularQuery;
let renderSingularFragment;
let renderSpy;

function useFragmentNode(fragmentNode, fragmentRef) {
    const result = useFragmentNodeOriginal(fragmentNode, fragmentRef);
    renderSpy(result);
    return result;
}

beforeEach(() => {
    // Set up mocks
    jest.resetModules();
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {});
    renderSpy = jest.fn();

    // Set up environment and base data
    TestRenderer.act(() => {
        environment = createMockEnvironment();
    });

    const singularVariables = { id: '1' };
    const gqlSingularQuery = graphql`
        query useFragmentNodeRequiredTestUserQuery($id: ID!) {
            node(id: $id) {
                ...useFragmentNodeRequiredTestUserFragment
            }
        }
    `;
    const gqlSingularFragment = graphql`
        fragment useFragmentNodeRequiredTestUserFragment on User {
            id
            name @required(action: NONE)
        }
    `;
    singularQuery = createOperationDescriptor(gqlSingularQuery, singularVariables);
    environment.commitPayload(singularQuery, {
        node: {
            __typename: 'User',
            id: '1',
            name: 'Alice',
        },
    });

    const ContextProvider = ({ children }) => {
        return <ReactRelayContext.Provider value={{ environment }}>{children}</ReactRelayContext.Provider>;
    };

    const SingularContainer = () => {
        // We need a render a component to run a Hook
        const userRef = {
            [ID_KEY]: singularQuery.request.variables.id,
            [FRAGMENTS_KEY]: {
                useFragmentNodeRequiredTestUserFragment: {},
            },
            [FRAGMENT_OWNER_KEY]: singularQuery.request,
        };

        useFragmentNode(gqlSingularFragment, userRef);
        return null;
    };

    renderSingularFragment = () => {
        let instance;
        TestRenderer.act(() => {
            instance = TestRenderer.create(
                <ContextProvider>
                    <SingularContainer />
                </ContextProvider>,
            );
        });
        return instance;
    };
});

afterEach(() => {
    environment.mockClear();
    renderSpy.mockClear();
    warning.mockClear();
});

it('should render singular fragment without error when data is available', () => {
    warning.mockClear();
    renderSingularFragment();
    expect(renderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
            id: '1',
            name: 'Alice',
        }),
    );
    expect(warning).not.toHaveBeenCalled();
});

it('should not warn on missing record when null bubbles to fragment root', () => {
    environment.commitPayload(singularQuery, {
        node: {
            __typename: 'User',
            id: '1',
            name: null,
        },
    });

    // commitPayload triggers some warnings, ignore those for the purposes of this test.
    // $FlowFixMe[prop-missing]
    warning.mockClear();

    renderSingularFragment();
    expect(renderSpy).toHaveBeenCalledWith(expect.objectContaining(null));
    expect(warning).not.toHaveBeenCalled();
});
