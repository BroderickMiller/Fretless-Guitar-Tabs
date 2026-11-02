import { asciiTabToGp7, type AsciiTabMetadata } from "./ascii-tab";
import { importTab } from "./import";
export async function importText(
  text: string,
  metadata: AsciiTabMetadata = {},
) {
  const { document, data } = await asciiTabToGp7(text, metadata);
  const filename = `${
    document.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "pasted-tab"
  }.gp`;
  const tab = await importTab({
    name: filename,
    size: data.byteLength,
    arrayBuffer: async () => new Uint8Array(data).buffer,
  } as File);
  const identity = JSON.stringify({
    text: text.replace(/\r\n?/g, "\n").trim(),
    title: document.title,
    artist: document.artist,
    tempo: document.tempo,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity),
  );
  return {
    ...tab,
    id: Array.from(new Uint8Array(digest), (x) =>
      x.toString(16).padStart(2, "0"),
    ).join(""),
    format: "text",
    sourceKind: "text" as const,
    originalText: text,
    warnings: document.warnings,
  };
}

export function extractTextTab(html: string) {
  // Template contents are inert: no scripts execute and no embedded resources load.
  const template = document.createElement("template");
  template.innerHTML = html;
  const root = template.content;
  root
    .querySelectorAll(
      "script,style,noscript,iframe,img,object,embed,link,template,svg",
    )
    .forEach((n) => n.remove());
  const title =
    root.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    root.querySelector("title")?.textContent ||
    "Imported text tab";
  const artist =
    root.querySelector('meta[name="author"]')?.getAttribute("content") ||
    undefined;
  root.querySelectorAll("br").forEach((n) => n.replaceWith("\n"));
  const blocks = Array.from(root.querySelectorAll("pre,textarea,code")).filter(
    (n) => !n.parentElement?.closest("pre,textarea,code"),
  );
  const text = blocks.length
    ? blocks.map((n) => n.textContent || "").join("\n\n")
    : root.textContent || "";
  return { text, title: title.trim(), artist };
}
