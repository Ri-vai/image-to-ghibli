"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

export function UTMHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if UTM data already exists
    const existingUtmData = Cookies.get("utm_data");
    if (existingUtmData) {
      return; // Skip if UTM data already exists
    }
    const utmSource = searchParams.get("utm_source") || null;
    const utmTerm = searchParams.get("utm_term") || null;
    const utmCampaign = searchParams.get("utm_campaign") || null;
    const utmMedium = searchParams.get("utm_medium") || null;
    const utmData = {
      utm_source: utmSource,
      utm_term: utmTerm,
      utm_campaign: utmCampaign,
      utm_medium: utmMedium,
      referral_url: document.referrer || "direct",
      device_type: getUserDeviceType(window.navigator.userAgent),
      utm_date: format(
        new TZDate(new Date(), "Asia/Shanghai"),
        "yyyy-MM-dd HH:mm:ss"
      ),
    };

    // Set cookie with 30 day expiry
    Cookies.set("utm_data", JSON.stringify(utmData), { expires: 30 });
  }, [searchParams]);

  return null;
}

function getUserDeviceType(userAgent: string | null): string {
  if (!userAgent) return "unknown";

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent ?? "");
  const isTablet = /iPad|Tablet/i.test(userAgent ?? "");
  const deviceType = isMobile ? "mobile" : isTablet ? "tablet" : "pc";

  return deviceType;
}
