# James Submission for SA Take Home Assignment

## Application Overview

This demo is written in Python with the [Flask framework](https://flask.palletsprojects.com/). You'll need to use a set of testmode API keys from the Stripe dashboard.

## Build, Configure and Run the Application

To get started, clone the repository and run pip3 to install dependencies:

```
git clone https://github.com/jamesojx97/e-commerce_project_extended
cd sa-takehome-project-python
pip3 install -r requirements.txt
```

Create a `.env` file and populate it with your Stripe account's test API keys in the following format:

```env
STRIPE_SECRET_KEY=<sk_test_xxx>
STRIPE_PUBLISHABLE_KEY=<pk_test_xxx>
```

Run the application locally with the command:

```
flask run
```

Navigate to [http://localhost:5000](http://localhost:5000) to view the index page.

## Solution Overview

### Backend/Frontend Setup

This application is a simple e-commerce checkout page that demonstrates a server-side approach to handling payments with Stripe. It uses a Flask backend to manage the checkout logic and Stripe API calls, and a Jinja2 frontend for rendering dynamic HTML.

### Stripe APIs Used

- **[stripe.PaymentIntent.create](https://docs.stripe.com/api/payment_intents/create)** - Creates a PaymentIntent
- **[stripe.createConfirmationToken](https://docs.stripe.com/js/confirmation_tokens/create_confirmation_token)** - Creates a Confirmation Token consisting of collected payment details
- **[stripe.ConfirmationToken.retrieve](https://docs.stripe.com/api/confirmation_tokens/retrieve)** - Retrieves a Confirmation Token to inspect collected payment details and run custom business logic
- **[stripe.PaymentIntent.retrieve](https://docs.stripe.com/api/payment_intents/retrieve)** - Retrieves a PaymentIntent to get the latest status
- **[stripe.confirmGrabPayPayment](https://docs.stripe.com/js/payment_intents/confirm_grabpay_payment)** - Confirm a PaymentIntent for GrabPay specific Payment Method
- **[stripe.confirmAlipayPayment](https://docs.stripe.com/js/payment_intents/confirm_alipay_payment)** - Confirm a PaymentIntent for Alipay specific Payment Method

### Application Architecture

The application is structured as a Flask project:

- **`app.py`**: The main file containing all the application's routes and business logic. It handles requests, interacts with the Stripe API, and renders the appropriate HTML pages.

- **`views/`**: This directory holds the HTML templates (.html files) rendered by Flask.
  - `index.html`: The main page where users select an item.
  - `checkout.html`: The page where users enter payment details. It loads the Stripe Payment Element.
  - `success.html`: The page that confirms a successful payment.

- **`public/`**: This directory contains static assets like CSS and JavaScript files.
  - `checkout.js`: The frontend JavaScript file that initializes Stripe, creates a Payment Element, and handles the form submission by sending a request to the backend.

## Approach, Documentation, and Challenges Encountered

### Approach

I considered what the merchant integrating Stripe may require in terms of their checkout flow and the business logic necessary.  This is why I chose to show Digital Wallets such as Alipay and GrabPay in addition to cards. I also wanted to demonstrate how easy it is to for a new user to set up Link and for an existing user to use Link for their checkout. Moreover, since the merchant is an online book store, collecting a delivery address would be important to faciliate their order fulfillment.

From past experience, merchants choosing to integrate Payment Element often have their own business logic they want to run prior to creating the Payment Intent. Thus, I chose an advanced integration design - **Finalize Payments on the Server** for accepting card payments. This demonstrates to the merchant how the implementation is flexible enough to accommodate their custom business logic such as inspecting card details to determine if discounts are applicable. Error handling such as prevention of multiple submissions and submitting card payment details without valid expiration dates or CVC formats has been included. 

### Documentation

- [Finalize Payments on the Server](https://docs.stripe.com/payments/finalize-payments-on-the-server)
- [Stripe Appearance API](https://docs.stripe.com/elements/appearance-api)
- [Confirm GrabPay Payment](https://docs.stripe.com/js/payment_intents/confirm_grabpay_payment)
- [Confirm Alipay Payment](https://docs.stripe.com/js/payment_intents/confirm_alipay_payment)
- [Create Payment Intent API](https://docs.stripe.com/api/payment_intents/create)
- [Retrieve Payment Intent API](https://docs.stripe.com/api/payment_intents/retrieve)
- [Create Confirmation Token](https://docs.stripe.com/js/confirmation_tokens/create_confirmation_token)
- [Retrieve Confirmation Token API](https://docs.stripe.com/api/confirmation_tokens/retrieve)
- [Link Authentication Element](https://docs.stripe.com/payments/elements/link-authentication-element)
- [Address Element](https://docs.stripe.com/elements/address-element)
- [Listening for changes on Address Elemnt](https://docs.stripe.com/elements/address-element/collect-addresses#web-retrieve-address)
- [Jinja Templating](https://jinja.palletsprojects.com/en/stable/templates/)
- [Jinja Templating Primer](https://realpython.com/primer-on-jinja-templating/)
- [Flask Documentation](https://flask.palletsprojects.com/en/stable/)
- [DHTMLX Form Event Handling](https://docs.dhtmlx.com/suite/form/handling_events/)
- [JavaScript Event Listeners](https://www.w3schools.com/js/js_htmldom_eventlistener.asp)

### Challenges Encountered

1. **Setting publishable key in checkout.js**: Extension from HTML encountered errors initially as it was not yet initialized - needed to be first set in the `checkout.html` file.

2. **Outdated payment intent status**: Passing the payment intent status through API calls b/w the client and server doesn't provide the most updated state of the PaymentIntent object. Retrieving the PaymentIntent status from the server prior to rendering the success.html page was a better approach. 

3. **Stripe SDK versioning**: Payment Element's Finalize Payments on the Server integration requires the Retrieve Confirmation Token API. The initial SDK version was v2 but it requires at least v8 - updated the `requirements.txt` file to include the minimum version.

3. **POST request structure**: Tried to create a POST request that passed in a JSON object but POST requests typically return some data which was no longer needed by the client side. Structurally it was much easier to use a GET request that took in query parameter values and rendered these values in the `success.html`.

## Extension

1. **Webhook Handling**: Set up a Stripe webhook endpoint to asynchronously handle payment events (e.g., `payment_intent.succeeded`). This is crucial for handling payments that are not instantly confirmed, such as those that require additional verification or for certain redirected local payment methods.

2. **Dynamic Discounts**: Extend the `check_promotion_criteria` function to be more dynamic, fetching promotion rules from a database rather than hardcoding them.

3. **User Authentication**: Implement a user authentication system to associate payment history with specific user accounts to recommend books to the customer based on past purchases.

4. **Database Integration**: Replace the hardcoded product information with a real database (e.g., PostgreSQL or MySQL) to manage products, prices, and inventory. This would make the application scalable.