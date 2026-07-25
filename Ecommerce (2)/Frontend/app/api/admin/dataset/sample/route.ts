import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "nodejs";

const SAMPLE_CSV = `Product_Name,Category,Gender,Color,Sleeve_Type,Material,Combo_Item,Is_Flash_Sale,Price,Discount_Pct,Month,Year,City,Sales
Slim Fit Blue Jeans,Jeans,Male,Blue,Not Specified,Denim,Single,0,2437.72,8.5,Jun,2024,Islamabad,295
Classic Cotton Tee,T-Shirt,Unisex,Black,Half Sleeve,Cotton,Single,1,899.0,15.0,Jul,2025,Karachi,640
Sports Sneakers,Shoes,Male,White,Not Specified,Synthetic,Single,0,5299.0,12.0,Apr,2023,Lahore,420
`;

export async function GET(request: NextRequest) {
  try {
    const authUser = authenticateRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    return new NextResponse(SAMPLE_CSV, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="dataset_sample.csv"',
      },
    });
  } catch (error) {
    console.error("Sample CSV download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
