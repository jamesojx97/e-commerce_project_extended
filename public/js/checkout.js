document.addEventListener("DOMContentLoaded", async function () {
    const stripe = Stripe(stripePublicKey); // Your public key from the server
    const amountinCents = amount

    const options = {
        mode: 'payment',
        amount: amountinCents,
        currency: 'usd',
        paymentMethodCreation: 'manual',
        // Fully customizable with appearance API.
        appearance: {/*...*/},
    };
    const elements = stripe.elements(options); // Initialize Elements without a client secret

    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element'); // Mount the payment element to the DOM

    const form = document.getElementById('payment-form');

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true; // Disable the button to prevent multiple submissions

            // Confirm the payment and obtain the confirmation token
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: 'http://127.0.0.1:5000/success', // Redirect URL after confirming payment
                }
            });

            if (error) {
                // Handle errors
                button.disabled = false; // Re-enable the button
                console.error("Payment confirmation error:", error);
                alert(error.message); // Show error message
            } else {
                // On success, send the payment intent ID to the server
                const confirmationTokenId = paymentIntent.id; // Extract the payment intent ID

                const res = await fetch("/create-confirm-intent", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        confirmationTokenId: confirmationTokenId // Send the confirmation token ID to the server
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    // Payment Intent created successfully
                    window.location.href = `http://127.0.0.1:5000/success?payment_intent=${data.paymentIntentId}`;
                } else {
                    alert(data.error || 'Payment processing failed.');
                    button.disabled = false; // Re-enable on error
                }
            }
        });
    } else {
        console.error("Form with ID 'payment-form' not found!");
    }
});
