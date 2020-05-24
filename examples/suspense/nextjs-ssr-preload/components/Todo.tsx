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

import ChangeTodoStatusMutation from '../mutations/ChangeTodoStatusMutation';
import RemoveTodoMutation from '../mutations/RemoveTodoMutation';
import RenameTodoMutation from '../mutations/RenameTodoMutation';
import TodoTextInput from './TodoTextInput';

import React, {useState, SyntheticEvent} from 'react';
import {useFragment, graphql, useRelayEnvironment} from 'relay-hooks';
import styled, {css} from 'styled-components';
import {Todo_todo$key} from '../__generated__/relay/Todo_todo.graphql';
import {Todo_user$key} from '../__generated__/relay/Todo_user.graphql';

type Props = {
  todo: Todo_todo$key;
  user: Todo_user$key;
  disabled?: boolean;
};

const DivView = styled.div`
  display: ${props => (props.isEditing ? 'none' : 'flex')};
`;

const StyledLi = styled.li`
  position: relative;
  font-size: 24px;
  border-bottom: 1px solid #ededed;
  flex: 1;
  ${props =>
    props.isEditing &&
    css`
      border-bottom: none;
      padding: 0;
      &:last-child {
        margin-bottom: -1px;
      }
    `}
`;

const ButtonDestroy = styled.button`
  display: none;
  position: absolute;
  top: 0;
  right: 10px;
  bottom: 0;
  width: 40px;
  height: 40px;
  margin: auto 0;
  font-size: 30px;
  color: #cc9a9a;
  margin-bottom: 11px;
  transition: color 0.2s ease-out;
  &:after {
    content: '×';
  }
  ${StyledLi}:hover & {
    color: #af5b5e;
    display: block;
  }
`;

const InputToggle = styled.input`
  text-align: center;
  width: 40px;
  height: auto;

  margin: auto 0;
  border: none;
  -webkit-appearance: none;
  appearance: none;
  &:after {
    content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-10 -18 100 135"><circle cx="50" cy="50" r="50" fill="none" stroke="%23bddad5" stroke-width="3"/></svg>');
  }
  ${props =>
    props.checked &&
    css`
      &:after {
        content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="-10 -18 100 135"><circle cx="50" cy="50" r="50" fill="none" stroke="%23bddad5" stroke-width="3"/><path fill="%235dc2af" d="M72 25L42 71 27 56l-4 4 20 20 34-52z"/></svg>');
      }
    `}
  @media screen and (-webkit-min-device-pixel-ratio: 0) {
    background: none;
    height: 40px;
  }
`;

const StyledLabel = styled.label`
  word-break: break-all;
  padding: 15px 0px 15px 15px;
  display: block;
  line-height: 1.2;
  transition: color 0.4s;
  ${props =>
    props.completed &&
    css`
      color: #d9d9d9;
      text-decoration: line-through;
    `}
`;

const fragmentSpecTodo = graphql`
  fragment Todo_todo on Todo {
    complete
    id
    text
  }
`;
const fragmentSpecUser = graphql`
  fragment Todo_user on User {
    id
    userId
    totalCount
    completedCount
  }
`;

// TODO MEDIA
export const Todo = (props: Props) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const {disabled} = props;
  const environment = useRelayEnvironment();
  const user = useFragment(fragmentSpecUser, props.user);
  const todo = useFragment(fragmentSpecTodo, props.todo);

  const handleCompleteChange = (e: SyntheticEvent<HTMLInputElement>) => {
    const complete = e.currentTarget.checked;
    ChangeTodoStatusMutation.commit(environment, complete, todo, user);
  };

  const handleDestroyClick = () => removeTodo();
  const handleLabelDoubleClick = () => {
    if (!disabled) setIsEditing(true);
  };
  const handleTextInputCancel = () => setIsEditing(false);

  const handleTextInputDelete = () => {
    setIsEditing(false);
    removeTodo();
  };

  const handleTextInputSave = (text: string) => {
    setIsEditing(false);
    RenameTodoMutation.commit(environment, text, todo);
  };

  const removeTodo = () => RemoveTodoMutation.commit(environment, todo, user);

  return (
    <StyledLi isEditing={isEditing}>
      <DivView isEditing={isEditing}>
        <InputToggle
          checked={todo.complete}
          onChange={handleCompleteChange}
          type="checkbox"
          disabled={disabled}
        />

        <StyledLabel
          completed={todo.complete}
          onDoubleClick={handleLabelDoubleClick}>
          {todo.text}
        </StyledLabel>
        {!disabled && <ButtonDestroy onClick={handleDestroyClick} />}
      </DivView>

      {isEditing && (
        <TodoTextInput
          edit
          isEditing={isEditing}
          commitOnBlur={true}
          initialValue={todo.text}
          onCancel={handleTextInputCancel}
          onDelete={handleTextInputDelete}
          onSave={handleTextInputSave}
        />
      )}
    </StyledLi>
  );
};

export default Todo;
