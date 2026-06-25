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
      summary: "无法读取 First Table 页面，请直接在官网查看空位。",
      slots: [],
      fetchedAt: new Date().toISOString(),
      bookingUrl,
    };
  }

  const sessionTypes = (page.firstTableSessionTypes as string[] | undefined) ?? [];
  const openHours = String(page.openHours ?? "").replace(/\r/g, "");
  const bookingPrices =
    (page.bookingPricesBySession as Array<{ title: string; price: string }>) ??
    [];
  const venueStatus = String(page.status ?? "unknown");

  const sessionLabels: Record<string, string> = {
    breakfast: "早餐场次",
    lunch: "午餐场次",
    dinner: "晚餐第一场",
    dinner2: "晚餐第二场",
  };

  const slots: AvailabilitySlot[] = sessionTypes.map((session) => ({
    label: sessionLabels[session] ?? session,
    detail:
      bookingPrices.find((item) => item.title === session)?.price ??
      "50% off food",
    available: venueStatus === "Live",
  }));

  if (openHours) {
    slots.push({
      label: "营业时间",
      detail: openHours.split("\n").join(" · "),
      available: true,
    });
  }

  return {
    platform: "First Table",
    status: venueStatus === "Live" ? "live" : "unavailable",
    summary:
      venueStatus === "Live"
        ? "已连接 First Table：以下场次开放预订，具体日期请在官网日历中确认。"
        : "该餐厅当前在 First Table 上不可预订。",
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
  const todayDiscount = discounts[0] ?? "优惠可用";

  const slots: AvailabilitySlot[] = windows.map((window) => ({
    label: todayDiscount,
    detail: `到店时间 ${window}`,
    available: true,
  }));

  if (slots.length === 0) {
    const forecastMatches = unique(
      [...html.matchAll(/(mon|tue|wed|thu|fri|sat|sun)[^<]{0,40}?(\d+% Off)/gi)].map(
        (match) => `${match[1].toUpperCase()} · ${match[2]}`
      )
    );

    return {
      platform: "EatClub",
      status: forecastMatches.length > 0 ? "live" : "unknown",
      summary:
        forecastMatches.length > 0
          ? "已连接 EatClub：以下为预测优惠，今日具体时段以 App 为准。"
          : "暂时无法读取 EatClub 优惠时段，请打开官网查看。",
      slots: forecastMatches.slice(0, 7).map((item) => ({
        label: item,
        available: true,
      })),
      fetchedAt: new Date().toISOString(),
      bookingUrl,
    };
  }

  return {
    platform: "EatClub",
    status: "live",
    summary: "已连接 EatClub：以下为今日可预订优惠时段。",
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
