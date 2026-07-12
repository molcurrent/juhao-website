export const NEWS_PAGE_SIZE = 2;

export function newsPagePath(page: number) {
  return page <= 1 ? "/news" : `/news/page/${page}`;
}

export function parseNewsPageNumber(slug: string[]) {
  if (slug.length !== 3 || slug[0] !== "news" || slug[1] !== "page") return null;
  const page = Number(slug[2]);
  if (!Number.isInteger(page) || page < 1 || String(page) !== slug[2]) return null;
  return page;
}
