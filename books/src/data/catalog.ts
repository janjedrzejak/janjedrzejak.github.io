import books from "./personal-books.json";

export type Book = (typeof books)[number];
export { books };

// Old links resolve to this shelf. Keep valid book links and other parameters.
const url = new URL(location.href);
if (url.searchParams.get("shelf") === "engineering") {
  url.searchParams.delete("shelf");
}
if (
  url.hash.startsWith("#book/") &&
  !books.some((book) => book.id === url.hash.slice(6))
) {
  url.hash = "";
}
if (url.href !== location.href) {
  history.replaceState(history.state, "", url.href);
}

export const shelfTitle = "Półka ważnych dla mnie książek";
export const pageTitle = shelfTitle + " · Jan Jędrzejak";
export const categories = [
  ["Wszystkie", "All"],
  ["Produkt", "Produkt i strategia"],
  ["Technologia", "Technologia i AI"],
  ["Reportaż", "Reportaż i biografie"],
  ["Literatura", "Literatura"],
] as const;
export const numberLabel = (n: number) => String(n).padStart(2, "0");
export const bookHref = (id: string) => "./#book/" + id;

export function asset(path: string) {
  return /^https:\/\//.test(path)
    ? path
    : new URL(import.meta.env.BASE_URL + path, document.baseURI).href;
}
