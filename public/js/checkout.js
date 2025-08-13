document.addEventListener("DOMContentLoaded", async function () {
    const stripe = Stripe(stripePublicKey); // Your public key from the server

    const amountinCents = amount;
    const options = {
        mode: 'payment',
        currency: currency,
        amount: amountinCents,
        paymentMethodCreation: 'manual',
        // Fully customizable with appearance API.
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimary: '#0570de',
                colorBackground: '#ffffff',
                colorText: '#30313d',
                colorDanger: '#df1b41',
                fontFamily: 'Ideal Sans, system-ui, sans-serif',
                spacingUnit: '2px',
                borderRadius: '4px',
            },
            rules: {
                '.Error': {
                    color: '#fa755a', // Set text color for error messages
                    fontSize: '16px', // Error message font size
                    marginTop: '10px', // Margin above the error message
                    display: 'block', // Make sure it displays
                },
                '.Tab:hover': {
                    color: 'var(--colorText)',
                },
                '.Tab--selected': {
                    borderColor: '#E0E6EB',
                    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(18, 42, 66, 0.02), 0 0 0 2px var(--colorPrimary)',
                },
            }
        },
    };

    const elements = stripe.elements(options); // Initialize Elements
    const paymentElement = elements.create('payment'); // Create the payment element
    paymentElement.mount('#payment-element'); // Mount the payment element to the DOM

    // Add a listener to detect the selected payment method
    let selectedPaymentMethodType = 'card'; // Default to card
    paymentElement.on('change', (event) => {
        selectedPaymentMethodType = event.value.type;
        console.log('Selected payment method:', selectedPaymentMethodType);
    });

    // Define the form variable here to ensure it exists
    const form = document.getElementById('payment-form');
    const handleError = (error) => {
        const messageContainer = document.querySelector('#error-message');
        if (messageContainer) {
            messageContainer.textContent = error.message; // Display the error message
            // Note: The 'button' variable is not in scope here.
            // You might need to pass it or define it in a higher scope.
            // button.disabled = false; // Re-enable button on error
        }
    };

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent form from submitting normally
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true; // Disable the button to prevent multiple submissions

            // Trigger form validation and wallet collection
            const { error: submitError } = await elements.submit();
            if (submitError) {
                handleError(submitError);
                return; // Early exit on error
            }

            if (selectedPaymentMethodType === 'card') {
                // Create the ConfirmationToken using the details collected by the Payment Element
                const { error, confirmationToken } = await stripe.createConfirmationToken({
                    elements
                });

                if (error) {
                    handleError(error);
                    return; // Early exit on error
                }
                console.log(confirmationToken.id);

                // Send the confirmation token to the server to create a Payment Intent
                const res = await fetch("/create-confirm-intent", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        confirmationTokenId: confirmationToken.id, // Send the confirmation token ID to the server
                        amount: amountinCents,
                        currency: currency
                    })
                });

                const data = await res.json();
                if (res.ok) {
                        const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}`;
                        window.location.href = successUrl;
                } 
                else {
                    handleError(new Error(data.error));
                }

            } else if (selectedPaymentMethodType === 'paynow') {
                // Create the Payment Intent on the server
                const res = await fetch("/create-paynow-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: amountinCents,
                        currency: currency,
                        paymentMethodType: 'paynow'
                    })
                });

                const data = await res.json();
                console.log('result here')
                console.log(res)

                if (res.ok) {
                    // Construct the URL with query parameters
                    const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}`;

                    stripe.confirmPayNowPayment(
                        data.client_secret,
                        {}
                        ).then(function({error, paymentIntent}) {
                        const messageContainer = document.querySelector('#error-message');

                        if (error) {
                        // Show error to your customer (e.g., insufficient funds, card declined)
                            if (messageContainer) {
                                messageContainer.textContent = error.message;
                            }
                        } 
                        else if (paymentIntent.status === 'succeeded') {
                            // The payment succeeded
                                if (messageContainer) {
                                    messageContainer.textContent = "Payment succeeded!";
                                }
                            // You can redirect to a success page here
                        } 
                        else if (paymentIntent.status === 'requires_action') {
                            // The payment requires additional action from the customer.
                            // For PayNow, this usually means showing the QR code.
                            // The Payment Element handles this automatically.
                            // Your code might not even reach this point if using the Payment Element.
                            if (messageContainer) {
                                messageContainer.textContent = "Payment requires confirmation.";
                            }
                        }
                    });
                } 
                else {
                    handleError(new Error(data.error));
                }
                
            }
        });
    } else {
        console.error("Form with ID 'payment-form' not found!"); // Log if form is not found
    }
});