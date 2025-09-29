import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function AddDirectMemberPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    // Extract teamId from URL path
    const path = location;
    const match = path.match(/\/teams\/(\d+)\/add-member/);
    
    if (match && match[1]) {
      const id = parseInt(match[1]);
      setTeamId(id);
      
      // Fetch team info
      const fetchTeam = async () => {
        try {
          const res = await fetch(`/api/teams/${id}`);
          if (res.ok) {
            const team = await res.json();
            setTeamName(team.name);
          } else {
            setError('הצוות לא נמצא');
          }
        } catch (err) {
          setError('שגיאה בטעינת פרטי הצוות');
        }
      };
      
      fetchTeam();
    } else {
      setError('מזהה צוות לא תקין');
    }
  }, [location]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('יש להזין כתובת אימייל');
      return;
    }
    
    if (!teamId) {
      setError('מזהה צוות לא תקין');
      return;
    }
    
    setError('');
    setSubmitting(true);
    
    try {
      // Use a direct fetch instead of apiRequest
      const response = await fetch('/api/direct-add-team-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          email
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'שגיאה בהוספת המשתמש');
      }
      
      setSuccess(true);
      toast({
        title: 'המשתמש נוסף בהצלחה',
        description: `המשתמש ${email} נוסף לצוות ${teamName}`,
      });
      
      // Close window after 3 seconds if it's a popup
      setTimeout(() => {
        window.close();
      }, 3000);
      
    } catch (err: any) {
      setError(err.message || 'שגיאה בהוספת המשתמש');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="container max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>הוספת משתמש לצוות {teamName || ''}</CardTitle>
          <CardDescription>
            הזן את כתובת האימייל של המשתמש להוספה ישירה לצוות
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-md text-center">
              <h3 className="text-lg font-semibold mb-2">המשתמש נוסף בהצלחה!</h3>
              <p>חלון זה ייסגר אוטומטית תוך מספר שניות</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    כתובת אימייל
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="הזן כתובת אימייל"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ltr-input"
                    dir="ltr"
                  />
                </div>
                
                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-md text-sm">
                    {error}
                  </div>
                )}
              </div>
            </form>
          )}
        </CardContent>
        {!success && (
          <CardFooter>
            <div className="flex w-full space-x-2 flex-row-reverse">
              <Button 
                type="button" 
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    מוסיף משתמש...
                  </>
                ) : (
                  'הוסף משתמש'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="flex-1"
                onClick={() => window.close()}
              >
                סגור
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}