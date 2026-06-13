import { notFound } from "next/navigation";

import { getProductById } from "@/actions/admin/products";
import { ProductForm } from "@/components/admin/products/product-form";

interface EditProductPageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { productId } = await params;
  const product = await getProductById(productId);

  if (!product) {
    notFound();
  }

  return <ProductForm product={product} />;
}
