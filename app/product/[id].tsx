import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyProduct() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = Array.isArray(id) ? id[0] : id;
  return <Redirect href={productId ? { pathname: "/product-detail", params: { id: productId } } : "/(tabs)"} />;
}
