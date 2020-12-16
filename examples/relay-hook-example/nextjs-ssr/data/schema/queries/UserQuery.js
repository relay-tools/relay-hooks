/* eslint-disable @typescript-eslint/explicit-function-return-type */
// @flow
/* graphql-relay doesn't export types, and isn't in flow-typed.  This gets too messy */
/**
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { GraphQLString } from 'graphql';
import { connectionArgs } from 'graphql-relay';
import { getUserOrThrow } from '../../database';
import { GraphQLUser } from '../nodes';

const UserQuery = {
    type: GraphQLUser,
    args: {
        id: { type: GraphQLString },
        ...connectionArgs,
    },
    resolve: (root, { id }) => getUserOrThrow(id),
};

export { UserQuery };
