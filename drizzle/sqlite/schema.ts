import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  real,
  index,
} from "drizzle-orm/sqlite-core";

export type SubscriptionCycle = "monthly" | "yearly";
export type ChargeType = "subscription" | "renewal" | "one-time" | "upgrade";
export type PaymentStatus = "paid" | "refunded";
export type SubscriptionStatus = "active" | "cancelled" | "cancelling";
export type PaymentChannel = "Stripe" | "Paypro" | "Creem" | "LemonSqueezy";

export const users = sqliteTable(
  "users",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    uuid: text().unique().notNull(),
    email: text().notNull(),
    created_at: text(),
    nickname: text(),
    avatar_url: text(),
    locale: text(),
    signin_type: text(),
    signin_ip: text(),
    signin_provider: text(),
    signin_openid: text(),
    utm: text({ mode: "json" }).default("{}"),
  },
  (table) => [
    uniqueIndex("email_provider_unique_idx").on(
      table.email,
      table.signin_provider
    ),
  ]
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    sub_id: text().unique().notNull(),
    user_uuid: text().notNull(),
    user_email: text().notNull(),
    sub_expires_at: text(),
    sub_status: text({
      enum: ["active", "cancelled", "cancelling"],
    }).$type<SubscriptionStatus>(),
    customer_id: text(),
    plan_type: text(),
    cycle: text({ enum: ["monthly", "yearly"] }).$type<SubscriptionCycle>(),
    payment_channel: text({
      enum: ["Stripe", "Paypro", "Creem", "LemonSqueezy"],
    }).$type<PaymentChannel>(),
    created_at: text().$defaultFn(() => new Date().toISOString()),
    updated_at: text().$defaultFn(() => new Date().toISOString()),
  },
  (table) => {
    return {
      emailIndex: index("subscription_email_idx").on(table.user_email),
      customerIdIndex: index("subscription_customerId_idx").on(
        table.customer_id
      ),
      subIdIndex: index("subscription_subId_idx").on(table.sub_id),
    };
  }
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    order_no: text().unique().notNull(),
    user_uuid: text().notNull(),
    user_email: text().notNull(),
    customer_id: text(),
    amount: real(),
    net_amount: real(),
    charge_type: text({
      enum: ["subscription", "renewal", "one-time", "upgrade"],
    })
      .$type<ChargeType>()
      .notNull(),
    payment_country: text(),
    payment_channel: text({
      enum: ["Stripe", "Paypro", "Creem", "LemonSqueezy"],
    })
      .$type<PaymentChannel>()
      .notNull(),
    status: text({ enum: ["paid", "refunded"] })
      .$type<PaymentStatus>()
      .notNull(),
    last_refund_at: text(),
    total_refund_amount: real(),
    invoice: text(),
    paid_at: text(),
    created_at: text().$defaultFn(() => new Date().toISOString()),
    updated_at: text().$defaultFn(() => new Date().toISOString()),
  },
  (table) => {
    return {
      emailIndex: index("order_email_idx").on(table.user_email),
      paymentIdIndex: index("order_paymentId_idx").on(table.payment_channel),
    };
  }
);

export const apikeys = sqliteTable("apikeys", {
  id: integer().primaryKey({ autoIncrement: true }),
  api_key: text().unique().notNull(),
  title: text(),
  user_uuid: text().notNull(),
  created_at: text(),
  status: text(),
});

export const credits = sqliteTable("credits", {
  id: integer().primaryKey({ autoIncrement: true }),
  trans_no: text().unique().notNull(),
  created_at: text(),
  user_uuid: text().notNull(),
  trans_type: text().notNull(),
  credits: integer().notNull(),
  order_no: text(),
  expired_at: text(),
});

export const posts = sqliteTable("posts", {
  id: integer().primaryKey({ autoIncrement: true }),
  uuid: text().unique().notNull(),
  slug: text(),
  title: text(),
  description: text(),
  content: text(),
  created_at: text(),
  updated_at: text(),
  status: text(),
  cover_url: text(),
  author_name: text(),
  author_avatar_url: text(),
  locale: text(),
});
