import { Redirect, useLocalSearchParams } from "expo-router";
export default function LegacyCategoryDetails() {
  const params = useLocalSearchParams<{ category?: string | string[]; title?: string | string[] }>();
  return <Redirect href={{ pathname: "/all-products", params: {
    type: "category", categoryId: Array.isArray(params.category) ? params.category[0] : params.category ?? "",
    title: Array.isArray(params.title) ? params.title[0] : params.title ?? "Products",
  } }} />;
}
