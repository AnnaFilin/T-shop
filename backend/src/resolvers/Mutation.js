const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const { transport, makeANiceEmail } = require('../mail');
const { hasPermission } = require('../utils');
const stripe = require('../stripe');

const Mutations = {
	async createItem(parent, args, ctx, info) {
		//Check if they are logged in
		if(!ctx.request.userId) {
			throw new Error('You must be logged in to do that!');
		}

		const item = await ctx.db.mutation.createItem(
		{
			data: {
				//this is the creation of the relationship between the Item and the User
				user: {
					connect: {
						id: ctx.request.userId,
					},
				},
			...args,
			},
		},
		info
		);
		console.log(item);
		return item;
	},

	updateItem(parent, args, ctx, info) {
		// first take a copy of the updates
		const updates = { ...args };
		// remove the ID from the updates
		delete updates.id;
		// run the update method
		return ctx.db.mutation.updateItem(
		{
			data: updates,
			where: {
			id: args.id,
			},
		},
		info
		);
	},

  	async deleteItem(parent, args, ctx, info) {
		const where = { id: args.id };
		// 1. find the item
		const item = await ctx.db.query.item({ where }, `{ id title user {id}}`);
		// 2. Check if they own that item, or have the permissions
		const ownsItem = item.user.id === ctx.request.userId;
		const hasPermission = ctx.request.user.permissions.some(permission => [
			'ADMIN', 'ITEMDELETE'
		].includes(permission));
		if(!ownsItem && !hasPermission) {
			throw new Error('You don`t have the permissions to do that!');
		}
		// 3. Delete it!
		return ctx.db.mutation.deleteItem({ where }, info);
  	},

  	async signup(parent, args, ctx, info) {
		// lowercase their email
		args.email = args.email.toLowerCase();
		// hash their password
		const password = await bcrypt.hash(args.password, 10);
		// create the user in the database
		const user = await ctx.db.mutation.createUser(
		{
			data: {
			...args,
			password,
			permissions: { set: ['USER'] },
			},
		},
		info
		);
		// create the JWT token for them
		const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
		console.log(token);
		// We set the jwt as a cookie on the response
		ctx.response.cookie('token', token, {
			httpOnly: true,
			maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
		});
		// Finalllllly we return the user to the browser
		return user;
 	},

  	async signin(parent, { email, password }, ctx, info) {
	//1.check if there is a user with that email
		const user = await ctx.db.query.user({ where: {email} });
		if(!user) {
			throw new Error(`No such user for ${email}`);
		}
		//2. check if it is the correct password
		const valid = await bcrypt.compare(password, user.password);
		if(!valid) {
			throw new Error('Wrong Password!');
		}
		//3.generate the JWT token
		const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
		//4.set the cookie with the token
		ctx.response.cookie('token', token, {
			httpOnly: true,
			maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
		});
		//5.return the user
		return user;
  	},

  	signout(parent, args, ctx, info) {
		ctx.response.clearCookie('token');
		return { message: 'Goodbye!'};
  	},

	  async requestReset(parent, args, ctx, info) {
		//1.check if this is a real user
		const user = await ctx.db.query.user({where: {email: args.email}} );
		if(!user) {
		 throw new Error(`No such user found for email ${args.email}`);
		}
		//2.set a reset token and an  expiry on that user
		const randomBytesPromisified = promisify(randomBytes);
		const resetToken = (await randomBytesPromisified(20)).toString('hex');
		const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
		const res = await ctx.db.mutation.updateUser({
			where: {email: args.email},
			data: {resetToken, resetTokenExpiry}
			//data: {resetToken: resetToken, resetTokenExpiry: resetTokenExpiry}
		});
		console.log(res);
		//3.email them that reset token
		const mailRes = await transport.sendMail({
			from: 'benderod@gmail.com',
			to: user.email,
			subject: 'Your password reset toen',
			html: makeANiceEmail(`Your password reset token is here \n\n
			<a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">
			Click here to reset</a>`),
		});
   
		return { message: 'Thanks'};
	   },
   
	   async resetPassword(parent, args, ctx, info) {
		   //1.check if the password is right
		   if(args.password !== args.confirmPassword) {
			   throw new Error('Yo Password don\'t match...');
		   }
		   //2.check if its a legit reset token
		   //3.check if its expired
		   const [user] = await ctx.db.query.users({
			   where: {
				   resetToken: args.resetToken,
				   resetTokenExpiry_gte: Date.now() - 3600000,
			   },
		   });
		   if(!user) {
			   throw new Error('This token id either invalid or expired');
		   }
		   //4.hash their new password
		   const password = await bcrypt.hash(args.password, 10);
		   //5.save the neew password to the user and remove ald resettoken fields
		   const updatedUser = await ctx.db.mutation.updateUser({
			   where: {email: user.email},
			   data: {
				   password,
				   resetToken: null,
				   resetTokenExpiry: null,
			   },
		   });
		   //6.generate JWT
		   const token = jwt.sign({userId: updatedUser.id}, process.env.APP_SECRET);
		   //7.set the JWT cookie
		   ctx.response.cookie('token', token, {
			   httpOnly: true,
			   maxAge: 1000 * 60 * 60 *24 * 365 
		   })
		   //8.return the new user
		   return updatedUser;
	   },

	async updatePermissions(parent, args, ctx, info) {
		//1. check if they are logged in
		if(!ctx.request.userId) {
			throw new Error('You must be logged in!');
		}
		//2. query the current user
		const currentUser = await ctx.db.query.user(
			{ 
				where: {
					id: ctx.request.userId 
				},
			},
			info
		);
		//3. check if they have permissions to do that
		hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE']);
		//4. update the permissions
		return ctx.db.mutation.updateUser(
			{
				data: 
				{
					permissions: {
						//because it's an ENUM
						set: args.permissions,
					}
				},
				where: {
					id: args.userId,
				},
			}, 
			info
		);
	},   
   
	async addToCart(parent, args, ctx, info) {
		//1.check if they are logged in
		//const userId = ctx.request.userId;
		const { userId } = ctx.request;
		if(!userId) {
			throw new Error('You must be logged in!');
		}
		//2.query the users current cart
		const [existingCartItem] = await ctx.db.query.cartItems({
			where: {
				user: {id: userId},
				item: {id: args.id},
			},
		});
		console.log(existingCartItem);
		//3.check if that item is already in the cart and increment by 1 if it is
		if(existingCartItem) {
			console.log('This item is allready in their cart...');
			return ctx.db.mutation.updateCartItem({
				where: {id: existingCartItem.id},
				data: {quantity: existingCartItem.quantity + 1},
			}, info);
		}
		//4.if it's not create a fresh CartItem for that user
		return ctx.db.mutation.createCartItem({
			data: {
				user: {
					connect: {id: userId},
				},
				item: {
					connect: {id: args.id},
				},
			},
		}, info);
	},

	async removeFromCart(parent, args, ctx, info) {
		//1.find the cart item
		const cartItem = await ctx.db.query.cartItem(
		{
			where: {
				id: args.id,
			},
		},
		`{ id, user { id }}`
		);
		//console.log(args.id);
		//1.5 :) make sure i found an item
		if(!cartItem) throw new Error('No cart item found!');
		//2.make sure they own that cart item
		if(cartItem.user.id !== ctx.request.userId) {
			throw new Error('You don`t own this item!!!');
		}
		//3.delete the cart item 
		return ctx.db.mutation.deleteCartItem(
			{
			  where: { id: args.id },
			},
			info
		);
	},

	async createOrder(parent, args, ctx, info) {
		//1.Query the current user and make sure they are signed in
		const { userId } = ctx.request;
		if(!userId) throw new Error('You must be signed in to complete the order');
		const user = await ctx.db.query.user(
			{ where: { id: userId}},
			`{
				id
				name
				email
				cart {
					id
					quantity
					item { title price id description image largeImage}
				}
			}`
		);
		//2.recalculate the totel for the price
		const amount = user.cart.reduce((tally, cartItem) => tally + cartItem.item.price * cartItem.quantity, 0);
		console.log(`Going to charge for a total of ${amount}`);
		//3.create the stripe charge (turn token into money...)
		const charge = await stripe.charges.create({
			amount,
			currency: 'USD',
			source: args.token,
		});
		//4.convert the cart items to order items
		const orderItems = user.cart.map(cartItem => {
			const orderItem = {
				...cartItem.item,
				quantity: cartItem.quntity,
				user: { connect: {id: userId} },
			};
			delete orderItem.id;
			return orderItem;
		});
		//5.create the order
		const order = await ctx.db.mutation.createOrder({
			data: {
				total: charge.amount,
				charge: charge.id,
				items: { create: orderItems},
				user: { connect: { id: userId } },
			},
		});
		//6.clean up = delete the users cart, delete cart items
		const cartItemIds = user.cart.map(cartItem => cartItem.id);
		await ctx.db.mutation.deleteManyCartItems({
			where: {
				id_in: cartItemIds,
			},
		});
		//7.return the order to the client
		return order;
	},
};

module.exports = Mutations;
