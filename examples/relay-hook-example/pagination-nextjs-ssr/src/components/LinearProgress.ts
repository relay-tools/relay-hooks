import styled, { keyframes } from "styled-components";

const progressKeyframe = keyframes`
  0% {
    background-color: hsl(200, 100%, 50%);
  }
  50% {
    background-color: hsl(200, 50%, 50%);
  }
  100% {
    background-color: hsl(200, 0%, 50%);
  }
`;


const Skeleton = styled.div`
    animation: ${progressKeyframe} 1s linear infinite alternate;
`;
// 2.5s ease-in-out 0s infinite normal none running   1s linear infinite alternate
export const LinearProgress = styled(Skeleton)`
  width: 100%;
  height: 0.3rem;
  border-radius: 0.25rem;
`;
