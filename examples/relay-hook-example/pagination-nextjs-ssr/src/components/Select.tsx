import React, { useState } from 'react'
import styled from 'styled-components'

const Main = styled("div")`
  font-family: sans-serif;
  width: 70px;
`;

const DropDownContainer = styled("div")`
  margin: 0 auto;
  position: absolute;
  width: 70px;
`;

const DropDownHeader = styled("div")`
  padding: 10px 10px;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15);
  font-weight: 500;
  font-size: 1.3rem;
  color: #3faffa;
  background: #ffffff;
  cursor: pointer;
`;

const DropDownListContainer = styled("div")``;

const DropDownList = styled("ul")`
  padding: 0;
  margin: 0;
  padding-left: 1em;
  background: #ffffff;
  border: 2px solid #e5e5e5;
  box-sizing: border-box;
  color: #3faffa;
  font-size: 1.3rem;
  font-weight: 500;
  &:first-child {
    padding-top: 0.8em;
  }
  cursor: pointer;
`;

const ListItem = styled("li")`
  list-style: none;
  margin-bottom: 0.8em;
`;

export const Select = (props) => {
  const { items, onItemSelected, defaultValue } = props;
  const [menuVisible, setMenuVisible] = useState(false)
  const [selectedOption, setSelectedOption] = useState(defaultValue);


  const onOptionClicked = value => {
    setSelectedOption(value);
    setMenuVisible(false);
    onItemSelected(value)
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible)
  }

  const list = items.map((item: any) => (
    <ListItem onClick={() => onOptionClicked(item)} key={item}>{item}</ListItem>
  ))

  return (
    <Main>
      <DropDownContainer>
        <DropDownHeader onClick={toggleMenu}>{selectedOption}</DropDownHeader>
        <DropDownListContainer>
          {menuVisible && (<DropDownList>
            {list}
          </DropDownList>)}
        </DropDownListContainer>
      </DropDownContainer>
    </Main>

  )
}