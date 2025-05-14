import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
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

const profileSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  username: z.string().min(2, "שם משתמש חייב להכיל לפחות 2 תווים"),
});

export default function SettingsPage() {
  const { user, updateProfileMutation, deleteAccountMutation, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || "",
      username: user?.username || "",
    },
  });

  const onSubmit = (values: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(values);
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "החשבון נמחק בהצלחה",
          description: "החשבון שלך נמחק בהצלחה. תופנה לדף ההתחברות.",
        });
        logoutMutation.mutate();
      }
    });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">הגדרות</h1>
          <p className="text-muted-foreground">ערוך את פרטי המשתמש שלך והגדרות נוספות</p>
        </div>

        <div className="grid gap-8">
          {/* עדכון פרופיל */}
          <Card>
            <CardHeader>
              <CardTitle>פרטי משתמש</CardTitle>
              <CardDescription>עדכן את פרטי המשתמש שלך</CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>שם משתמש</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>כתובת אימייל</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
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
                </CardFooter>
              </form>
            </Form>
          </Card>

          {/* הגדרת ערכת נושא */}
          <Card>
            <CardHeader>
              <CardTitle>ערכת נושא</CardTitle>
              <CardDescription>בחר את מצב התצוגה המועדף עליך</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSwitcher />
            </CardContent>
          </Card>

          {/* מחיקת חשבון */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-500">מחיקת חשבון</CardTitle>
              <CardDescription>פעולה זו תמחק לצמיתות את החשבון שלך ואת כל הנתונים הקשורים אליו</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                לאחר מחיקת החשבון, לא תוכל לשחזר את הנתונים שלך. חשוב לוודא שיש לך גיבוי של כל הנתונים החשובים לך.
              </p>
              
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <AlertTriangle className="ml-2 h-4 w-4" />
                    מחק את החשבון שלי
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>האם אתה בטוח שברצונך למחוק את החשבון?</AlertDialogTitle>
                    <AlertDialogDescription>
                      פעולה זו אינה הפיכה. היא תמחק לצמיתות את החשבון שלך ואת כל הנתונים הקשורים אליו.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {deleteAccountMutation.isPending && (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      )}
                      כן, מחק את החשבון שלי
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}