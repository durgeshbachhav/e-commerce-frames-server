'use strict';
const { createCoreController } = require('@strapi/strapi').factories;

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



module.exports = createCoreController('api::order.order', ({ strapi }) => ({
     async customOrderController(ctx) {
          try {
               // ctx.body = 'ok';
               const bodyData = ctx.body;
               const entries = await strapi.entityService.findMany('api::product.product', {
                    fields: ['title'],
                    limit: 2,

               })


               return { data: entries };
          } catch (error) {
               ctx.body = error;
          }
     },

     async create(ctx) {
          try {

               const { products } = ctx.request.body;

               const lineItems = await Promise.all(products.map(async (product) => {

                    const productEntries = await strapi.entityService.findMany("api::product.product", {
                         filters: {
                              key: product.key,
                         }
                    })

                    const realProduct = productEntries[0];


                    const image = product.image
                    return {
                         price_data: {
                              currency: 'inr',
                              product_data: {
                                   name: realProduct.title,
                                   images: [image]
                              },
                              unit_amount: realProduct.price * 100
                         },
                         quantity: product.quantity,
                    }
               }))

               const session = await stripe.checkout.sessions.create({
                    shipping_address_collection: {
                         allowed_countries: ['IN']
                    },
                    line_items: lineItems,
                    mode: 'payment',
                    success_url: `${process.env.CLIENT_BASE_URL}/payment/success`,
                    cancel_url: `${process.env.CLIENT_BASE_URL}/payment/failed`,
               });




               await strapi.entityService.create(`api::order.order`, {
                    data: {
                         products,
                         stripeId: session.id,
                    }
               })

               return { stripeId: session.id }
          } catch (error) {
               console.log(error);
               ctx.response.status = 500;
               return error;
          }
     }
}));
