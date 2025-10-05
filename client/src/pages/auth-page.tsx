import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email("אנא הכנס כתובת דוא״ל תקינה"),
  password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים"),
});

const registerSchema = insertUserSchema.omit({ username: true }).extend({
  password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים"),
  confirmPassword: z.string(),
  displayName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'הסיסמאות אינן תואמות',
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      displayName: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    // Remove confirmPassword before sending to API
    const { confirmPassword, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  // בדיקה אם יש פרמטר invitation token בURL
  const searchParams = new URLSearchParams(window.location.search);
  const inviteToken = searchParams.get('inviteToken');
  
  console.log('Auth page loaded with inviteToken:', inviteToken);
  
  // הפניה בהתאם למצב המשתמש ולהימצאות טוקן
  useEffect(() => {
    if (user) {
      if (inviteToken) {
        // עם טוקן, יש להפנות להזמנה אוטומטית
        console.log('User authenticated with invite token, redirecting to invitation');
        navigate(`/invitation/${inviteToken}`);
      } else {
        // ללא טוקן, הפניה לדף הראשי
        navigate("/");
      }
    }
  }, [user, navigate, inviteToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full flex flex-col md:flex-row bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Hero Section */}
        <div className="bg-primary p-8 text-white md:w-1/2 flex flex-col justify-center" dir="rtl">
          <h1 className="text-3xl font-bold mb-4">TimeTracker</h1>
          <p className="text-lg mb-6">אפליקציה לניהול הזמן שלך בצורה יעילה ומסודרת</p>
          <ul className="space-y-3">
            <li className="flex items-center">
              <span className="material-icons ml-2">check_circle</span>
              <span>מעקב אחר זמן בנושאים שונים</span>
            </li>
            <li className="flex items-center">
              <span className="material-icons ml-2">check_circle</span>
              <span>דוחות וסטטיסטיקות מפורטים</span>
            </li>
            <li className="flex items-center">
              <span className="material-icons ml-2">check_circle</span>
              <span>ממשק משתמש פשוט ונוח</span>
            </li>
            <li className="flex items-center">
              <span className="material-icons ml-2">check_circle</span>
              <span>גישה מכל מכשיר</span>
            </li>
          </ul>
        </div>

        {/* Auth Form Section */}
        <div className="p-8 md:w-1/2">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="text-right">התחברות</TabsTrigger>
              <TabsTrigger value="register" className="text-right">הרשמה</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-right">התחברות</CardTitle>
                  <CardDescription className="text-right">
                    הכנס את פרטי ההתחברות שלך להמשך.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-right block">דוא״ל</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="הכנס כתובת דוא״ל"
                        dir="ltr"
                        className="text-left"
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-500 text-right">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-right block">סיסמה</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="הכנס סיסמה"
                        dir="ltr"
                        className="text-left"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500 text-right">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full text-right" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : null}
                      התחבר
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-right">הרשמה</CardTitle>
                  <CardDescription className="text-right">
                    צור חשבון חדש לשימוש באפליקציה.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-display-name" className="text-right block">שם תצוגה (אופציונאלי)</Label>
                      <Input
                        id="register-display-name"
                        type="text"
                        placeholder="הכנס שם תצוגה"
                        dir="ltr"
                        className="text-left"
                        {...registerForm.register("displayName")}
                      />
                      {registerForm.formState.errors.displayName && (
                        <p className="text-sm text-red-500 text-right">
                          {registerForm.formState.errors.displayName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-right block">דוא״ל</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="הכנס כתובת דוא״ל"
                        dir="ltr"
                        className="text-left"
                        {...registerForm.register("email")}
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-500 text-right">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-right block">סיסמה</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="בחר סיסמה"
                        dir="ltr"
                        className="text-left"
                        {...registerForm.register("password")}
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-500 text-right">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-right block">אימות סיסמה</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="הכנס שוב את הסיסמה"
                        dir="ltr"
                        className="text-left"
                        {...registerForm.register("confirmPassword")}
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500 text-right">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit" 
                      className="w-full text-right" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      ) : null}
                      הירשם
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
