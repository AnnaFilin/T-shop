import Link from 'next/link';
import { Mutation } from 'react-apollo';
import NavStyles from './styles/NavStyles';
import User from './User';
import Signout from './Signout';
import { TOGGLE_CART_MUTATION } from './Cart';
import CartCount from './CartCount';
import CartItem from './CartItem';
// import styled from 'styled-components';

// const Logo = styled.h1`
// font-size: 4rem;
// position: relative;
// margin-left: 2rem;
// z-index: 2;
//     a {
//         padding: 0.5rem 1rem;
//         background: ${props => props.theme.green};
//         color: ${props => props.theme.offWhite};
//     }
//     @media (max-width: 1300px) {
//         margin: 0;
//         text-align: center;
//     }
// `;


const Nav = () => (
    <User>
      	{({ data: { me } }) => (
			<NavStyles>	
				<Link href="/items">
					<a>Shop</a>
				</Link>
				{me && (
					<>
						<Link href="/sell">
							<a>Sell</a>
						</Link>
						<Link href="/orders">
							<a>Orders</a>
						</Link>
						<Link href="/me">
							<a>Account</a>
						</Link>
						<Signout />
						<Mutation mutation={TOGGLE_CART_MUTATION}>
							{(toggleCart) => (
								<button onClick={toggleCart}>
									My Cart
									<CartCount count={me.cart.reduce((tally, cartItem) => tally + cartItem.quantity, 0)}></CartCount>
								</button>
							)}
						</Mutation>
					</>
				)}
				{!me && (
					<Link href="/signup">
						<a>Signin</a>
					</Link>
				)}
			</NavStyles>
		)}
	</User>
);

export default Nav;

