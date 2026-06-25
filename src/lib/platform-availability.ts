export type AvailabilitySlot = {
  label: string;
  detail?: string;
  available: boolean;
};

export type PlatformAvailability = {
  platform: "First Table" | "EatClub";
  status: "live" | "unavailable" | "unknown";
  summary: string;
  slots: AvailabilitySlot[];
  fetchedAt: string;
  bookingUrl: string;
};

const FIRST_TABLE_FIREBASE_BASE =
  "https://first-table.firebaseio.com/variableDiscountAvailability";

const FIRST_TABLE_SESSION_NAMES: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  dinner2: "Late Dinner",
};

type FirstTableFirebaseSlot = {
  available?: boolean;
  time?: string;
  session?: string;
  discount?: number;
  price?: number;
  date?: string;
};

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function parseFirstTableNextData(html: string) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!match) {
    return null;
  }

  const data = JSON.parse(match[1]) as {
    props?: { pageProps?: { page?: Record<string, unknown> } };
  };

  return data.props?.pageProps?.page ?? null;
}

function getTodayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatAuTime(time: string): string {
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time;
  }

  const period = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute.toString().padStart(2, "0")}${period}`;
}

function formatSessionName(sessionKey: string, sessionLabel?: string): string {
  if (sessionLabel) {
    return sessionLabel === "Dinner2" ? "Late Dinner" : sessionLabel;
  }

  return FIRST_TABLE_SESSION_NAMES[sessionKey.toLowerCase()] ?? sessionKey;
}

async function fetchFirstTableSessionSlots(
  restaurantId: number,
  sessionKey: string,
  date: string
): Promise<FirstTableFirebaseSlot[]> {
  const response = await fetch(
    `${FIRST_TABLE_FIREBASE_BASE}/${restaurantId}/${sessionKey.toLowerCase()}/${date}.json`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as Record<
    string,
    FirstTableFirebaseSlot
  > | null;

  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.values(data).filter((slot) => slot?.time);
}

export async function fetchFirstTableAvailability(
  bookingUrl: string
): Promise<PlatformAvailability> {
  const response = await fetch(bookingUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LHW-DiscountMap/1.0; +https://lhw-six.vercel.app/map)",
      Accept: "text/html",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`First Table page returned ${response.status}`);
  }

  const html = await response.text();
  const page = parseFirstTableNextData(html);

  if (!page) {
    return {
      platform: "First Table",
      status: "unknown",
      summary: "无法读取 First Table 数据。",
      slots: [],
      fetchedAt: new Date().toISOString(),
      bookingUrl,
    };
  }

  const restaurantName = String(page.title ?? "Restaurant");
  const restaurantId = Number(page.id);
  const sessionTypes =
    (page.firstTableSessionTypes as string[] | undefined) ?? [];
  const timeZone = String(page.timeZone ?? "Australia/Brisbane");
  const venueStatus = String(page.status ?? "unknown");
  const today = getTodayInTimezone(timeZone);

  if (!restaurantId || sessionTypes.length === 0) {
    return {
      platform: "First Table",
      status: "unknown",
      summary: `${restaurantName} 暂时无法读取今日空位。`,
      slots: [],
      fetchedAt: new Date().toISOString(),
      bookingUrl,
    };
  }

  const sessionResults = await Promise.all(
    sessionTypes.map(async (sessionKey) => ({
      sessionKey,
      slots: await fetchFirstTableSessionSlots(
        restaurantId,
        sessionKey,
        today
      ),
    }))
  );

  const allSlots = sessionResults
    .flatMap(({ sessionKey, slots }) =>
      slots.map((slot) => ({
        sessionKey,
        slot,
      }))
    )
    .sort((a, b) => a.slot.time!.localeCompare(b.slot.time!));

  const availableSlots = allSlots.filter(({ slot }) => slot.available);
  const unavailableSlots = allSlots.filter(({ slot }) => !slot.available);

  const slots: AvailabilitySlot[] = availableSlots.map(({ sessionKey, slot }) => {
    const sessionName = formatSessionName(sessionKey, slot.session);
    const timeLabel = formatAuTime(slot.time!);
    const discountPercent = slot.discount
      ? `${Math.round(slot.discount * 100)}% off food`
      : "50% off food";

    return {
      label: `今天 ${timeLabel} 可订 · ${sessionName}`,
      detail: discountPercent,
      available: true,
    };
  });

  if (slots.length === 0 && unavailableSlots.length > 0) {
    for (const { sessionKey, slot } of unavailableSlots) {
      const sessionName = formatSessionName(sessionKey, slot.session);
      slots.push({
        label: `今天 ${formatAuTime(slot.time!)} · ${sessionName}`,
        detail: "已满",
        available: false,
      });
    }
  }

  return {
    platform: "First Table",
    status:
      venueStatus === "Live" && availableSlots.length > 0
        ? "live"
        : venueStatus === "Live"
          ? "unavailable"
          : "unavailable",
    summary:
      availableSlots.length > 0
        ? `${restaurantName} 今天可预订：`
        : `${restaurantName} 今天暂无可预订时段。`,
    slots,
    fetchedAt: new Date().toISOString(),
    bookingUrl,
  };
}

export async function fetchEatClubAvailability(
  bookingUrl: string
): Promise<PlatformAvailability> {
  const response = await fetch(bookingUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LHW-DiscountMap/1.0; +https://lhw-six.vercel.app/map)",
      Accept: "text/html",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`EatClub page returned ${response.status}`);
  }

  const html = await response.text();
  const windows = unique(
    [...html.matchAll(/Arrive between ([^<]+)/g)].map((match) => match[1].trim())
  );
  const discounts = unique(
    [...html.matchAll(/(\d+% Off)/g)].map((match) => match[1])
  );
  const todayDiscount = discounts[0] ?? "Discount";

  const slots: AvailabilitySlot[] = windows.map((window) => ({
    label: `今天 ${window} · ${todayDiscount}`,
    available: true,
  }));

  if (slots.length === 0) {
    return {
      platform: "EatClub",
      status: "unknown",
      summary: "暂时无法读取 EatClub 今日折扣时段。",
      slots: [],
      fetchedAt: new Date().toISOString(),
      bookingUrl,
    };
  }

  return {
    platform: "EatClub",
    status: "live",
    summary: "今天有折扣的时段：",
    slots,
    fetchedAt: new Date().toISOString(),
    bookingUrl,
  };
}

export async function fetchPlatformAvailability(
  platform: "First Table" | "EatClub",
  bookingUrl: string
) {
  if (platform === "First Table") {
    return fetchFirstTableAvailability(bookingUrl);
  }

  return fetchEatClubAvailability(bookingUrl);
}
