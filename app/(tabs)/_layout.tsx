import { CustomTabBar } from "@/components/ui/tab-bar";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cabinet" />
      <Tabs.Screen name="receipt" />
      <Tabs.Screen name="mypage" />
    </Tabs>
  );
}
