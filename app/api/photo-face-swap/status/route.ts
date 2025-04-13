import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const predictionId = req.nextUrl.searchParams.get("id");
  
  if (!predictionId) {
    return NextResponse.json(
      { error: "Prediction ID is required" },
      { status: 400 }
    );
  }
  
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured" },
      { status: 500 }
    );
  }
  
  try {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get prediction status: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.status === "succeeded") {
      console.log("🚀 ~ GET ~ result:", result)
        console.log("🚀 ~ GET ~ result.output:", result.output)
      return NextResponse.json({ 
        success: true, 
        status: result.status,
        output: result.output 
      });
    } else if (result.status === "failed") {
      return NextResponse.json({ 
        success: false, 
        status: result.status,
        error: result.error || "Face swap processing failed" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        status: result.status,
        message: "Face swap is still processing" 
      });
    }
  } catch (error) {
    console.error("Error checking prediction status:", error);
    return NextResponse.json(
      { error: "Failed to check prediction status" },
      { status: 500 }
    );
  }
} 