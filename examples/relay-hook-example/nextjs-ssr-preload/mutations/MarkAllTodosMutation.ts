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

import {commitMutation, graphql} from 'relay-hooks';
import {Disposable} from 'relay-runtime';
/*
import type {
  MarkAllTodosInput,
  MarkAllTodosMutationResponse,
} from 'relay/MarkAllTodosMutation.graphql';

type MarkAllTodos = $NonMaybeType<
  $ElementType<MarkAllTodosMutationResponse, 'markAllTodos'>,
>;
type ChangedTodos = $NonMaybeType<$ElementType<MarkAllTodos, 'changedTodos'>>;
type ChangedTodo = $ElementType<ChangedTodos, number>;

import type {TodoList_user} from 'relay/TodoList_user.graphql';
type Todos = $NonMaybeType<$ElementType<TodoList_user, 'todos'>>;
type Edges = $NonMaybeType<$ElementType<Todos, 'edges'>>;
type Edge = $NonMaybeType<$ElementType<Edges, number>>;
type Node = $NonMaybeType<$ElementType<Edge, 'node'>>;
*/
const mutation = graphql`
  mutation MarkAllTodosMutation($input: MarkAllTodosInput!) {
    markAllTodos(input: $input) {
      changedTodos {
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

function getOptimisticResponse(complete: boolean, todos: any, user: any): any {
  // Relay returns Maybe types a lot of times in a connection that we need to cater for
  const validNodes: ReadonlyArray<any> = todos.edges
    ? todos.edges
        .filter(Boolean)
        .map((edge: any): any => edge.node)
        .filter(Boolean)
    : [];

  const changedTodos: any = validNodes
    .filter((node: any): boolean => node.complete !== complete)
    .map(
      (node: any): any => ({
        complete: complete,
        id: node.id,
      }),
    );

  return {
    markAllTodos: {
      changedTodos,
      user: {
        id: user.id,
        completedCount: complete ? user.totalCount : 0,
      },
    },
  };
}

function commit(
  environment: any,
  complete: boolean,
  todos: any,
  user: any,
): Disposable {
  const input: any = {
    complete,
    userId: user.userId,
  };

  return commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    optimisticResponse: getOptimisticResponse(complete, todos, user),
  });
}

export default {commit};
