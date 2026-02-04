import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Truck, CreditCard } from "lucide-react";
import { VirtualTryOnBot } from "../components/VirtualTryOnBot";
import { getProductById } from "../data/products";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const product = getProductById(id || "");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const { toast } = useToast();

  if (!product) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">Product not found.</p>
          <Link to="/demo" className="text-sm underline mt-4 inline-block">
            Return to demo
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return `Rs. ${price.toLocaleString("en-IN")}`;
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast({
        title: "Please select a size",
        description: "Choose your size before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Added to cart",
      description: `${product.name} (${selectedSize}) has been added to your cart.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="lg:flex lg:min-h-screen">
        {/* Image Gallery - Left Side */}
        <div className="lg:w-[60%] lg:overflow-y-auto bg-muted/30 flex items-center justify-center p-8">
          <img
            src={product.image}
            alt={product.name}
            className="max-w-full h-auto max-h-[80vh] object-contain"
          />
        </div>

        {/* Product Info - Right Side */}
        <div className="lg:w-[40%] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
          <div className="px-6 py-8 lg:px-12 lg:py-16 space-y-6">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/demo" className="hover:text-foreground transition-colors">
                Demo
              </Link>
              <span>/</span>
              <Link to="/demo" className="hover:text-foreground transition-colors">
                {product.category}
              </Link>
              <span>/</span>
              <span className="text-foreground">{product.name}</span>
            </nav>

            {/* Title & Price */}
            <div className="space-y-2">
              <h1 className="font-heading text-2xl lg:text-3xl font-semibold">
                {product.name}
              </h1>
              <p className="text-lg">{formatPrice(product.price)}</p>
              <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
            </div>

            {/* Category Badge */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 text-xs tracking-wide bg-secondary text-secondary-foreground rounded-full">
                {product.category}
              </span>
            </div>

            {/* Size Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Size</span>
                <button className="text-xs underline text-muted-foreground hover:text-foreground">
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[48px] h-12 px-4 text-sm border transition-colors ${
                      selectedSize === size
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Virtual Try-On Widget */}
            <VirtualTryOnBot productId={product.id} size={selectedSize || undefined} />

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              className="w-full h-14 text-sm tracking-wider"
            >
              ADD TO CART
            </Button>

            {/* Delivery Info */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Truck size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-sm">Express Shipping</p>
                  <p className="text-xs text-muted-foreground">2-4 business days</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-sm">COD Available</p>
                  <p className="text-xs text-muted-foreground">Pay on delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
