import type { PluginServerContext } from "@getpaseo/plugin/server";
import { fetchSub2ApiUsage } from "./server/usage";
import { getSub2ApiUsage } from "./shared/usage";

export default function contribute(server: PluginServerContext) {
  server.handle(getSub2ApiUsage, fetchSub2ApiUsage);
  return () => {};
}
