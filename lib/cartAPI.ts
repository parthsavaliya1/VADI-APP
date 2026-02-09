import { API } from "@/utils/api";

export const cartApi = {
  getCart: (userId: string) => API.get("/cart", { params: { userId } }),

  addToCart: (data: {
    userId: string;
    productId: string;
    variantId: string;
    quantity: number;
  }) => API.post("/cart/add", data),

  updateQty: (data: {
    userId: string;
    productId: string;
    variantId: string;
    quantity: number;
  }) => API.put("/cart/update", data),

  removeItem: (data: {
    userId: string;
    productId: string;
    variantId: string;
  }) => API.delete("/cart/remove", { data }),

  clearCart: (userId: string) =>
    API.delete("/cart/clear", { data: { userId } }),
};
