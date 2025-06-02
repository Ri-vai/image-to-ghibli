import Empty from "@/components/blocks/empty";
import { getTranslations } from "next-intl/server";
import { getUserUuid } from "@/services/user";
import { getLastSubscriptionByUserUuid } from "@/services/subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { PortalButton } from '@/components/ui/portal-button';

export default async function () {
  const t = await getTranslations();
  const user_uuid = await getUserUuid();

  if (!user_uuid) {
    return <Empty message="no auth" />;
  }

  const subscription = await getLastSubscriptionByUserUuid(user_uuid);
  console.log("🚀 ~ subscription:", subscription)

  // 检查是否有有效订阅
  const hasValidSubscription = subscription && 
    subscription.sub_status === 'active' && 
    (!subscription.sub_expires_at || new Date(subscription.sub_expires_at) > new Date());

  if (!subscription || !hasValidSubscription) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">{t("my_subscription.title")}</h3>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>{t("my_subscription.no_valid_subscription")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("my_subscription.title")}</h3>
        </div>
        <PortalButton>
          {t("my_subscription.manage_subscription")}
        </PortalButton>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {subscription.plan_type?.toUpperCase() || 'Unknown'} Plan
            </CardTitle>
            <Badge variant="default">
              {t("my_subscription.active")}
            </Badge>
          </div>
          <CardDescription>
            {subscription.cycle === 'monthly' ? t("my_subscription.monthly") : t("my_subscription.yearly")} subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t("my_subscription.created_at")}
              </p>
              <p className="text-sm">
                {moment(subscription.created_at).format("YYYY-MM-DD HH:mm:ss")}
              </p>
            </div>
            {subscription.sub_expires_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("my_subscription.expires_at")}
                </p>
                <p className="text-sm">
                  {moment(subscription.sub_expires_at).format("YYYY-MM-DD HH:mm:ss")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
