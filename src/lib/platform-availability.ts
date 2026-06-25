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

const FIRST_TABLE_SESSION_NAMES: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  dinner2: "Late Dinner",
};

export async function fetchFirstTableAvailability(
  bookingUrl: string
): Promise<PlatformAvailability> {
  const response = await fetch(bookingUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LHW-DiscountMap/1.0; +https://lhw-six.vercel.app/map)",
      Accept: "text/html",
    },
    next: { revalidate: 300 },
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
  const sessionTypes = (page.firstTableSessionTypes as string[] | undefined) ?? [];
  const bookingPrices =
    (page.bookingPricesBySession as Array<{ title: string; price: string }>) ??
    [];
  const venueStatus = String(page.status ?? "unknown");

  const slots: AvailabilitySlot[] = sessionTypes.map((session) => {
    const sessionName = FIRST_TABLE_SESSION_NAMES[session] ?? session;
    const price =
      bookingPrices.find((item) => item.title === session)?.price ?? "$10";

    return {
      label: `${restaurantName} · ${sessionName}`,
      detail: `50% off food · booking fee ${price}`,
      available: venueStatus === "Live",
    };
  });

  return {
    platform: "First Table",
    status: venueStatus === "Live" ? "live" : "unavailable",
    summary:
      venueStatus === "Live"
        ? `${restaurantName} 可在 First Table 预订：`
        : `${restaurantName} 当前不可预订。`,
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
    next: { revalidate: 180 },
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
    label: `${window} · ${todayDiscount}`,
    available: true,
  }));

  if (slots.length === 0) {
    return {
      platform: "EatClub",
      status: "unknown",
      summary: "暂时无法读取 EatClub 折扣时段。",
      slots: [],
      fetchedAt: new Date().toISOString(),
      bookingUrl,
    };
  }

  return {
    platform: "EatClub",
    status: "live",
    summary: "今日有折扣的时段：",
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
