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

import React, {
  useEffect,
  useRef,
  useState,
  SyntheticEvent,
  KeyboardEvent,
} from 'react';
import styled, {css} from 'styled-components';

type Props = {
  isEditing?: boolean;
  edit?: boolean;
  commitOnBlur?: boolean;
  initialValue?: string;
  onCancel?: () => void;
  onDelete?: () => void;
  onSave: (string) => void;
  placeholder?: string;
};

const ENTER_KEY_CODE = 13;
const ESC_KEY_CODE = 27;

const cssInput = css`
  ${props =>
    props.placeholder &&
    css`
      &::-webkit-input-placeholder {
        font-style: italic;
        font-weight: 300;
        color: #e6e6e6;
      }

      &::-moz-placeholder {
        font-style: italic;
        font-weight: 300;
        color: #e6e6e6;
      }

      &::input-placeholder {
        font-style: italic;
        font-weight: 300;
        color: #e6e6e6;
      }
    `}
  padding: 16px 16px 16px 60px;
  border: none;
  background: rgba(0, 0, 0, 0.003);
  box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.03);
`;

const StyledInput = styled.input`
  ${cssInput}
`;

const StyledEditInput = styled.input`
  position: relative;
  margin: 0;
  width: 100%;
  font-size: 24px;
  font-family: inherit;
  font-weight: inherit;
  line-height: 1.4em;
  border: 0;
  color: inherit;
  padding: 6px;
  border: 1px solid #999;
  box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  ${cssInput}
`;
const TodoTextInput = ({
  edit = false,
  isEditing = false,
  commitOnBlur,
  initialValue,
  onCancel,
  onDelete,
  onSave,
  placeholder,
}: Props) => {
  const [text, setText] = useState<string>(initialValue || '');
  const inputRef = useRef() as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const commitChanges = () => {
    const newText = text.trim();

    if (onDelete && newText === '') {
      onDelete();
    } else if (onCancel && newText === initialValue) {
      onCancel();
    } else if (newText !== '') {
      onSave(newText);
      setText('');
    }
  };

  const handleBlur = () => {
    if (commitOnBlur) {
      commitChanges();
    }
  };

  const handleChange = (e: SyntheticEvent<HTMLInputElement>) =>
    setText(e.currentTarget.value);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (onCancel && e.keyCode === ESC_KEY_CODE) {
      onCancel();
    } else if (e.keyCode === ENTER_KEY_CODE) {
      commitChanges();
    }
  };

  const InputComponent = edit ? StyledEditInput : StyledInput;
  return (
    <InputComponent
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      ref={inputRef}
      value={text}
    />
  );
};

export default TodoTextInput;
