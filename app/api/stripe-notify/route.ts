import Stripe from "stripe";
import { respOk } from "@/lib/resp";
import { insertSubscription } from "@/models/sub";
import { insertOrder } from "@/models/order";
import { insertCredit } from "@/models/credit";
import { getUniSeq } from "@/lib/hash";
import { sendNotification } from "@/lib/notification";

// 根据计划类型定义对应的积分数量
enum PlanCredits {
  FREE = 600,
  BASIC = 600,
  PRO = 1600,
}

console.log("[STRIPE WEBHOOK] 路由模块加载");

export async function POST(req: Request) {
  console.log("[STRIPE WEBHOOK] 接收到Stripe webhook请求");
  try {
    console.log("[STRIPE WEBHOOK] 检查Stripe配置");
    const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripePrivateKey || !stripeWebhookSecret) {
      console.error("[STRIPE WEBHOOK] Stripe配置无效，缺少密钥或webhook密钥");
      throw new Error("invalid stripe config");
    }

    console.log("[STRIPE WEBHOOK] 初始化Stripe客户端");
    const stripe = new Stripe(stripePrivateKey);

    console.log("[STRIPE WEBHOOK] 获取请求签名和正文");
    const sign = req.headers.get("stripe-signature") as string;
    const body = await req.text();
    if (!sign || !body) {
      console.error("[STRIPE WEBHOOK] 无效的通知数据，缺少签名或请求体");
      throw new Error("invalid notify data");
    }

    console.log("[STRIPE WEBHOOK] 验证Webhook签名并构造事件");
    const event = await stripe.webhooks.constructEventAsync(
      body,
      sign,
      stripeWebhookSecret
    );

    console.log("[STRIPE WEBHOOK] 事件类型:", event.type, "事件ID:", event.id);

    switch (event.type) {
      case "checkout.session.completed": {
        console.log("[STRIPE WEBHOOK] 处理结账完成事件");
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(
          "[STRIPE WEBHOOK] 结账会话ID:",
          session.id,
          "客户ID:",
          session.customer
        );

        if (session.subscription && session.customer) {
          console.log("[STRIPE WEBHOOK] 获取订阅订阅ID:", session.subscription);
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // console.log("[STRIPE WEBHOOK] 获取订阅详情:", subscription.items.data);

          console.log(
            "[STRIPE WEBHOOK] 获取客户详情，客户ID:",
            session.customer
          );
          const customer = await stripe.customers.retrieve(
            session.customer as string
          );

          if (!subscription || !customer || customer.deleted) {
            console.error("[STRIPE WEBHOOK] 无法获取订阅或客户详情");
            throw new Error(
              "Failed to retrieve subscription or customer details"
            );
          }

          console.log("[STRIPE WEBHOOK] 确定订阅周期");
          const cycle =
            subscription.items.data[0]?.plan.interval === "year"
              ? "yearly"
              : "monthly";

          const planType = getPlanTypeByPriceId(
            subscription.items.data[0]?.plan.id || ""
          );
          console.log(
            "[STRIPE WEBHOOK] 确定计划类型:",
            planType,
            "订阅周期:",
            cycle
          );

          console.log("[STRIPE WEBHOOK] 插入订阅记录到数据库");
          await insertSubscription({
            sub_id: subscription.id,
            user_uuid: session.client_reference_id || "",
            user_email: customer.email || "",
            sub_status: "active",
            customer_id: session.customer as string,
            plan_type: planType,
            cycle: cycle,
            payment_channel: "Stripe",
            sub_expires_at: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          });
          console.log(
            "[STRIPE WEBHOOK] 订阅记录已保存，订阅ID:",
            subscription.id
          );

          console.log("[STRIPE WEBHOOK] 获取最新发票");
          const latestInvoice = await stripe.invoices.retrieve(
            subscription.latest_invoice as string
          );
          console.log("[STRIPE WEBHOOK] 最新发票ID:", latestInvoice.id);

          console.log("[STRIPE WEBHOOK] 获取支付记录");
          const charge = latestInvoice.charge
            ? await stripe.charges.retrieve(latestInvoice.charge as string)
            : null;
          console.log("[STRIPE WEBHOOK] 支付记录ID:", charge?.id || "无");

          console.log("[STRIPE WEBHOOK] 获取余额交易记录");
          const balanceTransaction = charge?.balance_transaction
            ? await stripe.balanceTransactions.retrieve(
                charge.balance_transaction as string
              )
            : null;
          console.log(
            "[STRIPE WEBHOOK] 余额交易记录ID:",
            balanceTransaction?.id || "无"
          );

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
          console.log("[STRIPE WEBHOOK] 计算净收入金额(USD):", netAmountUSD);

          const order_no = charge?.payment_intent as string;
          const user_uuid = session.client_reference_id || "";
          console.log(
            "[STRIPE WEBHOOK] 准备订单数据, 订单号:",
            order_no,
            "用户ID:",
            user_uuid
          );

          console.log("[STRIPE WEBHOOK] 插入订单记录到数据库");
          await insertOrder({
            order_no: order_no,
            user_uuid: user_uuid,
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
          console.log("[STRIPE WEBHOOK] 订单记录已保存, 订单号:", order_no);

          const now = new Date();
          const expiredAt = new Date(now);
          expiredAt.setMonth(now.getMonth() + 1);

          // 根据计划类型获取对应的积分
          const credits =
            planType === "basic"
              ? PlanCredits.BASIC
              : planType === "pro"
              ? PlanCredits.PRO
              : PlanCredits.FREE;

          console.log(
            `[STRIPE WEBHOOK] 为用户添加积分, 计划类型: ${planType}, 积分数量: ${credits}, 过期时间:`,
            expiredAt.toISOString()
          );

          console.log("[STRIPE WEBHOOK] 插入积分记录到数据库");
          await insertCredit({
            trans_no: getUniSeq(),
            created_at: now.toISOString(),
            user_uuid: user_uuid,
            trans_type: "subscription",
            credits: credits,
            order_no: order_no,
            expired_at: expiredAt.toISOString(),
          });
          console.log(
            "[STRIPE WEBHOOK] 积分记录已保存, 用户:",
            user_uuid,
            "积分:",
            credits
          );

          await sendNotification(
            `New Subscription: ${customer.email} - Price: ${(
              (session.amount_total || 0) / 100
            ).toFixed(2)}$`
          );
          console.log(
            "[STRIPE WEBHOOK] 订阅处理完成, 用户:",
            customer.email,
            "计划:",
            planType
          );
        } else {
          console.log(
            "[STRIPE WEBHOOK] 结账会话未包含订阅或客户信息, 跳过处理"
          );
        }
        break;
      }

      default:
        console.log("[STRIPE WEBHOOK] 未处理的事件类型:", event.type);
    }

    console.log("[STRIPE WEBHOOK] Webhook处理成功");
    return respOk();
  } catch (e: any) {
    console.error("[STRIPE WEBHOOK] Stripe通知处理失败:", e.message);
    console.error("[STRIPE WEBHOOK] 错误详情:", e);
    try {
      await sendNotification(`Stripe notify failed: ${e.message}`);
      console.log("[STRIPE WEBHOOK] 已发送错误通知");
    } catch (notifyError) {
      console.error("[STRIPE WEBHOOK] 发送错误通知失败:", notifyError);
    }
    return Response.json(
      { error: `handle stripe notify failed: ${e.message}` },
      { status: 500 }
    );
  }
}

const getPlanTypeByPriceId = (priceId: string) => {
  console.log("[STRIPE WEBHOOK] 根据价格ID获取计划类型, 价格ID:", priceId);

  if (
    priceId === process.env.STRIPE_BAISC_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_BAISC_YEARLY_PRICE_ID
  ) {
    console.log("[STRIPE WEBHOOK] 匹配到基础计划");
    return "basic";
  }

  if (
    priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID ||
    priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID
  ) {
    console.log("[STRIPE WEBHOOK] 匹配到专业计划");
    return "pro";
  }

  console.log("[STRIPE WEBHOOK] 未匹配到特定计划，返回免费计划");
  return "free";
};
