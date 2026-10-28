import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { getInitials } from "@/utils/getInitials";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { PlatformPressable } from "expo-router/react-navigation";
import { useAuth } from "../../context/AuthContext";
import { C } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabIconCircle({ focused, children }: { focused: boolean; children: ReactNode }) {
  return (
    <View style={{
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: focused ? C.primary : "transparent",
    }}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 12);

  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#151719",
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => (
          <PlatformPressable
            {...props}
            style={[
              props.style,
              {
                flex: 1,
                borderRadius: 26,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              },
            ]}
          />
        ),
        tabBarActiveBackgroundColor: "transparent",
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          marginHorizontal: "8%",
          bottom,
          height: 60,
          paddingTop: 4,
          paddingBottom: 4,
          paddingHorizontal: 4,
          borderRadius: 32,
          backgroundColor: C.page,
          borderWidth: 1,
          borderTopWidth: 1,
          borderColor: C.line,
          elevation: 0,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          borderRadius: 26,
          marginHorizontal: 1,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        tabBarIconStyle: {
          width: 44,
          height: 44,
          flexGrow: 0,
          margin: 0,
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIconCircle focused={focused}>
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            </TabIconCircle>
          ),
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, focused }) => (
            <TabIconCircle focused={focused}>
              <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
            </TabIconCircle>
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <TabIconCircle focused={focused}>
              <Ionicons name={focused ? "receipt" : "receipt-outline"} size={24} color={color} />
            </TabIconCircle>
          ),
          href: user ? "/(tabs)/orders" : null,
        }}
      />

      <Tabs.Screen
        name="order-tracking"
        options={{
          // Hide the tab button while keeping this route navigable.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
          title: "Track Order",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIconCircle focused={focused}>
            {user ? (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: focused ? C.primary : C.soft, borderWidth: 1.5, borderColor: color, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color, fontSize: 12, fontWeight: "800" }} numberOfLines={1}>
                  {getInitials(user.name)}
                </Text>
              </View>
            ) : <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={28} color={color} />}
            </TabIconCircle>
          ),
        }}
      />
    </Tabs>
  );
}
