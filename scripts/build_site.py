#!/usr/bin/env python3
"""Render the bilingual authoring HTML into a crawlable GitHub Pages artifact."""
from copy import deepcopy
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
import hashlib
import json
import math
import re
import shutil
from lxml import etree, html

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
ORIGIN = "https://janjedrzejak.github.io"
PAGES = json.loads((ROOT / "scripts/seo-pages.json").read_text())
HOME_PL = json.loads((ROOT / "scripts/home-pl.json").read_text())
ARTICLES = [p for p in PAGES if p.startswith("blog-posts/")]


def fragment_into(element, markup):
    for child in list(element):
        element.remove(child)
    fragment = html.fragment_fromstring(markup, create_parent="div")
    element.text = fragment.text
    for child in list(fragment):
        element.append(child)


def set_text(element, text):
    for child in list(element):
        element.remove(child)
    element.text = text


def url_for(path, language):
    path = "" if path == "index.html" else path
    return ORIGIN + ("/pl/" if language == "pl" else "/") + path


def meta(doc, key, value, kind="name"):
    found = doc.xpath(f'//head/meta[@{kind}="{key}"]')
    element = found[0] if found else etree.SubElement(doc.find("head"), "meta", {kind: key})
    element.set("content", value)
    for duplicate in found[1:]:
        duplicate.getparent().remove(duplicate)


def structured(doc, graph):
    for element in doc.xpath('//script[@type="application/ld+json"]'):
        element.getparent().remove(element)
    element = etree.SubElement(doc.find("head"), "script", type="application/ld+json")
    element.text = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=2).replace("</", "<\\/")


def rewrite_url(value, source, language, page_link=False):
    if not value or value.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return value
    resolved = urlsplit(urljoin(ORIGIN + "/" + source, value))
    if resolved.netloc != urlsplit(ORIGIN).netloc:
        return value
    path = resolved.path.lstrip("/") or "index.html"
    if page_link and path in PAGES:
        result = urlsplit(url_for(path, language)).path
    else:
        result = "/" + path
    return urlunsplit(("", "", result, resolved.query, resolved.fragment))


def localize(doc, path, language):
    doc.set("lang", language)
    doc.set("data-language", language)
    doc.find("body").set("data-language", language)
    # Materialize full text before removing authoring attributes. No crawler-specific output.
    for element in list(doc.iter()):
        if not isinstance(element.tag, str):
            continue
        if element.get(f"data-{language}") is not None:
            set_text(element, element.get(f"data-{language}"))
        if element.get(f"data-{language}-html") is not None:
            fragment_into(element, element.get(f"data-{language}-html"))
        if element.get(f"data-{language}-aria") is not None:
            element.set("aria-label", element.get(f"data-{language}-aria"))
        if language == "pl":
            for attribute in ("data-i18n", "data-i18n-html", "data-i18n-aria"):
                if attribute not in element.attrib:
                    continue
                key = element.get(attribute)
                if key not in HOME_PL:
                    raise ValueError(f"Missing Polish translation: {key}")
                if attribute == "data-i18n-aria":
                    element.set("aria-label", HOME_PL[key])
                elif attribute == "data-i18n-html":
                    fragment_into(element, HOME_PL[key])
                else:
                    set_text(element, HOME_PL[key])
    for element in doc.xpath('//*[@data-language-toggle]'):
        element.tag = "a"
        element.attrib.pop("type", None)
        element.set("href", urlsplit(url_for(path, "en" if language == "pl" else "pl")).path)
        element.set("hreflang", "en" if language == "pl" else "pl")
        element.set("lang", "en" if language == "pl" else "pl")
        label = "Zmień język na angielski" if language == "pl" else "Switch language to Polish"
        element.set("aria-label", label)
        element.set("title", label)
        for child in element.xpath('.//*[contains(@class,"language-current")]'):
            set_text(child, language.upper())
        for child in element.xpath('.//*[contains(@class,"language-next")]'):
            set_text(child, "EN" if language == "pl" else "PL")
    for element in doc.xpath('//*[@data-menu-label]'):
        set_text(element, "Otwórz menu" if language == "pl" else "Open menu")
    for element in doc.iter():
        for key in list(element.attrib):
            if key.startswith(("data-en", "data-pl", "data-title-", "data-description-", "data-i18n")):
                del element.attrib[key]


