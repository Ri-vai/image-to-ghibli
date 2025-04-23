import { auth } from "@/auth/index";
import { respData, respErr, respJson, respOk } from "@/lib/resp";
import Stripe from "stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return respErr("no auth, please sign-in");
  }

  const user = session.user;

  try {
    const { planType, billingType, mode, successUrl, cancelUrl } =
      await req.json();

    if (!planType || !billingType || !mode || !successUrl || !cancelUrl) {
      return respErr("invalid params");
    }

    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "");

    const session = await stripe.checkout.sessions.create({
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price: getPriceId(planType, billingType),
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: user.uuid,
    });

    return respData({
      url: session.url,
    });
  } catch (error) {
    console.error(error);
    return respErr("checkout failed");
  }
}

const getPriceId = (planType: string, billingType: string) => {
  if (planType === "basic" && billingType === "monthly") {
    return process.env.STRIPE_BAISC_MONTHLY_PRICE_ID;
  }

  if (planType === "basic" && billingType === "yearly") {
    return process.env.STRIPE_BAISC_YEARLY_PRICE_ID;
  }

  if (planType === "pro" && billingType === "monthly") {
    return process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  }

  if (planType === "pro" && billingType === "yearly") {
    return process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  }

  return process.env.STRIPE_PRICE_ID_FREE;
};
