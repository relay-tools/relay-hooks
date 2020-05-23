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

import {
  commitMutation,
  graphql,
  //RecordSourceSelectorProxy,
} from 'relay-hooks';

import {
  ConnectionHandler,
  Disposable,
  IEnvironment,
  RecordSourceSelectorProxy,
} from 'relay-runtime';
import {TodoListFooter_user} from '../__generated__/relay/TodoListFooter_user.graphql';
import {isNotNull} from '../components/TodoApp';

type Todos = NonNullable<TodoListFooter_user['todos']>;
type Edges = NonNullable<Todos['edges']>;
type Edge = NonNullable<Edges[number]>;
type Node = NonNullable<Edge['node']>;
type NullableNode = Edge['node'];

const mutation = graphql`
  mutation RemoveCompletedTodosMutation($input: RemoveCompletedTodosInput!) {
    removeCompletedTodos(input: $input) {
      deletedTodoIds
      user {
        completedCount
        totalCount
      }
    }
  }
`;

function sharedUpdater(
  store: any,
  user: TodoListFooter_user,
  deletedIDs: ReadonlyArray<string>,
) {
  const userProxy = store.get(user.id);
  const conn = ConnectionHandler.getConnection(userProxy, 'TodoList_todos');

  // Purposefully type forEach as void, to toss the result of deleteNode
  if (conn) {
    deletedIDs.forEach(
      (deletedID: string): void =>
        ConnectionHandler.deleteNode(conn, deletedID),
    );
  }
}

function commit(
  environment: IEnvironment,
  todos: Todos,
  user: TodoListFooter_user,
) {
  const input: any = {
    userId: user.userId,
  };

  commitMutation(environment, {
    mutation,
    variables: {
      input,
    },
    updater: (store: any) => {
      const payload = store.getRootField('removeCompletedTodos');
      const deletedIds = payload.getValue('deletedTodoIds');

      // $FlowFixMe `payload.getValue` returns mixed, not sure how to check refinement to $ReadOnlyArray<string>
      sharedUpdater(store, user, deletedIds);
    },
    optimisticUpdater: (store: any) => {
      // Relay returns Maybe types a lot of times in a connection that we need to cater for
      const completedNodeIds: ReadonlyArray<string> = todos.edges
        ? todos.edges
            .filter(isNotNull)
            .map((edge: Edge): NullableNode => edge.node)
            .filter(isNotNull)
            .filter((node: Node): boolean => node.complete)
            .map((node: Node): string => node.id)
        : [];

      const userRecord = store.get(user.id);
      userRecord.setValue(
        userRecord.getValue('totalCount') - completedNodeIds.length,
        'totalCount',
      );
      userRecord.setValue(0, 'completedCount');
      sharedUpdater(store, user, completedNodeIds);
    },
  });
}

export default {commit};
