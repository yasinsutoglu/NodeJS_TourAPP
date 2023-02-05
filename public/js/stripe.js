/*eslint-disable*/
import axios from 'axios';
import {showAlert} from './alerts'
const stripe = Stripe(`${process.env.STRIPE_PUBLIC_KEY}`)

export const bookTour = async (tourId) =>{
    try {
      //1)Get checkout session from API
      const session = await axios(
        `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
      );

      //2) create checkout form + charge credit card
        await stripe.redirectToCheckout({
            sessionId:session.data.session.id,
        })

    } catch (error) {
        console.log(error)
        showAlert('error', error)
    }
}