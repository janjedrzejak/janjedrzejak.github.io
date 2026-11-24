import engineering from "./books.json";
import personal from "./personal-books.json";

export type Book = (typeof engineering)[number];

export const readingMap =
  "https://github.com/nagavineerpasam/systems-to-ai-reading-map";
export const personalTitle = "Półka ważnych dla mnie książek";
const query = new URLSearchParams(location.search);
const previousId = location.hash.startsWith("#book/")
  ? location.hash.slice(6)
  : "";

// Preserve links to the original engineering shelf, including earlier book URLs.
export const technicalShelf =
  query.get("shelf") === "engineering" ||
  (!query.has("shelf") && engineering.some((book) => book.id === previousId));

if (technicalShelf && !query.has("shelf")) {
  query.set("shelf", "engineering");
  if (location.hash)
    history.replaceState(history.state, "", "?" + query + location.hash);
}

export const books: Book[] = technicalShelf ? engineering : personal;
export const shelfTitle = technicalShelf ? "Półka inżynierska" : personalTitle;
export const pageTitle = shelfTitle + " · Jan Jędrzejak";
export const shelfQuery = technicalShelf ? "?shelf=engineering" : "";
export const otherShelf = technicalShelf ? "./" : "./?shelf=engineering";
export const otherLabel = technicalShelf
  ? "Moje ważne książki"
  : "Półka inżynierska";
export const categories = technicalShelf
  ? ([
      ["Wszystkie", "All"],
      ["Podstawy", "Foundations"],
      ["Backend", "Backend"],
      ["Infrastruktura", "Infrastructure & Operations"],
      ["AI", "Artificial Intelligence"],
    ] as const)
  : ([
      ["Wszystkie", "All"],
      ["Produkt", "Produkt i strategia"],
      ["Technologia", "Technologia i AI"],
      ["Reportaż", "Reportaż i biografie"],
      ["Literatura", "Literatura"],
    ] as const);

export function categoryLabel(name: string) {
  return categories.find(([, key]) => key === name)?.[0] ?? name;
}
export const numberLabel = (n: number) => String(n).padStart(2, "0");
export const bookHref = (id: string) => "./" + shelfQuery + "#book/" + id;

export function asset(path: string) {
  return /^https:\/\//.test(path)
    ? path
    : new URL(import.meta.env.BASE_URL + path, document.baseURI).href;
}
