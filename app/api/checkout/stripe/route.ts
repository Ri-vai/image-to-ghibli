import { auth } from "@/auth/index";
import { respData, respErr } from "@/lib/resp";
import { sendNotification } from "@/lib/notification";
import Stripe from "stripe";

export async function POST(req: Request) {
  console.log("[STRIPE CHECKOUT] 开始处理结账请求");
  const session = await auth();
  if (!session) {
    console.log("[STRIPE CHECKOUT] 未授权访问，需要登录");
    return respErr("no auth, please sign-in");
  }

  const user = session.user;
  console.log(`[STRIPE CHECKOUT] 用户已验证: ${user.email}`);

  try {
    console.log("[STRIPE CHECKOUT] 解析请求参数");
    const { planType, billingType, mode, successUrl, cancelUrl } =
      await req.json();

    console.log(
      `[STRIPE CHECKOUT] 请求参数: planType=${planType}, billingType=${billingType}, mode=${mode}`
    );

    if (!planType || !billingType || !mode || !successUrl || !cancelUrl) {
      console.log("[STRIPE CHECKOUT] 参数不完整，请求无效");
      return respErr("invalid params");
    }

    console.log("[STRIPE CHECKOUT] 初始化Stripe客户端");
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY || "");

    const priceId = getPriceId(planType, billingType);
    console.log(`[STRIPE CHECKOUT] 选择的价格ID: ${priceId}`);

    console.log("[STRIPE CHECKOUT] 创建Stripe结账会话");
    const session = await stripe.checkout.sessions.create({
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: user.uuid,
    });

    console.log(`[STRIPE CHECKOUT] Stripe会话创建成功: ${session.id}`);
    // await sendNotification(`Checkout: ${user.email} - Plan: ${planType}`);
    console.log(`[STRIPE CHECKOUT] 结账URL已生成: ${session.url}`);
    return respData({
      url: session.url,
    });
  } catch (error) {
    console.error("[STRIPE CHECKOUT] 结账过程发生错误:", error);
    await sendNotification(
      `Checkout failed: ${user.email} Error: ${JSON.stringify(error)}`
    );
    console.error(error);
    return respErr("checkout failed");
  }
}

const getPriceId = (planType: string, billingType: string) => {
  console.log(
    `[STRIPE CHECKOUT] 获取价格ID: planType=${planType}, billingType=${billingType}`
  );

  if (planType === "basic" && billingType === "monthly") {
    console.log("[STRIPE CHECKOUT] 选择基础月度计划");
    return process.env.STRIPE_BAISC_MONTHLY_PRICE_ID;
  }

  if (planType === "basic" && billingType === "yearly") {
    console.log("[STRIPE CHECKOUT] 选择基础年度计划");
    return process.env.STRIPE_BAISC_YEARLY_PRICE_ID;
  }

  if (planType === "pro" && billingType === "monthly") {
    console.log("[STRIPE CHECKOUT] 选择专业月度计划");
    return process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  }

  if (planType === "pro" && billingType === "yearly") {
    console.log("[STRIPE CHECKOUT] 选择专业年度计划");
    return process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  }

  console.log("[STRIPE CHECKOUT] 未匹配到特定计划，使用免费计划");
  return process.env.STRIPE_PRICE_ID_FREE;
};
