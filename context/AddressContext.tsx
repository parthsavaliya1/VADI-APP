import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { createContext, useContext, useEffect, useState } from "react";

type Address = {
  _id: string;
  name: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type AddressContextType = {
  defaultAddress: Address | null;
  selectedAddress: Address | null;
  setSelectedAddress: (address: Address | null) => void;
  refreshAddress: () => Promise<void>;
};

const AddressContext = createContext<AddressContextType>({
  defaultAddress: null,
  selectedAddress: null,
  setSelectedAddress: () => {},
  refreshAddress: async () => {},
});

export const AddressProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const loadDefaultAddress = async () => {
    if (!user?._id) return;

    try {
      const res = await API.get(`/addresses/${user._id}`);
      const defaultAddr = res.data.find((a: Address) => a.isDefault);
      setDefaultAddress(defaultAddr || null);

      // If no address is selected, use default
      if (!selectedAddress && defaultAddr) {
        setSelectedAddress(defaultAddr);
      }
    } catch (err) {
      console.error("Failed to load default address");
    }
  };

  useEffect(() => {
    loadDefaultAddress();
  }, [user]);

  return (
    <AddressContext.Provider
      value={{
        defaultAddress,
        selectedAddress,
        setSelectedAddress,
        refreshAddress: loadDefaultAddress,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddress = () => useContext(AddressContext);
