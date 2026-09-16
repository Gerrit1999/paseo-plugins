import type { PluginClientContext } from "@getpaseo/plugin/client";
import { MainSurface } from "./client/main";

export default function contribute(client: PluginClientContext) {
  client.addSurface("main", MainSurface);
  client.addSidebarItem({
    id: "sub2api-usage",
    title: "Sub2API Usage",
    icon: "ChartNoAxesCombined",
    surface: "main",
  });
  return () => {};
}
