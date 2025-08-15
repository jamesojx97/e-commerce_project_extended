document.addEventListener("DOMContentLoaded", async function () {
    const stripe = Stripe(stripePublicKey); // Public key from the server

    const amountinCents = amount;
    const options = {
        mode: 'payment',
        currency: currency,
        amount: amountinCents,
        paymentMethodCreation: 'manual',
        // Customize with Appearance API.
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
                    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(19, 46, 73, 0.02), 0 0 0 2px var(--colorPrimary)',
                },
            }
        },
    };

    // Define form variable here to ensure it exists
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

    const button = form.querySelector('button[type="submit"]');
    // Initially disable the button
    button.disabled = true;

    const elements = stripe.elements(options); // Initialize Elements
    const paymentElement = elements.create('payment'); // Create the payment element
    paymentElement.mount('#payment-element'); // Mount the payment element to the DOM

    // Add a listener to detect the selected payment method
    let selectedPaymentMethodType = 'card'; // Default to card
    paymentElement.on('change', (event) => {
        selectedPaymentMethodType = event.value.type;
        console.log('Selected payment method:', selectedPaymentMethodType);
        // Check if the payment fields are complete and valid
        if (event.complete) {
            button.disabled = false; // Enable the button
        } else {
            button.disabled = true; // Disable the button
        }
        // Show any validation errors from Stripe Elements
        if (event.error) {
            handleError(event.error);
        } else {
            // Clear any existing error messages if the input is now valid
            const messageContainer = document.querySelector('#error-message');
            if (messageContainer) {
                messageContainer.textContent = "";
            }
        }
    });

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

                // Send confirmation token to server to create a Payment Intent
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
                    const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&currency=${data.currency}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}&status=${data.status}`;
                    window.location.href = successUrl;
                } 
                else {
                    handleError(new Error(data.error));
                }

            } 
            else if (selectedPaymentMethodType === 'grabpay') {
                // Create the Payment Intent on the server
                const res = await fetch("/create-grabpay-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: amountinCents,
                        currency: currency,
                        paymentMethodType: 'grabpay'
                    })
                });

                const data = await res.json();
                const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&currency=${data.currency}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}&status=${data.status}`;
                        
                if (res.ok) {
                    stripe.confirmGrabPayPayment(data.client_secret, {
                        // Return URL where customer should be redirected after the authorization
                        return_url: window.location.origin + successUrl,
                    });
                } 
                else {
                    handleError(new Error(data.error));
                }
            }
            else if (selectedPaymentMethodType === 'alipay') {
                // Create Payment Intent on the server
                const res = await fetch("/create-alipay-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: amountinCents,
                        currency: currency,
                        paymentMethodType: 'alipay'
                    })
                });

                const data = await res.json();
                const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&currency=${data.currency}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}&status=${data.status}`;
                        
                if (res.ok) {
                    stripe.confirmAlipayPayment(data.client_secret, {
                        // Return URL where the customer should be redirected after the authorization
                        return_url: window.location.origin + successUrl,
                    });
                } 
                else {
                    handleError(new Error(data.error));
                }
            }
        });
    } 
    else {
        console.error("Form with ID 'payment-form' not found!"); // Log if form is not found
    }
});