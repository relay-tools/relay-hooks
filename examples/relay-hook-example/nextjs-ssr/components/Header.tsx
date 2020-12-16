/* eslint-disable react/display-name */
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';

const StyledButton = styled.button`
    margin: auto;
    padding: 10px;
    cursor: pointer;
    display: -webkit-box;
    flex: 1;
    ${(props): any =>
        props.selected &&
        css`
            border: 1px solid #999;
            box-shadow: inset 0 -1px 5px 0 rgba(0, 0, 0, 0.2);
            box-sizing: border-box;
        `}
`;

const MyButton = forwardRef(({ onClick, href, children, selected }: any, ref) => (
    <StyledButton selected={selected} href={href} onClick={onClick} ref={ref}>
        {children}
    </StyledButton>
));

const StyledDiv = styled.div`
    display: flex;
    background: #fff;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
`;

export function isPaginated(router): boolean {
    const { pathname } = router;
    return pathname === '/paginated';
}

export function isScroll(router): boolean {
    const { pathname } = router;
    return pathname === '/scroll';
}

export function isAll(router): boolean {
    const { pathname } = router;
    return pathname === '/';
}

export const Header = (): any => {
    const router = useRouter();
    return (
        <React.Fragment>
            <StyledDiv>
                <Link
                    href={{
                        pathname: '/',
                        query: router.query,
                    }}
                >
                    <MyButton selected={isAll(router)}>ALL</MyButton>
                </Link>
                <Link href={{ pathname: '/paginated', query: router.query }}>
                    <MyButton selected={isPaginated(router)}>PAGINATED</MyButton>
                </Link>
                <Link href={{ pathname: '/scroll', query: router.query }}>
                    <MyButton selected={isScroll(router)}>SCROLL</MyButton>
                </Link>
            </StyledDiv>
        </React.Fragment>
    );
};
