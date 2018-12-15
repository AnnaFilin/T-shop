import React from 'react';
import StripeCheckout from 'react-stripe-checkout';
import { Mutation } from 'react-apollo';
import Router from 'next/router';
import gql from 'graphql-tag';
import NProgress from 'nprogress';
import PropTypes from 'prop-types';
import calcTotalPrice from '../lib/calcTotalPrice';
import Error from './ErrorMessage';
import User, { CURRENT_USER_QUERY } from './User';

const CREATE_ORDER_MUTATION = gql`
    mutation createOrder($token: String!) {
        createOrder(token: $token) {
            id
            charge
            total
            items {
                id
                title
            }
        }
    }
`;

function totalItems(cart) {
    return cart.reduce((tally, cartItem) => tally + cartItem.quantity, 0);
}


class TakeMyMoney extends React.Component {

    onToken = async (res, createOrder) => {
        console.log('On Token called...');
        console.log(res);
    
        const order = await createOrder({
            variables: {
                token: res.id,
            },
        }).catch(err => {
            alert(err.message);
        });
        console.log(order);
    };


    render() {
        return (
            <User>
                {({ data: { me } }) => (
                    <Mutation 
                        mutation={CREATE_ORDER_MUTATION}
                        refetchQueries={[{ query: CURRENT_USER_QUERY}]}
                    >
                        { createOrder => (
                            <StripeCheckout
                            amount={calcTotalPrice(me.cart)}
                            name="T-Shop"  
                            description={`Order of ${totalItems(me.cart)} items`}
                            image={me.cart.length && me.cart[0].item.image}
                            stripeKey="pk_test_EVLTP2zpEpPLDT9slgIa4AvY"
                            currency="USD"
                            email={me.email}
                            token={res => this.onToken(res, createOrder)}  
                            >
                            {this.props.children}
                            </StripeCheckout>
                        )}    
                    </Mutation>
                )}
            </User>
        );
    }
}



export default TakeMyMoney;