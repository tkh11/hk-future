import { getSiteSearchContent } from "@/content/cms-adapter";

// Header search data, loaded by the browser only when a visitor opens the search,
// so ordinary page requests do not read the whole catalog.
// The frozen export explicitly replaces this with force-static in its staging tree.
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(await getSiteSearchContent());
}
