import { manifestResponse } from "@/lib/manifest";

export const dynamic = "force-static";
export const GET = () => manifestResponse("en");
