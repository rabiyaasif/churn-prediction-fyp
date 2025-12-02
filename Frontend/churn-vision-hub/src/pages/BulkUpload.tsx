import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Upload, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { bulkUploadProducts, bulkUploadUsers } from "@/services/analysis";

const BulkUpload = () => {
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [usersFile, setUsersFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<{
    products: string | null;
    users: string | null;
  }>({ products: null, users: null });
  const [uploadSuccess, setUploadSuccess] = useState<{
    products: boolean | null;
    users: boolean | null;
  }>({ products: null, users: null });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState<{
    products: { inserted: number } | null;
    users: { inserted: number } | null;
  }>({ products: null, users: null });

  const parseCSV = (text: string): string[][] => {
    const lines = text.split("\n").filter((line) => line.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "products" | "users") => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      if (type === "products") {
        setProductsFile(file);
        setUploadSuccess((prev) => ({ ...prev, products: null }));
        setFileErrors((prev) => ({ ...prev, products: null }));
      } else {
        setUsersFile(file);
        setUploadSuccess((prev) => ({ ...prev, users: null }));
        setFileErrors((prev) => ({ ...prev, users: null }));
      }
      setError(null);
    }
  };

  const handleUpload = async () => {
    // Reset previous errors
    setError(null);
    setFileErrors({ products: null, users: null });

    // Validate that at least one file is selected
    if (!productsFile && !usersFile) {
      setError("Please select at least one file to upload.");
      setFileErrors({
        products: "File is required",
        users: "File is required"
      });
      return;
    }

    // Validate individual files if user tried to upload without selecting
    const errors: { products: string | null; users: string | null } = {
      products: null,
      users: null
    };

    // Note: We only show errors if user clicked upload without any files
    // If at least one file is selected, we proceed

    setUploading(true);
    setUploadSuccess({ products: null, users: null });
    setUploadProgress(0);
    setResults({ products: null, users: null });

    try {
      // Upload products if file is selected
      if (productsFile) {
        setUploadProgress(25);
        const productsText = await productsFile.text();
        const productsData = parseCSV(productsText);
        
        // Skip header row and convert to objects
        const headers = productsData[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
        const products = productsData.slice(1).map((row) => {
          const product: any = {};
          headers.forEach((header, index) => {
            const value = row[index]?.trim() || "";
            // Flexible column name matching - try to match common variations
            const normalizedHeader = header.replace(/[^a-z0-9]/g, "");
            // Product ID matching (prioritize product_id, then id)
            if (!product.product_id) {
              if (normalizedHeader.includes("productid") || normalizedHeader.includes("product_id")) {
                product.product_id = value;
              } else if (normalizedHeader === "id" || normalizedHeader === "productid") {
                product.product_id = value;
              }
            }
            // Name matching
            if (!product.name) {
              if (normalizedHeader === "name" || normalizedHeader.includes("productname") || normalizedHeader.includes("product_name") || normalizedHeader.includes("title") || normalizedHeader === "product") {
                product.name = value;
              }
            }
            // Description matching
            if (normalizedHeader.includes("description") || normalizedHeader.includes("desc") || normalizedHeader.includes("details")) {
              product.description = value || undefined;
            }
            // Category matching
            if (normalizedHeader.includes("category") || normalizedHeader.includes("cat") || normalizedHeader.includes("type")) {
              product.category = value || undefined;
            }
            // Price matching
            if (normalizedHeader.includes("price") || normalizedHeader.includes("cost") || normalizedHeader.includes("amount")) {
              const numValue = parseFloat(value);
              product.price = !isNaN(numValue) ? numValue : undefined;
            }
            // Currency matching
            if (normalizedHeader.includes("currency") || normalizedHeader.includes("curr") || normalizedHeader.includes("curr_code")) {
              product.currency = value || undefined;
            }
          });
          return product;
        });

        // Validate required fields
        const invalidProducts = products.filter(
          (p) => !p.product_id || !p.name
        );
        if (invalidProducts.length > 0) {
          throw new Error(
            `Invalid products: ${invalidProducts.length} products are missing required fields (product_id, name)`
          );
        }

        setUploadProgress(50);
        const productsResult = await bulkUploadProducts(products);
        setResults((prev) => ({ ...prev, products: productsResult }));
        setUploadSuccess((prev) => ({ ...prev, products: true }));
      }

      // Upload users if file is selected
      if (usersFile) {
        setUploadProgress(75);
        const usersText = await usersFile.text();
        const usersData = parseCSV(usersText);
        
        // Skip header row and convert to objects
        const headers = usersData[0].map((h) => h.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
        const users = usersData.slice(1).map((row) => {
          const user: any = {};
          headers.forEach((header, index) => {
            const value = row[index]?.trim() || "";
            // Flexible column name matching - try to match common variations
            const normalizedHeader = header.replace(/[^a-z0-9]/g, "");
            // User ID matching (prioritize user_id, then id)
            if (!user.user_id) {
              if (normalizedHeader.includes("userid") || normalizedHeader.includes("user_id")) {
                user.user_id = value;
              } else if (normalizedHeader === "id" && !normalizedHeader.includes("email")) {
                user.user_id = value;
              }
            }
            // Email matching
            if (normalizedHeader.includes("email") || normalizedHeader.includes("e_mail") || normalizedHeader.includes("e-mail") || normalizedHeader.includes("mail")) {
              user.email = value || undefined;
            }
            // Name matching
            if (normalizedHeader === "name" || normalizedHeader.includes("username") || normalizedHeader.includes("user_name") || normalizedHeader.includes("fullname") || normalizedHeader.includes("full_name") || normalizedHeader.includes("displayname")) {
              user.name = value || undefined;
            }
          });
          return user;
        });

        // Validate required fields
        const invalidUsers = users.filter((u) => !u.user_id);
        if (invalidUsers.length > 0) {
          throw new Error(
            `Invalid users: ${invalidUsers.length} users are missing required field (user_id)`
          );
        }

        setUploadProgress(90);
        const usersResult = await bulkUploadUsers(users);
        setResults((prev) => ({ ...prev, users: usersResult }));
        setUploadSuccess((prev) => ({ ...prev, users: true }));
      }

      setUploadProgress(100);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message || "Failed to upload files. Please try again.");
      setUploadSuccess({ products: false, users: false });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Upload className="h-8 w-8 text-foreground" />
            <h1 className="text-3xl font-bold text-foreground">
              Bulk CSV Upload
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Upload product and user CSV files to perform bulk operations.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Products Upload Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Upload Products CSV
            </p>
            {uploadSuccess.products === true ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : uploadSuccess.products === false ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, "products")}
            className={`mb-3 ${fileErrors.products ? "border-destructive" : ""}`}
            disabled={uploading}
          />
          {fileErrors.products && (
            <p className="text-sm text-destructive mt-1">{fileErrors.products}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Upload any CSV file with product data. The system will automatically detect columns.
          </p>
          {productsFile && (
            <p className="text-sm text-foreground mt-2">
              Selected: {productsFile.name}
            </p>
          )}
          {results.products && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {results.products.inserted} products inserted
            </p>
          )}
        </Card>

        {/* Users Upload Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Upload Users CSV
            </p>
            {uploadSuccess.users === true ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : uploadSuccess.users === false ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange(e, "users")}
            className={`mb-3 ${fileErrors.users ? "border-destructive" : ""}`}
            disabled={uploading}
          />
          {fileErrors.users && (
            <p className="text-sm text-destructive mt-1">{fileErrors.users}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Upload any CSV file with user data. The system will automatically detect columns.
          </p>
          {usersFile && (
            <p className="text-sm text-foreground mt-2">
              Selected: {usersFile.name}
            </p>
          )}
          {results.users && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {results.users.inserted} users inserted
            </p>
          )}
        </Card>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="text-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        </Card>
      )}

      {/* Error Messages */}
      {error && (
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </Card>
      )}

      {/* Success Message */}
      {uploadSuccess.products === true || uploadSuccess.users === true ? (
        <Card className="p-6 border-green-500/50 bg-green-500/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-600">
              Files uploaded successfully!
            </p>
          </div>
        </Card>
      ) : null}

      {/* Upload Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleUpload}
          disabled={uploading}
          className="min-w-[200px]"
        >
          {uploading ? "Uploading..." : "Upload Files"}
        </Button>
      </div>
    </div>
  );
};

export default BulkUpload;

