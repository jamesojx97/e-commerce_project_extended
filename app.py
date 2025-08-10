import os
import stripe

from dotenv import load_dotenv
from flask import Flask, request, render_template

load_dotenv()

app = Flask(__name__,
  static_url_path='',
  template_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), "views"),
  static_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), "public"))

# Set env variables
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')  # Get the Stripe secret key

# Home route
@app.route('/', methods=['GET'])
def index():
  return render_template('index.html')

# Checkout route
@app.route('/checkout', methods=['GET'])
def checkout():

  # Just hardcoding amounts here to avoid using a database
  item = request.args.get('item')
  title = None
  amount = None
  error = None

  if item == '1':
    title = 'The Art of Doing Science and Engineering'
    amount = 2300
  elif item == '2':
    title = 'The Making of Prince of Persia: Journals 1985-1993'
    amount = 2500
  elif item == '3':
    title = 'Working in Public: The Making and Maintenance of Open Source'
    amount = 2800
  else:
    # Included in layout view, feel free to assign error
    error = 'No item selected'
  '''
  payment_intent = stripe.PaymentIntent.create(
    amount=1099,
    currency="usd",
    automatic_payment_methods={"enabled": True},
  )
  '''

  public_key = os.getenv('STRIPE_PUBLISHABLE_KEY')
  print("Stripe Public Key:", public_key)  # This is your publishable key

  #return render_template('checkout.html', title=title, amount=amount, error=error, client_secret=payment_intent.client_secret, public_key=public_key)
  return render_template('checkout.html', title=title, amount=amount, error=error, public_key=public_key)

# Success route
@app.route('/success', methods=['GET'])
def success():
  '''
  payment_intent_id = request.args.get('payment_intent')  # This comes from confirmPayment in frontend
  payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)  # Retrieve the PaymentIntent
  
  amount_received = payment_intent['amount_received'] / 100  # Convert to dollars
  currency = payment_intent['currency']
  payment_status = payment_intent['status']
    
  return render_template('success.html', amount=amount_received, currency=currency, status=payment_status, payment_intent_id=payment_intent_id)
  ''' 

@app.route('/create-confirm-intent', methods=['POST'])
def create_confirm_intent():
    data = request.get_json()
    confirmation_token = data['confirmationTokenId']

    try:
        # Confirm the payment and inspect the card details
        payment_intent = stripe.PaymentIntent.retrieve(confirmation_token)

        # Optionally, you can inspect the card details here to determine promotions
        card_details = payment_intent['payment_method_details']['card']
        card_country = card_details['country']
        card_brand = card_details['brand']

        # Check for promotions based on the card
        eligible_for_promotion = check_promotion_criteria(card_country, card_brand)

        # Only create a Payment Intent if eligible
        if eligible_for_promotion:
            new_payment_intent = stripe.PaymentIntent.create(
                amount=payment_intent['amount'],  # Use the amount your server wishes to charge
                currency=payment_intent['currency'],
                confirmation_method='manual',
                confirm=True,
                payment_method=payment_intent['payment_method']  # Or pass the actual payment method ID
            )
            return jsonify({'paymentIntentId': new_payment_intent.id})

        return jsonify({'error': 'Not eligible for promotions'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def check_promotion_criteria(country, brand):
    # Logic to determine if the card qualifies for promotions
    if country in ['US', 'CA'] and brand in ['Visa', 'MasterCard']:
        return True
    return False



if __name__ == '__main__':
  app.run(port=5000, host='0.0.0.0', debug=True)