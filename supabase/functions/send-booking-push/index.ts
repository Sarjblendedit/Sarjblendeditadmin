import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationRecord = {
  customer_id: string;
  booking_id: string | null;
  title: string;
  body: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: NotificationRecord;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("BOOKING_PUSH_WEBHOOK_SECRET");
  if (!webhookSecret || request.headers.get("x-webhook-secret") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request.json()) as WebhookPayload;
  if (payload.type !== "INSERT" || !payload.record?.customer_id) {
    return Response.json({ sent: 0 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data: preferences, error: preferencesError } = await supabase
    .from("customer_preferences")
    .select("booking_updates")
    .eq("customer_id", payload.record.customer_id)
    .maybeSingle();

  if (preferencesError) throw preferencesError;
  // A missing preference record uses the default: booking updates enabled.
  if (preferences?.booking_updates === false) {
    return Response.json({ sent: 0, reason: "customer_opted_out" });
  }

  const { data: devices, error } = await supabase
    .from("push_notification_devices")
    .select("expo_push_token")
    .eq("customer_id", payload.record.customer_id);

  if (error) throw error;

  const messages = (devices ?? []).map((device) => ({
    to: device.expo_push_token,
    sound: "default",
    title: payload.record.title,
    body: payload.record.body,
    data: { bookingId: payload.record.booking_id },
    channelId: "booking-updates",
  }));

  if (!messages.length) return Response.json({ sent: 0 });

  const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(Deno.env.get("EXPO_ACCESS_TOKEN")
        ? { Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}` }
        : {}),
    },
    body: JSON.stringify(messages),
  });

  const responseBody = await expoResponse.text();
  return new Response(responseBody, {
    status: expoResponse.status,
    headers: { "Content-Type": "application/json" },
  });
});
