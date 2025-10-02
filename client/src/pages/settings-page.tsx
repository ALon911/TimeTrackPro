import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const profileFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: "דוא״ל הוא שדה חובה" })
    .email({ message: "אימייל אינו תקין" }),
  displayName: z.string().optional(),
});

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: user?.email || "",
      displayName: user?.displayName || "",
    },
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        email: user.email || "",
        displayName: user.displayName || "",
      });
    }
  }, [user]);
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { email: string; displayName?: string }) => {
      const res = await apiRequest("PUT", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data);
      // Update form with new data
      form.reset({
        email: data.email,
        displayName: data.displayName || "",
      });
      toast({
        title: "הפרופיל עודכן בהצלחה",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה בעדכון הפרופיל",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user/account");
    },
    onSuccess: () => {
      logoutMutation.mutate();
      toast({
        title: "החשבון נמחק בהצלחה",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "שגיאה במחיקת החשבון",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(data);
  };
  
  if (!user) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">הגדרות</h2>
        <p className="text-neutral-600">נהל את פרטי החשבון והעדפות שלך</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>פרטי חשבון</CardTitle>
              <CardDescription>עדכן את פרטי החשבון שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-right block">שם תצוגה</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="הכנס שם תצוגה"
                            dir="ltr"
                            className="text-left"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-right block">דוא״ל</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            dir="ltr"
                            className="text-left"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending && (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="ml-2 h-4 w-4" />
                      שמור שינויים
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>התנתק מהמערכת</CardTitle>
              <CardDescription>התנתק מהחשבון שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-600 mb-4">לחץ על הכפתור למטה כדי להתנתק מהחשבון שלך.</p>
              <Button
                variant="outline"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                התנתק
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות מראה</CardTitle>
              <CardDescription>בחר את המראה המועדף עליך</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-medium">מצב כהה</h4>
                    <p className="text-muted-foreground text-xs">בחר בין מצב בהיר לכהה</p>
                  </div>
                  <ThemeSwitcher />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader className="text-destructive">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                מחק חשבון
              </CardTitle>
              <CardDescription>מחק לצמיתות את החשבון והנתונים שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">
                פעולה זו אינה ניתנת לביטול. היא תמחק לצמיתות את החשבון והנתונים שלך מהשרתים שלנו.
              </p>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">מחק את החשבון שלי</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>האם אתה בטוח ברצונך למחוק את החשבון?</AlertDialogTitle>
                    <AlertDialogDescription>
                      פעולה זו אינה ניתנת לביטול. היא תמחק לצמיתות את החשבון והנתונים שלך מהשרתים שלנו.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAccountMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                    >
                      {deleteAccountMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "כן, מחק את החשבון שלי"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}