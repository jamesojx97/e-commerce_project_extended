import os
import stripe

from dotenv import load_dotenv
from flask import Flask, request, render_template, jsonify

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
 

  public_key = os.getenv('STRIPE_PUBLISHABLE_KEY')
  print("Stripe Public Key:", public_key)  # This is your publishable key]
  print('Amount: ', amount)

  #return render_template('checkout.html', title=title, amount=amount, error=error, client_secret=payment_intent.client_secret, public_key=public_key)
  return render_template('checkout.html', title=title, amount=amount, error=error, public_key=public_key, default_currency='sgd')


# Create and Confirm PaymentIntent route
@app.route('/create-confirm-intent', methods=['POST'])
def create_confirm_intent():
    data = request.get_json()
    confirmation_token_id = data['confirmationTokenId']
    amount = data['amount']
    currency = data['currency']
    discountApplied=False
    discounted_amount=amount


    try:
      # Inspect the card details from confirmation token
      confirmation_token = stripe.ConfirmationToken.retrieve(confirmation_token_id)
      if not confirmation_token:
        return jsonify({'error': 'Missing confirmation token'}), 400
    
      card_country = confirmation_token['payment_method_preview']['card']['country']
      card_brand = confirmation_token['payment_method_preview']['card']['brand']

      # Check for promotions based on the card
      eligible_for_promotion = check_promotion_criteria(card_brand)

      # Only create a Payment Intent if eligible
      if eligible_for_promotion:
        discounted_amount=0.9*amount
        discountApplied=True
        payment_intent = stripe.PaymentIntent.create(
          amount=int(amount),  # Use the amount your server wishes to charge
          currency=currency,
          confirm=True,                  
          confirmation_token=confirmation_token,
          return_url='http://127.0.0.1:5000/success'
          
      )
      print(discountApplied)
      return jsonify({
         'paymentIntentId': payment_intent.id,
         'amount': amount/100,
         'discountedAmount': discounted_amount/100,  # Return the final discounted amount (if any)
         'discount': discountApplied,
         'currency': currency
      })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def check_promotion_criteria(brand):
    # Logic to determine if the card qualifies for promotions
    if brand in ['visa']:
        return True
    return False

# Create a PayNow Payment Intent
@app.route('/create-paynow-intent', methods=['POST'])
def create_paynow_intent():
    data = request.get_json()
    amount = data['amount']
    currency = data['currency']
    discounted_amount = amount
    discount_applied = False

    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            payment_method_types=['paynow'],
            payment_method_data={"type": "paynow"},
        )
        return jsonify({
            'client_secret': payment_intent.client_secret,
            'paymentIntentId': payment_intent.id,
            'amount': amount,
            'discountedAmount': discounted_amount,
            'discount': discount_applied,
            'currency': currency
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Success route
@app.route('/success', methods=['GET'])
def success():
    # Retrieve the payment intent ID and other parameters from the query string
    payment_intent_id = request.args.get('payment_intent')
    amount = request.args.get('amount')
    discounted_amount = request.args.get('discounted_amount')
    currency = request.args.get('currency')
    discount_str = request.args.get('discount')  # Convert to boolean
    discount = discount_str.lower() == 'true'
  

    print(payment_intent_id)
    print(amount)
    print(discount_str)
    print(discount)
    print(currency)

    # You can add validation if necessary
    if not payment_intent_id or not amount or not currency:
        return jsonify({'error': 'Missing required parameters!'}), 400

    return render_template('success.html', 
                           payment_intent_id=payment_intent_id, 
                           amount=amount, 
                           currency=currency, 
                           eligible_for_discount=discount, 
                           discounted_amount=discounted_amount)

if __name__ == '__main__':
  app.run(port=5000, host='0.0.0.0', debug=True)