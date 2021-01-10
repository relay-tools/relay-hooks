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

import { GraphQLBoolean, GraphQLID, GraphQLNonNull } from 'graphql';
import { mutationWithClientMutationId } from 'graphql-relay';
import { changeTodoStatus, getTodoOrThrow, getUserOrThrow } from '../../database';
import { GraphQLTodo, GraphQLUser } from '../nodes';

const ChangeTodoStatusMutation = mutationWithClientMutationId({
    name: 'ChangeTodoStatus',
    inputFields: {
        complete: { type: new GraphQLNonNull(GraphQLBoolean) },
        id: { type: new GraphQLNonNull(GraphQLID) },
        userId: { type: new GraphQLNonNull(GraphQLID) },
    },
    outputFields: {
        todo: {
            type: new GraphQLNonNull(GraphQLTodo),
            resolve: ({ id }) => getTodoOrThrow(id),
        },
        user: {
            type: new GraphQLNonNull(GraphQLUser),
            resolve: ({ userId }) => getUserOrThrow(userId),
        },
    },
    mutateAndGetPayload: ({ id, complete, userId }) => {
        changeTodoStatus(id, complete);

        return { id, userId };
    },
});

export { ChangeTodoStatusMutation };
