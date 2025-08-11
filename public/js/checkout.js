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

    // Define the form variable here to ensure it exists
    const form = document.getElementById('payment-form'); 

    const handleError = (error) => {
        const messageContainer = document.querySelector('#error-message');
        if (messageContainer) {
            messageContainer.textContent = error.message; // Display the error message
            button.disabled = false; // Re-enable button on error
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

            // Create the ConfirmationToken using the details collected by the Payment Element
            const { error, confirmationToken } = await stripe.createConfirmationToken({
                elements
            });

            if (error) {
                handleError(error);
                return; // Early exit on error
            }

            console.log(confirmationToken.id);
            console.log('there-1');

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
            console.log('there0');

            if (res.ok) {

                // Construct the URL with query parameters
                const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}`;

                // Send the JSON to your Flask backend
                const response = await fetch(successUrl, {
                    method: 'GET',
                });

                if (response.ok) {
                    
                    // Redirect to the success page using the constructed URL
                    window.location.href = successUrl; // Navigate to success page with parameters
                } else {
                    // Handle errors as before
                }
            } // Closing for the fetch response check
        }); // Closing for addEventListener on the form
    } else {
        console.error("Form with ID 'payment-form' not found!"); // Log if form is not found
    }

}); // Closing for DOMContentLoaded
