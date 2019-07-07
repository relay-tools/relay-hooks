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

export class Todo {
  +id: string;
  +text: string;
  +complete: boolean;

  constructor(id: string, text: string, complete: boolean) {
    this.id = id;
    this.text = text;
    this.complete = complete;
  }
}

export class User {
  +id: string;

  constructor(id: string) {
    this.id = id;
  }
}

// Mock authenticated ID
const USER_ID = 'me';

const USER_YOU_ID = 'you';

// Mock user database table
const usersById: Map<string, User> = new Map([[USER_ID, new User(USER_ID)]]);
usersById.set(USER_YOU_ID, new User(USER_YOU_ID));

// Mock todo database table
const todosById: Map<string, Todo> = new Map();
const todoIdsByUser: Map<string, $ReadOnlyArray<string>> = new Map([
  [USER_ID, []],
  [USER_YOU_ID, []]
]);

// Seed initial data
let nextTodoId: number = 0;
addTodo(USER_ID, 'Taste JavaScript', true);
addTodo(USER_ID, 'Buy a unicorn', false);

function getTodoIdsForUser(id: string): $ReadOnlyArray<string> {
  return todoIdsByUser.get(id) || [];
}

export function addTodo(idUser: string, text: string, complete: boolean): string {
  const todo = new Todo(`${nextTodoId++}`, text, complete);
  todosById.set(todo.id, todo);

  const todoIdsForUser = getTodoIdsForUser(idUser);
  todoIdsByUser.set(idUser, todoIdsForUser.concat(todo.id));

  return todo.id;
}

export function changeTodoStatus(id: string, complete: boolean) {
  const todo = getTodoOrThrow(id);

  // Replace with the modified complete value
  todosById.set(id, new Todo(id, todo.text, complete));
}

// Private, for strongest typing, only export `getTodoOrThrow`
function getTodo(id: string): ?Todo {
  return todosById.get(id);
}

export function getTodoOrThrow(id: string): Todo {
  const todo = getTodo(id);

  if (!todo) {
    throw new Error(`Invariant exception, Todo ${id} not found`);
  }

  return todo;
}

export function getTodos(idUser, status: string = 'any'): $ReadOnlyArray<Todo> {
  const todoIdsForUser = getTodoIdsForUser(idUser);
  const todosForUser = todoIdsForUser.map(getTodoOrThrow);

  if (status === 'any') {
    return todosForUser;
  }

  return todosForUser.filter(
    (todo: Todo): boolean => todo.complete === (status === 'completed'),
  );
}

// Private, for strongest typing, only export `getUserOrThrow`
function getUser(id: string): ?User {
  return usersById.get(id);
}

export function getUserOrThrow(id: string): User {
  const user = getUser(id);

  if (!user) {
    //throw new Error(`Invariant exception, User ${id} not found`);
  }

  return user;
}

export function markAllTodos(idUser: string, complete: boolean): $ReadOnlyArray<string> {
  const todosToChange = getTodos(idUser).filter(
    (todo: Todo): boolean => todo.complete !== complete,
  );

  todosToChange.forEach(
    (todo: Todo): void => changeTodoStatus(todo.id, complete),
  );

  return todosToChange.map((todo: Todo): string => todo.id);
}

export function removeTodo(id: string, idUser: string) {
  const todoIdsForUser = getTodoIdsForUser(idUser);

  // Remove from the users list
  todoIdsByUser.set(
    idUser,
    todoIdsForUser.filter((todoId: string): boolean => todoId !== id),
  );

  // And also from the total list of Todos
  todosById.delete(id);
}

export function removeCompletedTodos(idUser: string): $ReadOnlyArray<string> {
  const todoIdsForUser = getTodoIdsForUser(idUser);

  const todoIdsToRemove = getTodos(idUser)
    .filter((todo: Todo): boolean => todo.complete)
    .map((todo: Todo): string => todo.id);

  // Remove from the users list
  todoIdsByUser.set(
    idUser,
    todoIdsForUser.filter(
      (todoId: string): boolean => !todoIdsToRemove.includes(todoId),
    ),
  );

  // And also from the total list of Todos
  todoIdsToRemove.forEach((id: string): boolean => todosById.delete(id));

  return todoIdsToRemove;
}

export function renameTodo(id: string, text: string) {
  const todo = getTodoOrThrow(id);

  // Replace with the modified text value
  todosById.set(id, new Todo(id, text, todo.complete));
}
