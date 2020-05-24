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
  id;
  text;
  complete;

  constructor(id, text, complete) {
    this.id = id;
    this.text = text;
    this.complete = complete;
  }
}

export class User {
  id;

  constructor(id) {
    this.id = id;
  }
}

// Mock authenticated ID
const USER_ID = 'me';

const USER_YOU_ID = 'you';

// Mock user database table
const usersById = new Map([[USER_ID, new User(USER_ID)]]);
usersById.set(USER_YOU_ID, new User(USER_YOU_ID));

// Mock todo database table
const todosById = new Map();
const todoIdsByUser = new Map([[USER_ID, []], [USER_YOU_ID, []]]);

// Seed initial data
let nextTodoId = 0;
addTodo(USER_ID, '0', 'Taste JavaScript', true);
addTodo(USER_ID, '1', 'Buy a unicorn', false);

function getTodoIdsForUser(id) {
  return todoIdsByUser.get(id) || [];
}

export function addTodo(idUser, id, text, complete) {
  const todo = new Todo(id, text, complete);
  todosById.set(todo.id, todo);

  const todoIdsForUser = getTodoIdsForUser(idUser);
  todoIdsByUser.set(idUser, todoIdsForUser.concat(todo.id));

  return todo.id;
}

export function changeTodoStatus(id, complete) {
  const todo = getTodoOrThrow(id);

  // Replace with the modified complete value
  todosById.set(id, new Todo(id, todo.text, complete));
}

// Private, for strongest typing, only export `getTodoOrThrow`
function getTodo(id) {
  return todosById.get(id);
}

export function getTodoOrThrow(id) {
  const todo = getTodo(id);

  if (!todo) {
    throw new Error(`Invariant exception, Todo ${id} not found`);
  }

  return todo;
}

export function getTodos(idUser, status = 'any') {
  const todoIdsForUser = getTodoIdsForUser(idUser);
  const todosForUser = todoIdsForUser.map(getTodoOrThrow);

  if (status === 'any') {
    return todosForUser;
  }

  return todosForUser.filter(
    todo => todo.complete === (status === 'completed'),
  );
}

// Private, for strongest typing, only export `getUserOrThrow`
function getUser(id) {
  return usersById.get(id);
}

export function getUserOrThrow(id) {
  const user = getUser(id);

  if (!user) {
    //throw new Error(`Invariant exception, User ${id} not found`);
  }

  return user;
}

export function markAllTodos(idUser, complete) {
  const todosToChange = getTodos(idUser).filter(
    todo => todo.complete !== complete,
  );

  todosToChange.forEach(todo => changeTodoStatus(todo.id, complete));

  return todosToChange.map(todo => todo.id);
}

export function removeTodo(id, idUser) {
  const todoIdsForUser = getTodoIdsForUser(idUser);

  // Remove from the users list
  todoIdsByUser.set(idUser, todoIdsForUser.filter(todoId => todoId !== id));

  // And also from the total list of Todos
  todosById.delete(id);
}

export function removeCompletedTodos(idUser) {
  const todoIdsForUser = getTodoIdsForUser(idUser);

  const todoIdsToRemove = getTodos(idUser)
    .filter(todo => todo.complete)
    .map(todo => todo.id);

  // Remove from the users list
  todoIdsByUser.set(
    idUser,
    todoIdsForUser.filter(todoId => !todoIdsToRemove.includes(todoId)),
  );

  // And also from the total list of Todos
  todoIdsToRemove.forEach(id => todosById.delete(id));

  return todoIdsToRemove;
}

export function renameTodo(id, text) {
  const todo = getTodoOrThrow(id);

  // Replace with the modified text value
  todosById.set(id, new Todo(id, text, todo.complete));
}
