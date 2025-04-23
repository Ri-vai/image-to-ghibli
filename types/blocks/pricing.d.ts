import { Button } from "@/types/blocks/base/button";

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
}

export interface PricingToggle {
  monthly: string;
  annual: string;
  default_plan: "monthly" | "annual";
  discount_text?: string;
}

export interface PricingPlan {
  monthly: {
    amount: number;
    price: string;
  };
  annual: {
    amount: number;
    price: string;
    savings_text?: string;
  };
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;
  pricing: {
    monthly: {
      amount: number;
      price: string;
    };
    annual: {
      amount: number;
      price: string;
      savings_text?: string;
    };
  };
  currency: string;
  unit?: string;
  features_title?: string;
  features?: {
    text: string;
    included: boolean;
  }[];
  button?: Button;
  tip?: string;
  is_featured?: boolean;
  product_id: {
    monthly: string;
    annual: string;
  };
  product_name?: string;
  credits?: number;
  valid_months?: number;
  group?: string;
}

export interface Pricing {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  toggle?: PricingToggle;
  items?: PricingItem[];
  groups?: PricingGroup[];
  cancel_text?: string;
}
