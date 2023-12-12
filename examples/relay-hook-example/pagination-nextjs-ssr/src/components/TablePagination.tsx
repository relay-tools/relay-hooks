import { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { TodoTextInput } from "./TodoTextInput";
import { Select } from "./Select";


/*
rowsPerPageOptions={[2, 5, 10, 25]}
                    count={totalCount}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}*/

const StyledButton = styled.button<any>`
                    margin: 5px;
                    padding: 10px;
                    cursor: ${(props)=>props.disabled?'default':'pointer'};
                    flex: 1;
                    border: 1px solid #999999;
                    ${(props): any =>
        props.disabled &&
        css`
                    background-color: #cccccc;
                    color: #666666;
                        `}
                `;

const StyledLabel = styled.label`
                word-break: break-all;
                padding: 15px 0px 15px 15px;
                display: block;
                line-height: 1.2;
                transition: color 0.4s;
            `;

const StyledDiv = styled.div`
            display: flex;
            background: #fff;
            box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2), 0 25px 50px 0 rgba(0, 0, 0, 0.1);
        `;


export const TablePagination = (props: any) => {
    const { rowsPerPageOptions, count, rowsPerPage, page, onPageChange, onRowsPerPageChange } = props;

    const [localPage, setLocalPage] = useState(page);
    const getLabelDisplayedRowsTo = () => {
        if (count === -1) {
            return (localPage + 1) * rowsPerPage;
        }
        return rowsPerPage === -1 ? count : Math.min(count, (localPage + 1) * rowsPerPage);
    };
    function labelDisplayedRows({ from, to, count }) {
        return `${from}–${to} of ${count !== -1 ? count : `more than ${to}`}`;
    }
    const label = labelDisplayedRows({
        from: count === 0 ? 0 : localPage * rowsPerPage + 1,
        to: getLabelDisplayedRowsTo(),
        count: count === -1 ? -1 : count,
    })

    const newPage = (next: boolean) => {
        let newPage;
        if (next) {
            newPage = localPage + 1
        } else {
            newPage = localPage - 1
        }
        setLocalPage(newPage)
        onPageChange(newPage)
    }
    return <StyledDiv>
        <StyledLabel>Rows for Page: </StyledLabel>
        <Select items={rowsPerPageOptions} onItemSelected={onRowsPerPageChange} defaultValue={rowsPerPage} />
        <StyledLabel>{label}</StyledLabel>
        <StyledButton disabled={page == 0} onClick={() => { newPage(false) }}>Prev</StyledButton>
        <StyledButton disabled={(page + 1) * rowsPerPage >= count} onClick={() => { newPage(true) }}>Next</StyledButton>
    </StyledDiv>

}