def add_article_navigation(doc, path, language, published, modified):
    content = doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," article-content ")]')[0]
    header = doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," article-meta ")]')[0]
    header.clear()
    header.set("class", "article-meta mono")
    date = etree.SubElement(header, "time", datetime=published)
    date.text = ("Opublikowano: " if language == "pl" else "Published: ") + published
    if modified and modified != published:
        date = etree.SubElement(header, "time", datetime=modified)
        date.text = ("Aktualizacja: " if language == "pl" else "Updated: ") + modified
    minutes = max(1, math.ceil(len(content.text_content().split()) / 200))
    etree.SubElement(header, "span").text = f"{minutes} MIN"
    author = etree.SubElement(header, "a", href=urlsplit(url_for("index.html", language)).path + "#profile")
    author.text = "Jan Jędrzejak"

    toc = etree.Element("nav", {"class": "article-toc", "aria-label": "Spis treści" if language == "pl" else "On this page"})
    etree.SubElement(toc, "p").text = "W tym artykule" if language == "pl" else "On this page"
    listing = etree.SubElement(toc, "ol")
    for i, heading in enumerate(content.xpath('.//h2'), 1):
        heading.set("id", heading.get("id") or f"section-{i}")
        link = etree.SubElement(etree.SubElement(listing, "li"), "a", href="#" + heading.get("id"))
        link.text = heading.text_content()
    if len(listing):
        lead = content.xpath('./p')[0] if content.xpath('./p') else None
        content.insert(content.index(lead) + 1 if lead is not None else 0, toc)

    related = etree.Element("aside", {"class": "related-notes", "aria-labelledby": "related-title"})
    etree.SubElement(related, "h2", id="related-title").text = "Czytaj dalej" if language == "pl" else "Read next"
    groups = {
        "blog-posts/n8n-raspberry-pi.html": ["n8n-professional-certificate", "automation-failures"],
        "blog-posts/n8n-professional-certificate.html": ["n8n-raspberry-pi", "automation-failures"],
        "blog-posts/snapclip.html": ["system-integration", "automation-failures"],
        "blog-posts/automation-failures.html": ["system-integration", "n8n-raspberry-pi"],
        "blog-posts/system-integration.html": ["automation-failures", "ai-project-management"],
        "blog-posts/ai-project-management.html": ["system-integration", "automation-failures"]
    }
    ul = etree.SubElement(related, "ul")
    for slug in groups[path]:
        target = "blog-posts/" + slug + ".html"
        link = etree.SubElement(etree.SubElement(ul, "li"), "a", href=urlsplit(url_for(target, language)).path)
        link.text = PAGES[target][language]["title"].split(" | ")[0]
    content.addnext(related)


