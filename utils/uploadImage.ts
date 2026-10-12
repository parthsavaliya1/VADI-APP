import { API } from "@/utils/api";

export async function uploadProductImage(uri: string): Promise<string> {
  const filename = uri.split("/").pop() || "product.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const ext = match?.[1]?.toLowerCase();
  const type =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const form = new FormData();
  form.append("file", {
    uri,
    name: filename,
    type,
  } as unknown as Blob);

  const { data } = await API.post("/api/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (!data?.success || !data?.url) {
    throw new Error(data?.message || "Image upload failed");
  }

  return data.url as string;
}
