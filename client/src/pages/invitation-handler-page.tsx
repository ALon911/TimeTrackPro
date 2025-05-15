import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeams } from "@/hooks/use-teams";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitationHandlerPage() {
  // בסיסי
  const [, setLocation] = useLocation();
  const params = useParams<{ token: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const { respondToInvitationMutation } = useTeams();
  
  // סטייטים
  const [status, setStatus] = useState<"loading" | "error" | "success" | "unauthorized">("loading");
  const [message, setMessage] = useState<string>("");
  const [tokenToUse, setTokenToUse] = useState<string | null>(null);
  
  // אתחול הטוקן בעת טעינת הקומפוננטה
  useEffect(() => {
    const init = () => {
      // מנסה לקחת את הטוקן מהפרמטרים של הנתיב
      const tokenFromParams = params.token;
      
      // במקרה שזה לא פועל, מנסה לחלץ מהנתיב ישירות
      const pathParts = window.location.pathname.split('/');
      const fallbackToken = pathParts[pathParts.length - 1];
      
      // בוחר את הטוקן הטוב ביותר שיש לנו
      const effectiveToken = tokenFromParams || fallbackToken;
      
      // שומר את הטוקן למצב
      setTokenToUse(effectiveToken);
      
      console.log({
        path: window.location.pathname,
        tokenFromParams,
        fallbackToken,
        effectiveToken
      });
    };
    
    init();
  }, [params]);
  
  // טיפול בהזמנה כאשר יש לנו משתמש וטוקן
  useEffect(() => {
    if (!tokenToUse) {
      return; // אין טוקן עדיין, מחכה
    }
    
    // אם המשתמש לא מחובר, מציג מסך התחברות
    if (!user && !authLoading) {
      setStatus("unauthorized");
      return;
    }
    
    // אם המשתמש מחובר ויש טוקן, מטפל בהזמנה
    if (user && !authLoading && tokenToUse) {
      handleAcceptInvitation();
    }
  }, [user, authLoading, tokenToUse]);
  
  // פונקציה לקבלת ההזמנה
  const handleAcceptInvitation = async () => {
    if (!tokenToUse) {
      setStatus("error");
      setMessage("מזהה ההזמנה חסר");
      return;
    }
    
    try {
      setStatus("loading");
      
      respondToInvitationMutation.mutate(
        { token: tokenToUse, action: "accept" },
        {
          onSuccess: (data) => {
            setStatus("success");
            setMessage(data.message || "ההזמנה התקבלה בהצלחה");
            
            // הפנה לעמוד הצוותים אחרי הצלחה
            setTimeout(() => {
              setLocation('/teams');
            }, 2000);
          },
          onError: (error: any) => {
            console.error("Error accepting invitation:", error);
            setStatus("error");
            setMessage(error.message || "אירעה שגיאה בעת קבלת ההזמנה");
          }
        }
      );
    } catch (error) {
      console.error("Uncaught error:", error);
      setStatus("error");
      setMessage("אירעה שגיאה בעת עיבוד ההזמנה");
    }
  };

  const navigateToTeams = () => setLocation("/teams");
  const navigateToAuth = () => {
    // אם יש לנו טוקן, שומרים אותו בפרמטר החיפוש כדי לשמור אותו בין הדפים
    if (tokenToUse) {
      setLocation(`/auth?inviteToken=${tokenToUse}`);
    } else {
      setLocation("/auth");
    }
  };

  // מסך טעינה
  if (status === "loading" || authLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-lg">מעבד את ההזמנה...</p>
        </div>
      </div>
    );
  }

  // מסך לא מחובר
  if (status === "unauthorized") {
    return (
      <div className="container py-8 max-w-md mx-auto min-h-screen flex flex-col justify-center">
        <Card className="border-primary-600">
          <CardHeader>
            <CardTitle className="text-center">נדרשת התחברות</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 bg-amber-50 dark:bg-amber-950/20 text-black dark:text-amber-50 border-amber-300 dark:border-amber-800">
              <AlertTitle>התחבר כדי לקבל את ההזמנה לצוות</AlertTitle>
              <AlertDescription>
                כדי לקבל את ההזמנה לצוות, יש להתחבר למערכת תחילה.
              </AlertDescription>
            </Alert>
            <div className="flex justify-center mt-4">
              <Button onClick={navigateToAuth} className="w-full">
                עבור להתחברות
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // מסך שגיאה
  if (status === "error") {
    return (
      <div className="container py-8 max-w-md mx-auto min-h-screen flex flex-col justify-center">
        <Card className="border-red-300 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-center text-red-600 dark:text-red-400">שגיאה בעיבוד ההזמנה</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>לא ניתן לקבל את ההזמנה</AlertTitle>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
            <div className="flex justify-center mt-4">
              <Button onClick={navigateToTeams} className="w-full">
                עבור לדף הצוותים
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // מסך הצלחה
  return (
    <div className="container py-8 max-w-md mx-auto min-h-screen flex flex-col justify-center">
      <Card className="border-green-300 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-center text-green-600 dark:text-green-400">ההזמנה התקבלה בהצלחה!</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 bg-green-50 dark:bg-green-950/20 text-black dark:text-green-50 border-green-300 dark:border-green-800">
            <AlertTitle>ברוך הבא לצוות</AlertTitle>
            <AlertDescription>
              {message}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={navigateToTeams} className="w-full">
              עבור לדף הצוותים
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}