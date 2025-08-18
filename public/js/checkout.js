// checkout.js

document.addEventListener("DOMContentLoaded", function () {

    const stripe = Stripe(stripePublicKey);
    const options = {
        layout: {
            type: 'tabs',
            defaultCollapsed: false,
        }
    }
    // Customize with Appearance API.
    const appearance = {
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
    };
    const option = { mode: 'shipping' };
    var elements = stripe.elements({
        mode: 'payment',
        currency: currency,
        amount: amount,
        paymentMethodCreation: 'manual',
        appearance: appearance
    });
    // Create Address Element
    const addressElement = elements.create('address', option);
    addressElement.mount('#address-element');

    // Create Payment Element
    const paymentElement = elements.create('payment', options);
    paymentElement.mount('#payment-element'); 

    // Create Link Authentication Element
    const linkAuthenticationElement =  elements.create('linkAuthentication') 
    linkAuthenticationElement.mount("#link-authentication-element"); 

    // Define form variable here to ensure it exists
    const form = document.getElementById('payment-form');
    const handleError = (error) => {
        const messageContainer = document.querySelector('#error-message');
        if (messageContainer){
            let userMessage = 'An unexpected error occurred. Please try again.';
            // Extract the specific error message from the raw response
            if (error.message) {
                const parts = error.message.split(': ');
                if (parts.length > 1) {
                    userMessage = parts[1];
                } else {
                    userMessage = error.message;
                }
            }
            // Style the message
            messageContainer.innerHTML = `<div class="alert alert-danger" role="alert"><strong>${userMessage}</strong></div>`;
        }
    };

    let addressComplete = false;
    let paymentComplete = false;
    let emailComplete = false;
    let customerName = '';
    let customerEmail = '';

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    // Function to check the form's completeness and enable the button.
    function updateButtonState(){
        button.disabled = !(addressComplete && paymentComplete && emailComplete);
    };

    // Add a listener to detect the selected payment method
    let selectedPaymentMethodType = 'card'; // Default to card
    paymentElement.on('change', (event) => {
        selectedPaymentMethodType = event.value.type;
        console.log('Selected payment method:', selectedPaymentMethodType);
        paymentComplete = event.complete; // 'complete' is true if the payment details are valid
        updateButtonState();
    });

    addressElement.on('change', (event) => {
        addressComplete = event.complete; // 'complete' is true if all required fields are filled and valid
        customerName = event.value.name;
        updateButtonState();
        if (event.error) {
            handleError(event.error);
        }
    });

    linkAuthenticationElement.on('change', (event) => {
        emailComplete = event.complete; // 'complete' is true if all required fields are filled and valid
        customerEmail = event.value.email;
        updateButtonState();
        if (event.error) {
            handleError(event.error);
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
                //console.log(confirmationToken.id);

                // Send confirmation token to server to create a Payment Intent
                const res = await fetch("/create-confirm-intent-card", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        confirmationTokenId: confirmationToken.id, // Send the confirmation token ID to the server
                        amount: amount,
                        currency: currency,
                        email: customerEmail,
                        name: customerName
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&currency=${data.currency}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}`;
                    window.location.href = successUrl;
                } 
                else {
                    console.log(data.error)
                    handleError(new Error(data.error));
                }

            } 
            else if (selectedPaymentMethodType === 'link') {
                // Create the Payment Intent on the server
                const res = await fetch("/create-confirm-intent-link", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: amount,
                        currency: currency,
                        paymentMethodType: 'link',
                        email: customerEmail,
                        name: customerName
                    })
                });

                const data = await res.json();
                const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&currency=${data.currency}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}`;
                clientSecret = data.client_secret
                //console.log(clientSecret);

                if (res.ok) {
                    stripe.confirmPayment({
                        elements,
                        clientSecret,
                        confirmParams: {
                        return_url: window.location.origin + successUrl,
                        },
                    });
                } 
                else {
                    handleError(error);
                }
            }
            else if (selectedPaymentMethodType === 'grabpay') {
                // Create the Payment Intent on the server
                const res = await fetch("/create-grabpay-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        amount: amount,
                        currency: currency,
                        paymentMethodType: 'grabpay',
                        email: customerEmail,
                        name: customerName
                    })
                });

                const data = await res.json();
                const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&currency=${data.currency}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}`;
                        
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
                        amount: amount,
                        currency: currency,
                        paymentMethodType: 'alipay',
                        email: customerEmail,
                        name: customerName
                    })
                });

                const data = await res.json();
                const successUrl = `/success?payment_intent=${data.paymentIntentId}&amount=${data.amount}&currency=${data.currency}&discounted_amount=${data.discountedAmount}&discount=${data.discount}&currency=${data.currency}`;
                        
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
