#! /usr/bin/env node
import { Order, Customer, Item, Payment, NearbyStores, Tracking } from 'dominos';
import config from 'config';
import {urls} from 'dominos';
import fetch from 'node-fetch';

console.log("Hello world") 
//extra cheese thin crust pizza
const pizza = new Item(
    {
        //16 inch hand tossed crust
        code: '14SCREEN',
        options: {
            //sauce, whole pizza : normal
            X: { '1/1': '1' },
            //cheese, whole pizza  : double 
            C: { '1/1': '2' },
            //pepperoni, whole pizza : double 
            P: { '1/2': '2' }
        }
    }
);

const pizza2 = new Item(
 {
  code:'P_14SCREEN'
 }
);

const customer = new Customer(
  {
    //this could be an Address instance if you wanted 
    address: {
      street: config.get('streetNumber') + " " + config.get('streetName'),
      streetNumber: config.get('streetNumber'),
      streetName: config.get('streetName'), 
      unitType: config.get('unitType'),
      unitNumber: config.get('unitNumber'),
      zipcode: config.get('zipcode'),
      postalCode: config.get('zipcode'),
      city: config.get('city'),
      region: config.get('region')
    },
    firstName: config.get('firstName'),
    lastName: config.get('lastName'),
    //where's that 555 number from?
    phone: config.get('phone'),
    email: config.get('email')
  }
);
// console.log('customer', customer)

//we need to wait for this to return before
const nearbyStores = await new NearbyStores(customer.address);


let distance = 10;
let storeID = 0;
let actualStore;
//get closest delivery store
for (const store of nearbyStores.stores) {
  //inspect each store
  // console.dir(store,{depth:3});
  if (
    //we check all of these because the API responses seem to say true for some
    //and false for others, but it is only reliably ok for delivery if ALL are true
    //this may become an additional method on the NearbyStores class.
    // && store.IsDeliveryStore

    store.IsOnlineCapable
    && store.IsOnlineNow
    && store.AllowDeliveryOrders
    && store.IsOpen
    && store.ServiceIsOpen.Delivery
    && store.MinDistance < distance
  ) {
    distance = store.MinDistance;
    storeID = store.StoreID;
    actualStore = store;
  }

  // if (storeID === "3694") { console.log('chosen store', store) }
}
//3622 union sq

//3686 definitely works
//3694 store near Victor

if (storeID == 0) {
  throw ReferenceError('No Open Stores');
}

console.log('chosen store', storeID);
// console.log(nearbyStores)

// nearbyStore -> object {stores: [storeobj, storeobj, ...]}

// console.log('goodbye world');
// console.log('customer', customer);
// console.log('nearby Stores', nearbyStores);
// fetch('POST', 'www.dominos.com/orders')
//www.dominos.com/orders
//fetch -> send a request to an endpoint/aka API
//returns a promise. which is a special object meant to handle asynchronous code.
//1. pending
//2. fufilled
  //-> return whatever (list of stores)
//3. error
//nearbyStores = [list of stores]
//pending promise

//FINAL SECTION

const order = new Order(customer);

//MAY's Store is 5756
//storeID = 5756
// console.log(order);
//=> { storeID: 5676}
//storeID = "5756";
// console.log('storeID', typeof storeID)
order.storeID = storeID;
//console.log(order)
//3694 has a 14SCREEN pizza

// add pizza
order.addItem(pizza);
//validate order
// console.log(order);
const validate = await order.validate();
// console.log(validate);
// get the price
const price = await order.price();
// console.log('price', price);

const myCard = new Payment(
  {
    amount: order.amountsBreakdown.customer,

    // dashes are not needed, they get filtered out
    number: config.get('number'),

    //slashes not needed, they get filtered out
    expiration: config.get('expiration'),
    securityCode: config.get('securityCode'),
    postalCode: config.get('postalCode'),
    tipAmount: config.get('tipAmount')
  }
);

order.payments.push(myCard);

// console.log('myCard', order.payments)
console.log('order.address', order.address)

try {
  await order.place();
  const tracking = new Tracking();

  const trackingResult = await tracking.byPhone(customer.phone);

  //inspect the tracking info
  console.log('\n\nOrder Tracking\n\n');
  console.dir(trackingResult, { depth: 3 });
} catch (err) {
  // console.log('error', err);
  console.trace(err);
  //inspect Order Response to see more information about the 
  //failure, unless you added a real card, then you can inspect
  //the order itself
  console.log('\n\nFailed Order Probably Bad Card, here is order.priceResponse the raw response from Dominos\n\n');
  console.dir(
    order.placeResponse,
    { depth: 5 }
  );
}
