import personalBooks from "./personal-books.json";
import themedShelves from "./themed-shelves.json";

export type Book = (typeof personalBooks)[number];

const personalTitle = "Półka ważnych dla mnie książek";
export const shelves = [
  { id: "", label: "Ważne dla mnie", title: personalTitle, books: personalBooks },
  ...themedShelves.map((shelf) => ({ ...shelf, title: shelf.label })),
];

// Book links resolve to their own shelf, including links without a shelf query.
const url = new URL(location.href);
const bookId = url.hash.startsWith("#book/") ? url.hash.slice(6) : null;
const linkedShelf = bookId
  ? shelves.find((shelf) => shelf.books.some((book) => book.id === bookId))
  : undefined;
const selectedShelf =
  linkedShelf ??
  shelves.find((shelf) => shelf.id === url.searchParams.get("shelf")) ??
  shelves[0];
if (selectedShelf.id) {
  url.searchParams.set("shelf", selectedShelf.id);
} else {
  url.searchParams.delete("shelf");
}
if (bookId !== null && !linkedShelf) url.hash = "";
if (url.href !== location.href) {
  history.replaceState(history.state, "", url.href);
}

export const books: Book[] = selectedShelf.books;
export const shelfId = selectedShelf.id;
export const wraps = !shelfId;
export const shelfTitle = selectedShelf.title;
export const pageTitle = shelfTitle + " · Jan Jędrzejak";
export const catalogTitle = shelfId
  ? "Katalog · " + shelfTitle
  : "Katalog ważnych książek";
export const categories = [
  ["Wszystkie", "All"],
  ["Produkt", "Produkt i strategia"],
  ["Technologia", "Technologia i AI"],
  ["Reportaż", "Reportaż i biografie"],
  ["Literatura", "Literatura"],
] as const;
export const numberLabel = (n: number) => String(n).padStart(2, "0");
export const shelfHref = (id = shelfId, catalog = false) =>
  (catalog ? "./catalog.html" : "./") + (id ? "?shelf=" + id : "");
export const bookHref = (id: string) => shelfHref() + "#book/" + id;

export function asset(path: string) {
  return /^https:\/\//.test(path)
    ? path
    : new URL(import.meta.env.BASE_URL + path, document.baseURI).href;
}
