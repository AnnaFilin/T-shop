import Nav from './Nav';
import styled from 'styled-components';
import Link from 'next/link';
import Router from 'next/router';
import NProgress from 'nprogress';

Router.onRouteChangeStart = () => {
    NProgress.start();
}

Router.onRouteChangeComplete = () => {
    NProgress.done();
}

Router.onRouteChangeError = () => {
    NProgress.done();
}

const Logo = styled.h1`
font-size: 4rem;
position: relative;
margin-left: 2rem;
z-index: 2;
    a {
        padding: 0.5rem 1rem;
        background: ${props => props.theme.green};
        color: ${props => props.theme.offWhite};
    }
    @media (max-width: 1300px) {
        margin: 0;
        text-align: center;
    }
`;

const StyledHeader = styled.header`
    .bar {
        display: grid;
        grid-template-columns: auto 1fr;
        border-bottom: 10px solid ${props => props.theme.lightGreen};
        justify-content: space-between;
        align-items: strech;
        @media(max-width: 1300px) {
            grid-template-columns: 1fr;
            justify-content: center;
        }
    }
    .sub-bar{
        display: grid;
        grid-template-columns: auto 1fr;
       /* border-bottom: 2px solid ${props => props.theme.lightGreen};*/
    }
`;

const Header = () => (
    <StyledHeader>
        <div className="bar">
            <Logo>
                <Link href="/">
                    <a>T-Shop</a>        
                </Link>
            </Logo>
            <Nav />
        </div>  
        <div className="sub-bar">
            <p>Search</p>
        </div>
        <div>Cart</div>
    </StyledHeader>
);



// const Header = () => (
//     <StyledHeader>
//         <div className="bar">
//             <Nav />
//         </div>  
//         <div className="sub-bar">
//             <p>Search</p>
//         </div>
//         <div>Cart</div>
//     </StyledHeader>
// );

export default Header;