import { NextResponse } from "next/server";
import { fetchLocationIqTravelEstimates } from "@/lib/travel-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromLat = Number(searchParams.get("fromLat"));
  const fromLng = Number(searchParams.get("fromLng"));
  const toLat = Number(searchParams.get("toLat"));
  const toLng = Number(searchParams.get("toLng"));

  if (
    [fromLat, fromLng, toLat, toLng].some((value) => Number.isNaN(value))
  ) {
    return NextResponse.json(
      { error: "fromLat, fromLng, toLat, toLng are required" },
      { status: 400 }
    );
  }

  try {
    const estimates = await fetchLocationIqTravelEstimates(
      fromLat,
      fromLng,
      toLat,
      toLng
    );

    return NextResponse.json({
      estimates,
      source: "locationiq",
      transitNote: "公交路线请在 Google Maps 中查看实时班次",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message.includes("LOCATIONIQ_API_KEY")
        ? "LocationIQ API key is not configured"
        : "Failed to fetch travel estimates";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
