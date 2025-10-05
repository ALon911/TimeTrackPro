import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, CheckCircle, XCircle, RefreshCw, Sparkles, Lightbulb } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AISuggestion {
  id: string;
  type: 'productivity' | 'time_management' | 'work_life_balance' | 'goal_setting';
  title: string;
  description: string;
  actionable: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number;
  isRead: boolean;
  isApplied: boolean;
  createdAt: string;
}

const typeLabels = {
  productivity: 'פרודוקטיביות',
  time_management: 'ניהול זמן',
  work_life_balance: 'איזון עבודה-חיים',
  goal_setting: 'הגדרת מטרות'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const typeColors = {
  productivity: 'bg-blue-100 text-blue-800',
  time_management: 'bg-green-100 text-green-800',
  work_life_balance: 'bg-purple-100 text-purple-800',
  goal_setting: 'bg-orange-100 text-orange-800'
};

export default function SuggestionsPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch suggestions
  const { data: suggestions = [], isLoading, error } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/suggestions');
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      return response.json();
    }
  });

  // Generate new suggestions
  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/suggestions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      toast({
        title: "הצעות נוצרו",
        description: "נוצרו הצעות AI חדשות בהתבסס על הפעילות שלך.",
      });
    },
    onError: () => {
      toast({
        title: "שגיאה",
        description: "נכשל ביצירת הצעות. אנא נסה שוב.",
        variant: "destructive",
      });
    }
  });

  // Update suggestion
  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<{ isRead: boolean; isApplied: boolean }> }) => {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update suggestion');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    }
  });

  // Delete suggestion
  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete suggestion');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      toast({
        title: "הצעה נמחקה",
        description: "ההצעה הוסרה.",
      });
    }
  });

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      await generateSuggestionsMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsRead = (suggestion: AISuggestion) => {
    if (!suggestion.isRead) {
      updateSuggestionMutation.mutate({
        id: suggestion.id,
        updates: { isRead: true }
      });
    }
  };

  const handleMarkAsApplied = (suggestion: AISuggestion) => {
    updateSuggestionMutation.mutate({
      id: suggestion.id,
      updates: { isApplied: !suggestion.isApplied }
    });
  };

  const handleDelete = (suggestion: AISuggestion) => {
    deleteSuggestionMutation.mutate(suggestion.id);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'תאריך לא זמין';
      }
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'תאריך לא זמין';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          נכשל בטעינת ההצעות. אנא נסה שוב.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8 mb-16 md:mb-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 dark:text-white">הצעות AI ותובנות</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            המלצות ותובנות מותאמות אישית בהתבסס על נתוני מעקב הזמן שלך
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div></div>
        <Button
          onClick={handleGenerateSuggestions}
          disabled={isGenerating || generateSuggestionsMutation.isPending}
          className="flex items-center gap-2"
        >
          {isGenerating || generateSuggestionsMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          צור הצעות חדשות
        </Button>
      </div>

      <div className="space-y-6">
          {suggestions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-right">אין הצעות עדיין</h3>
                <p className="text-muted-foreground text-right mb-4">
                  אנחנו צריכים יותר נתונים על דפוסי העבודה שלך כדי ליצור הצעות מותאמות אישית.
                  <br />
                  התחל לעקוב אחר הזמן שלך וחזור בעוד כמה ימים!
                </p>
                <Button onClick={handleGenerateSuggestions} disabled={isGenerating}>
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  נסה ליצור הצעות
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion: AISuggestion) => (
                <Card key={suggestion.id} className={`transition-all duration-200 ${!suggestion.isRead ? 'ring-2 ring-blue-200' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 text-right">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                          {!suggestion.isRead && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              חדש
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={typeColors[suggestion.type]}>
                            {typeLabels[suggestion.type]}
                          </Badge>
                          <Badge className={priorityColors[suggestion.priority]}>
                            עדיפות {suggestion.priority}
                          </Badge>
                          <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                            {suggestion.confidence}% ביטחון
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground" dir="rtl">
                          {formatDate(suggestion.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-base text-right">
                      {suggestion.description}
                    </CardDescription>
                    
                    <div className="bg-muted/50 p-4 rounded-lg text-right">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        צעדים מעשיים
                      </h4>
                      <p className="text-sm">{suggestion.actionable}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant={suggestion.isApplied ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleMarkAsApplied(suggestion)}
                        className="flex items-center gap-2"
                      >
                        {suggestion.isApplied ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        {suggestion.isApplied ? 'מיושם' : 'סמן כמיושם'}
                      </Button>
                      
                      {!suggestion.isRead && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsRead(suggestion)}
                        >
                          סמן כנקרא
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(suggestion)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        דחה
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
