import { useAuth } from "@/context/AuthContext";
import { API } from "@/utils/api";
import { createContext, useContext, useEffect, useState } from "react";

type Address = {
  _id: string;
  name: string;
  city: string;
  state: string;
  isDefault: boolean;
};

type AddressContextType = {
  defaultAddress: Address | null;
  refreshAddress: () => Promise<void>;
};

const AddressContext = createContext<AddressContextType>({
  defaultAddress: null,
  refreshAddress: async () => {},
});

export const AddressProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);

  const loadDefaultAddress = async () => {
    if (!user?._id) return;

    try {
      const res = await API.get(`/addresses/${user._id}`);
      const defaultAddr = res.data.find((a: Address) => a.isDefault);
      setDefaultAddress(defaultAddr || null);
    } catch (err) {
      console.error("Failed to load default address");
    }
  };

  useEffect(() => {
    loadDefaultAddress();
  }, [user]);

  return (
    <AddressContext.Provider
      value={{ defaultAddress, refreshAddress: loadDefaultAddress }}
    >
      {children}
    </AddressContext.Provider>
  );
};

export const useAddress = () => useContext(AddressContext);
