import React from 'react';
import Link from 'next/link';
import styled, {css} from 'styled-components';
import {withRouter} from 'next/router';

const StyledButton = styled.button`
  margin: auto;
  padding: 10px;
  cursor: pointer;
  display: -webkit-box;
  flex: 1;
  ${props =>
    props.selected &&
    css`
      border: 1px solid #999;
      box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
      box-sizing: border-box;
    `}
`;

const MyButton = React.forwardRef(
  ({onClick, href, children, selected}: any, ref) => (
    <StyledButton selected={selected} href={href} onClick={onClick} ref={ref}>
      {children}
    </StyledButton>
  ),
);

const StyledDiv = styled.div`
  display: flex;
  background: #fff;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
`;

const Header = ({userId}) => {
  const selectedYou = userId === 'you';
  return (
    <StyledDiv>
      <Link href="/">
        <MyButton selected={!selectedYou}>ME</MyButton>
      </Link>
      <Link href="/you">
        <MyButton selected={selectedYou}>YOU</MyButton>
      </Link>
    </StyledDiv>
  );
};

export default Header;
