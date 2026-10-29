import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyCategory() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  return <Redirect href={{ pathname: "/all-products", params: { type: "category", categoryId: Array.isArray(slug) ? slug[0] : slug ?? "" } }} />;
}
