import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { createContext, useContext, useEffect, useState } from "react";

/* ================= TYPES ================= */

type Address = {
  _id: string;
  user: string;
  type: "home" | "work" | "other";
  name?: string; // display name
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AddressInput = {
  type?: "home" | "work" | "other";
  name?: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: [number, number]; // [lng, lat]
  isDefault?: boolean;
};

type AddressContextType = {
  addresses: Address[];
  defaultAddress: Address | null;
  selectedAddress: Address | null;
  loading: boolean;

  setSelectedAddress: (address: Address | null) => void;
  addAddress: (address: AddressInput) => Promise<Address>;
  updateAddress: (
    addressId: string,
    data: Partial<AddressInput>,
  ) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  refreshAddresses: () => Promise<void>;
  getAddressesByType: (type: "home" | "work" | "other") => Address[];
  findNearbyAddresses: (
    longitude: number,
    latitude: number,
    maxDistance?: number,
  ) => Promise<Address[]>;
};

const AddressContext = createContext<AddressContextType>({
  addresses: [],
  defaultAddress: null,
  selectedAddress: null,
  loading: false,
  setSelectedAddress: () => {},
  addAddress: async () => ({}) as Address,
  updateAddress: async () => {},
  deleteAddress: async () => {},
  setDefaultAddress: async () => {},
  refreshAddresses: async () => {},
  getAddressesByType: () => [],
  findNearbyAddresses: async () => [],
});

/* ================= PROVIDER ================= */

export const AddressProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [defaultAddress, setDefaultAddressState] = useState<Address | null>(
    null,
  );
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(false);

  /* ---------- LOAD ADDRESSES ON USER LOGIN ---------- */
  useEffect(() => {
    if (user?._id) {
      loadAddresses();
    } else {
      setAddresses([]);
      setDefaultAddressState(null);
      setSelectedAddress(null);
    }
  }, [user]);

  /* ================= ADDRESS OPERATIONS ================= */

  // 📥 LOAD ADDRESSES FROM SERVER
  const loadAddresses = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      // Updated endpoint to match backend route: GET /addresses/:userId
      const res = await API.get(`/api/addresses/${user._id}`);
      setAddresses(res.data);

      // Set default address
      const defaultAddr = res.data.find((a: Address) => a.isDefault);
      setDefaultAddressState(defaultAddr || null);

      // If no address is selected, use default
      if (!selectedAddress && defaultAddr) {
        setSelectedAddress(defaultAddr);
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  // ➕ ADD ADDRESS
  const addAddress = async (addressData: AddressInput): Promise<Address> => {
    if (!user?._id) {
      throw new Error("Please login to add an address");
    }

    try {
      const payload: any = {
        user: user._id,
        type: addressData.type || "home",
        name: addressData.name,
        phone: addressData.phone,
        addressLine1: addressData.addressLine1,
        addressLine2: addressData.addressLine2,
        landmark: addressData.landmark,
        city: addressData.city,
        state: addressData.state,
        pincode: addressData.pincode,
        isDefault: addressData.isDefault || false,
      };

      // Add location coordinates if provided
      if (addressData.coordinates) {
        payload.location = {
          type: "Point",
          coordinates: addressData.coordinates,
        };
      }

      // Updated endpoint to match backend route: POST /addresses
      const res = await API.post("/api/addresses", payload);
      const newAddress = res.data;

      setAddresses((prev) => [...prev, newAddress]);

      // If this is set as default or first address, update default
      if (newAddress.isDefault || addresses.length === 0) {
        setDefaultAddressState(newAddress);
        setSelectedAddress(newAddress);
      }

      return newAddress;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Failed to add address");
    }
  };

  // 🔄 UPDATE ADDRESS
  const updateAddress = async (
    addressId: string,
    data: Partial<AddressInput>,
  ) => {
    if (!user?._id) return;

    try {
      const payload: any = { ...data };

      // Handle coordinates update
      if (data.coordinates) {
        payload.location = {
          type: "Point",
          coordinates: data.coordinates,
        };
        delete payload.coordinates;
      }

      // Updated endpoint to match backend route: PUT /addresses/:id
      const res = await API.put(`/api/addresses/${addressId}`, payload);
      const updatedAddress = res.data;

      setAddresses((prev) =>
        prev.map((addr) => (addr._id === addressId ? updatedAddress : addr)),
      );

      // Update default if changed
      if (updatedAddress.isDefault) {
        setDefaultAddressState(updatedAddress);

        // If setting as default, unset others
        setAddresses((prev) =>
          prev.map((addr) => ({
            ...addr,
            isDefault: addr._id === addressId,
          })),
        );
      }

      // Update selected if it's the same address
      if (selectedAddress?._id === addressId) {
        setSelectedAddress(updatedAddress);
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to update address",
      );
    }
  };

  // ❌ DELETE ADDRESS
  const deleteAddress = async (addressId: string) => {
    if (!user?._id) return;

    try {
      // Updated endpoint to match backend route: DELETE /addresses/:id
      await API.delete(`/api/addresses/${addressId}`);

      const deletedAddress = addresses.find((a) => a._id === addressId);
      const wasDefault = deletedAddress?.isDefault;

      setAddresses((prev) => prev.filter((addr) => addr._id !== addressId));

      // If deleted address was default, the backend automatically sets a new default
      // Refresh to get the updated default
      if (wasDefault) {
        await loadAddresses();
      }

      // Clear selected if deleted
      if (selectedAddress?._id === addressId) {
        const newDefault = addresses.find(
          (a) => a._id !== addressId && a.isDefault,
        );
        setSelectedAddress(newDefault || null);
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to delete address",
      );
    }
  };

  // ⭐ SET DEFAULT ADDRESS
  const setDefaultAddress = async (addressId: string) => {
    if (!user?._id) return;

    try {
      // Updated endpoint to match backend route: PUT /addresses/:id/default
      const res = await API.put(`/api/addresses/${addressId}/default`);
      const updatedAddress = res.data;

      // Update all addresses (unset previous default)
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: addr._id === addressId,
        })),
      );

      setDefaultAddressState(updatedAddress);
      setSelectedAddress(updatedAddress);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Failed to set default address",
      );
    }
  };

  // 🔄 REFRESH ADDRESSES
  const refreshAddresses = async () => {
    await loadAddresses();
  };

  // 📍 GET ADDRESSES BY TYPE (CLIENT-SIDE FILTER)
  const getAddressesByType = (type: "home" | "work" | "other"): Address[] => {
    return addresses.filter((addr) => addr.type === type);
  };

  // 🗺️ FIND NEARBY ADDRESSES (GEO SEARCH)
  const findNearbyAddresses = async (
    longitude: number,
    latitude: number,
    maxDistance: number = 5000, // default 5km
  ): Promise<Address[]> => {
    try {
      // Updated endpoint to match backend route: POST /addresses/nearby
      const res = await API.post("/api/addresses/nearby", {
        longitude,
        latitude,
        maxDistance,
      });

      return res.data;
    } catch (error: any) {
      console.error("Failed to find nearby addresses:", error);
      throw new Error(
        error.response?.data?.error || "Failed to find nearby addresses",
      );
    }
  };

  /* ================= PROVIDER ================= */

  return (
    <AddressContext.Provider
      value={{
        addresses,
        defaultAddress,
        selectedAddress,
        loading,
        setSelectedAddress,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        refreshAddresses,
        getAddressesByType,
        findNearbyAddresses,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};

/* ================= HOOK ================= */

export const useAddress = () => useContext(AddressContext);
