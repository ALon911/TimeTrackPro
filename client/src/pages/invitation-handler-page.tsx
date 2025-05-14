import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeams } from "@/hooks/use-teams";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitationHandlerPage() {
  console.log('InvitationHandlerPage component loading');
  
  // הוספת לוגים נוספים לבעיות נפוצות
  console.log('Current URL path:', window.location.pathname);
  console.log('Current search params:', window.location.search);
  
  const [, setLocation] = useLocation();
  const { token } = useParams<{ token: string }>();
  
  console.log('Token from params:', token);
  console.log('Token type:', typeof token, 'Token length:', token?.length);
  
  // במקרה של בעיות עם token, ננסה לחלץ אותו ישירות מה-URL
  const pathParts = window.location.pathname.split('/');
  const fallbackToken = pathParts[pathParts.length - 1];
  console.log('Fallback token extraction:', fallbackToken);
  
  // שימוש בטוקן מהפרמטרים או במקרה חירום מהנתיב
  const effectiveToken = token || fallbackToken;
  console.log('Effective token to use:', effectiveToken);
  
  const { respondToInvitationMutation } = useTeams();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "error" | "success" | "unauthorized">("loading");
  const [message, setMessage] = useState<string>("");

  // מגדיר פונקציה לקבלת ההזמנה
  const processInvitation = () => {
    if (effectiveToken) {
      handleAcceptInvitation(effectiveToken);
    } else {
      console.error('No effective token found to process invitation');
      setStatus("error");
      setMessage("מזהה ההזמנה חסר או לא תקין");
    }
  };

  useEffect(() => {
    console.log('InvitationHandlerPage useEffect triggered');
    console.log('Current user:', user);
    console.log('Auth loading:', authLoading);
    console.log('Token value in useEffect:', token);
    console.log('Effective token in useEffect:', effectiveToken);
    
    // Debug location
    console.log('Current location:', window.location.pathname);
    
    // אם המשתמש לא מחובר, הפנה אותו לעמוד ההתחברות
    if (!user && !authLoading) {
      console.log('User not authenticated, redirecting to auth page');
      setStatus("unauthorized");
      return;
    }

    // אם המשתמש מחובר ויש טוקן (רגיל או חלופי), קבל את ההזמנה
    if (user && effectiveToken) {
      console.log('User authenticated and token exists, handling invitation');
      processInvitation();
    } else {
      console.log('Not handling invitation yet:', { 
        user: !!user, 
        token: !!token,
        effectiveToken: !!effectiveToken
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, token, effectiveToken]);

  const handleAcceptInvitation = async (tokenToUse: string) => {
    try {
      console.log(`Starting handleAcceptInvitation with token: ${tokenToUse}`);
      setStatus("loading");
      
      if (!tokenToUse) {
        console.error('No token provided to handleAcceptInvitation');
        setStatus("error");
        setMessage("מזהה ההזמנה חסר");
        return;
      }
      
      // הדפס את המידע שנשלח בבקשה
      console.log('Sending mutation with data:', { token: tokenToUse, action: "accept" });
      
      respondToInvitationMutation.mutate(
        { token: tokenToUse, action: "accept" },
        {
          onSuccess: (data) => {
            console.log('Invitation response success:', data);
            setStatus("success");
            setMessage(data.message || "ההזמנה התקבלה בהצלחה");
            
            // הפנה לעמוד הצוותים אחרי הצלחה
            setTimeout(() => {
              setLocation('/teams');
            }, 2000);
          },
          onError: (error: any) => {
            console.error("Detailed error accepting invitation:", {
              error,
              message: error.message,
              statusCode: error.statusCode,
              response: error.response
            });
            setStatus("error");
            setMessage(error.message || "אירעה שגיאה בעת קבלת ההזמנה");
          }
        }
      );
    } catch (error) {
      console.error("Uncaught error in invitation handler:", error);
      setStatus("error");
      setMessage("אירעה שגיאה בעת עיבוד ההזמנה");
    }
  };

  const navigateToTeams = () => {
    setLocation("/teams");
  };

  const navigateToAuth = () => {
    setLocation("/auth");
  };

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