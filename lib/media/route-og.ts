import rawRouteOg from "@/content/governance/route-og.json";

export type RouteOgRecord = {
  route: string;
  path: string;
  width: 1200;
  height: 630;
  bytes: number;
  sha256: string;
  alt: string;
  stage_label: string;
};

const routeOg = rawRouteOg as RouteOgRecord[];
const routeOgByRoute = new Map(routeOg.map((record) => [record.route, record]));

export function getRouteOg(route: string) {
  return routeOgByRoute.get(route);
}

export function requireRouteOg(route: string) {
  const record = getRouteOg(route);
  if (!record) throw new Error(`Published route is missing its generated social card: ${route}`);
  return record;
}

export function routeOgMetadataImage(route: string) {
  const record = requireRouteOg(route);
  return { url: record.path, width: record.width, height: record.height, alt: record.alt };
}
