import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const { clearCart } = useCart();

  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    clearCart();
    logout();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* USER INFO */}
        <View style={styles.userCard}>
          <Ionicons name="person-circle" size={70} color="#2E7D32" />
          <Text style={styles.name}>
            {isAdmin ? "VADI Admin" : "VADI Customer"}
          </Text>
          <Text style={styles.phone}>{user?.phone || "+91 XXXXXXXX90"}</Text>
        </View>

        {/* MENU */}
        <View style={styles.menu}>
          <MenuItem
            icon="receipt"
            label="My Orders"
            onPress={() => {
              // Navigate to orders (already handled by Orders tab)
            }}
          />
          <MenuItem
            icon="location"
            label="My Addresses"
            onPress={() => router.push("/my-addresses")}
          />

          {/* 🔐 ADMIN ACTIONS (AFTER ADDRESS) */}
          {isAdmin && (
            <>
              <AdminItem
                icon="pricetag"
                label="Add Category"
                onPress={() => router.push("/admin/add-category")}
              />
              <AdminItem
                icon="add-circle"
                label="Add Product"
                onPress={() => router.push("/admin/add-product")}
              />
            </>
          )}

          <MenuItem
            icon="help-circle"
            label="Help & Support"
            onPress={() => {
              // Navigate to help
            }}
          />
          <MenuItem
            icon="information-circle"
            label="About VADI"
            onPress={() => {
              // Navigate to about
            }}
          />
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* NORMAL MENU ITEM */
function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color="#2E7D32" />
        <Text style={styles.menuText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );
}

/* ADMIN CLICKABLE ITEM */
function AdminItem({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={22} color="#1B5E20" />
        <Text style={[styles.menuText, { fontWeight: "700" }]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#1B5E20" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  container: {
    padding: 15,
    flex: 1,
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
  },
  phone: {
    color: "#666",
    marginTop: 4,
  },
  menu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    marginLeft: 12,
    fontSize: 15,
  },
  logoutBtn: {
    backgroundColor: "#D32F2F",
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  logoutText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
  },
});
