import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

// Form schema for adding a member directly
const directAddSchema = z.object({
  email: z.string().email({ message: "יש להזין כתובת אימייל תקינה" }),
});

type DirectAddFormData = z.infer<typeof directAddSchema>;

export default function AddDirectMemberPage() {
  const { teamId } = useParams();
  const [teamName, setTeamName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Set up form with validation
  const form = useForm<DirectAddFormData>({
    resolver: zodResolver(directAddSchema),
    defaultValues: {
      email: "",
    },
  });

  // Load team details on mount
  useEffect(() => {
    const loadTeam = async () => {
      if (!teamId) {
        setError("מזהה צוות חסר או לא תקין");
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiRequest("GET", `/api/teams/${teamId}`);
        if (!res.ok) {
          throw new Error("צוות לא נמצא או אין הרשאה לגישה");
        }
        
        const team = await res.json();
        setTeamName(team.name);
      } catch (err: any) {
        setError(err.message || "שגיאה בטעינת פרטי הצוות");
      } finally {
        setIsLoading(false);
      }
    };

    loadTeam();
  }, [teamId]);

  const onSubmit = async (data: DirectAddFormData) => {
    if (!teamId) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", `/api/teams/${teamId}/members`, {
        email: data.email,
        role: "member"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "שגיאה בהוספת משתמש");
      }
      
      setSuccess(true);
      toast({
        title: "משתמש נוסף בהצלחה",
        description: `המשתמש ${data.email} נוסף לצוות ${teamName}`,
      });

      // Auto-close window after 3 seconds
      setTimeout(() => {
        window.close();
      }, 3000);
    } catch (err: any) {
      setError(err.message || "שגיאה בלתי ידועה");
      toast({
        title: "שגיאה בהוספת משתמש",
        description: err.message || "שגיאה בלתי ידועה",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">טוען פרטי צוות...</p>
        </div>
      </div>
    );
  }

  // Show error
  if (error && !teamName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive mb-2" />
            <CardTitle>שגיאה בטעינת פרטי צוות</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p>{error}</p>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => window.close()}
              className="w-full"
            >
              סגור
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show success
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md border-green-500">
          <CardHeader className="bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500 mr-2" />
              <CardTitle>פעולה הושלמה בהצלחה</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="mb-2">המשתמש נוסף בהצלחה לצוות {teamName}.</p>
            <p className="text-sm text-muted-foreground">חלון זה ייסגר אוטומטית תוך מספר שניות.</p>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => window.close()}
              className="w-full"
            >
              סגור
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show the form
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md border-primary">
        <CardHeader className="bg-primary/10">
          <CardTitle>הוספת משתמש לצוות {teamName}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כתובת אימייל</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="הזן אימייל של משתמש קיים"
                        type="email"
                        dir="ltr"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                הוסף משתמש לצוות
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="border-t pt-4 justify-end">
          <Button 
            variant="outline" 
            onClick={() => window.close()}
          >
            ביטול
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}