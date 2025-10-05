import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lightbulb, CheckCircle, XCircle, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

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

export default function SuggestionsWidget() {
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch top 3 suggestions
  const { data: suggestions = [], isLoading, error } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/suggestions?limit=3');
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

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      await generateSuggestionsMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsApplied = (suggestion: AISuggestion) => {
    updateSuggestionMutation.mutate({
      id: suggestion.id,
      updates: { isApplied: !suggestion.isApplied }
    });
  };

  const handleViewAll = () => {
    setLocation('/suggestions');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load suggestions. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              הצעות AI
            </CardTitle>
            <CardDescription>
              המלצות מותאמות אישית בהתבסס על הפעילות שלך
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateSuggestions}
            disabled={isGenerating || generateSuggestionsMutation.isPending}
          >
            {isGenerating || generateSuggestionsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              אין הצעות זמינות עדיין. צור כמה בהתבסס על הפעילות שלך!
            </p>
            <Button
              onClick={handleGenerateSuggestions}
              disabled={isGenerating}
              size="sm"
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              צור הצעות
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion: AISuggestion) => (
              <div key={suggestion.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={typeColors[suggestion.type]} variant="secondary">
                        {typeLabels[suggestion.type]}
                      </Badge>
                      {suggestion.priority === 'high' && (
                        <Badge className={priorityColors[suggestion.priority]} variant="secondary">
                          עדיפות גבוהה
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!suggestion.isRead && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      חדש
                    </Badge>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {suggestion.description}
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={suggestion.isApplied ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleMarkAsApplied(suggestion)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {suggestion.isApplied ? 'מיושם' : 'החל'}
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewAll}
                className="w-full flex items-center gap-2"
              >
                צפה בכל ההצעות
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
