import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Current path: {location}
          </p>
          
          <p className="mt-2 text-sm text-gray-600">
            This page does not exist in the application.
          </p>
          
          <Link href="/">
            <Button className="mt-4 w-full">
              <Home className="mr-2 h-4 w-4" />
              Go to Home Page
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
