import { NextResponse } from "next/server";
import { fetchPlatformAvailability } from "@/lib/platform-availability";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const bookingUrl = searchParams.get("url");

  if (
    (platform !== "First Table" && platform !== "EatClub") ||
    !bookingUrl
  ) {
    return NextResponse.json(
      { error: "platform and url are required" },
      { status: 400 }
    );
  }

  try {
    const availability = await fetchPlatformAvailability(platform, bookingUrl);
    return NextResponse.json(availability);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch platform availability",
        platform,
        bookingUrl,
      },
      { status: 502 }
    );
  }
}
