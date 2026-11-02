import { extensions, importTab } from "./import";
import { importText, extractTextTab } from "./text-import";

const MAX_BYTES = 30 * 1024 * 1024;
export function parseImportUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Paste a complete HTTPS link to a Guitar Pro file.");
  }
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Use an HTTPS link without embedded login details.");
  return url;
}
export function sourceWebsite(
  url: URL,
): "Songsterr" | "Ultimate Guitar" | null {
  const host = url.hostname.toLowerCase();
  if (host === "songsterr.com" || host.endsWith(".songsterr.com"))
    return "Songsterr";
  if (host === "ultimate-guitar.com" || host.endsWith(".ultimate-guitar.com"))
    return "Ultimate Guitar";
  return null;
}
export function droppedUrl(data: Pick<DataTransfer, "getData">): string {
  const uri = data
    .getData("text/uri-list")
    .split(/\r?\n/)
    .find((line) => line.trim() && !line.startsWith("#"));
  return (uri || data.getData("text/plain")).trim();
}
export async function importFromUrl(value: string, signal: AbortSignal) {
  const url = parseImportUrl(value);
  const source = sourceWebsite(url);
  if (source)
    throw new Error(
      `${source} page links cannot be copied directly. Use the site's official Guitar Pro download, then import that file.`,
    );
  let response: Response;
  try {
    response = await fetch(url.href, {
      signal,
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      "This host could not be reached or does not allow direct browser imports. Download the file from its source, then use Import tabs.",
    );
  }
  if (!response.ok)
    throw new Error(
      `The download returned HTTP ${response.status}. Use an accessible file link or download the file from its source.`,
    );
  const contentType = response.headers.get("content-type") || "";
  const isText = /text\/|application\/xhtml/i.test(contentType);
  const disposition = response.headers.get("content-disposition") || "";
  let filename: string;
  try {
    filename = decodeURIComponent(url.pathname.split("/").pop() || "");
  } catch {
    filename = "";
  }
  const attachment = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  if (attachment) filename = attachment.trim().split(/[\\/]/).pop() || filename;
  if (
    !isText &&
    !extensions.includes(filename.split(".").pop()?.toLowerCase() || "")
  ) {
    await response.body?.cancel();
    throw new Error(
      "The link must download a named Guitar Pro file (.gp3, .gp4, .gp5, .gpx or .gp).",
    );
  }
  if (Number(response.headers.get("content-length")) > MAX_BYTES) {
    await response.body?.cancel();
    throw new Error("Files must be smaller than 30 MB.");
  }
  if (!response.body) throw new Error("The download did not contain a file.");
  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      size += chunk.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new Error("Files must be smaller than 30 MB.");
      }
      chunks.push(new Uint8Array(chunk));
    }
  } finally {
    reader.releaseLock();
  }
  signal.throwIfAborted();
  const file = new File(chunks, filename || "download.gp", {
    type: contentType || "application/octet-stream",
  });
  let tab;
  if (isText) {
    if (size > 1000000)
      throw new Error(
        "This text webpage is too large to convert. Paste a shorter tab instead.",
      );
    const text = await file.text();
    const page = /html|xhtml/i.test(contentType)
      ? extractTextTab(text)
      : { text, title: undefined, artist: undefined };
    try {
      tab = await importText(page.text, {
        title: page.title,
        artist: page.artist,
      });
    } catch (e) {
      throw new Error(
        `No playable text tab could be converted from this webpage. ${e instanceof Error ? e.message : ""} Try Paste tab text instead.`,
      );
    }
  } else tab = await importTab(file);
  signal.throwIfAborted();
  // Keep attribution, but never persist expiring tokens or URL fragments.
  return { ...tab, sourceUrl: `${url.origin}${url.pathname}` };
}
