import Stripe from "stripe";
import { respOk } from "@/lib/resp";
import { insertSubscription } from "@/models/sub";
import { insertOrder } from "@/models/order";

export async function POST(req: Request) {
  try {
    const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripePrivateKey || !stripeWebhookSecret) {
      throw new Error("invalid stripe config");
    }

    const stripe = new Stripe(stripePrivateKey);

    const sign = req.headers.get("stripe-signature") as string;
    const body = await req.text();
    if (!sign || !body) {
      throw new Error("invalid notify data");
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      sign,
      stripeWebhookSecret
    );

    console.log("stripe notify event: ", event);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Get subscription details
        if (session.subscription && session.customer) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const customer = await stripe.customers.retrieve(
            session.customer as string
          );

          if (!subscription || !customer || customer.deleted) {
            throw new Error(
              "Failed to retrieve subscription or customer details"
            );
          }

          // Extract billing cycle from subscription
          const cycle =
            subscription.items.data[0]?.plan.interval === "year"
              ? "yearly"
              : "monthly";

          // Insert subscription record
          await insertSubscription({
            sub_id: subscription.id,
            user_uuid: session.client_reference_id || "",
            user_email: customer.email || "",
            sub_status: "active",
            customer_id: session.customer as string,
            plan_type: getPlanTypeByPriceId(
              subscription.items.data[0]?.plan.id || ""
            ),
            cycle: cycle,
            payment_channel: "Stripe",
            sub_expires_at: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          });

          // For subscription payments, we need to get the latest invoice
          const latestInvoice = await stripe.invoices.retrieve(
            subscription.latest_invoice as string
          );
          const charge = latestInvoice.charge
            ? await stripe.charges.retrieve(latestInvoice.charge as string)
            : null;
          const balanceTransaction = charge?.balance_transaction
            ? await stripe.balanceTransactions.retrieve(
                charge.balance_transaction as string
              )
            : null;

          const netAmountUSD = balanceTransaction
            ? parseFloat(
                (balanceTransaction.currency === "usd"
                  ? balanceTransaction.net / 100
                  : balanceTransaction.net /
                    100 /
                    (balanceTransaction.exchange_rate || 1)
                ).toFixed(2)
              )
            : 0;

          // Insert order record
          await insertOrder({
            order_no: charge?.payment_intent as string,
            user_uuid: session.client_reference_id || "",
            user_email: customer.email || "",
            paid_email: customer.email || "",
            customer_id: session.customer as string,
            amount: (session.amount_total || 0) / 100,
            net_amount: netAmountUSD,
            charge_type: "subscription",
            payment_country: session.customer_details?.address?.country || "",
            payment_channel: "Stripe",
            status: "paid",
            invoice: latestInvoice.invoice_pdf,
            paid_at: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        console.log("not handle event: ", event.type);
    }

    return respOk();
  } catch (e: any) {
    console.log("stripe notify failed: ", e);
    return Response.json(
      { error: `handle stripe notify failed: ${e.message}` },
      { status: 500 }
    );
  }
}

const getPlanTypeByPriceId = (priceId: string) => {
  if (
    priceId === process.env.STRIPE_BAISC_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_BAISC_YEARLY_PRICE_ID
  ) {
    return "basic";
  }

  if (
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID
  ) {
    return "pro";
  }

  return "free";
};
