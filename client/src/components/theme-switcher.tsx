import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-2">
      <div className="text-lg font-semibold mb-2">מצב תצוגה</div>
      <RadioGroup value={theme} onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}>
        <div className="flex items-center space-x-2 space-x-reverse">
          <RadioGroupItem value="light" id="light" />
          <Label htmlFor="light" className="flex items-center cursor-pointer mr-2">
            <Sun className="h-4 w-4 ml-2" />
            מצב בהיר
          </Label>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <RadioGroupItem value="dark" id="dark" />
          <Label htmlFor="dark" className="flex items-center cursor-pointer mr-2">
            <Moon className="h-4 w-4 ml-2" />
            מצב כהה
          </Label>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <RadioGroupItem value="system" id="system" />
          <Label htmlFor="system" className="flex items-center cursor-pointer mr-2">
            <Monitor className="h-4 w-4 ml-2" />
            הגדרות מערכת
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

// כפתור מקוצר לשינוי תמה
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  function toggleTheme() {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      title={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}