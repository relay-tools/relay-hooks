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

import { GraphQLID, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { getUserOrThrow, removeTodo } from '../../database';
import { GraphQLUser } from '../nodes';

const RemoveTodoMutation = mutationWithClientMutationId({
    name: 'RemoveTodo',
    inputFields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        userId: { type: new GraphQLNonNull(GraphQLID) },
    },
    outputFields: {
        deletedTodoId: {
            type: new GraphQLNonNull(GraphQLID),
            resolve: ({ id }) => id,
        },
        user: {
            type: new GraphQLNonNull(GraphQLUser),
            resolve: ({ userId }) => getUserOrThrow(userId),
        },
    },
    mutateAndGetPayload: ({ id, userId }) => {
        removeTodo(id, userId);

        return { id, userId };
    },
});

export { RemoveTodoMutation };
