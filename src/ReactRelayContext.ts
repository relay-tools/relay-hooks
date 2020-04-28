/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

import * as React from 'react';
import { __internal } from 'relay-runtime';

const { createRelayContext } = __internal;

export const ReactRelayContext = createRelayContext(React);