def build_page(path, language):
    doc = html.document_fromstring((ROOT / path).read_text())
    body = doc.find("body")
    config = PAGES.get(path, {}).get(language, {})
    title = config.get("title") or body.get(f"data-title-{language}") or doc.find("head/title").text
    description = config.get("description") or body.get(f"data-description-{language}") or doc.xpath('//meta[@name="description"]/@content')[0]
    title = title.replace(" — ", " | ").replace(" – ", " | ")
    old_json = [json.loads(e.text) for e in doc.xpath('//script[@type="application/ld+json"]')]
    localize(doc, path, language)
    set_text(doc.find("head/title"), title)
    if "h1" in config:
        set_text(doc.xpath('//h1')[0], config["h1"])
    # Keep the article title visible on first paint rather than waiting for a reveal animation.
    for header in doc.xpath('//header[contains(concat(" ",normalize-space(@class)," ")," article-header ")]'):
        header.attrib.pop("data-reveal", None)
    if path == "blog.html":
        for card in doc.xpath('//a[contains(concat(" ",normalize-space(@class)," ")," blog-card ")]'):
            target = card.get("href")
            if target not in ARTICLES:
                continue
            article_doc = html.document_fromstring((ROOT / target).read_text())
            localize(article_doc, target, language)
            article_body = article_doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," article-content ")]')[0]
            minutes = max(1, math.ceil(len(article_body.text_content().split()) / 200))
            published = article_doc.xpath('//meta[@property="article:published_time"]/@content')
            if not published:
                node = next(json.loads(e.text) for e in article_doc.xpath('//script[@type="application/ld+json"]') if json.loads(e.text).get("@type") == "BlogPosting")
                published = [node["datePublished"]]
            times = card.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," blog-meta ")]/*')
            if len(times) >= 2:
                date = times[-1]
                date.tag = "time"
                date.set("datetime", published[0][:10])
                set_text(date, published[0][:10] + f" / {minutes} MIN")
            heading = card.xpath('.//h2')
            if target.endswith("n8n-raspberry-pi.html") and heading:
                set_text(heading[0], PAGES[target][language]["h1"])
    canonical = url_for(path, language)
    for element in doc.xpath('//link[@rel="canonical" or @hreflang]'):
        element.getparent().remove(element)
    etree.SubElement(doc.find("head"), "link", rel="canonical", href=canonical)
    if path in PAGES:
        for lang in ("en", "pl", "x-default"):
            etree.SubElement(doc.find("head"), "link", rel="alternate", hreflang=lang, href=url_for(path, "en" if lang == "x-default" else lang))
    for key, value in [("description", description), ("twitter:title", title), ("twitter:description", description), ("twitter:image", ORIGIN + "/img/me.webp"), ("twitter:image:alt", "Jan Jędrzejak"), ("twitter:card", "summary")]:
        meta(doc, key, value)
    for key, value in [("og:title", title), ("og:description", description), ("og:url", canonical), ("og:locale", "pl_PL" if language == "pl" else "en_US"), ("og:locale:alternate", "en_US" if language == "pl" else "pl_PL"), ("og:site_name", "Jan Jędrzejak"), ("og:image", ORIGIN + "/img/me.webp"), ("og:image:alt", "Jan Jędrzejak"), ("og:image:width", "1760"), ("og:image:height", "2432")]:
        meta(doc, key, value, "property")
    # Remove nonexistent assets and an unused second consent library.
    for element in list(doc.xpath('//link | //script[@src]')):
        value = element.get("href") or element.get("src") or ""
        if "favicon.svg" in value or "/gh/silktide/cookie-consent@latest/" in value:
            element.getparent().remove(element)
        elif "apple-touch-icon.png" in value:
            element.set("href", "/img/apple-icon-180x180.png")
        elif "site.webmanifest" in value:
            element.set("href", "/img/manifest.json")
    for element in doc.xpath('//meta[@name="keywords"]'):
        element.getparent().remove(element)
    for element in doc.xpath('//*[@href or @src]'):
        if element.tag == "link" and (element.get("rel") == "canonical" or element.get("hreflang")):
            continue
        for attribute in ("href", "src"):
            if attribute in element.attrib:
                # The language switch deliberately points to the other language.
                switch = "data-language-toggle" in element.attrib
                if not switch:
                    element.set(attribute, rewrite_url(element.get(attribute), path, language, element.tag == "a"))
    for element in doc.xpath('//img[contains(@src,"/img/me.jpg")]'):
        element.set("src", "/img/me.webp")
        element.set("width", "1760")
        element.set("height", "2432")
        element.set("loading", "lazy")
        element.set("decoding", "async")
    for element in doc.xpath('//script[@src]'):
        if element.get("src", "").startswith("/"):
            element.set("defer", "defer")
    for element in doc.xpath('//link[@href] | //script[@src]'):
        attr = "src" if element.tag == "script" else "href"
        value = element.get(attr)
        parts = urlsplit(value)
        local = ROOT / parts.path.lstrip("/")
        if value.startswith("/") and local.suffix in (".js", ".css") and local.is_file():
            version = hashlib.sha256(local.read_bytes()).hexdigest()[:10]
            element.set(attr, parts.path + "?v=" + version)
    noscript = etree.SubElement(doc.find("head"), "noscript")
    etree.SubElement(noscript, "style").text = "[data-reveal]{opacity:1!important;transform:none!important}.cursor-dot,.cursor-ring,.page-progress{display:none!important}"

    person = {"@type": "Person", "@id": ORIGIN + "/#person", "name": "Jan Jędrzejak", "url": ORIGIN + "/", "image": ORIGIN + "/img/me.webp", "jobTitle": "Digital Project Manager / Product Owner", "sameAs": ["https://www.linkedin.com/in/janjedrzejak", "https://github.com/janjedrzejak", "https://www.credly.com/users/jan-jedrzejak"]}
    website = {"@type": "WebSite", "@id": ORIGIN + "/#website", "url": ORIGIN + "/", "name": "Jan Jędrzejak", "inLanguage": ["en", "pl"], "publisher": {"@id": ORIGIN + "/#person"}}
    webpage = {"@type": "WebPage", "@id": canonical + "#webpage", "url": canonical, "name": title, "description": description, "inLanguage": language, "isPartOf": {"@id": ORIGIN + "/#website"}}
    graph = [person, website, webpage]
    if path == "index.html":
        original = next((node for node in old_json if node.get("@type") == "Person"), {})
        person.update({k: deepcopy(v) for k, v in original.items() if k not in ("@context", "image", "sameAs")})
        webpage.update({"@type": "ProfilePage", "mainEntity": {"@id": ORIGIN + "/#person"}})
    if path in ARTICLES:
        original = next(node for node in old_json if node.get("@type") == "BlogPosting")
        published = original["datePublished"][:10]
        modified = PAGES[path].get("modified", original.get("dateModified", published))
        add_article_navigation(doc, path, language, published, modified)
        article = {"@type": "BlogPosting", "@id": canonical + "#article", "url": canonical, "mainEntityOfPage": {"@id": canonical + "#webpage"}, "headline": doc.xpath('//h1')[0].text_content(), "description": description, "inLanguage": language, "datePublished": published, "dateModified": modified, "author": {"@id": ORIGIN + "/#person", "@type": "Person", "name": "Jan Jędrzejak", "url": url_for("index.html", language)}, "publisher": {"@id": ORIGIN + "/#person"}, "isPartOf": {"@id": url_for("blog.html", language) + "#blog"}}
        graph.append(article)
        webpage["mainEntity"] = {"@id": canonical + "#article"}
        meta(doc, "article:published_time", published, "property")
        meta(doc, "article:modified_time", modified, "property")
    if path == "blog.html":
        webpage["@type"] = "CollectionPage"
        graph.append({"@type": "Blog", "@id": canonical + "#blog", "url": canonical, "name": title, "inLanguage": language, "author": {"@id": ORIGIN + "/#person"}, "blogPost": [{"@id": url_for(p, language) + "#article"} for p in ARTICLES]})
        webpage["mainEntity"] = {"@id": canonical + "#blog"}
    if path == "projects.html":
        webpage["@type"] = "CollectionPage"
    if path in PAGES and path != "index.html":
        crumbs = [(url_for("index.html", language), "Strona główna" if language == "pl" else "Home")]
        if path in ARTICLES:
            crumbs.append((url_for("blog.html", language), "Notatki" if language == "pl" else "Notes"))
        crumbs.append((canonical, doc.xpath('//h1')[0].text_content()))
        breadcrumb = {"@type": "BreadcrumbList", "@id": canonical + "#breadcrumb", "itemListElement": [{"@type": "ListItem", "position": i, "name": label, "item": url} for i, (url, label) in enumerate(crumbs, 1)]}
        graph.append(breadcrumb)
        webpage["breadcrumb"] = {"@id": canonical + "#breadcrumb"}
        main = doc.xpath('//main')[0]
        nav = etree.Element("nav", {"class": "breadcrumbs", "aria-label": "Ścieżka nawigacji" if language == "pl" else "Breadcrumb"})
        ol = etree.SubElement(nav, "ol")
        for i, (url, label) in enumerate(crumbs):
            li = etree.SubElement(ol, "li")
            if i == len(crumbs) - 1:
                li.set("aria-current", "page")
                li.text = label
            else:
                etree.SubElement(li, "a", href=urlsplit(url).path).text = label
        main.insert(0, nav)
    structured(doc, graph)
    output = OUT / ("pl" if language == "pl" else "") / path
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html.tostring(doc, encoding="unicode", doctype="<!DOCTYPE html>", method="html") + "\n")
    return doc


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for name in ("img", "cookie", "res"):
        shutil.copytree(ROOT / name, OUT / name, ignore=shutil.ignore_patterns(".DS_Store"))
    for pattern in ("*.css", "*.js", "*.pdf", "robots.txt"):
        for source in ROOT.glob(pattern):
            shutil.copy2(source, OUT / source.name)
    docs = {}
    for path in PAGES:
        for language in ("en", "pl"):
            docs[(path, language)] = build_page(path, language)
    # Keep the utility page's intentional noindex and GitHub's real 404 response.
    for name in ("404.html", "ksiazka-nfc.html"):
        doc = html.document_fromstring((ROOT / name).read_text())
        for element in doc.xpath('//*[@href or @src]'):
            for attr in ("href", "src"):
                if attr in element.attrib:
                    element.set(attr, rewrite_url(element.get(attr), name, "en", element.tag == "a"))
        (OUT / name).write_text(html.tostring(doc, encoding="unicode", doctype="<!DOCTYPE html>"))
    (OUT / ".nojekyll").touch()
    sitemap = etree.Element("urlset", nsmap={None: "http://www.sitemaps.org/schemas/sitemap/0.9"})
    for (path, language), doc in docs.items():
        robots = doc.xpath('//meta[@name="robots"]/@content')
        if robots and "noindex" in robots[0]:
            continue
        entry = etree.SubElement(sitemap, "url")
        etree.SubElement(entry, "loc").text = url_for(path, language)
        if PAGES[path].get("modified"):
            etree.SubElement(entry, "lastmod").text = PAGES[path]["modified"]
    (OUT / "sitemap.xml").write_bytes(etree.tostring(sitemap, pretty_print=True, encoding="UTF-8", xml_declaration=True))
    print(f"Built {len(docs)} localized pages and 2 utility pages in {OUT}")


if __name__ == "__main__":
    build()
