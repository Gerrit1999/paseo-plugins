import type { PluginContext } from "@getpaseo/plugin";
import { MainSurface } from "./main.client";
import { fetchSub2ApiUsage } from "./usage.server";
import { getSub2ApiUsage } from "./usage.shared";

export default function contribute(plugin: PluginContext) {
  plugin.handle(getSub2ApiUsage, fetchSub2ApiUsage);
  plugin.addSurface("main", MainSurface);
  plugin.addSidebarItem({
    id: "sub2api-usage",
    title: "Sub2API Usage",
    icon: "ChartNoAxesCombined",
    surface: "main",
  });
  return () => {};
}
