export class AmplitudeAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEvent({
    userId,
    eventType,
    eventProperties = {},
    time = Date.now(),
  }: {
    userId: string;
    eventType: string;
    eventProperties?: Record<string, any>;
    time?: number;
  }) {
    const payload = {
      api_key: this.apiKey,
      events: [
        {
          user_id: userId,
          event_type: eventType,
          event_properties: eventProperties,
          time,
        },
      ],
    };
    try {
      const res = await fetch("https://api2.amplitude.com/2/httpapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("AmplitudeAPI error:", res.status, text);
      }
    } catch (err) {
      console.error("AmplitudeAPI fetch error:", err);
    }
  }
}
