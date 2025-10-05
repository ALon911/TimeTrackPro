import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface StandaloneAddMemberProps {
  teamId: number;
  teamName: string;
}

export function StandaloneAddMember({ teamId, teamName }: StandaloneAddMemberProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: "member"
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "שגיאה בהוספת משתמש");
      }
      
      setSuccess(`המשתמש ${email} נוסף לצוות בהצלחה`);
      setEmail("");
    } catch (err: any) {
      setError(err.message || "שגיאה בלתי ידועה");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="border-red-500 shadow-md">
      <CardHeader className="bg-red-50 dark:bg-red-950">
        <CardTitle className="text-red-600 dark:text-red-400">הוספת משתמש ישירות לצוות {teamName}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="הזן כתובת אימייל של משתמש קיים"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              required
              className="border-red-300"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              משתמש זה יתווסף ישירות לצוות ללא תהליך אישור
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button 
          onClick={handleSubmit}
          disabled={loading || !email}
          variant="destructive"
          className="w-full"
        >
          {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          הוסף משתמש ישירות לצוות
        </Button>
      </CardFooter>
    </Card>
  );
}