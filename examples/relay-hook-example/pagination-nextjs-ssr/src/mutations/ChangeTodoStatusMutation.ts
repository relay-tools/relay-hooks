// @flow
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

import { commitMutation, graphql } from 'relay-hooks';
import { ChangeTodoStatusMutation as ChangeTodoStatusMutationType } from '../__generated__/relay/ChangeTodoStatusMutation.graphql';
import { getUser } from './ReadInlineUser';

const mutation = graphql`
    mutation ChangeTodoStatusMutation($input: ChangeTodoStatusInput!) @raw_response_type {
        changeTodoStatus(input: $input) {
            todo {
                id
                complete
            }
            user {
                id
                completedCount
            }
        }
    }
`;

function getOptimisticResponse(complete: boolean, todo: any, user: any): any {
    return {
        changeTodoStatus: {
            todo: {
                complete: complete,
                id: todo.id,
            },
            user: {
                id: user.id,
                completedCount: complete ? user.completedCount + 1 : user.completedCount - 1,
            },
        },
    };
}

export function commit(environment: any, complete: boolean, todo: any, userRef: any): void {
    const user = getUser(userRef);
    const input: any = {
        complete,
        userId: user.userId,
        id: todo.id,
    };
    commitMutation<ChangeTodoStatusMutationType>(environment, {
        mutation,
        variables: {
            input,
        },
        optimisticResponse: getOptimisticResponse(complete, todo, user),
    });
}

export const ChangeTodoStatusMutation = {
    commit,
};
