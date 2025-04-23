"use client";

import { Check, X, Loader } from "lucide-react";
import { PricingItem, Pricing as PricingType } from "@/types/blocks/pricing";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { Label } from "@/components/ui/label";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";

export default function Pricing({ pricing }: { pricing: PricingType }) {
  if (pricing.disabled) {
    return null;
  }

  const { user, setShowSignModal } = useAppContext();
  const [isAnnual, setIsAnnual] = useState(
    pricing.toggle?.default_plan === "annual"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  const handleCheckout = async (planType: string) => {
    try {
      if (!user) {
        setShowSignModal(true);
        return;
      }

      const params = {
        planType,
        billingType: isAnnual ? "yearly" : "monthly",
        mode: "subscription",
        successUrl: `${window.location.origin}`,
        cancelUrl: `${window.location.origin}`,
      };

      setIsLoading(true);
      setProductId(`${planType}_${params.billingType}`);

      const response = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setIsLoading(false);
        setProductId(null);
        setShowSignModal(true);
        return;
      }

      const { code, message, data } = await response.json();

      if (code !== 0) {
        toast.error(message);
        return;
      }

      const { url } = data;

      window.location.href = url;
    } catch (e) {
      toast.error("checkout failed");
    } finally {
      setIsLoading(false);
      setProductId(null);
    }
  };

  return (
    <section id={pricing.name} className="py-16">
      <div className="container">
        <div className="mx-auto mb-12 text-center">
          <h2 className="mb-4 text-4xl font-semibold lg:text-5xl">
            {pricing.title}
          </h2>
          <p className="text-muted-foreground lg:text-lg">
            {pricing.description}
          </p>

          {pricing.toggle && (
            <div className="mt-8">
              <div className="flex items-center justify-center gap-4">
                <span
                  className={
                    !isAnnual ? "font-semibold" : "text-muted-foreground"
                  }
                >
                  {pricing.toggle.monthly}
                </span>
                <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                <span
                  className={
                    isAnnual ? "font-semibold" : "text-muted-foreground"
                  }
                >
                  {pricing.toggle.annual}
                </span>
              </div>
              {isAnnual && pricing.toggle.discount_text && (
                <div className="mt-2">
                  <Badge variant="secondary" className="bg-primary/10">
                    {pricing.toggle.discount_text}
                  </Badge>
                </div>
              )}
              {pricing.cancel_text && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {pricing.cancel_text}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {pricing.items?.map((item, index) => {
            const plan = (
              isAnnual ? item.pricing.annual : item.pricing.monthly
            ) as {
              amount: number;
              price: string;
              savings_text?: string;
            };

            return (
              <div
                key={index}
                className={`rounded-lg p-6 ${
                  item.is_featured
                    ? "border-primary border-2 bg-card text-card-foreground shadow-lg"
                    : "border bg-background/60"
                }`}
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      {item.title && (
                        <h3 className="text-xl font-semibold">{item.title}</h3>
                      )}
                      <div className="flex-1"></div>
                      {item.label && (
                        <Badge variant="secondary" className="bg-primary/10">
                          {item.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-end gap-2 mb-4">
                      <span className="text-5xl font-semibold">
                        {plan.price}
                      </span>
                      {item.unit && (
                        <span className="text-muted-foreground mb-1">
                          /{item.unit}
                        </span>
                      )}
                    </div>
                    {isAnnual && plan.savings_text && (
                      <p className="text-sm text-primary">
                        {plan.savings_text}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-muted-foreground mt-2">
                        {item.description}
                      </p>
                    )}
                    {item.features && (
                      <ul className="mt-6 space-y-3">
                        {item.features.map((feature, fi) => (
                          <li className="flex gap-2" key={`feature-${fi}`}>
                            {feature.included ? (
                              <Check className="mt-1 size-4 shrink-0 text-primary" />
                            ) : (
                              <X className="mt-1 size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span
                              className={
                                !feature.included ? "text-muted-foreground" : ""
                              }
                            >
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    {item.button && (
                      <Button
                        className="w-full font-semibold"
                        variant={item.is_featured ? "default" : "outline"}
                        disabled={isLoading}
                        onClick={() => {
                          if (isLoading) return;
                          handleCheckout(item.title?.toLowerCase() || "");
                        }}
                      >
                        {isLoading &&
                        productId ===
                          (isAnnual
                            ? item.product_id.annual
                            : item.product_id.monthly) ? (
                          <>
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                            {item.button.title}
                          </>
                        ) : (
                          <>
                            {item.button.title}
                            {item.button.icon && (
                              <Icon
                                name={item.button.icon}
                                className="ml-2 size-4"
                              />
                            )}
                          </>
                        )}
                      </Button>
                    )}
                    {item.tip && (
                      <p className="text-muted-foreground text-sm mt-2 text-center">
                        {item.tip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
