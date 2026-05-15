import { Router, type IRouter } from "express";
import {
  GetLandmarksQueryParams,
  GetLandmarkDetailParams,
  GetLandmarksResponse,
  GetLandmarkDetailResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";

interface WikiGeoSearchResult {
  pageid: number;
  ns: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
  primary: string;
}

interface WikiPageInfo {
  pageid: number;
  title: string;
  coordinates?: Array<{ lat: number; lon: number; primary?: string }>;
  extract?: string;
  thumbnail?: { source: string; width: number; height: number };
}

async function fetchWikipediaGeoSearch(
  north: number,
  south: number,
  east: number,
  west: number
): Promise<WikiGeoSearchResult[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "geosearch",
    gsbbox: `${north}|${west}|${south}|${east}`,
    gslimit: "50",
    format: "json",
    origin: "*",
  });

  const url = `${WIKIPEDIA_API}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    query?: { geosearch?: WikiGeoSearchResult[] };
  };
  return data?.query?.geosearch ?? [];
}

async function fetchPageDetails(
  pageIds: number[]
): Promise<Map<number, WikiPageInfo>> {
  if (pageIds.length === 0) return new Map();

  const params = new URLSearchParams({
    action: "query",
    pageids: pageIds.join("|"),
    prop: "extracts|pageimages|coordinates",
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    piprop: "thumbnail",
    pithumbsize: "400",
    format: "json",
    origin: "*",
  });

  const url = `${WIKIPEDIA_API}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Wikipedia API error: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    query?: { pages?: Record<string, WikiPageInfo> };
  };

  const pages = data?.query?.pages ?? {};
  const result = new Map<number, WikiPageInfo>();

  for (const page of Object.values(pages)) {
    result.set(page.pageid, page);
  }

  return result;
}

router.get("/landmarks", async (req, res): Promise<void> => {
  const parsed = GetLandmarksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { north, south, east, west } = parsed.data;

  const geoResults = await fetchWikipediaGeoSearch(north, south, east, west);

  if (geoResults.length === 0) {
    res.json(GetLandmarksResponse.parse([]));
    return;
  }

  const pageIds = geoResults.map((r) => r.pageid);
  const pageDetails = await fetchPageDetails(pageIds);

  const landmarks = geoResults.map((geo) => {
    const detail = pageDetails.get(geo.pageid);
    return {
      pageId: geo.pageid,
      title: geo.title,
      lat: geo.lat,
      lng: geo.lon,
      thumbnailUrl: detail?.thumbnail?.source ?? null,
      extract: detail?.extract ?? null,
      wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(geo.title.replace(/ /g, "_"))}`,
    };
  });

  res.json(GetLandmarksResponse.parse(landmarks));
});

router.get("/landmarks/:pageId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.pageId)
    ? req.params.pageId[0]
    : req.params.pageId;
  const parsed = GetLandmarkDetailParams.safeParse({ pageId: parseInt(raw, 10) });

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { pageId } = parsed.data;
  const pageDetails = await fetchPageDetails([pageId]);
  const detail = pageDetails.get(pageId);

  if (!detail) {
    res.status(404).json({ error: "Landmark not found" });
    return;
  }

  const coords = detail.coordinates?.[0];

  const landmark = {
    pageId: detail.pageid,
    title: detail.title,
    lat: coords?.lat ?? 0,
    lng: coords?.lon ?? 0,
    extract: detail.extract ?? null,
    thumbnailUrl: detail.thumbnail?.source ?? null,
    wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(detail.title.replace(/ /g, "_"))}`,
  };

  res.json(GetLandmarkDetailResponse.parse(landmark));
});

export default router;
