import { promises as fs } from "fs";
import path from "path";

/** Sdílené fs pomocníky data access vrstvy. */

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function readJsonl<T>(file: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(file, "utf8");
    const events: T[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line) as T);
      } catch {
        // poškozený řádek ignorujeme — audit nesmí shodit aplikaci
      }
    }
    return events;
  } catch {
    return [];
  }
}

export async function appendJsonl(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, JSON.stringify(data) + "\n", "utf8");
}

export async function writeJsonl(file: string, items: unknown[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const content = items.map((item) => JSON.stringify(item)).join("\n");
  await fs.writeFile(file, content + (items.length ? "\n" : ""), "utf8");
}
